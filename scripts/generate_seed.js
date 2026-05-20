/**
 * generate_seed.js
 * Extrai dados essenciais do SQLite local e gera um seed SQL
 * para popular o banco do Railway na primeira execução.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.resolve(__dirname, '../database.sqlite'));

// Tabelas essenciais para o sistema funcionar
const TABLES = ['users', 'clients', 'products', 'suppliers', 'orders', 'order_items'];
const MAX_ROWS = 500;

function escapeVal(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return v;
    // Escape single quotes
    return "'" + String(v).replace(/'/g, "''") + "'";
}

async function tableToSQL(table) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table} LIMIT ${MAX_ROWS}`, [], (err, rows) => {
            if (err) { resolve(''); return; }
            if (!rows || rows.length === 0) { resolve(''); return; }
            
            const lines = rows.map(row => {
                const cols = Object.keys(row).join(', ');
                const vals = Object.values(row).map(escapeVal).join(', ');
                return `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${vals});`;
            });
            
            resolve(`-- ${table} (${rows.length} registros)\n` + lines.join('\n') + '\n');
        });
    });
}

async function main() {
    let output = '-- Seed data gerado em ' + new Date().toISOString() + '\n';
    output += '-- Execute este arquivo para popular o banco do Railway na primeira vez\n\n';
    
    for (const table of TABLES) {
        const sql = await tableToSQL(table);
        output += sql + '\n';
    }
    
    const outPath = path.resolve(__dirname, 'seed_data.sql');
    fs.writeFileSync(outPath, output, 'utf8');
    
    const lineCount = output.split('\n').length;
    console.log(`✅ Seed gerado: ${lineCount} linhas → scripts/seed_data.sql`);
    db.close();
}

main().catch(console.error);
