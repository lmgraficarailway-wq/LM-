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

// POST /api/stock/adjust — Manual stock adjustment
exports.adjustStock = (req, res) => {
    const { product_id, quantity_change, type, reason, user_id } = req.body;

    if (!product_id || !quantity_change || !type) {
        return res.status(400).json({ error: 'Campos obrigatórios: product_id, quantity_change, type' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // Update product stock
        const updateSql = "UPDATE products SET stock = stock + ? WHERE id = ?";
        db.run(updateSql, [quantity_change, product_id], function (err) {
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
            db.run(movSql, [product_id, quantity_change, type, reason || '', user_id], function (err) {
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
