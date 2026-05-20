/**
 * import_route.js — Endpoint temporário para importar dados do SQLite local
 * Protegido por IMPORT_SECRET. Remover após a migração.
 */
const express = require('express');
const router = express.Router();
const db = require('../database/db');

const IMPORT_SECRET = 'lmpasso-migrate-2026';

// Ordem de inserção respeitando foreign keys
const TABLE_ORDER = [
    'clients',
    'suppliers',
    'products',
    'product_color_variants',
    'orders',
    'order_items',
    'comments',
    'stock_movements',
    'purchase_requests',
    'material_cost_movements',
];

function insertRows(table, rows) {
    return new Promise((resolve) => {
        if (!rows || rows.length === 0) return resolve({ table, imported: 0, skipped: 0 });

        let imported = 0;
        let skipped = 0;
        let done = 0;

        rows.forEach(row => {
            const cols = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const vals = Object.values(row);

            // INSERT OR IGNORE para não duplicar se já existir
            db.run(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, vals, function (err) {
                if (err) {
                    skipped++;
                } else {
                    if (this.changes > 0) imported++; else skipped++;
                }
                done++;
                if (done === rows.length) resolve({ table, imported, skipped });
            });
        });
    });
}

// ── Export endpoint (pull data back to local) ────────────────────────────────
const EXPORT_TABLES = [
    'clients',
    'users',
    'suppliers',
    'products',
    'product_color_variants',
    'orders',
    'order_items',
    'comments',
    'stock_movements',
    'purchase_requests',
    'material_cost_movements',
    'catalogue_items',
    'dispatch_costs',
];

router.get('/export-data', async (req, res) => {
    const secret = req.query.secret || req.headers['x-export-secret'];
    if (secret !== IMPORT_SECRET) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = {};
    try {
        for (const table of EXPORT_TABLES) {
            result[table] = await new Promise((resolve) => {
                db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                    if (err) {
                        console.warn(`Export: tabela ${table} não encontrada — ignorando`);
                        resolve([]);
                    } else {
                        resolve(rows);
                    }
                });
            });
            console.log(`Export: ${table} — ${result[table].length} registros`);
        }
        res.json({ success: true, data: result });
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/import-data', async (req, res) => {
    const { secret, data } = req.body;

    if (secret !== IMPORT_SECRET) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        const results = [];
        for (const table of TABLE_ORDER) {
            if (data[table] && data[table].length > 0) {
                const result = await insertRows(table, data[table]);
                results.push(result);
                console.log(`Import: ${table} — ${result.imported} importados, ${result.skipped} ignorados`);
            }
        }
        res.json({ success: true, results });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
