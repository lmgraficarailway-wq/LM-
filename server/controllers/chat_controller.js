const db = require('../database/db');
const { brasiliaDatetime } = require('../utils/dateHelper');

// Lista global de conexões ativas para Server-Sent Events
let clients = [];

// Função auxiliar para enviar evento para todos os clientes ativos
const broadcast = (data) => {
    clients.forEach(c => {
        try {
            c.res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch(err) {
            console.error('Error broadcasting to client', c.id, err);
        }
    });
};

exports.stream = (req, res) => {
    // Configura os headers para manter a conexão aberta
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform'); // no-transform disables Express compression
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now() + Math.random().toString();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Enviar mensagem inicial para confirmar a conexão
    res.write(`data: ${JSON.stringify({ type: 'connected', msg: 'SSE ativo' })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
};

exports.getHistory = (req, res) => {
    // Busca as 100 mais RECENTES (ORDER BY DESC + LIMIT) e depois inverte para exibir na ordem certa
    db.all(`SELECT t.*, u.avatar as author_avatar FROM team_chat t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.id DESC LIMIT 100`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Inverte para ordem cronológica (mais antiga primeiro, mais recente no final)
        const messages = (rows || []).reverse().map(m => ({
            ...m,
            author_avatar: m.author_avatar && m.author_avatar.startsWith('/uploads/')
                ? `https://lm-passo-production.up.railway.app${m.author_avatar}`
                : m.author_avatar
        }));
        res.setHeader('Cache-Control', 'no-store, no-cache, private');
        res.json({ messages });
    });
};

// Polling — retorna apenas mensagens novas (id > after)
exports.getNewMessages = (req, res) => {
    const after = parseInt(req.query.after) || 0;
    db.all(
        `SELECT t.*, u.avatar as author_avatar
         FROM team_chat t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.id > ?
         ORDER BY t.id ASC
         LIMIT 50`,
        [after],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const messages = (rows || []).map(m => ({
                ...m,
                author_avatar: m.author_avatar && m.author_avatar.startsWith('/uploads/')
                    ? `https://lm-passo-production.up.railway.app${m.author_avatar}`
                    : m.author_avatar
            }));
            res.setHeader('Cache-Control', 'no-store, no-cache, private');
            res.json({ messages });
        }
    );
};


exports.uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    }
    try {
        const { uploadFile } = require('../utils/firebaseStorage');
        const publicUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'chat');
        res.json({ url: publicUrl });
    } catch (e) {
        console.error('[Chat Upload] Erro:', e.message);
        // Fallback: URL relativa (funciona apenas no Railway)
        const imageUrl = `/uploads/${req.file.filename || req.file.originalname}`;
        res.json({ url: imageUrl });
    }
};

exports.sendMessage = (req, res) => {
    const { message, user_id, user_name, user_role, reply_to_id, reply_to_author, reply_to_msg, attachment_url } = req.body;

    if ((!message || !message.trim()) && !attachment_url) {
        return res.status(400).json({ error: 'Mensagem inválida' });
    }

    db.run(
        `INSERT INTO team_chat (user_id, user_name, user_role, message, reply_to_id, reply_to_author, reply_to_msg, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, user_name, user_role, message ? message.trim() : '', reply_to_id || null, reply_to_author || null, reply_to_msg || null, attachment_url || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const insertedId = this.lastID;
            const newMsg = {
                id: insertedId,
                type: 'message',
                user_id: user_id,
                user_name: user_name,
                user_role: user_role,
                message: message ? message.trim() : '',
                reply_to_id: reply_to_id || null,
                reply_to_author: reply_to_author || null,
                reply_to_msg: reply_to_msg || null,
                attachment_url: attachment_url || null,
                created_at: new Date().toISOString(),
                author_avatar: null
            };

            // Responde ao cliente imediatamente — sem esperar a query do avatar
            res.json({ success: true, message: newMsg });

            // Busca o avatar em paralelo e faz broadcast para os outros via SSE
            db.get('SELECT avatar FROM users WHERE id = ?', [user_id], (err2, userRow) => {
                if (userRow && userRow.avatar) {
                    newMsg.author_avatar = userRow.avatar.startsWith('/uploads/')
                        ? `https://lm-passo-production.up.railway.app${userRow.avatar}`
                        : userRow.avatar;
                }
                broadcast(newMsg);
            });
        }
    );
};

exports.typing = (req, res) => {
    const { isTyping, user_id, user_name, user_role } = req.body;

    broadcast({
        type: 'typing',
        user_id,
        user_name,
        user_role,
        isTyping
    });

    res.json({ success: true });
};

exports.editMessage = (req, res) => {
    const { id } = req.params;
    const { message, user_id } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Mensagem inválida' });
    }

    // Only allow user to edit their own message
    db.get(`SELECT * FROM team_chat WHERE id = ?`, [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Mensagem não encontrada' });
        if (parseInt(row.user_id) !== parseInt(user_id)) return res.status(403).json({ error: 'Sem permissão' });

        const now = new Date().toISOString();
        db.run(
            `UPDATE team_chat SET message = ?, is_edited = 1, edited_at = ? WHERE id = ?`,
            [message.trim(), now, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                broadcast({
                    type: 'edit',
                    id: parseInt(id),
                    message: message.trim(),
                    is_edited: 1,
                    edited_at: now
                });

                res.json({ success: true });
            }
        );
    });
};

exports.deleteMessage = (req, res) => {
    const { id } = req.params;
    // Support both query params (DELETE requests) and body
    const user_id  = req.query.user_id  || (req.body && req.body.user_id);
    const user_role = req.query.user_role || (req.body && req.body.user_role);

    if (!user_id) return res.status(400).json({ error: 'Usuário não identificado' });

    db.get(`SELECT * FROM team_chat WHERE id = ?`, [id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Mensagem não encontrada' });

        // Only the message owner or a master user can delete
        const isMaster = user_role === 'master';
        const isOwner = parseInt(row.user_id) === parseInt(user_id);

        if (!isOwner && !isMaster) {
            return res.status(403).json({ error: 'Sem permissão para excluir esta mensagem' });
        }

        db.run(`DELETE FROM team_chat WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            broadcast({
                type: 'delete',
                id: parseInt(id)
            });

            res.json({ success: true });
        });
    });
};
