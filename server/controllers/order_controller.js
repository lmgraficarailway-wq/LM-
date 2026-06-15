
// Helper para parsear checklist (SQLite=string JSON, Firestore=objeto)
function parseChecklist(v) {
    if (!v) return { arte: false, impressao: false, corte: false, embalagem: false };
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch(e) { return { arte: false, impressao: false, corte: false, embalagem: false }; }
}

const db = require('../database/db');
const { brasiliaDatetime, brasiliaISO } = require('../utils/dateHelper');
const { calculateProductionTime } = require('../utils/production_calculator');
const { uploadFile, isStorageUrl } = require('../utils/firebaseStorage');

const USE_STORAGE = process.env.NODE_ENV === 'production' || process.env.USE_FIREBASE_STORAGE === 'true';

// Helper to calculate deadline (dias úteis) — usa fuso horário de Brasília
const calculateDeadline = (days) => {
    // Obtém a data/hora atual no fuso de Brasília
    const nowBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const date = new Date(nowBrasilia);
    let remainingDays = parseInt(days);

    while (remainingDays > 0) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        // 0 = Domingo, 6 = Sábado
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remainingDays--;
        }
    }
    // Define o horário final do prazo como 23:59:59 do dia calculado (horário de Brasília)
    date.setHours(23, 59, 59, 0);
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

    sql += ` ORDER BY o.created_at DESC`; // Firestore ignora CASE; ordenação real é feita em JS abaixo

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const data = rows.map(r => ({
            ...r,
            checklist: parseChecklist(r.checklist)
        }));

        // ── Ordenação correta do Kanban (igual ao Railway) ────────────────────
        // Finalizados: mais recentemente movidos primeiro
        // Ativos: prioridade → prazo mais próximo → criação mais recente
        data.sort((a, b) => {
            const isFinalA = a.status === 'finalizado';
            const isFinalB = b.status === 'finalizado';

            // finalizado ordena por moved_at DESC
            if (isFinalA && isFinalB) {
                const tA = new Date(a.moved_at || a.created_at || 0).getTime();
                const tB = new Date(b.moved_at || b.created_at || 0).getTime();
                return tB - tA;
            }

            // não-finalizado ordena por: prioridade → deadline → created_at DESC
            if (!isFinalA && !isFinalB) {
                if ((b.is_priority || 0) !== (a.is_priority || 0))
                    return (b.is_priority || 0) - (a.is_priority || 0);
                if (a.deadline && b.deadline) {
                    const dA = new Date(a.deadline).getTime();
                    const dB = new Date(b.deadline).getTime();
                    if (dA !== dB) return dA - dB; // prazo mais próximo primeiro
                }
                const cA = new Date(a.created_at || 0).getTime();
                const cB = new Date(b.created_at || 0).getTime();
                return cB - cA; // mais recente primeiro
            }

            // finalizado vai para o final
            return isFinalA ? 1 : -1;
        });

        res.json({ data });

        // Auto-archive: mantém só os 30 finalizados mais recentes
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
exports.uploadAttachments = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const orderId = req.params.id;

    try {
        let fileRefs;
        if (USE_STORAGE) {
            // Envia para Firebase Storage e guarda as URLs completas
            const urls = await Promise.all(req.files.map(f =>
                uploadFile(f.buffer, f.originalname, f.mimetype, 'attachments')
            ));
            fileRefs = urls.join(',');
        } else {
            // Local: usa filename do disco
            fileRefs = req.files.map(f => f.filename).join(',');
        }

        db.get("SELECT attachments FROM orders WHERE id = ?", [orderId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            const existing = row && row.attachments ? row.attachments : '';
            const updated = existing ? existing + ',' + fileRefs : fileRefs;

            db.run("UPDATE orders SET attachments = ? WHERE id = ?", [updated, orderId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Arquivos anexados', files: fileRefs.split(',') });
            });
        });
    } catch (e) {
        console.error('[Order] Erro ao anexar arquivos:', e.message);
        res.status(500).json({ error: 'Erro no upload: ' + e.message });
    }
};


exports.acceptOrder = (req, res) => {
    // Buscar o pedido — sem bloquear por prazo expirado (produção deve poder aceitar sempre)
    db.get("SELECT deadline_at, deadline_type, status FROM orders WHERE id = ?", [req.params.id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
        if (order.status !== 'aguardando_aceite') {
            return res.status(400).json({ error: 'Pedido não está aguardando aceite.' });
        }

        // Aceitar — manter deadline original do vendedor
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
    const orderId = req.params.id;

    // Atualiza status do pedido para em_balcao
    const updateOrder = "UPDATE orders SET status = 'em_balcao', loss_justification = ?, stock_reserved = 0 WHERE id = ?";
    db.run(updateOrder, [loss_justification || null, orderId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (!items || items.length === 0) {
            // Sem itens (pedido antigo sem order_items no Firestore)
            // Status atualizado — estoque não pode ser rastreado sem os itens
            return res.json({ message: 'Pedido enviado para balcão' });
        }

        // Estoque já foi reservado na criação do pedido.
        // Aqui: ajustamos o DELTA (uso real vs. pedido) e registramos custo de material no financeiro.
        let processed = 0;
        const markDone = () => {
            processed++;
            if (processed === items.length) {
                res.json({ message: 'Pedido finalizado, estoque e financeiro atualizados' });
            }
        };

        items.forEach(item => {
            const used = item.used || item.ordered;
            const delta = used - item.ordered; // positivo = perda extra, negativo = sobra devolvida

            // ── 1. Registrar custo de material no financeiro ──────────────────
            db.get("SELECT unit_cost, name FROM products WHERE id = ?", [item.product_id], (err2, product) => {
                if (!err2 && product) {
                    const unitCost = parseFloat(product.unit_cost) || 0;
                    const costAmount = unitCost * used;
                    if (costAmount > 0) {
                        db.run(
                            "INSERT INTO material_cost_movements (product_id, order_id, cost_amount, quantity, description) VALUES (?, ?, ?, ?, ?)",
                            [item.product_id, orderId, costAmount, used,
                             `Pedido #${orderId} — Balcão${item.color_name ? ` (${item.color_name})` : ''}`]
                        );
                    }
                }

                // ── 2. Ajustar estoque (delta apenas — reserva já feita na criação) ───
                if (item.color_variant_id) {
                    // Pulseira com variante de cor
                    if (delta !== 0) {
                        db.run(
                            "UPDATE product_color_variants SET quantity = MAX(0, quantity - ?) WHERE id = ?",
                            [delta, item.color_variant_id],
                            () => {
                                db.get("SELECT product_id FROM product_color_variants WHERE id = ?", [item.color_variant_id], (err3, cv) => {
                                    if (cv) {
                                        db.get("SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?", [cv.product_id], (err4, row) => {
                                            db.run("UPDATE products SET stock = ? WHERE id = ?", [(row && row.total) || 0, cv.product_id]);
                                        });
                                    }
                                    if (delta > 0) {
                                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'perda', ?, ?)",
                                            [item.product_id, -delta, `Perda Pedido #${orderId} — Cor: ${item.color_name || ''}`, null]);
                                    } else {
                                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_sobra', ?, ?)",
                                            [item.product_id, -delta, `Sobra Pedido #${orderId} — Cor: ${item.color_name || ''}`, null]);
                                    }
                                    markDone();
                                });
                            }
                        );
                    } else {
                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'saida_pedido', ?, ?)",
                            [item.product_id, -item.ordered, `Confirmação Balcão #${orderId} — Cor: ${item.color_name || ''}`, null]);
                        markDone();
                    }
                } else {
                    // Produto normal
                    if (delta !== 0) {
                        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [delta, item.product_id], () => {
                            if (delta > 0) {
                                db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'perda', ?, ?)",
                                    [item.product_id, -delta, `Perda Pedido #${orderId}: ${loss_justification || 'N/A'}`, null]);
                            } else {
                                db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'retorno_sobra', ?, ?)",
                                    [item.product_id, -delta, `Sobra Pedido #${orderId}`, null]);
                            }
                            markDone();
                        });
                    } else {
                        db.run("INSERT INTO stock_movements (product_id, quantity_change, type, reason, user_id) VALUES (?, ?, 'saida_pedido', ?, ?)",
                            [item.product_id, -item.ordered, `Confirmação Balcão #${orderId}`, null]);
                        markDone();
                    }
                }
            });
        });
    });
};

exports.concludeOrder = async (req, res) => {
    // Moves to 'finalizado' with optional photo
    const { carrier, dispatch_amount } = req.body;
    let pickup_photo = null;

    try {
        if (req.file) {
            if (USE_STORAGE) {
                pickup_photo = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, 'pickup_photos');
            } else {
                pickup_photo = req.file.filename;
            }
        }
    } catch (e) {
        console.error('[Order] Erro ao salvar foto de conclusão:', e.message);
        // Não bloqueia a conclusão do pedido
    }

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
// Cache: evita bater no Firestore a cada clique no Financeiro
let _salesReportCache = null;
let _salesReportCacheTs = 0;
const SALES_CACHE_TTL = 30 * 1000; // 30 segundos

exports.getSalesReport = (req, res) => {
    const now = Date.now();
    if (_salesReportCache && (now - _salesReportCacheTs) < SALES_CACHE_TTL) {
        return res.json(_salesReportCache);
    }

    const sqlReal = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value, o.payment_method,
               o.products_summary, o.launched_to_core, o.launched_to_warlen, o.launched_to_emanuel,
               o.is_internal, o.event_name,
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

    // Executa as duas queries em PARALELO (não em sequência)
    Promise.all([
        new Promise((resolve, reject) =>
            db.all(sqlReal, [], (err, rows) => err ? reject(err) : resolve(rows || []))),
        new Promise((resolve) =>
            db.all(sqlReserved, [], (err, rows) => resolve(rows || [])))
    ]).then(([rows, reserved]) => {
        const totalReservado = reserved.reduce((s, r) => s + (r.total_value || 0), 0);
        const result = { data: rows, reserved, total_reservado: totalReservado };
        _salesReportCache = result;
        _salesReportCacheTs = Date.now();
        res.json(result);
    }).catch(err => res.status(500).json({ error: err.message }));
};

// Invalida o cache do relatório financeiro (chamar após edições)
exports.invalidateSalesCache = () => { _salesReportCache = null; };


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
            checklist: parseChecklist(r.checklist)
        }));
        res.json({ data });
    });
};

// Client Financial — financial report filtered strictly by client_id (read-only)
exports.getClientFinancial = (req, res) => {
    const clientId = req.params.clientId;
    const sql = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value,
               o.payment_method, o.products_summary, o.event_name, o.payment_code,
               o.status, c.name AS client_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.client_id = ? AND o.status IN ('producao', 'em_balcao', 'finalizado', 'arquivado')
        ORDER BY o.created_at DESC
    `;
    db.all(sql, [clientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// Arena Financial — report for Arena client (filtered strictly by client_id = 7)
// Shows ALL relevant statuses so every Arena order appears as soon as it's created
exports.getArenaFinancial = (req, res) => {
    const ARENA_CLIENT_ID = 7;
    const sql = `
        SELECT o.id, o.created_at, o.description, o.total_value, o.discount_value,
               o.payment_method, o.products_summary, o.event_name, o.payment_code,
               o.status, o.launched_to_core,
               c.name AS client_name
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.client_id = ?
        AND o.status NOT IN ('rascunho', 'rejeitado', 'cancelado')
        ORDER BY o.created_at DESC
    `;
    db.all(sql, [ARENA_CLIENT_ID], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows, total: rows.length });
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

exports.launchToWarlen = (req, res) => {
    const { launched } = req.body;
    db.run("UPDATE orders SET launched_to_warlen = ? WHERE id = ?", [launched ? 1 : 0, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        _salesReportCache = null;
        res.json({ message: 'Atualizado (Warlen)' });
    });
};

exports.launchToEmanuel = (req, res) => {
    const { launched } = req.body;
    db.run("UPDATE orders SET launched_to_emanuel = ? WHERE id = ?", [launched ? 1 : 0, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        _salesReportCache = null;
        res.json({ message: 'Atualizado (Emanuel)' });
    });
};

// Edit financial fields of an order (product, value, discount, payment, description)
exports.financialEdit = (req, res) => {
    const id = req.params.id;
    const { products_summary, total_value, discount_value, payment_method, description } = req.body;

    const fields = [];
    const params = [];

    if (products_summary !== undefined) { fields.push('products_summary = ?'); params.push(products_summary); }
    if (total_value      !== undefined) { fields.push('total_value = ?');      params.push(parseFloat(total_value) || 0); }
    if (discount_value   !== undefined) { fields.push('discount_value = ?');   params.push(parseFloat(discount_value) || 0); }
    if (payment_method   !== undefined) { fields.push('payment_method = ?');   params.push(payment_method); }
    if (description      !== undefined) { fields.push('description = ?');      params.push(description); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    params.push(id);
    db.run(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Invalida cache para que o próximo carregamento reflita as mudanças
        _salesReportCache = null;
        res.json({ message: 'Pedido atualizado com sucesso', changes: this.changes });
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

    db.all("SELECT id, status, is_internal, created_at FROM orders WHERE is_internal = 0", [], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT order_id, product_id, quantity, product_snapshot_name FROM order_items", [], (err, orderItems) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.all("SELECT id, name FROM products", [], (err, products) => {
                if (err) return res.status(500).json({ error: err.message });

                const productsMap = {};
                products.forEach(p => productsMap[p.id] = p.name);

                // Map orders by ID
                const ordersMap = {};
                orders.forEach(o => {
                    if (['em_balcao', 'finalizado', 'arquivado'].includes(o.status)) {
                        ordersMap[o.id] = new Date(o.created_at);
                    }
                });

                // Prepare buckets
                const monthBuckets = Array.from({length: 12}, () => ({}));
                const quarterBuckets = Array.from({length: 4}, () => ({}));
                const annualBucket = {};

                const addToBucket = (bucket, productName, qty, orderId) => {
                    if (!bucket[productName]) bucket[productName] = { qty: 0, orderIds: new Set() };
                    bucket[productName].qty += qty;
                    bucket[productName].orderIds.add(orderId);
                };

                orderItems.forEach(item => {
                    const orderDate = ordersMap[item.order_id];
                    if (!orderDate) return;
                    if (orderDate.getFullYear() !== year) return;

                    const productName = item.product_snapshot_name || productsMap[item.product_id] || 'Produto Desconhecido';
                    const qty = parseFloat(item.quantity) || 0;
                    const month = orderDate.getMonth();
                    const quarter = Math.floor(month / 3);

                    addToBucket(monthBuckets[month], productName, qty, item.order_id);
                    addToBucket(quarterBuckets[quarter], productName, qty, item.order_id);
                    addToBucket(annualBucket, productName, qty, item.order_id);
                });

                const processBucket = (bucket, limit = 5) => {
                    const rows = Object.entries(bucket).map(([name, data]) => ({
                        product_name: name,
                        total_qty: data.qty,
                        total_orders: data.orderIds.size
                    }));
                    rows.sort((a, b) => b.total_qty - a.total_qty);

                    const totalQty = rows.reduce((s, r) => s + r.total_qty, 0);
                    const totalOrders = rows.reduce((s, r) => s + r.total_orders, 0);
                    const top = rows.slice(0, limit);
                    const bottom = rows.length > limit ? rows.slice(-limit).reverse() : [];
                    const topNames = new Set(top.map(r => r.product_name));

                    return {
                        top,
                        bottom: bottom.filter(r => !topNames.has(r.product_name)),
                        all: rows,  // ALL sold products sorted by qty desc
                        total_qty: totalQty,
                        total_orders: totalOrders
                    };
                };

                const months = monthBuckets.map((bucket, i) => {
                    const mFrom = new Date(year, i, 1).toISOString().slice(0, 10);
                    const mTo = new Date(year, i + 1, 0).toISOString().slice(0, 10);
                    return {
                        month: i + 1,
                        label: MONTH_NAMES[i],
                        period: `${mFrom} — ${mTo}`,
                        ...processBucket(bucket, 5)
                    };
                });

                const quarters = quarterBuckets.map((bucket, i) => {
                    const qFrom = new Date(year, i * 3, 1).toISOString().slice(0, 10);
                    const qTo = new Date(year, (i * 3) + 3, 0).toISOString().slice(0, 10);
                    const labels = [
                        'T1 — Jan / Fev / Mar',
                        'T2 — Abr / Mai / Jun',
                        'T3 — Jul / Ago / Set',
                        'T4 — Out / Nov / Dez'
                    ];
                    return {
                        label: labels[i],
                        period: `${qFrom} — ${qTo}`,
                        ...processBucket(bucket, 5)
                    };
                });

                res.json({
                    year,
                    months,
                    quarters,
                    annual: {
                        label: String(year),
                        period: `${year}-01-01 — ${year}-12-31`,
                        ...processBucket(annualBucket, 10)
                    }
                });
            });
        });
    });
};

// Product Summary — all registered products with annual qty sold, unit price, total value
exports.getProductSummary = (req, res) => {
    const now = new Date();
    const year = now.getFullYear();

    // Get all products with price info
    db.all("SELECT id, name, price, price_1_day, price_3_days FROM products ORDER BY name ASC", [], (err, products) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get all orders (non-internal, relevant statuses) for this year
        db.all(
            "SELECT id, created_at FROM orders WHERE is_internal = 0 AND status IN ('em_balcao','finalizado','arquivado')",
            [], (err, orders) => {
                if (err) return res.status(500).json({ error: err.message });

                // Filter to current year
                const validOrderIds = new Set();
                orders.forEach(o => {
                    const d = new Date(o.created_at);
                    if (d.getFullYear() === year) validOrderIds.add(o.id);
                });

                // Get all order items
                db.all(
                    "SELECT order_id, product_id, quantity, product_snapshot_name, price FROM order_items",
                    [], (err, items) => {
                        if (err) return res.status(500).json({ error: err.message });

                        // Build sold map: product_id -> { qty, revenue }
                        const soldMap = {};
                        items.forEach(item => {
                            if (!validOrderIds.has(item.order_id)) return;
                            const pid = item.product_id;
                            if (!soldMap[pid]) soldMap[pid] = { qty: 0, revenue: 0 };
                            const qty = parseFloat(item.quantity) || 0;
                            const price = parseFloat(item.price) || 0;
                            soldMap[pid].qty += qty;
                            soldMap[pid].revenue += qty * price;
                        });

                        const data = products.map(p => {
                            const sold = soldMap[p.id] || { qty: 0, revenue: 0 };
                            const unitPrice = parseFloat(p.price_3_days || p.price || 0);
                            const totalValue = sold.revenue > 0 ? sold.revenue : sold.qty * unitPrice;
                            return {
                                id: p.id,
                                name: p.name,
                                unit_price: unitPrice,
                                total_qty: sold.qty,
                                total_value: parseFloat(totalValue.toFixed(2))
                            };
                        });

                        const grandTotal = data.reduce((s, r) => s + r.total_value, 0);
                        const grandQty = data.reduce((s, r) => s + r.total_qty, 0);

                        res.json({ year, data, grand_total: parseFloat(grandTotal.toFixed(2)), grand_qty: grandQty });
                    }
                );
            }
        );
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
