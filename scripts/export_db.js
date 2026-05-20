/**
 * export_db.js  — Exporta todas as tabelas do SQLite local para db_export.json
 * Rodar em: C:\Users\T.i\.gemini\antigravity\scratch\lm-passo
 * Comando:   node scripts/export_db.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Tabelas a exportar (excluímos users por segurança — serão recriados no boot)
const TABLES = [
    'clients',
    'products',
    'product_color_variants',
    'orders',
    'order_items',
    'comments',
    'stock_movements',
    'suppliers',
    'purchase_requests',
    'material_cost_movements',
];

async function exportAll() {
    const result = {};
    for (const table of TABLES) {
        result[table] = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                if (err) {
                    console.warn(`Tabela ${table} não encontrada, ignorando...`);
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
        console.log(`✓ ${table}: ${result[table].length} registros`);
    }

    const outPath = path.resolve(process.cwd(), 'scripts', 'db_export.json');
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`\n✅ Exportado para: ${outPath}`);
    db.close();
}

exportAll().catch(console.error);
