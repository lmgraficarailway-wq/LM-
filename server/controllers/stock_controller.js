const db = require('../database/db');

// Calcula o status do estoque em JavaScript (compatível com SQLite e Firestore)
function calcStockStatus(stock, minStock) {
    const s = parseInt(stock) || 0;
    const m = parseInt(minStock) || 5;
    if (s <= 0) return 'zerado';
    if (s <= m) return 'baixo';
    return 'ok';
}

// GET /api/stock — Overview of all products with stock status
exports.getStockOverview = (req, res) => {
    // Query simples — sem CASE WHEN nem subqueries (compatível com Firestore)
    const sql = `SELECT id, name, type, stock, min_stock FROM products WHERE terceirizado = 0 ORDER BY name ASC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Busca todas as color_variants de uma vez (1 query ao invés de N)
        db.all('SELECT * FROM product_color_variants ORDER BY color ASC', [], (err2, variants) => {
            if (err2) variants = [];

            // Indexa variantes por product_id para lookup O(1)
            const variantsByProduct = {};
            (variants || []).forEach(v => {
                const pid = String(v.product_id);
                if (!variantsByProduct[pid]) variantsByProduct[pid] = [];
                variantsByProduct[pid].push({ color: v.color, quantity: parseInt(v.quantity) || 0 });
            });

            const data = rows.map(r => {
                const colorVars = variantsByProduct[String(r.id)] || [];
                const stock_status = calcStockStatus(r.stock, r.min_stock);
                return { ...r, stock_status, color_variants: colorVars };
            });

            // Ordena: zerado primeiro, depois baixo, depois ok — igual ao SQL original
            data.sort((a, b) => {
                const order = { zerado: 0, baixo: 1, ok: 2 };
                const diff = (order[a.stock_status] || 2) - (order[b.stock_status] || 2);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            });

            const summary = {
                total: data.length,
                zerado: data.filter(r => r.stock_status === 'zerado').length,
                baixo: data.filter(r => r.stock_status === 'baixo').length,
                ok: data.filter(r => r.stock_status === 'ok').length,
            };

            res.json({ data, summary });
        });
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
