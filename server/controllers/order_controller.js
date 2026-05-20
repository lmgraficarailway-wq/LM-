const db = require('../database/db');
const { brasiliaDatetime, brasiliaISO } = require('../utils/dateHelper');
const { calculateProductionTime } = require('../utils/production_calculator');

// Helper to calculate deadline (dias úteis)
const calculateDeadline = (days) => {
    const date = new Date();
    let remainingDays = parseInt(days);
    
    while (remainingDays > 0) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        // 0 = Domingo, 6 = Sábado
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remainingDays--;
        }
    }
    return date.toISOString();
};

exports.getAllOrders = (req, res) => {
    const { status, role, user_id } = req.query;
    let sql = `
        SELECT o.*, c.name as client_name, c.phone as client_phone, u.name as created_by_name,
        c.cpf as client_cpf, c.address as client_address, c.city as client_city, c.state as client_state, c.zip_code as client_zip_code,
        mu.name as moved_by_name,
        COALESCE(o.products_summary, p.name) as product_name,
        COALESCE(
            (SELECT SUM(CAST(p2.production_time AS REAL) * oi.quantity) 
             FROM order_items oi 
             JOIN products p2 ON oi.product_id = p2.id 
             WHERE oi.order_id = o.id),
            (SELECT CAST(p.production_time AS REAL) 
             FROM products p 
             WHERE p.id = o.product_id),
            0
        ) as total_estimated_time,
        COALESCE(
            (SELECT MAX(p2.terceirizado)
             FROM order_items oi
             JOIN products p2 ON oi.product_id = p2.id
             WHERE oi.order_id = o.id),
            0
        ) as has_terceirizado
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN products p ON o.product_id = p.id -- Legacy support
        LEFT JOIN users u ON o.created_by = u.id
        LEFT JOIN users mu ON o.moved_by = mu.id
        WHERE o.status != 'arquivado'
    `;

    // Simple verification (in production we would use the token user info directly)
    // If role is Vendedor, maybe see only their own? For now, open or filter if requested.

    sql += ` ORDER BY 
        CASE WHEN o.status = 'finalizado' THEN COALESCE(o.moved_at, o.created_at) ELSE NULL END DESC,
        CASE WHEN o.status != 'finalizado' THEN o.is_priority ELSE 0 END DESC,
        CASE WHEN o.status != 'finalizado' THEN o.created_at ELSE NULL END DESC`;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse checklist JSON
        const data = rows.map(r => ({
            ...r,
            checklist: r.checklist ? JSON.parse(r.checklist) : { arte: false, impressao: false, corte: false, embalagem: false }
        }));
        res.json({ data });

        // Auto-archive old finalizado orders (>30) — Firestore-compatible
        db.all(`SELECT id FROM orders WHERE status = 'finalizado' ORDER BY created_at DESC`, [], (err2, allFin) => {
            if (err2 || !allFin || allFin.length <= 30) return;
            const toArchive = allFin.slice(30).map(r => r.id);
            toArchive.forEach(oid => {
                db.run(`UPDATE orders SET status = 'arquivado' WHERE id = ?`, [oid], () => {});
            });
        });
    });
};


exports.updateChecklist = (req, res) => {
    const { checklist } = req.body; // Expecting JSON object
    const sql = "UPDATE orders SET checklist = ? WHERE id = ?";
    db.run(sql, [JSON.stringify(checklist), req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Checklist atualizado' });
    });
};

exports.getOrderItems = (req, res) => {
    const sql = `SELECT oi.*, p.name as product_name, p.stock as current_stock,
                        p.type as product_type,
                        oi.color_variant_id, oi.color_name
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};


exports.createOrder = (req, res) => {
    const { client_id, payment_method, created_by, description, deadline_option, items, total_value, discount_value, is_internal, event_name, payment_code } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum item no pedido.' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let productsSummary = [];
        let readyItems = [];
        let errors = [];
        let completedChecks = 0;

        const processItem = (item, callback) => {
            db.get("SELECT * FROM products WHERE id = ?", [item.product_id], (err, product) => {
                if (err) return callback(err.message);
                if (!product) return callback(`Produto ${item.product_id} não encontrado.`);

                let unitPrice = product.price_3_days || product.price || 0;
                if (deadline_option === '1D') {
                    unitPrice = product.price_1_day || (unitPrice * 1.5) || 0;
                }

                const colorLabel = item.color_name ? ` [${item.color_name}]` : '';
                productsSummary.push(`${product.name}${colorLabel} (${item.quantity}x)`);

                readyItems.push({
                    product_id: product.id,
                    quantity: item.quantity,
                    price: unitPrice,
                    unit_cost: product.unit_cost || 0,
                    name: product.name,
                    color_variant_id: item.color_variant_id || null,
                    color_name: item.color_name || null,
                    is_terceirizado: product.terceirizado || 0
                });
                callback(null);
            });
        };

        const checkDone = () => {
            completedChecks++;
            if (completedChecks === items.length) {
                if (errors.length > 0) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: errors.join(', ') });
                }

                const summaryStr = productsSummary.join(', ');
                const finalTotal = total_value || 0;
                // Loyalty discount overrides any manual discount — 5% on gross total
                let finalDiscount = discount_value || 0;
                let loyaltyDiscount = 0;
                let isPriority = 0;
                const finalInternal = is_internal ? 1 : 0;
                const finalEventName = event_name || '';

                const proceedWithOrder = (loyaltyOverride = false) => {
                    if (loyaltyOverride) {
                        // Trust frontend payload for discount_value and total_value (which is already Net)
                        loyaltyDiscount = finalDiscount; 
                        isPriority = 1;
                    }
                    const totalToPay = finalTotal;

                    const hasTerceirizado = readyItems.some(i => i.is_terceirizado);
                    const deadline_days = hasTerceirizado ? 5 : (deadline_option === '1D' ? 1 : 3);
                    const effective_deadline_option = hasTerceirizado ? '5D' : deadline_option;
                    const deadline_at = calculateDeadline(deadline_days);

                    const estData = calculateProductionTime(readyItems);
                    const aiMinutes = estData.minutes;
                    const aiDescription = estData.breakdown;

                    const sqlOrder = `INSERT INTO orders (client_id, description, total_value, discount_value, loyalty_discount, payment_method, created_by, status, deadline_type, deadline_at, products_summary, is_internal, is_terceirizado, event_name, payment_code, ai_estimated_time, production_notes, is_priority) VALUES (?, ?, ?, ?, ?, ?, ?, 'aguardando_aceite', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                    db.run(sqlOrder, [client_id, description, finalTotal, finalDiscount, loyaltyDiscount, payment_method, created_by, effective_deadline_option, deadline_at, summaryStr, finalInternal, hasTerceirizado ? 1 : 0, finalEventName, payment_code || '', aiMinutes, aiDescription, isPriority], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }

                        const orderId = this.lastID;
                        const sqlItem = `INSERT INTO order_items (order_id, product_id, quantity, price, product_snapshot_name, color_variant_id, color_name) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                        let insertedItems = 0;

                        readyItems.forEach(item => {
                            db.run(sqlItem, [orderId, item.product_id, item.quantity, item.price, item.name, item.color_variant_id, item.color_name], (err) => {
                                insertedItems++;
                                if (insertedItems === readyItems.length) {
                                    // === RESERVAR ESTOQUE ===
                                    const reserveStock = (afterReserve) => {
                                        if (finalInternal) { afterReserve(); return; }
                                        let reserveDone = 0;
                                        readyItems.forEach(ri => {
                                            if (ri.color_variant_id) {
                                                db.run("UPDATE product_color_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?", [ri.quantity, ri.color_variant_id], () => {
                                                    db.get("SELECT product_id FROM product_color_variants WHERE id = ?", [ri.color_variant_id], (err, cv) => {
                                                        if (cv) {
                                                            db.get("SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?", [cv.product_id], (err, row) => {
                                                                db.run("UPDATE products SET stock = ? WHERE id = ?", [(row && row.total) || 0, cv.product_id]);
                                                            });
                                                        }
                                                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'reserva_pedido', ?, ?)", [ri.product_id, -ri.quantity, `Reserva Pedido #${orderId} — Cor: ${ri.color_name || ''}`, null]);
                                                        reserveDone++;
                                                        if (reserveDone === readyItems.length) afterReserve();
                                                    });
                                                });
                                            } else {
                                                db.run("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", [ri.quantity, ri.product_id], () => {
                                                    db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'reserva_pedido', ?, ?)", [ri.product_id, -ri.quantity, `Reserva Pedido #${orderId}`, null]);
                                                    reserveDone++;
                                                    if (reserveDone === readyItems.length) afterReserve();
                                                });
                                            }
                                        });
                                    };

                                    reserveStock(() => {
                                        db.run("UPDATE orders SET stock_reserved = 1 WHERE id = ?", [orderId]);
                                        if (finalInternal) {
                                            let costsDone = 0;
                                            readyItems.forEach(ci => {
                                                const costPrice = parseFloat(ci.unit_cost) || 0;
                                                const costAmount = costPrice * (ci.quantity || 1);
                                                db.run("INSERT INTO material_cost_movements (product_id, order_id, cost_amount, quantity, description) VALUES (?, ?, ?, ?, ?)", [ci.product_id, orderId, costAmount, ci.quantity, `Pedido Interno #${orderId} — ${ci.name}`], () => {
                                                    db.run("UPDATE products SET cost_value = COALESCE(cost_value, 0) + ? WHERE id = ?", [costAmount, ci.product_id]);
                                                    costsDone++;
                                                    if (costsDone === readyItems.length) {
                                                        db.run("COMMIT");
                                                        res.json({ message: 'Pedido interno criado com sucesso', group_id: orderId });
                                                    }
                                                });
                                            });
                                        } else {
                                            if (payment_method === 'Fidelidade') {
                                                db.run("INSERT INTO client_credit_movements (client_id, amount, type, order_id, description, created_by) VALUES (?, ?, 'order_debit', ?, ?, ?)",
                                                    [client_id, totalToPay, orderId, `Pedido #${orderId}`, created_by], () => {
                                                        db.run("UPDATE clients SET credit_balance = credit_balance - ? WHERE id = ?", [totalToPay, client_id], () => {
                                                            db.run("COMMIT");
                                                            res.json({ message: 'Pedido criado com sucesso', group_id: orderId, is_terceirizado: hasTerceirizado });
                                                        });
                                                    }
                                                );
                                            } else {
                                                db.run("COMMIT");
                                                res.json({ message: 'Pedido criado com sucesso', group_id: orderId, is_terceirizado: hasTerceirizado });
                                            }
                                        }
                                    });
                                }
                            });
                        });
                });
                }; // end proceedWithOrder

                if (payment_method === 'Fidelidade' && !finalInternal) {
                    db.get("SELECT credit_balance, credit_limit, loyalty_status FROM clients WHERE id = ?", [client_id], (err, row) => {
                        if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                        if (!row || !row.loyalty_status) { db.run("ROLLBACK"); return res.status(400).json({ error: "Cliente não possui Fidelidade ativada." }); }
                        const loyaltyDisc = Math.round((total_value || 0) * 0.05 * 100) / 100;
                        const totalToPay = (total_value || 0) - loyaltyDisc;
                        if (row.credit_balance - totalToPay < -row.credit_limit) {
                            db.run("ROLLBACK");
                            return res.status(400).json({ error: `Limite de crédito excedido. Saldo atual: R$ ${row.credit_balance.toFixed(2)}, Limite: R$ ${row.credit_limit.toFixed(2)}` });
                        }
                        proceedWithOrder(true); // loyalty client — apply 5% discount + priority
                    });
                } else if (!finalInternal && client_id) {
                    // Check if client is loyalty even on other payment methods
                    db.get("SELECT loyalty_status FROM clients WHERE id = ?", [client_id], (err, row) => {
                        proceedWithOrder(!!(row && row.loyalty_status));
                    });
                } else {
                    proceedWithOrder(false);
                }
            }
        };

        items.forEach(item => processItem(item, (err) => {
            if (err) errors.push(err);
            checkDone();
        }));
    });
};

// Upload attachments for an order
exports.uploadAttachments = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const fileNames = req.files.map(f => f.filename).join(',');
    const orderId = req.params.id;

    db.get("SELECT attachments FROM orders WHERE id = ?", [orderId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const existing = row && row.attachments ? row.attachments : '';
        const updated = existing ? existing + ',' + fileNames : fileNames;

        db.run("UPDATE orders SET attachments = ? WHERE id = ?", [updated, orderId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Arquivos anexados', files: req.files.map(f => f.filename) });
        });
    });
};

exports.acceptOrder = (req, res) => {
    // Buscar o pedido para validar o prazo original do vendedor
    db.get("SELECT deadline_at, deadline_type FROM orders WHERE id = ?", [req.params.id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

        // Validar se ainda está dentro do prazo
        const now = new Date();
        const deadline = new Date(order.deadline_at);
        if (now > deadline) {
            return res.status(400).json({
                error: 'Prazo expirado! O prazo de entrega definido pelo vendedor já passou.',
                deadline_at: order.deadline_at
            });
        }

        // Aceitar sem recalcular — manter deadline original do vendedor
        db.run("UPDATE orders SET status = 'producao' WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Pedido aceito e em produção', deadline_at: order.deadline_at });
        });
    });
};
exports.markAsPaid = (req, res) => {
    const { payment_method } = req.body;
    if (!payment_method) return res.status(400).json({ error: 'Forma de pagamento não informada.' });

    db.run("UPDATE orders SET payment_method = ? WHERE id = ?", [payment_method, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pagamento atualizado com sucesso' });
    });
};

exports.finalizeOrder = (req, res) => {
    const { items, loss_justification } = req.body;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const updateOrder = "UPDATE orders SET status = 'em_balcao', loss_justification = ?, stock_reserved = 0 WHERE id = ?";
        db.run(updateOrder, [loss_justification || null, req.params.id], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }

            if (!items || items.length === 0) {
                db.run("COMMIT");
                return res.json({ message: 'Pedido enviado para balcão' });
            }

            // Stock was already reserved at order creation.
            // Here we only adjust the DELTA: restore under-usage or deduct extra loss.
            let processed = 0;
            const markDone = () => {
                processed++;
                if (processed === items.length) {
                    db.run("COMMIT");
                    res.json({ message: 'Pedido finalizado e estoque atualizado' });
                }
            };

            items.forEach(item => {
                const used = item.used || item.ordered;
                const delta = used - item.ordered; // positive = extra loss, negative = returned

                if (item.color_variant_id) {
                    // Pulseira: adjust delta on color variant
                    const adjustQty = -delta; // negative delta = return stock
                    if (delta !== 0) {
                        db.run(
                            "UPDATE product_color_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?",
                            [delta, item.color_variant_id],
                            () => {
                                db.get("SELECT product_id FROM product_color_variants WHERE id = ?", [item.color_variant_id], (err, cv) => {
                                    if (cv) {
                                        db.get("SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?", [cv.product_id], (err, row) => {
                                            db.run("UPDATE products SET stock = ? WHERE id = ?", [(row && row.total) || 0, cv.product_id]);
                                        });
                                    }
                                    if (delta > 0) {
                                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'perda', ?, ?)",
                                            [item.product_id, -delta, `Perda Pedido #${req.params.id} — Cor: ${item.color_name || ''}`, null]);
                                    } else {
                                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_sobra', ?, ?)",
                                            [item.product_id, -delta, `Sobra Pedido #${req.params.id} — Cor: ${item.color_name || ''}`, null]);
                                    }
                                    markDone();
                                });
                            }
                        );
                    } else {
                        // Log confirmation
                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'saida_pedido', ?, ?)",
                            [item.product_id, -item.ordered, `Confirmação Pedido #${req.params.id} — Cor: ${item.color_name || ''}`, null]);
                        markDone();
                    }
                } else {
                    // Produto normal: adjust delta
                    if (delta !== 0) {
                        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [delta, item.product_id], () => {
                            if (delta > 0) {
                                db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'perda', ?, ?)",
                                    [item.product_id, -delta, `Perda no Pedido #${req.params.id}: ${loss_justification || 'N/A'}`, null]);
                            } else {
                                db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_sobra', ?, ?)",
                                    [item.product_id, -delta, `Sobra no Pedido #${req.params.id}`, null]);
                            }
                            markDone();
                        });
                    } else {
                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'saida_pedido', ?, ?)",
                            [item.product_id, -item.ordered, `Confirmação Pedido #${req.params.id}`, null]);
                        markDone();
                    }
                }
            });
        });
    });
};

exports.concludeOrder = (req, res) => {
    // Moves to 'finalizado' with photo
    const pickup_photo = req.file ? req.file.filename : null;
    const { carrier, dispatch_amount } = req.body;

    db.run("UPDATE orders SET status = 'finalizado', pickup_photo = ? WHERE id = ?", [pickup_photo, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // If a carrier was selected, record the dispatch cost
        if (carrier && dispatch_amount && parseFloat(dispatch_amount) > 0) {
            const amount = parseFloat(dispatch_amount);
            db.run(
                "INSERT INTO dispatch_costs (order_id, carrier, amount) VALUES (?, ?, ?)",
                [req.params.id, carrier, amount],
                (err2) => {
                    if (err2) console.error('Erro ao salvar custo de despacho:', err2.message);
                }
            );
        }

        res.json({ message: 'Pedido concluído com sucesso' });
    });
};

// Simple JSON conclude (sem upload de foto) — usado pelo front-end como fallback confiável
exports.concludeSimple = (req, res) => {
    const { carrier, dispatch_amount } = req.body || {};
    const orderId = req.params.id;

    db.run("UPDATE orders SET status = 'finalizado' WHERE id = ?", [orderId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });

        if (carrier && dispatch_amount && parseFloat(dispatch_amount) > 0) {
            db.run(
                "INSERT INTO dispatch_costs (order_id, carrier, amount) VALUES (?, ?, ?)",
                [orderId, carrier, parseFloat(dispatch_amount)],
                (err2) => { if (err2) console.error('Erro despacho:', err2.message); }
            );
        }

        console.log(`[CONCLUDE-SIMPLE] Pedido #${orderId} finalizado com sucesso`);
        res.json({ message: 'Pedido finalizado com sucesso', id: orderId });
    });
};

// Dispatch Costs Report — grouped by month for the financial view
exports.getDispatchCosts = (req, res) => {
    const sql = `
        SELECT dc.id, dc.order_id, dc.carrier, dc.amount, dc.created_at,
               dc.launched_to_core,
               c.name as client_name
        FROM dispatch_costs dc
        LEFT JOIN orders o ON dc.order_id = o.id
        LEFT JOIN clients c ON o.client_id = c.id
        ORDER BY dc.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT SUM(amount) as total FROM dispatch_costs", [], (err2, totRow) => {
            res.json({ data: rows, total: (totRow && totRow.total) || 0 });
        });
    });
};

// Delete a dispatch cost entry (admin only)
exports.deleteDispatchCost = (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM dispatch_costs WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
        res.json({ message: 'Custo de despacho apagado com sucesso' });
    });
};

// Update a dispatch cost entry (admin only)
exports.updateDispatchCost = (req, res) => {
    const id = req.params.id;
    const { carrier, amount } = req.body;
    if (!carrier || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Campos inválidos' });
    }
    db.run(
        "UPDATE dispatch_costs SET carrier = ?, amount = ? WHERE id = ?",
        [carrier, parseFloat(amount), id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
            res.json({ message: 'Custo de despacho atualizado com sucesso' });
        }
    );
};

// Toggle launched_to_core on a dispatch cost entry
exports.launchDispatchToCore = (req, res) => {
    const { launched } = req.body;
    db.run(
        "UPDATE dispatch_costs SET launched_to_core = ? WHERE id = ?",
        [launched ? 1 : 0, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Atualizado' });
        }
    );
};



exports.rejectOrder = (req, res) => {
    const { rejection_reason } = req.body;
    const orderId = req.params.id;

    // Restore reserved stock before rejecting
    db.get("SELECT stock_reserved FROM orders WHERE id = ?", [orderId], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });

        const doReject = () => {
            db.run("UPDATE orders SET status = 'rejeitado', rejection_reason = ?, stock_reserved = 0 WHERE id = ?",
                [rejection_reason, orderId], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Pedido rejeitado' });
                });
        };

        if (order && order.stock_reserved) {
            // Restore stock for each order_item
            db.all("SELECT * FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
                if (err || !items || items.length === 0) { doReject(); return; }
                let done = 0;
                const next = () => { done++; if (done === items.length) doReject(); };
                items.forEach(item => {
                    if (item.color_variant_id) {
                        db.run("UPDATE product_color_variants SET quantity = quantity + ? WHERE id = ?",
                            [item.quantity, item.color_variant_id], () => {
                                db.get("SELECT product_id FROM product_color_variants WHERE id = ?", [item.color_variant_id], (err, cv) => {
                                    if (cv) db.get("SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?", [cv.product_id], (err, row) => {
                                        db.run("UPDATE products SET stock = ? WHERE id = ?", [(row && row.total) || 0, cv.product_id]);
                                    });
                                    db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_rejeicao', ?, ?)",
                                        [item.product_id, item.quantity, `Rejeição Pedido #${orderId}`, null]);
                                    next();
                                });
                            });
                    } else {
                        db.run("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id], () => {
                            db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_rejeicao', ?, ?)",
                                [item.product_id, item.quantity, `Rejeição Pedido #${orderId}`, null]);
                            next();
                        });
                    }
                });
            });
        } else {
            doReject();
        }
    });
};

// Comments
exports.addComment = (req, res) => {
    const { user_id, message } = req.body;
    const order_id = req.params.id;
    const sql = "INSERT INTO comments (order_id, user_id, message) VALUES (?, ?, ?)";

    db.run(sql, [order_id, user_id, message], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Comentário adicionado', id: this.lastID });
    });
};

exports.getComments = (req, res) => {
    const sql = `
        SELECT c.*, u.name as user_name 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.order_id = ?
        ORDER BY c.created_at ASC
    `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Financial Report — all finalized orders with client details
exports.getSalesReport = (req, res) => {
    const sqlReal = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value, o.payment_method,
               o.products_summary, o.launched_to_core, o.is_internal, o.event_name,
               c.name as client_name, c.phone as client_phone
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.status IN ('producao', 'em_balcao', 'finalizado', 'arquivado')
        ORDER BY o.created_at DESC
    `;
    const sqlReserved = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value, o.payment_method,
               o.products_summary, o.status, o.event_name,
               c.name as client_name, c.phone as client_phone
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.status = 'aguardando_aceite' AND o.is_internal = 0
        ORDER BY o.created_at DESC
    `;
    db.all(sqlReal, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(sqlReserved, [], (err2, reserved) => {
            const totalReservado = (reserved || []).reduce((s, r) => s + (r.total_value || 0), 0);
            res.json({ data: rows, reserved: reserved || [], total_reservado: totalReservado });
        });
    });
};

// Client Portal — orders filtered by client_id for tracking
exports.getClientOrders = (req, res) => {
    const clientId = req.params.clientId;
    const sql = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value, o.payment_method,
               o.products_summary, o.status, o.deadline_at, o.deadline_type, o.checklist, o.payment_code, o.event_name,
               c.name as client_name, c.cpf as client_cpf, c.address as client_address, c.city as client_city, c.state as client_state, c.zip_code as client_zip_code
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.client_id = ?
        ORDER BY o.created_at DESC
    `;
    db.all(sql, [clientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const data = rows.map(r => ({
            ...r,
            checklist: r.checklist ? JSON.parse(r.checklist) : { arte: false, impressao: false, corte: false, embalagem: false }
        }));
        res.json({ data });
    });
};

// Client Financial — financial report filtered by client_id (read-only)
exports.getClientFinancial = (req, res) => {
    const clientId = req.params.clientId;
    const sql = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value, o.payment_method,
               o.products_summary, o.event_name, o.payment_code
        FROM orders o
        WHERE o.client_id = ? AND o.status IN ('producao', 'em_balcao', 'finalizado', 'arquivado')
        ORDER BY o.created_at DESC
    `;
    db.all(sql, [clientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Create a direct CORE financial entry
exports.createCoreEntry = (req, res) => {
    const { client_name, client_phone, products_summary, total_value, payment_method, created_at } = req.body;

    // First find or create the client
    db.get("SELECT id FROM clients WHERE phone = ?", [client_phone || ''], (err, client) => {
        const insertOrder = (clientId) => {
            const date = created_at || new Date().toISOString();
            const sql = `INSERT INTO orders (client_id, description, total_value, payment_method, status, launched_to_core, products_summary, created_at)
                         VALUES (?, ?, ?, ?, 'finalizado', 1, ?, ?)`;
            db.run(sql, [clientId, 'Entrada CORE', total_value, payment_method || 'CORE', products_summary, date], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Entrada CORE criada com sucesso', id: this.lastID });
            });
        };

        if (client) {
            insertOrder(client.id);
        } else if (client_name) {
            db.run("INSERT INTO clients (name, phone, origin) VALUES (?, ?, 'CORE')", [client_name, client_phone || ''], function (err) {
                if (err) return insertOrder(null);
                insertOrder(this.lastID);
            });
        } else {
            insertOrder(null);
        }
    });
};

exports.launchToCore = (req, res) => {
    const { launched } = req.body;
    db.run("UPDATE orders SET launched_to_core = ? WHERE id = ?", [launched ? 1 : 0, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Atualizado' });
    });
};

// Edit a financial entry
exports.editFinancialEntry = (req, res) => {
    const { client_name, client_phone, products_summary, total_value, payment_method, created_at } = req.body;
    const orderId = req.params.id;

    // Update order
    const sql = `UPDATE orders SET total_value = ?, payment_method = ?, products_summary = ?, created_at = ? WHERE id = ?`;
    db.run(sql, [total_value, payment_method, products_summary, created_at, orderId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Update client info if provided
        db.get("SELECT client_id FROM orders WHERE id = ?", [orderId], (err, order) => {
            if (order && order.client_id) {
                db.run("UPDATE clients SET name = ?, phone = ? WHERE id = ?", [client_name, client_phone || '', order.client_id], () => { });
            }
            res.json({ message: 'Entrada atualizada' });
        });
    });
};

// Update file path for an order
exports.updateFilePath = (req, res) => {
    const { file_path } = req.body;
    db.run("UPDATE orders SET file_path = ? WHERE id = ?", [file_path || '', req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Caminho salvo' });
    });
};

// Open folder in Windows Explorer
exports.openFolder = (req, res) => {
    const { file_path } = req.body;
    if (!file_path) return res.status(400).json({ error: 'Caminho não informado' });

    const { exec } = require('child_process');
    exec(`explorer "${file_path.replace(/\//g, '\\')}"`, (err) => {
        if (err) {
            // Explorer returns exit code 1 even on success sometimes
            console.log('Explorer launched for:', file_path);
        }
        res.json({ message: 'Pasta aberta' });
    });
};

exports.archiveOrder = (req, res) => {
    db.run("UPDATE orders SET status = 'arquivado' WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pedido arquivado' });
    });
};

exports.getArchivedOrders = (req, res) => {
    const sql = `
        SELECT o.*, c.name as client_name, c.phone as client_phone,
               c.cpf as client_cpf, c.address as client_address, c.city as client_city, c.state as client_state, c.zip_code as client_zip_code,
               p.name as product_name, u.name as created_by_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.status = 'arquivado'
        ORDER BY o.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

exports.deleteOrder = (req, res) => {
    const orderId = req.params.id;
    db.serialize(() => {
        db.get("SELECT is_internal, stock_reserved FROM orders WHERE id = ?", [orderId], (err, order) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

            const doDelete = () => {
                db.run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
                db.run("DELETE FROM comments WHERE order_id = ?", [orderId]);
                db.run("DELETE FROM material_cost_movements WHERE order_id = ?", [orderId]);
                db.run("DELETE FROM orders WHERE id = ?", [orderId], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
                    res.json({ message: 'Pedido excluído com sucesso' });
                });
            };

            const afterCostRevert = () => {
                // Restore reserved stock if applicable
                if (order.stock_reserved) {
                    db.all("SELECT * FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
                        if (err || !items || items.length === 0) { doDelete(); return; }
                        let done = 0;
                        const next = () => { done++; if (done === items.length) doDelete(); };
                        items.forEach(item => {
                            if (item.color_variant_id) {
                                db.run("UPDATE product_color_variants SET quantity = quantity + ? WHERE id = ?",
                                    [item.quantity, item.color_variant_id], () => {
                                        db.get("SELECT product_id FROM product_color_variants WHERE id = ?", [item.color_variant_id], (err, cv) => {
                                            if (cv) db.get("SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?", [cv.product_id], (err, row) => {
                                                db.run("UPDATE products SET stock = ? WHERE id = ?", [(row && row.total) || 0, cv.product_id]);
                                            });
                                            db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_exclusao', ?, ?)",
                                                [item.product_id, item.quantity, `Exclusão Pedido #${orderId}`, null]);
                                            next();
                                        });
                                    });
                            } else {
                                db.run("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id], () => {
                                    db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_exclusao', ?, ?)",
                                        [item.product_id, item.quantity, `Exclusão Pedido #${orderId}`, null]);
                                    next();
                                });
                            }
                        });
                    });
                } else {
                    doDelete();
                }
            };

            if (order.is_internal) {
                db.all("SELECT product_id, cost_amount FROM material_cost_movements WHERE order_id = ?", [orderId], (err2, rows) => {
                    if (!err2 && rows && rows.length > 0) {
                        rows.forEach(r => {
                            db.run("UPDATE products SET cost_value = MAX(0, COALESCE(cost_value, 0) - ?) WHERE id = ?", [r.cost_amount, r.product_id]);
                        });
                    }
                    afterCostRevert();
                });
            } else {
                afterCostRevert();
            }
        });
    });
};

// Move order between producao <-> finalizado columns (producao role only)
exports.moveOrderStatus = (req, res) => {
    const { new_status, user_id } = req.body;
    const allowed = ['producao', 'em_balcao', 'finalizado'];
    if (!allowed.includes(new_status)) {
        return res.status(400).json({ error: 'Status inválido para movimentação.' });
    }
    const sql = "UPDATE orders SET status = ?, moved_by = ?, moved_at = CURRENT_TIMESTAMP WHERE id = ?";
    db.run(sql, [new_status, user_id || null, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
        // Return moved_by_name for instant card update
        if (user_id) {
            db.get("SELECT name FROM users WHERE id = ?", [user_id], (err2, row) => {
                res.json({ message: 'Pedido movido com sucesso', moved_by_name: row ? row.name : null });
            });
        } else {
            res.json({ message: 'Pedido movido com sucesso', moved_by_name: null });
        }
    });
};

// Material Costs Report — aggregated costs from internal orders
exports.getMaterialCostsReport = (req, res) => {
    const sql = `
        SELECT mc.id, mc.product_id, mc.order_id, mc.cost_amount, mc.quantity,
               mc.description, mc.created_at,
               p.name as product_name, p.type as product_type
        FROM material_cost_movements mc
        JOIN products p ON mc.product_id = p.id
        ORDER BY mc.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Also get the total accumulated costs
        db.get("SELECT SUM(cost_amount) as total_cost FROM material_cost_movements", [], (err2, totRow) => {
            res.json({
                data: rows,
                total_cost: (totRow && totRow.total_cost) || 0
            });
        });
    });
};

// Product Demand Report — top/bottom products by quantity ordered (monthly, quarterly & annual)
exports.getProductDemand = (req, res) => {
    const now = new Date();
    const year = now.getFullYear();

    const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const buildQuery = (dateFrom, dateTo) => `
        SELECT
            COALESCE(oi.product_snapshot_name, p.name, 'Produto Desconhecido') as product_name,
            SUM(oi.quantity) as total_qty,
            COUNT(DISTINCT o.id) as total_orders
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.status IN ('em_balcao', 'finalizado', 'arquivado')
          AND o.is_internal = 0
          AND DATE(o.created_at) >= '${dateFrom}'
          AND DATE(o.created_at) <= '${dateTo}'
        GROUP BY COALESCE(oi.product_snapshot_name, p.name)
        ORDER BY total_qty DESC
    `;

    const processRows = (rows, limit = 5) => {
        if (!rows || rows.length === 0) return { top: [], bottom: [], total_qty: 0, total_orders: 0 };
        const totalQty = rows.reduce((s, r) => s + (r.total_qty || 0), 0);
        const totalOrders = rows.reduce((s, r) => s + (r.total_orders || 0), 0);
        const top = rows.slice(0, limit);
        const bottom = rows.length > limit ? rows.slice(-limit).reverse() : [];
        const topNames = new Set(top.map(r => r.product_name));
        return {
            top,
            bottom: bottom.filter(r => !topNames.has(r.product_name)),
            total_qty: totalQty,
            total_orders: totalOrders
        };
    };

    // Build all 12 monthly queries and 4 quarterly queries in parallel using callbacks chain
    const monthQueries = [];
    for (let m = 0; m < 12; m++) {
        const from = new Date(year, m, 1).toISOString().slice(0, 10);
        const to   = new Date(year, m + 1, 0, 23, 59, 59).toISOString().slice(0, 10);
        monthQueries.push({ month: m + 1, label: MONTH_NAMES[m], from, to });
    }

    const quarterDefs = [
        { label: 'T1 — Jan / Fev / Mar', months: [1,2,3], from: `${year}-01-01`, to: `${year}-03-31` },
        { label: 'T2 — Abr / Mai / Jun', months: [4,5,6], from: `${year}-04-01`, to: `${year}-06-30` },
        { label: 'T3 — Jul / Ago / Set', months: [7,8,9], from: `${year}-07-01`, to: `${year}-09-30` },
        { label: 'T4 — Out / Nov / Dez', months: [10,11,12], from: `${year}-10-01`, to: `${year}-12-31` }
    ];

    const annualFrom = `${year}-01-01`;
    const annualTo   = `${year}-12-31`;

    // Run all queries: 12 months + 4 quarters + 1 annual = 17 queries
    const allQueries = [
        ...monthQueries.map(mq => ({ key: `m_${mq.month}`, sql: buildQuery(mq.from, mq.to) })),
        ...quarterDefs.map((qd, i) => ({ key: `q_${i}`, sql: buildQuery(qd.from, qd.to) })),
        { key: 'annual', sql: buildQuery(annualFrom, annualTo) }
    ];

    const results = {};
    let done = 0;
    let hasError = false;

    allQueries.forEach(({ key, sql }) => {
        db.all(sql, [], (err, rows) => {
            if (hasError) return;
            if (err) {
                hasError = true;
                return res.status(500).json({ error: err.message });
            }
            results[key] = rows || [];
            done++;
            if (done === allQueries.length) {
                // Build response
                const months = monthQueries.map(mq => ({
                    month: mq.month,
                    label: mq.label,
                    period: `${mq.from} — ${mq.to}`,
                    ...processRows(results[`m_${mq.month}`], 5)
                }));

                const quarters = quarterDefs.map((qd, i) => ({
                    label: qd.label,
                    period: `${qd.from} — ${qd.to}`,
                    ...processRows(results[`q_${i}`], 5)
                }));

                const annualData = processRows(results['annual'], 10);

                res.json({
                    year,
                    months,
                    quarters,
                    annual: {
                        label: String(year),
                        period: `${annualFrom} — ${annualTo}`,
                        ...annualData
                    }
                });
            }
        });
    });
};

// Delete a single material cost movement (admin only)
exports.deleteMaterialCost = (req, res) => {
    const costId = req.params.id;

    // Fetch the entry first to revert the product's cost_value
    db.get("SELECT product_id, cost_amount FROM material_cost_movements WHERE id = ?", [costId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Lançamento não encontrado' });

        // Revert product cost accumulation
        db.run(
            "UPDATE products SET cost_value = MAX(0, COALESCE(cost_value, 0) - ?) WHERE id = ?",
            [row.cost_amount, row.product_id],
            () => {
                // Delete the entry
                db.run("DELETE FROM material_cost_movements WHERE id = ?", [costId], function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ message: 'Lançamento de custo apagado com sucesso' });
                });
            }
        );
    });
};
