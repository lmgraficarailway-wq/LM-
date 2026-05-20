/**
 * SCRIPT DE MIGRAÇÃO: SQLite → Firebase Firestore
 * ================================================
 * Execute UMA VEZ para migrar todos os dados do banco local para o Firestore.
 *
 * USO:
 *   node scripts/migrate_to_firestore.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const admin = require('firebase-admin');
const path = require('path');

// ── Inicializar Firebase ───────────────────────────────────────────────────
const creds = require('../firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(creds) });
const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });

// ── Abrir SQLite ───────────────────────────────────────────────────────────
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const sqlite = new sqlite3.Database(dbPath);

const TABLES = [
    'users', 'clients', 'products', 'orders', 'order_items',
    'catalogue_items', 'team_chat', 'reminders', 'menu_orders',
    'stock_movements', 'client_credit_movements', 'dispatch_costs',
    'material_cost_movements', 'purchase_requests', 'product_color_variants',
    'suppliers', 'product_kit_templates', 'product_kit_items', 'comments'
];

async function migrateTable(table) {
    return new Promise((resolve, reject) => {
        sqlite.all(`SELECT * FROM ${table}`, [], async (err, rows) => {
            if (err) {
                console.log(`  ⚠️  ${table}: tabela não existe, pulando.`);
                return resolve(0);
            }
            if (!rows || rows.length === 0) {
                console.log(`  ✓ ${table}: vazia, pulando.`);
                return resolve(0);
            }

            let maxId = 0;
            const BATCH_SIZE = 400;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = firestore.batch();
                const chunk = rows.slice(i, i + BATCH_SIZE);
                chunk.forEach(row => {
                    const id = row.id;
                    if (id > maxId) maxId = id;
                    const ref = firestore.collection(table).doc(String(id));
                    // Limpar campos undefined
                    const data = {};
                    Object.keys(row).forEach(k => {
                        if (row[k] !== undefined) data[k] = row[k];
                    });
                    batch.set(ref, data);
                });
                await batch.commit();
            }

            // Salvar contador para próximo ID
            await firestore.collection('_counters').doc(table).set({ seq: maxId });
            console.log(`  ✅ ${table}: ${rows.length} registros migrados (max_id=${maxId})`);
            resolve(rows.length);
        });
    });
}

async function run() {
    console.log('\n🚀 INICIANDO MIGRAÇÃO SQLite → Firestore\n');
    let total = 0;
    for (const table of TABLES) {
        try {
            const count = await migrateTable(table);
            total += count;
        } catch (e) {
            console.error(`  ❌ Erro em ${table}:`, e.message);
        }
    }
    console.log(`\n✅ MIGRAÇÃO CONCLUÍDA! Total: ${total} registros\n`);
    sqlite.close();
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
