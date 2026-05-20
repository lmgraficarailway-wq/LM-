const db = require('../database/db');
const bcrypt = require('bcryptjs');

// List helper to handle query results
const getAll = (sql, params, res) => {
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

exports.getAllClients = (req, res) => {
    const sql = `
        SELECT c.*, 
               u.id as access_user_id, 
               u.username as access_username,
               u.plain_password as access_password,
               COALESCE(SUM(m.amount), 0) as L90_spent,
               COUNT(m.id) as L90_orders
        FROM clients c
        LEFT JOIN users u ON u.client_id = c.id AND u.role = 'cliente'
        LEFT JOIN client_credit_movements m ON m.client_id = c.id 
             AND m.type = 'order_debit' 
             AND m.created_at >= COALESCE(c.points_reset_at, '2026-04-28')
        GROUP BY c.id
        ORDER BY c.name ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let updates = [];
        
        const data = rows.map(r => {
            let currentTier = r.loyalty_tier || 'bronze';
            let newTier = currentTier;
            let notified = r.loyalty_tier_notified !== undefined ? r.loyalty_tier_notified : 1;

            if (r.loyalty_status) {
                if (r.L90_spent >= 1000 || r.L90_orders >= 40) {
                    newTier = 'ouro';
                } else if (r.L90_spent >= 500 || r.L90_orders >= 20) {
                    newTier = 'prata';
                } else {
                    newTier = 'bronze';
                }

                if (newTier !== currentTier) {
                    // Only trigger notification animation if leveling UP, not downgrading.
                    // Tier rank: bronze=1, prata=2, ouro=3
                    const rank = t => t === 'ouro' ? 3 : (t === 'prata' ? 2 : 1);
                    if (rank(newTier) > rank(currentTier)) {
                        notified = 0; // Trigger animation
                    }
                    updates.push({ id: r.id, tier: newTier, notified });
                }
            }

            return {
                ...r,
                loyalty_tier: newTier,
                loyalty_tier_notified: notified,
                has_access: r.access_user_id ? true : false
            };
        });

        // Run async DB updates for any tier changes
        if (updates.length > 0) {
            db.serialize(() => {
                const stmt = db.prepare("UPDATE clients SET loyalty_tier = ?, loyalty_tier_notified = ? WHERE id = ?");
                updates.forEach(u => stmt.run(u.tier, u.notified, u.id));
                stmt.finalize();
            });
        }

        res.json({ data });
    });
};

exports.createClient = (req, res) => {
    const { name, phone, origin, core_discount, cpf, address, city, state, zip_code, loyalty_status, credit_limit, credit_balance, billing_date, active } = req.body;
    const sql = "INSERT INTO clients (name, phone, origin, core_discount, cpf, address, city, state, zip_code, loyalty_status, credit_limit, credit_balance, billing_date, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const params = [name, phone, origin, core_discount ? 1 : 0, cpf || '', address || '', city || '', state || '', zip_code || '', loyalty_status ? 1 : 0, parseFloat(credit_limit) || 0, parseFloat(credit_balance) || 0, billing_date ? parseInt(billing_date) : null, active !== undefined ? (active ? 1 : 0) : 1];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cliente criado com sucesso', id: this.lastID });
    });
};

exports.updateClient = (req, res) => {
    const { name, phone, origin, core_discount, cpf, address, city, state, zip_code, loyalty_status, credit_limit, credit_balance, billing_date, active } = req.body;
    const sql = "UPDATE clients SET name = ?, phone = ?, origin = ?, core_discount = ?, cpf = ?, address = ?, city = ?, state = ?, zip_code = ?, loyalty_status = ?, credit_limit = ?, credit_balance = ?, billing_date = ?, active = ? WHERE id = ?";
    const params = [name, phone, origin, core_discount ? 1 : 0, cpf || '', address || '', city || '', state || '', zip_code || '', loyalty_status ? 1 : 0, parseFloat(credit_limit) || 0, parseFloat(credit_balance) || 0, billing_date ? parseInt(billing_date) : null, active !== undefined ? (active ? 1 : 0) : 1, req.params.id];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cliente atualizado', changes: this.changes });
    });
};

exports.deleteClient = (req, res) => {
    db.run("DELETE FROM clients WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Cliente removido', changes: this.changes });
    });
};

// Credit Account Methods
exports.getCreditMovements = (req, res) => {
    const clientId = req.params.id;
    const sql = `
        SELECT cm.*, u.name as created_by_name 
        FROM client_credit_movements cm
        LEFT JOIN users u ON cm.created_by = u.id
        WHERE cm.client_id = ?
        ORDER BY cm.created_at DESC
    `;
    db.all(sql, [clientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

exports.addCreditTransaction = (req, res) => {
    const clientId = req.params.id;
    const { amount, description, user_id } = req.body; // user_id passed from frontend
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valor inválido.' });
    }

    const value = parseFloat(amount);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(
            "INSERT INTO client_credit_movements (client_id, amount, type, description, created_by) VALUES (?, ?, 'payment_credit', ?, ?)",
            [clientId, value, description || 'Pagamento / Acerto de Conta', user_id || null],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                db.run("UPDATE clients SET credit_balance = credit_balance + ? WHERE id = ?", [value, clientId], function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    db.run("COMMIT");
                    res.json({ message: 'Transação registrada com sucesso.' });
                });
            }
        );
    });
};

// Delete a credit movement and revert the balance
exports.deleteCreditMovement = (req, res) => {
    const movId = req.params.id;
    
    db.get("SELECT * FROM client_credit_movements WHERE id = ?", [movId], (err, mov) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada' });
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM client_credit_movements WHERE id = ?", [movId], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                
                // If it was a credit (+), we subtract from balance.
                // If it was a debit (-), we add back to balance.
                const operator = mov.type === 'payment_credit' ? '-' : '+';
                db.run(`UPDATE clients SET credit_balance = credit_balance ${operator} ? WHERE id = ?`, [mov.amount, mov.client_id], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    db.run("COMMIT");
                    res.json({ message: 'Movimentação apagada e saldo atualizado.' });
                });
            });
        });
    });
};

// Toggle client financial access — create or remove user account
exports.toggleClientAccess = (req, res) => {
    const clientId = req.params.id;
    const { enable } = req.body;

    if (enable) {
        // Check if already has access
        db.get("SELECT id FROM users WHERE client_id = ? AND role = 'cliente'", [clientId], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing) return res.status(400).json({ error: 'Cliente já possui acesso ativo.' });

            // Get client info to generate username
            db.get("SELECT name, phone FROM clients WHERE id = ?", [clientId], (err, client) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });

                // Generate username from client name (lowercase, no spaces, no accents)
                const baseName = client.name
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '')
                    .substring(0, 20);
                const username = `cliente_${baseName}`;

                // Generate random 6-digit password
                const password = String(Math.floor(100000 + Math.random() * 900000));
                const hashedPassword = bcrypt.hashSync(password, 8);

                // Check if username exists, append number if needed
                db.get("SELECT id FROM users WHERE username = ?", [username], (err, existingUser) => {
                    const finalUsername = existingUser ? `${username}_${clientId}` : username;

                    db.run(
                        "INSERT INTO users (username, password, role, name, client_id, plain_password) VALUES (?, ?, 'cliente', ?, ?, ?)",
                        [finalUsername, hashedPassword, client.name, clientId, password],
                        function (err) {
                            if (err) return res.status(500).json({ error: err.message });

                            const link = `${req.protocol}://${req.get('host')}`;
                            res.json({
                                message: 'Acesso criado com sucesso',
                                username: finalUsername,
                                password: password,
                                link: link
                            });
                        }
                    );
                });
            });
        });
    } else {
        // Remove access — delete the user linked to this client
        db.run("DELETE FROM users WHERE client_id = ? AND role = 'cliente'", [clientId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Acesso removido', removed: true });
        });
    }
};

// Reset client access — generate new password and return credentials to admin
exports.resetClientAccess = (req, res) => {
    const clientId = req.params.id;

    db.get("SELECT u.id, u.username, c.name FROM users u JOIN clients c ON c.id = u.client_id WHERE u.client_id = ? AND u.role = 'cliente'", [clientId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Este cliente não possui acesso ativo.' });

        const newPassword = String(Math.floor(100000 + Math.random() * 900000));
        const hashedPassword = bcrypt.hashSync(newPassword, 8);

        db.run("UPDATE users SET password = ?, plain_password = ? WHERE id = ?", [hashedPassword, newPassword, row.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const link = `${req.protocol}://${req.get('host')}`;
            res.json({
                message: 'Senha resetada com sucesso',
                username: row.username,
                password: newPassword,
                link: link
            });
        });
    });
};
// Get existing client access credentials
exports.getClientAccess = (req, res) => {
    const clientId = req.params.id;
    db.get("SELECT username, plain_password FROM users WHERE client_id = ? AND role = 'cliente'", [clientId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Este cliente ainda não possui acesso configurado.' });
        
        const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
        res.json({
            username: row.username,
            password: row.plain_password || '******',
            link: `${origin}/#/login?u=${row.username}`
        });
    });
};
// Acknowledge tier upgrade notification
exports.ackTierNotification = (req, res) => {
    const clientId = req.params.id;
    db.run("UPDATE clients SET loyalty_tier_notified = 1 WHERE id = ?", [clientId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notificação reconhecida com sucesso.' });
    });
};
// Sync portal user name when client name changes
exports.syncAccessName = (req, res) => {
    const clientId = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome inválido.' });

    db.run(
        "UPDATE users SET name = ? WHERE client_id = ? AND role = 'cliente'",
        [name, clientId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Nome sincronizado', changes: this.changes });
        }
    );
};

exports.resetPoints = (req, res) => {
    const sql = "UPDATE clients SET points_reset_at = CURRENT_TIMESTAMP WHERE id = ?";
    db.run(sql, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
        res.json({ message: 'Pontuação zerada com sucesso!' });
    });
};
