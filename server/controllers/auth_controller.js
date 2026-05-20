const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const SECRET_KEY = 'lm-passo-secret-key-change-me'; // Em produção usar .env

exports.login = (req, res) => {
    const { username, password } = req.body;

    // Query simples sem JOIN — mais confiável no modo Firestore
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('[Auth] Erro ao buscar usuário:', err.message);
            return res.status(500).json({ error: 'Erro no servidor' });
        }
        if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Senha inválida' });

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, client_id: user.client_id || null },
            SECRET_KEY,
            { expiresIn: 86400 }
        );

        // Para usuários clientes, buscar loyalty_status separadamente
        const sendResponse = (loyaltyStatus) => {
            res.status(200).send({
                auth: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    client_id: user.client_id || null,
                    loyalty_status: loyaltyStatus
                }
            });
        };

        if (user.client_id) {
            db.get(`SELECT loyalty_status FROM clients WHERE id = ?`, [user.client_id], (err2, client) => {
                sendResponse(client ? !!client.loyalty_status : false);
            });
        } else {
            sendResponse(false);
        }
    });
};

// Apenas para criar o primeiro usuário ou usuários via API (protegido depois)
exports.register = (req, res) => {
    const { username, password, role, name } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run("INSERT INTO users (username, password, role, name, plain_password) VALUES (?, ?, ?, ?, ?)",
        [username, hashedPassword, role, name, password],
        function (err) {
            if (err) return res.status(500).json({ error: 'Erro ao criar usuário.' });
            res.status(200).json({ message: 'Usuário criado com sucesso!', id: this.lastID });
        }
    );
};

exports.getAllUsers = (req, res) => {
    db.all("SELECT id, username, name, role, avatar FROM users ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

exports.changePassword = (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 4) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
    }
    const hashedPassword = bcrypt.hashSync(new_password, 8);
    db.run("UPDATE users SET password = ?, plain_password = ? WHERE id = ?", [hashedPassword, new_password, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Senha alterada com sucesso' });
    });
};

exports.getUserPasswords = (req, res) => {
    db.all("SELECT id, username, name, role, plain_password FROM users ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

exports.updateRole = (req, res) => {
    const { role } = req.body;
    const validRoles = ['master', 'financeiro', 'producao', 'vendedor', 'interno', 'cliente'];
    if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ error: 'Perfil inválido' });
    }
    db.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Perfil atualizado com sucesso' });
    });
};

exports.deleteUser = (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Usuário excluído com sucesso' });
    });
};

exports.uploadAvatar = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    db.run("UPDATE users SET avatar = ? WHERE id = ?", [avatarUrl, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Avatar atualizado com sucesso', avatar: avatarUrl });
    });
};
