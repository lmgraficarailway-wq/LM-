const db = require('../database/db');
const jwt = require('jsonwebtoken');
const { brasiliaDatetime } = require('../utils/dateHelper');

// Garante que a coluna pinned existe (migração segura)
db.run(`ALTER TABLE reminders ADD COLUMN pinned INTEGER DEFAULT 0`, () => {});
const SECRET_KEY = 'lm-passo-secret-key-change-me';

const getUserFromToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    try { return jwt.verify(token, SECRET_KEY, { ignoreExpiration: true }); } catch { return null; }
};

// GET /api/reminders — list all, pinned first then by position/date
const getAll = (req, res) => {
    const sql = `
        SELECT r.*, u.name AS created_by_name, u.role AS created_by_role
        FROM reminders r
        LEFT JOIN users u ON r.created_by = u.id
        ORDER BY
            r.pinned DESC,
            r.position ASC,
            r.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// GET /api/reminders/pending-count — returns count of pending reminders
const getPendingCount = (req, res) => {
    db.get(`SELECT COUNT(*) AS count FROM reminders WHERE status = ?`, ['pendente'], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row ? row.count : 0 });
    });
};

// POST /api/reminders — create new reminder
const create = (req, res) => {
    const { title, description, priority } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório.' });
    }
    const validPriorities = ['urgente', 'normal', 'baixo'];
    const prio = validPriorities.includes(priority) ? priority : 'normal';

    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;

    // IMPORTANTE: usar ? para TODOS os valores — valores literais no SQL
    // confundem o parser do Firestore (desalinha índices de params)
    db.run(
        `INSERT INTO reminders (title, description, priority, status, created_by) VALUES (?, ?, ?, ?, ?)`,
        [title.trim(), description?.trim() || '', prio, 'pendente', userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const insertedId = this.lastID;
            db.get(
                `SELECT r.*, u.name AS created_by_name, u.role AS created_by_role FROM reminders r LEFT JOIN users u ON r.created_by = u.id WHERE r.id = ?`,
                [insertedId],
                (err2, row) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    // Garante dados mínimos na resposta mesmo se SELECT falhar
                    res.status(201).json({ data: row || { id: insertedId, title: title.trim(), description: description?.trim() || '', priority: prio, status: 'pendente', created_by: userId, created_at: new Date().toISOString() } });
                }
            );
        }
    );
};

// PUT /api/reminders/:id — update title/description/priority
const update = (req, res) => {
    const { id } = req.params;
    const { title, description, priority } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório.' });
    }
    const validPriorities = ['urgente', 'normal', 'baixo'];
    const prio = validPriorities.includes(priority) ? priority : 'normal';

    db.run(
        `UPDATE reminders SET title = ?, description = ?, priority = ? WHERE id = ?`,
        [title.trim(), description?.trim() || '', prio, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Lembrete não encontrado.' });
            res.json({ success: true });
        }
    );
};

// PUT /api/reminders/:id/toggle — toggle between pendente ↔ concluido
const toggle = (req, res) => {
    const { id } = req.params;
    db.get(`SELECT status FROM reminders WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Lembrete não encontrado.' });

        // Normaliza status: pode vir como número por bug de migração
        const currentStatus = String(row.status || '').toLowerCase();
        const newStatus = currentStatus === 'pendente' ? 'concluido' : 'pendente';
        const concludedAt = newStatus === 'concluido' ? new Date().toISOString() : null;

        db.run(
            `UPDATE reminders SET status = ?, concluded_at = ? WHERE id = ?`,
            [newStatus, concludedAt, id],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true, newStatus });
            }
        );
    });
};

// DELETE /api/reminders/:id
const remove = (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM reminders WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Lembrete não encontrado.' });
        res.json({ success: true });
    });
};

// PUT /api/reminders/:id/pin — toggle pin state
const togglePin = (req, res) => {
    const { id } = req.params;
    db.get(`SELECT pinned FROM reminders WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Lembrete não encontrado.' });
        const newPinned = row.pinned ? 0 : 1;
        db.run(`UPDATE reminders SET pinned = ? WHERE id = ?`, [newPinned, id], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, pinned: newPinned });
        });
    });
};

// PUT /api/reminders/reorder
const updateOrder = (req, res) => {
    const { items } = req.body; // Array de { id, position }
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Lista de items inválida.' });
    }

    db.serialize(() => {
        const stmt = db.prepare('UPDATE reminders SET position = ? WHERE id = ?');
        items.forEach(item => {
            stmt.run(item.position, item.id);
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
};

module.exports = { getAll, getPendingCount, create, update, toggle, togglePin, remove, updateOrder };
