const db = require('../database/db');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'lm-passo-secret-key-change-me';

const getUserFromToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    try { return jwt.verify(token, SECRET_KEY, { ignoreExpiration: true }); } catch { return null; }
};

// GET /api/menu-orders — lista todos os cardápios
const getAll = (req, res) => {
    const sql = `
        SELECT mo.*, u.name AS created_by_name, u.role AS created_by_role, c.name as client_name, c.core_discount,
               p.price AS product_price,
               o.total_value AS launched_total,
               o.discount_value AS launched_discount
        FROM menu_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        LEFT JOIN clients c ON mo.client_id = c.id
        LEFT JOIN products p ON (CASE WHEN mo.print_type = 'frente_e_verso' THEN 94 ELSE 54 END) = p.id
        LEFT JOIN orders o ON mo.order_id = o.id
        ORDER BY mo.position ASC, mo.launched_to_core ASC, mo.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// POST /api/menu-orders — criar novo cardápio
const create = (req, res) => {
    const { quantity, event_name, client_id, producer_name, print_type } = req.body;

    if (!event_name || !event_name.trim()) return res.status(400).json({ error: 'Nome do evento é obrigatório.' });
    if (!client_id) return res.status(400).json({ error: 'Cliente é obrigatório.' });

    const validPrintTypes = ['frente', 'frente_e_verso', 'plastificado'];
    const pType = validPrintTypes.includes(print_type) ? print_type : 'frente';
    const qty = parseInt(quantity) > 0 ? parseInt(quantity) : 1;
    const cid = parseInt(client_id);

    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;

    db.run(
        `INSERT INTO menu_orders (quantity, event_name, client_id, producer_name, print_type, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
        [qty, event_name.trim(), cid, producer_name || '', pType, userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get(
                `SELECT mo.*, u.name AS created_by_name, u.role AS created_by_role,
                        c.name AS client_name, c.core_discount,
                        p.price AS product_price,
                        o.total_value AS launched_total,
                        o.discount_value AS launched_discount
                 FROM menu_orders mo
                 LEFT JOIN users u ON mo.created_by = u.id
                 LEFT JOIN clients c ON mo.client_id = c.id
                 LEFT JOIN products p ON (CASE WHEN mo.print_type = 'frente_e_verso' THEN 94 ELSE 54 END) = p.id
                 LEFT JOIN orders o ON mo.order_id = o.id
                 WHERE mo.id = ?`,
                [this.lastID],
                (err2, row) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.status(201).json({ data: row });
                }
            );
        }
    );
};

// PUT /api/menu-orders/:id — editar cardápio
const update = (req, res) => {
    const { id } = req.params;
    const { quantity, event_name, client_id, producer_name, print_type } = req.body;

    if (!event_name || !event_name.trim()) return res.status(400).json({ error: 'Nome do evento é obrigatório.' });
    if (!client_id) return res.status(400).json({ error: 'Cliente é obrigatório.' });

    const validPrintTypes = ['frente', 'frente_e_verso', 'plastificado'];
    const pType = validPrintTypes.includes(print_type) ? print_type : 'frente';
    const qty = parseInt(quantity) > 0 ? parseInt(quantity) : 1;
    const cid = parseInt(client_id);

    db.run(
        `UPDATE menu_orders SET quantity = ?, event_name = ?, client_id = ?, producer_name = ?, print_type = ? WHERE id = ?`,
        [qty, event_name.trim(), cid, producer_name || '', pType, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Cardápio não encontrado.' });
            res.json({ success: true });
        }
    );
};

const revertOrderData = (row, userId, callback) => {
    let sql = '', params = [];
    if (row.order_id) {
        sql = 'SELECT id FROM orders WHERE id = ?';
        params = [row.order_id];
    } else {
        sql = 'SELECT id FROM orders WHERE description LIKE ? AND client_id = ? ORDER BY id DESC LIMIT 1';
        params = [`%Cardápio Lançado - Evento: ${row.event_name}%`, row.client_id];
    }
    db.get(sql, params, (err, orderRow) => {
        if (err || !orderRow) return callback();
        const orderId = orderRow.id;
        const productId = row.print_type === 'frente_e_verso' ? 94 : 54;
        db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [row.quantity, productId], () => {
            db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], () => {
                db.run('DELETE FROM orders WHERE id = ?', [orderId], () => {
                    db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'entrada_estorno', ?, ?)",
                        [productId, row.quantity, `Estorno Cardápio (Exclusão) Pedido #${orderId}`, userId], () => {
                            callback();
                    });
                });
            });
        });
    });
};

// PUT /api/menu-orders/:id/launch-core — marcar como lançado no CORE e abater estoque
const launchToCore = (req, res) => {
    const { id } = req.params;
    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;

    db.get(`SELECT mo.*, c.core_discount FROM menu_orders mo LEFT JOIN clients c ON mo.client_id = c.id WHERE mo.id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cardápio não encontrado.' });

        const isUnlaunching = row.launched_to_core === 1;

        if (isUnlaunching) {
            revertOrderData(row, userId, () => {
                db.run(`UPDATE menu_orders SET launched_to_core = 0, status = 'pendente', order_id = NULL, launched_at = NULL WHERE id = ?`, [id], function(e) {
                    if (e) return res.status(500).json({ error: e.message });
                    res.json({ success: true, launched_to_core: 0 });
                });
            });
            return;
        }

        // It's launching! We need to create an order
        const productId = row.print_type === 'frente_e_verso' ? 94 : 54;

        db.get(`SELECT * FROM products WHERE id = ?`, [productId], (errP, product) => {
            if (errP) return res.status(500).json({ error: errP.message });
            if (!product) return res.status(400).json({ error: 'Produto de impressão A4 não encontrado no banco.' });

            const itemValue = product.price || 0;
            const grossValue = itemValue * row.quantity;
            const discountPercent = row.core_discount ? 15 : 0;
            const discountValue = grossValue * (discountPercent / 100);
            const totalValue = grossValue - discountValue;
            
            const description = `Cardápio Lançado - Evento: ${row.event_name}`;
            const productsSummary = `${row.event_name} - ${row.quantity}x ${product.name}`;

            // Create standard order. launched_to_core is 0 so the financial team can confer and launch it.
            db.run(
                `INSERT INTO orders (client_id, description, total_value, discount_value, payment_method, status, launched_to_core, products_summary, is_internal, event_name)
                 VALUES (?, ?, ?, ?, 'CORE', 'finalizado', 0, ?, 0, ?)`,
                [row.client_id, description, totalValue, discountValue, productsSummary, row.event_name],
                function(errO) {
                    if (errO) return res.status(500).json({ error: errO.message });
                    const orderId = this.lastID;

                    // Insert order item
                    db.run(
                        `INSERT INTO order_items (order_id, product_id, quantity, price, product_snapshot_name) VALUES (?, ?, ?, ?, ?)`,
                        [orderId, productId, row.quantity, itemValue, product.name],
                        (errI) => {
                            if (errI) console.error('Erro ao adicionar item:', errI);

                            // Deduct stock
                            db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [row.quantity, productId], () => {
                                db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'saida_pedido', ?, ?)",
                                    [productId, -row.quantity, `Cardápio (CORE) Pedido #${orderId}`, userId]);

                                // Finally update the menu_order itself
                                db.run(`UPDATE menu_orders SET launched_to_core = 1, status = 'lançado', order_id = ?, launched_at = CURRENT_TIMESTAMP WHERE id = ?`, [orderId, id], function(e) {
                                    if (e) return res.status(500).json({ error: e.message });
                                    res.json({ success: true, launched_to_core: 1, order_id: orderId, launched_at: new Date().toISOString() });
                                });
                            });
                        }
                    );
                }
            );
        });
    });
};

// DELETE /api/menu-orders/:id
const remove = (req, res) => {
    const { id } = req.params;
    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;

    db.get(`SELECT * FROM menu_orders WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cardápio não encontrado.' });

        const deleteAction = () => {
            db.run(`DELETE FROM menu_orders WHERE id = ?`, [id], function (errDel) {
                if (errDel) return res.status(500).json({ error: errDel.message });
                res.json({ success: true });
            });
        };

        if (row.launched_to_core === 1) {
            revertOrderData(row, userId, deleteAction);
        } else {
            deleteAction();
        }
    });
};

// PUT /api/menu-orders/reorder
const updateOrder = (req, res) => {
    const { items } = req.body; // Array of { id, position }
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Lista de items inválida.' });
    }

    db.serialize(() => {
        const stmt = db.prepare('UPDATE menu_orders SET position = ? WHERE id = ?');
        items.forEach(item => {
            stmt.run(item.position, item.id);
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
};

module.exports = { getAll, create, update, launchToCore, remove, updateOrder };
