/**
 * backup_firebase_to_sqlite.js
 * =============================================
 * Baixa TODOS os dados do Firebase Firestore e salva
 * como backup no arquivo database_backup.sqlite local.
 *
 * Uso: node scripts/backup_firebase_to_sqlite.js
 * Ou: importado pelo servidor para rodar automaticamente.
 */

require('dotenv').config();

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ── Inicializar Firebase ──────────────────────────────────────────────────────
function getFirestore() {
    if (admin.apps.length) return admin.apps[0];

    let creds;
    if (process.env.FIREBASE_CREDENTIALS) {
        creds = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } else {
        const credsPath = path.resolve(process.cwd(), 'firebase-credentials.json');
        if (!fs.existsSync(credsPath)) {
            throw new Error('firebase-credentials.json não encontrado');
        }
        creds = require(credsPath);
    }

    return admin.initializeApp({ credential: admin.credential.cert(creds) });
}

// ── Tabelas para fazer backup ────────────────────────────────────────────────
const TABLES = [
    'clients', 'products', 'orders', 'order_items',
    'catalogue_items', 'suppliers', 'dispatch_costs', 'users',
    'product_color_variants', 'material_cost_movements',
    'purchase_requests', 'team_chat', 'product_kit_templates',
    'product_kit_items', 'stock_movements', 'comments', 'reminders',
    'menu_orders', 'client_credit_movements'
];

async function runBackup() {
    const startTime = Date.now();
    console.log(`\n🔄 [Backup Firebase→SQLite] Iniciando... ${new Date().toLocaleString('pt-BR')}`);

    getFirestore();
    const db = admin.firestore();

    // Baixar todas as coleções do Firebase
    const allData = {};
    let totalRecords = 0;

    for (const table of TABLES) {
        try {
            const snap = await db.collection(table).get();
            allData[table] = snap.docs.map(d => ({ id: parseInt(d.id) || d.id, ...d.data() }));
            totalRecords += allData[table].length;
            if (allData[table].length > 0) {
                process.stdout.write(`  ✅ ${table}: ${allData[table].length} registros\n`);
            }
        } catch (e) {
            allData[table] = [];
        }
    }

    // Salvar como JSON de backup (sempre atualizado)
    const backupPath = path.resolve(process.cwd(), 'scripts', 'db_backup_firebase.json');
    fs.writeFileSync(backupPath, JSON.stringify({
        exported_at: new Date().toISOString(),
        total_records: totalRecords,
        data: allData
    }, null, 2));

    // Salvar também no db_export.json (compatível com o script de restauração)
    const exportPath = path.resolve(process.cwd(), 'scripts', 'db_export.json');
    fs.writeFileSync(exportPath, JSON.stringify(allData, null, 2));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Backup concluído em ${elapsed}s — ${totalRecords} registros salvos localmente.`);
    console.log(`   Arquivo: scripts/db_backup_firebase.json\n`);

    return { totalRecords, elapsed };
}

// Se executado diretamente
if (require.main === module) {
    runBackup()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('❌ Erro no backup:', err.message);
            process.exit(1);
        });
}

module.exports = { runBackup };
