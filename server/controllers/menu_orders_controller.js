const db = require('../database/db');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'lm-passo-secret-key-change-me';

const getUserFromToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return null;
    try { return jwt.verify(token, SECRET_KEY, { ignoreExpiration: true }); } catch { return null; }
};

// GET /api/menu-orders â€” lista todos os cardápios
const getAll = (req, res) => {
    const sql = `
        SELECT mo.*, u.name AS created_by_name, u.role AS created_by_role, c.name as client_name, c.core_discount AS core_discount,
               p.price AS product_price,
               mo.unit_price,
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


// POST /api/menu-orders â€” criar novo cardápio
const create = (req, res) => {
    const { quantity, event_name, client_id, producer_name, print_type, unit_price, discount_on_close } = req.body;

    if (!event_name || !event_name.trim()) return res.status(400).json({ error: 'Nome do evento é obrigatório.' });
    if (!client_id) return res.status(400).json({ error: 'Cliente é obrigatório.' });

    const validPrintTypes = ['frente', 'frente_e_verso', 'plastificado'];
    const pType = validPrintTypes.includes(print_type) ? print_type : 'frente';
    const qty = parseInt(quantity) > 0 ? parseInt(quantity) : 1;
    const cid = parseInt(client_id);
    const uPrice = parseFloat(unit_price) > 0 ? parseFloat(unit_price) : 0;

    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;
    const discClose = discount_on_close ? 1 : 0;

    db.run(
        `INSERT INTO menu_orders (quantity, event_name, client_id, producer_name, print_type, status, created_by, unit_price, discount_on_close)
         VALUES (?, ?, ?, ?, ?, 'pendente', ?, ?, ?)`,
        [qty, event_name.trim(), cid, producer_name || '', pType, userId, uPrice, discClose],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get(
                `SELECT mo.*, u.name AS created_by_name, u.role AS created_by_role,
                        c.name AS client_name, c.core_discount AS core_discount,
                        p.price AS product_price,
                        mo.unit_price,
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


// PUT /api/menu-orders/:id â€” editar cardápio
const update = (req, res) => {
    const { id } = req.params;
    const { quantity, event_name, client_id, producer_name, print_type, unit_price, discount_on_close } = req.body;

    if (!event_name || !event_name.trim()) return res.status(400).json({ error: 'Nome do evento é obrigatório.' });
    if (!client_id) return res.status(400).json({ error: 'Cliente é obrigatório.' });

    const validPrintTypes = ['frente', 'frente_e_verso', 'plastificado'];
    const pType = validPrintTypes.includes(print_type) ? print_type : 'frente';
    const qty = parseInt(quantity) > 0 ? parseInt(quantity) : 1;
    const cid = parseInt(client_id);
    const uPrice = parseFloat(unit_price) >= 0 ? parseFloat(unit_price) : 0;

    const discClose2 = discount_on_close ? 1 : 0;
    db.run(
        `UPDATE menu_orders SET quantity = ?, event_name = ?, client_id = ?, producer_name = ?, print_type = ?, unit_price = ?, discount_on_close = ? WHERE id = ?`,
        [qty, event_name.trim(), cid, producer_name || '', pType, uPrice, discClose2, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Cardápio não encontrado.' });
            res.json({ success: true });
        }
    );
};


const revertOrderData = (row, userId, callback) => {
    // Normaliza order_id: pode ser numero, string com numero, ou null/"NULL"
    const rawOrderId = row.order_id;
    const orderId = (rawOrderId !== null && rawOrderId !== undefined &&
                     String(rawOrderId).toUpperCase() !== 'NULL' &&
                     String(rawOrderId).trim() !== '' &&
                     !isNaN(parseInt(rawOrderId)))
        ? parseInt(rawOrderId) : null;

    const productId = row.print_type === 'frente_e_verso' ? 94 : 54;

    const doDelete = (oId) => {
        db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [row.quantity, productId], () => {
            db.run('DELETE FROM order_items WHERE order_id = ?', [oId], () => {
                db.run('DELETE FROM orders WHERE id = ?', [oId], () => {
                    db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'entrada_estorno', ?, ?)",
                        [productId, row.quantity, `Estorno Card\u00e1pio (Estorno) Pedido #${oId}`, userId], () => {
                            callback();
                    });
                });
            });
        });
    };

    if (orderId) {
        // Tenta buscar o pedido pelo ID direto
        db.get('SELECT id FROM orders WHERE id = ?', [orderId], (err, orderRow) => {
            if (err) { console.error('[revert] Erro ao buscar order:', err.message); }
            if (orderRow) {
                doDelete(orderRow.id);
            } else {
                // Nao encontrou pelo ID - tenta buscar pelo descricao
                db.get('SELECT id FROM orders WHERE client_id = ? ORDER BY id DESC LIMIT 1',
                    [row.client_id], (err2, fallbackRow) => {
                        if (fallbackRow) {
                            doDelete(fallbackRow.id);
                        } else {
                            console.warn('[revert] Pedido nao encontrado para card\u00e1pio #' + row.id);
                            callback();
                        }
                });
            }
        });
    } else {
        // Sem order_id registrado - apenas reverte o status
        console.warn('[revert] Card\u00e1pio #' + row.id + ' sem order_id, apenas revertendo status');
        callback();
    }
};

// PUT /api/menu-orders/:id/launch-core â€” marcar como lançado no CORE e abater estoque
const launchToCore = (req, res) => {
    const { id } = req.params;
    const userFromToken = getUserFromToken(req);
    const userId = userFromToken ? userFromToken.id : null;

    db.get(`SELECT mo.*, c.core_discount AS core_discount FROM menu_orders mo LEFT JOIN clients c ON mo.client_id = c.id WHERE mo.id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cardápio não encontrado.' });

        const isUnlaunching = parseInt(row.launched_to_core) === 1 || row.launched_to_core == 1 || row.status === 'lançado';

        if (isUnlaunching) {
            revertOrderData(row, userId, () => {
                db.run(`UPDATE menu_orders SET launched_to_core = ?, status = 'pendente', order_id = NULL, launched_at = NULL WHERE id = ?`, [0, id], function(e) {
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

            // Usa unit_price do cardápio (definido pelo usuário), ou product.price como fallback
            const itemValue = parseFloat(row.unit_price) > 0
                ? parseFloat(row.unit_price)
                : (product ? (product.price || 0) : 0);

            const grossValue = itemValue * row.quantity;
            const discountPercent = row.core_discount ? 15 : 0;
            const discountValue = grossValue * (discountPercent / 100);
            const totalValue = grossValue - discountValue;

            const productName = product ? product.name : `Impressão A4 (${row.print_type})`;
            const discountNote = row.discount_on_close ? ' | DESCONTAR NO FECHAMENTO DO EVENTO' : '';
            const description = `Cardápio Lançado - Evento: ${row.event_name}${discountNote}`;
            const productsSummary = `${row.event_name} - ${row.quantity}x ${productName}`;

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
                                db.run(`UPDATE menu_orders SET launched_to_core = ?, status = 'lançado', order_id = ?, launched_at = CURRENT_TIMESTAMP WHERE id = ?`, [1, orderId, id], function(e) {
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

// GET /api/menu-orders/print-prices â€” retorna preços dos produtos por tipo de impressão
const getPrintPrices = (req, res) => {
    // IDs dos produtos de impressão A4:
    // 54 = Frente (simples), 94 = Frente e Verso, 95 = Plastificado (fallback 54)
    db.all(`SELECT id, name, price FROM products WHERE id IN (54, 94, 95) ORDER BY id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const byId = {};
        (rows || []).forEach(r => { byId[r.id] = r; });

        const frente      = byId[54]  || { id: 54,  name: 'Impressão A4 Frente',         price: 0 };
        const frenteVerso = byId[94]  || { id: 94,  name: 'Impressão A4 Frente e Verso', price: 0 };
        const plastif     = byId[95]  || byId[54] || { id: 54, name: 'Plastificado',     price: 0 };

        res.setHeader('Cache-Control', 'no-store');
        res.json({
            frente:         { id: frente.id,      name: frente.name,      price: frente.price      || 0 },
            frente_e_verso: { id: frenteVerso.id, name: frenteVerso.name, price: frenteVerso.price || 0 },
            plastificado:   { id: plastif.id,     name: plastif.name,     price: plastif.price     || 0 },
        });
    });
};

module.exports = { getAll, create, update, launchToCore, remove, updateOrder, getPrintPrices };
