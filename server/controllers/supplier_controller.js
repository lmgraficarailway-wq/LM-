const db = require('../database/db');

// GET /api/suppliers
exports.getAllSuppliers = (req, res) => {
    db.all("SELECT * FROM suppliers ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// POST /api/suppliers
exports.createSupplier = (req, res) => {
    const { name, phone, website, description } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome do fornecedor é obrigatório.' });
    }
    db.run(
        "INSERT INTO suppliers (name, phone, website, description) VALUES (?, ?, ?, ?)",
        [name.trim(), (phone || '').trim(), (website || '').trim(), (description || '').trim()],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ data: { id: this.lastID, name, phone, website, description } });
        }
    );
};

// PUT /api/suppliers/:id
exports.updateSupplier = (req, res) => {
    const { name, phone, website, description } = req.body;
    const { id } = req.params;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome do fornecedor é obrigatório.' });
    }
    db.run(
        "UPDATE suppliers SET name = ?, phone = ?, website = ?, description = ? WHERE id = ?",
        [name.trim(), (phone || '').trim(), (website || '').trim(), (description || '').trim(), id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
            res.json({ success: true });
        }
    );
};

// DELETE /api/suppliers/:id
exports.deleteSupplier = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM suppliers WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
        res.json({ success: true });
    });
};
