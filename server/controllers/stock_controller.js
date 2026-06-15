const db = require('../database/db');

// GET /api/stock — Overview of all products with stock status
exports.getStockOverview = (req, res) => {
    const sql = `
        SELECT p.id, p.name, p.type, p.stock, p.min_stock,
            CASE 
                WHEN p.stock <= 0 THEN 'zerado'
                WHEN p.stock <= COALESCE(p.min_stock, 5) THEN 'baixo'
                ELSE 'ok'
            END as stock_status,
            (SELECT group_concat(cv.color || ':' || cv.quantity, '|||')
             FROM product_color_variants cv WHERE cv.product_id = p.id) as color_variants_raw
        FROM products p
        WHERE p.terceirizado = 0
        ORDER BY 
            CASE 
                WHEN p.stock <= 0 THEN 0
                WHEN p.stock <= COALESCE(p.min_stock, 5) THEN 1
                ELSE 2
            END,
            p.name ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const data = rows.map(r => ({
            ...r,
            color_variants: r.color_variants_raw
                ? r.color_variants_raw.split('|||').map(v => {
                    const sepIdx = v.lastIndexOf(':');
                    return {
                        color: v.substring(0, sepIdx),
                        quantity: parseInt(v.substring(sepIdx + 1)) || 0
                    };
                })
                : []
        }));

        const summary = {
            total: data.length,
            zerado: data.filter(r => r.stock_status === 'zerado').length,
            baixo: data.filter(r => r.stock_status === 'baixo').length,
            ok: data.filter(r => r.stock_status === 'ok').length,
        };

        res.json({ data, summary });
    });
};

// POST /api/stock/adjust — Manual stock adjustment (relative: +/-)
exports.adjustStock = (req, res) => {
    const { product_id, quantity_change, type, reason, user_id } = req.body;

    if (!product_id || quantity_change === undefined || quantity_change === null || !type) {
        return res.status(400).json({ error: 'Campos obrigatórios: product_id, quantity_change, type' });
    }

    const change = parseInt(quantity_change);
    if (isNaN(change)) {
        return res.status(400).json({ error: 'quantity_change deve ser um número inteiro' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Update product stock (relative change)
        const updateSql = "UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?";
        db.run(updateSql, [change, product_id], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                db.run("ROLLBACK");
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // Insert movement record
            const movSql = "INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, ?, ?, ?)";
            db.run(movSql, [product_id, change, type, reason || '', user_id], function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT");
                res.json({ message: 'Estoque ajustado com sucesso', movement_id: this.lastID });
            });
        });
    });
};

// PUT /api/stock/set/:id — Set stock to an absolute value (manual correction)
exports.setStock = (req, res) => {
    const { new_stock, reason, user_id } = req.body;
    const productId = req.params.id;

    if (new_stock === undefined || new_stock === null || new_stock === '') {
        return res.status(400).json({ error: 'Campos obrigatórios: new_stock' });
    }

    const target = parseInt(new_stock);
    if (isNaN(target) || target < 0) {
        return res.status(400).json({ error: 'new_stock deve ser um número inteiro não negativo' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Get current stock to calculate change
        db.get("SELECT stock FROM products WHERE id = ?", [productId], (err, row) => {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
            if (!row) { db.run("ROLLBACK"); return res.status(404).json({ error: 'Produto não encontrado' }); }

            const oldStock = row.stock || 0;
            const change = target - oldStock;

            db.run("UPDATE products SET stock = ? WHERE id = ?", [target, productId], function (err) {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                const movSql = "INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'ajuste_manual', ?, ?)";
                db.run(movSql, [productId, change, reason || 'Ajuste manual direto', user_id || null], function (err) {
                    if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                    db.run("COMMIT");
                    res.json({ message: 'Estoque definido com sucesso', new_stock: target, change });
                });
            });
        });
    });
};

// GET /api/stock/movements — Stock movement history
exports.getStockMovements = (req, res) => {
    const { product_id } = req.query;

    let sql = `
        SELECT sm.*, p.name as product_name, u.name as user_name
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN users u ON sm.user_id = u.id
    `;
    const params = [];

    if (product_id) {
        sql += " WHERE sm.product_id = ?";
        params.push(product_id);
    }

    sql += " ORDER BY sm.created_at DESC LIMIT 100";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// PUT /api/stock/min/:id — Update minimum stock threshold
exports.updateMinStock = (req, res) => {
    const { min_stock } = req.body;
    const sql = "UPDATE products SET min_stock = ? WHERE id = ?";

    db.run(sql, [min_stock, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Estoque mínimo atualizado', changes: this.changes });
    });
};
