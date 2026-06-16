const db = require('../database/db');
const { getMasterProductId } = require('../utils/sharedStockMap');

// Helper: acessa o Firestore diretamente (bypassa emulação SQL)
// Retorna null em modo SQLite (local)
async function getFirestoreDb() {
    if (!db._getNextId) return null; // modo SQLite: não tem _getNextId
    // aguarda init assíncrono do Firestore se necessário
    if (db._db) return db._db;
    // Fallback: espera até 3s pelo _db ficar disponível
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        if (db._db) return db._db;
    }
    return db._db || null;
}

// Normaliza product_id para número (Firestore é strictly-typed)
function numId(id) {
    const n = parseInt(id);
    return isNaN(n) ? id : n;
}

exports.getAllProducts = (req, res) => {
    const sql = `SELECT * FROM products ORDER BY name ASC`;
    db.all(sql, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Buscar color_variants para todos os produtos em paralelo
        const allColorRows = await new Promise((resolve) => {
            db.all("SELECT * FROM product_color_variants ORDER BY color ASC", [], (e, r) => resolve(r || []));
        });

        // Agrupar por product_id
        const colorsByProduct = {};
        allColorRows.forEach(cv => {
            const pid = String(cv.product_id);
            if (!colorsByProduct[pid]) colorsByProduct[pid] = [];
            colorsByProduct[pid].push({ id: cv.id, color: cv.color, quantity: cv.quantity });
        });

        const data = rows.map(r => {
            const masterId = String(getMasterProductId(r.id));
            const masterRow = rows.find(x => String(x.id) === masterId) || r;
            return {
                ...r,
                stock: masterRow.stock,
                color_variants: colorsByProduct[masterId] || []
            };
        });
        res.json({ data });
    });
};


exports.createProduct = (req, res) => {
    const { name, type, production_time, price, stock, price_1_day, price_3_days, terceirizado, unit_cost } = req.body;

    // Check if type exists to inherit stock
    const getStockSql = "SELECT stock FROM products WHERE type = ? AND type != '' LIMIT 1";
    db.get(getStockSql, [type], (err, row) => {
        const finalStock = (row && row.stock !== undefined) ? row.stock : (stock || 0);

        const safePrice = price !== undefined ? price : (price_3_days || 0);

        const sql = "INSERT INTO products (name, type, production_time, price, stock, price_1_day, price_3_days, terceirizado, unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [name, type || '', production_time || '', safePrice, finalStock, price_1_day || 0, price_3_days || 0, terceirizado ? 1 : 0, unit_cost || 0];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Produto criado com sucesso', id: this.lastID });
        });
    });
};

exports.updateProduct = (req, res) => {
    let { name, type, production_time, price, price_1_day, price_3_days, terceirizado, unit_cost } = req.body;
    const productId = req.params.id;

    // Normalize type
    const normalizedType = type ? type.trim() : '';

    const safePrice = price !== undefined ? price : (price_3_days || 0);

    // IMPORTANT: We do NOT update 'stock' here.
    // Stock is managed exclusively by the Stock tab (/api/stock/adjust and /api/stock/set/:id).
    // This prevents accidental stock resets when editing product details.
    const sql = "UPDATE products SET name = ?, type = ?, production_time = ?, price = ?, price_1_day = ?, price_3_days = ?, terceirizado = ?, unit_cost = ? WHERE id = ?";
    const params = [name, normalizedType, production_time || '', safePrice, price_1_day || 0, price_3_days || 0, terceirizado ? 1 : 0, unit_cost || 0, productId];

    console.log(`[Product] Updating Prod ${productId}. Type: '${normalizedType}'. Stock NOT modified.`);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto atualizado com sucesso', changes: this.changes });
    });
};

exports.deleteProduct = async (req, res) => {
    const id = req.params.id;
    // Delete color variants first
    const fdb = await getFirestoreDb();
    if (fdb) {
        try {
            // Delete all color variants for this product from Firestore directly
            const snap = await fdb.collection('product_color_variants')
                .where('product_id', '==', numId(id)).get();
            const batch = fdb.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            if (!snap.empty) await batch.commit();
        } catch (e) { console.error('[deleteProduct] variants cleanup error:', e.message); }
    } else {
        db.run("DELETE FROM product_color_variants WHERE product_id = ?", [id]);
    }
    db.run("DELETE FROM products WHERE id = ?", id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Produto removido', changes: this.changes });
    });
};

// ── Color Variants ─────────────────────────────────────────────────────────
exports.getColorVariants = async (req, res) => {
    let productId = req.params.id;
    productId = getMasterProductId(productId);
    const fdb = await getFirestoreDb();

    if (fdb) {
        // Usa Firestore diretamente — busca por número E string para garantir compatibilidade
        try {
            let snap = await fdb.collection('product_color_variants')
                .where('product_id', '==', numId(productId)).get();
            // Fallback: busca como string caso dados antigos usem string
            if (snap.empty) {
                snap = await fdb.collection('product_color_variants')
                    .where('product_id', '==', String(productId)).get();
            }
            const rows = snap.docs
                .map(d => ({ id: parseInt(d.id), ...d.data() }))
                .sort((a, b) => String(a.color).localeCompare(String(b.color)));
            return res.json({ data: rows });
        } catch (e) {
            console.error('[getColorVariants] Firestore error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }

    // Modo SQLite (local)
    db.all("SELECT * FROM product_color_variants WHERE product_id = ? ORDER BY color ASC",
        [productId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ data: rows });
        });
};

// Replace all color variants for a product (send full array)
exports.saveColorVariants = async (req, res) => {
    let productId = req.params.id;
    productId = getMasterProductId(productId);
    const { variants } = req.body; // [{ color, quantity }]
    if (!Array.isArray(variants)) return res.status(400).json({ error: 'variants must be an array' });

    const totalQty = variants.reduce((acc, v) => {
        const qty = parseInt(v.quantity);
        return acc + (isNaN(qty) ? 0 : qty);
    }, 0);

    const fdb = await getFirestoreDb();

    if (fdb) {
        // ── Caminho Firestore: operações diretas, sem emulação SQL ──
        try {
            const pidNum = numId(productId);

            // Step 1: Buscar e deletar TODAS as variantes existentes (por número E string)
            const [snapNum, snapStr] = await Promise.all([
                fdb.collection('product_color_variants').where('product_id', '==', pidNum).get(),
                fdb.collection('product_color_variants').where('product_id', '==', String(productId)).get()
            ]);

            // Combinar IDs únicos para deletar
            const toDelete = new Map();
            [...snapNum.docs, ...snapStr.docs].forEach(d => toDelete.set(d.id, d.ref));

            if (toDelete.size > 0) {
                const batch = fdb.batch();
                toDelete.forEach(ref => batch.delete(ref));
                await batch.commit();
                console.log(`[saveColorVariants] Deletadas ${toDelete.size} variantes antigas do produto ${productId}`);
            }

            if (variants.length === 0) {
                // Zera o stock do produto
                await fdb.collection('products').doc(String(pidNum)).update({ stock: 0 });
                return res.json({ message: 'Cores salvas', data: [], total_stock: 0 });
            }

            // Step 2: Buscar próximo ID para cada variante
            const { _getNextId } = require('../database/firestore');
            const insertBatch = fdb.batch();
            for (const v of variants) {
                const qty = parseInt(v.quantity);
                const safeQty = isNaN(qty) ? 0 : qty;
                const newId = await _getNextId('product_color_variants');
                const ref = fdb.collection('product_color_variants').doc(String(newId));
                insertBatch.set(ref, {
                    product_id: pidNum,   // ← sempre número
                    color: v.color || '',
                    quantity: safeQty,
                    created_at: new Date().toISOString()
                });
            }
            await insertBatch.commit();
            console.log(`[saveColorVariants] Inseridas ${variants.length} variantes para produto ${productId}`);

            // Step 3: Atualizar stock do produto
            await fdb.collection('products').doc(String(pidNum)).update({ stock: totalQty });

            return res.json({ message: 'Cores salvas', count: variants.length, total_stock: totalQty });

        } catch (err) {
            console.error('[saveColorVariants] Firestore error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    // ── Caminho SQLite (local) ──
    try {
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM product_color_variants WHERE product_id = ?", [productId], function(err) {
                if (err) reject(err); else resolve();
            });
        });

        if (variants.length === 0) {
            await new Promise((resolve) => {
                db.run("UPDATE products SET stock = 0 WHERE id = ?", [productId], () => resolve());
            });
            return res.json({ message: 'Cores salvas', data: [], total_stock: 0 });
        }

        const stmt = db.prepare("INSERT INTO product_color_variants (product_id, color, quantity) VALUES (?, ?, ?)");
        for (const v of variants) {
            const qty = parseInt(v.quantity);
            const safeQty = isNaN(qty) ? 0 : qty;
            await new Promise((resolve, reject) => {
                stmt.run([productId, v.color || '', safeQty], function(err) {
                    if (err) reject(err); else resolve();
                });
            });
        }
        stmt.finalize();

        await new Promise((resolve) => {
            db.run("UPDATE products SET stock = ? WHERE id = ?", [totalQty, productId], () => resolve());
        });

        return res.json({ message: 'Cores salvas', count: variants.length, total_stock: totalQty });

    } catch (err) {
        console.error('[saveColorVariants] SQLite error:', err.message);
        return res.status(500).json({ error: err.message });
    }
};

// Debit usage from a specific color variant
exports.debitColorVariant = (req, res) => {
    const variantId = req.params.id;
    const used = parseInt(req.body.used) || 0;
    if (used <= 0) return res.status(400).json({ error: 'Quantidade deve ser > 0' });

    db.get("SELECT * FROM product_color_variants WHERE id = ?", [variantId], (err, variant) => {
        if (err || !variant) return res.status(404).json({ error: 'Variante não encontrada' });

        const newQty = Math.max(0, (variant.quantity || 0) - used);
        db.run("UPDATE product_color_variants SET quantity = ? WHERE id = ?", [newQty, variantId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Recalculate product stock = sum of all color quantities
            db.get(
                "SELECT SUM(quantity) as total FROM product_color_variants WHERE product_id = ?",
                [variant.product_id],
                (err, row) => {
                    const total = (row && row.total) || 0;
                    db.run("UPDATE products SET stock = ? WHERE id = ?", [total, variant.product_id], () => {
                        res.json({ message: 'Debitado', new_quantity: newQty, total_stock: total });
                    });
                }
            );
        });
    });
};

// ── Cost History ────────────────────────────────────────────────────────────
exports.getCostHistory = (req, res) => {
    const productId = req.params.id;
    db.all(
        `SELECT mc.*, p.name as product_name
         FROM material_cost_movements mc
         JOIN products p ON mc.product_id = p.id
         WHERE mc.product_id = ?
         ORDER BY mc.created_at DESC`,
        [productId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Also get the accumulated cost_value
            db.get("SELECT cost_value FROM products WHERE id = ?", [productId], (err2, prod) => {
                res.json({
                    data: rows,
                    total_cost: (prod && prod.cost_value) || 0
                });
            });
        }
    );
};

// ── Product Kits ────────────────────────────────────────────────────────────
exports.getKits = (req, res) => {
    const productId = req.params.id;
    db.all("SELECT * FROM product_kit_templates WHERE product_id = ?", [productId], (err, templates) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!templates || templates.length === 0) return res.json({ data: [] });
        
        const templateIds = templates.map(t => t.id);
        const placeholders = templateIds.map(() => '?').join(',');
        
        db.all(`SELECT ki.*, p.name as product_name, p.price as current_product_price, p.type as product_type 
                FROM product_kit_items ki 
                JOIN products p ON ki.child_product_id = p.id 
                WHERE ki.template_id IN (${placeholders})`, templateIds, (err2, items) => {
            
            if (err2) return res.status(500).json({ error: err2.message });
            
            const result = templates.map(t => {
                return {
                    ...t,
                    items: items.filter(i => i.template_id === t.id)
                };
            });
            
            res.json({ data: result });
        });
    });
};

exports.saveKits = (req, res) => {
    const productId = req.params.id;
    const { templates } = req.body; 
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        db.all("SELECT id FROM product_kit_templates WHERE product_id = ?", [productId], (err, existing) => {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
            
            const existingIds = existing.map(e => e.id);
            if (existingIds.length > 0) {
                const placeholders = existingIds.map(() => '?').join(',');
                db.run(`DELETE FROM product_kit_items WHERE template_id IN (${placeholders})`, existingIds);
            }
            
            db.run("DELETE FROM product_kit_templates WHERE product_id = ?", [productId], (err) => {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                
                if (!templates || templates.length === 0) {
                    db.run("COMMIT");
                    return res.json({ message: 'Kits atualizados' });
                }
                
                const insertTemplate = db.prepare("INSERT INTO product_kit_templates (product_id, name, base_price) VALUES (?, ?, ?)");
                const insertItem = db.prepare("INSERT INTO product_kit_items (template_id, child_product_id, quantity) VALUES (?, ?, ?)");
                
                let templatesDone = 0;
                let errorOccurred = false;
                
                templates.forEach(t => {
                    insertTemplate.run([productId, t.name || '', parseFloat(t.base_price) || 0], function(err) {
                        if (errorOccurred) return;
                        if (err) { errorOccurred = true; db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }
                        
                        const templateId = this.lastID;
                        const items = t.items || [];
                        let itemsDone = 0;
                        
                        if (items.length === 0) {
                            templatesDone++;
                            if (templatesDone === templates.length) {
                                db.run("COMMIT");
                                insertTemplate.finalize();
                                insertItem.finalize();
                                res.json({ message: 'Kits atualizados com sucesso' });
                            }
                        } else {
                            items.forEach(item => {
                                insertItem.run([templateId, item.child_product_id, parseInt(item.quantity) || 1], (errItem) => {
                                    if (errorOccurred) return;
                                    if (errItem) { errorOccurred = true; db.run("ROLLBACK"); return res.status(500).json({ error: errItem.message }); }
                                    
                                    itemsDone++;
                                    if (itemsDone === items.length) {
                                        templatesDone++;
                                        if (templatesDone === templates.length) {
                                            db.run("COMMIT");
                                            insertTemplate.finalize();
                                            insertItem.finalize();
                                            res.json({ message: 'Kits atualizados com sucesso' });
                                        }
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    });
};
