const db = require('../database/db');

// GET /api/purchases — List all purchase requests
exports.getAllPurchases = (req, res) => {
    const sql = `
        SELECT 
            pr.*,
            p.name as product_name,
            p.type as product_type,
            s.name as supplier_name,
            u1.name as requested_by_name,
            u2.name as received_by_name
        FROM purchase_requests pr
        LEFT JOIN products p ON pr.product_id = p.id
        LEFT JOIN suppliers s ON pr.supplier_id = s.id
        LEFT JOIN users u1 ON pr.requested_by = u1.id
        LEFT JOIN users u2 ON pr.received_by = u2.id
        ORDER BY pr.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// POST /api/purchases — Create a new purchase request
exports.createPurchase = (req, res) => {
    const { product_id, custom_product_name, supplier_id, quantity, unit_cost, notes, requested_by } = req.body;

    if (!product_id && (!custom_product_name || !custom_product_name.trim())) {
        return res.status(400).json({ error: 'Selecione um produto ou informe o material faltante.' });
    }
    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Quantidade mínima é 1.' });
    }

    const sql = `
        INSERT INTO purchase_requests (product_id, custom_product_name, supplier_id, quantity, unit_cost, notes, requested_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [product_id || null, custom_product_name || null, supplier_id || null, quantity, unit_cost || 0, notes || '', requested_by || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Solicitação criada com sucesso', id: this.lastID });
    });
};

// PUT /api/purchases/:id/receive — Confirm receipt and update stock
exports.receivePurchase = (req, res) => {
    const { id } = req.params;
    const { received_by, supplier_id, unit_cost } = req.body;

    // First fetch the purchase request
    db.get("SELECT * FROM purchase_requests WHERE id = ?", [id], (err, pr) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pr) return res.status(404).json({ error: 'Solicitação não encontrada' });
        if (pr.status !== 'pendente') {
            return res.status(400).json({ error: `Solicitação já está com status: ${pr.status}` });
        }

        const finalSupplierId = supplier_id !== undefined ? (supplier_id || null) : pr.supplier_id;
        const finalUnitCost = unit_cost !== undefined ? (parseFloat(unit_cost) || 0) : pr.unit_cost;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            if (pr.product_id) {
                // Update stock
                db.run("UPDATE products SET stock = stock + ? WHERE id = ?", [pr.quantity, pr.product_id], function (err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                    // Insert stock movement
                    const reason = `Compra recebida (Solicitação #${id})`;
                    const movSql = `INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, ?, ?, ?)`;
                    db.run(movSql, [pr.product_id, pr.quantity, 'entrada_compra', reason, received_by || null], function (err) {
                        if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                        // Mark purchase request as received
                        const updateSql = `UPDATE purchase_requests SET status = 'recebida', received_by = ?, received_at = CURRENT_TIMESTAMP, supplier_id = ?, unit_cost = ? WHERE id = ?`;
                        db.run(updateSql, [received_by || null, finalSupplierId, finalUnitCost, id], function (err) {
                            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                            db.run("COMMIT");
                            res.json({ message: 'Compra recebida e estoque atualizado com sucesso!' });
                        });
                    });
                });
            } else {
                // No product_id (missing material), just mark as received
                const updateSql = `UPDATE purchase_requests SET status = 'recebida', received_by = ?, received_at = CURRENT_TIMESTAMP, supplier_id = ?, unit_cost = ? WHERE id = ?`;
                db.run(updateSql, [received_by || null, finalSupplierId, finalUnitCost, id], function (err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                    db.run("COMMIT");
                    res.json({ message: 'Compra avulsa recebida com sucesso!' });
                });
            }
        });
    });
};

// PUT /api/purchases/:id/cancel — Cancel a purchase request
exports.cancelPurchase = (req, res) => {
    const { id } = req.params;

    db.get("SELECT status FROM purchase_requests WHERE id = ?", [id], (err, pr) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pr) return res.status(404).json({ error: 'Solicitação não encontrada' });
        if (pr.status !== 'pendente') {
            return res.status(400).json({ error: `Não é possível cancelar. Status atual: ${pr.status}` });
        }

        db.run("UPDATE purchase_requests SET status = 'cancelada' WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Solicitação cancelada com sucesso' });
        });
    });
};

// DELETE /api/purchases/:id — Excluir permanentemente (apenas master)
exports.deletePurchase = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM purchase_requests WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Solicitação não encontrada' });
        res.json({ success: true, message: 'Solicitação excluída com sucesso' });
    });
};
