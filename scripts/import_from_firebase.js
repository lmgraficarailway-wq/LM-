/**
 * import_from_firebase.js — Baixa dados do Firebase Firestore e restaura o banco local
 * Uso: node scripts/import_from_firebase.js
 */

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const CRED_PATH = path.resolve(process.cwd(), 'firebase-credentials.json');
const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const EXPORT_PATH = path.resolve(process.cwd(), 'scripts', 'db_export.json');

if (!fs.existsSync(CRED_PATH)) {
    console.error('\n❌ firebase-credentials.json não encontrado!\n');
    process.exit(1);
}

const serviceAccount = require(CRED_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestoreDb = admin.firestore();

const localDb = new sqlite3.Database(DB_PATH);

console.log('\n🔥 Conectando ao Firebase...\n');

async function downloadCollection(collectionName) {
    const snap = await firestoreDb.collection(collectionName).get();
    if (snap.empty) return [];
    return snap.docs.map(doc => doc.data());
}

function insertRows(table, rows, columns, done) {
    if (!rows || rows.length === 0) {
        console.log(`  ⚠️  ${table}: sem dados`);
        return done();
    }
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    let count = 0;
    let completed = 0;
    rows.forEach(row => {
        const values = columns.map(c => {
            const v = row[c];
            return (v === '' || v === undefined) ? null : v;
        });
        localDb.run(sql, values, function(err) {
            if (!err && this.changes > 0) count++;
            completed++;
            if (completed === rows.length) {
                console.log(`  ✅ ${table}: ${count} registros importados`);
                done();
            }
        });
    });
}

async function run() {
    const collections = {
        clients:         ['id','name','phone','origin','created_at','core_discount','address','city','zip_code','cpf','state'],
        products:        ['id','name','type','production_time','price','stock','price_1_day','price_3_days','min_stock','terceirizado','cost_value','unit_cost'],
        users:           ['id','username','password','role','name','client_id','plain_password'],
        orders:          ['id','client_id','product_id','description','total_value','payment_method','created_by','created_at','status','deadline_type','deadline_at','production_notes','rejection_reason','pickup_photo','checklist','group_id','quantity','products_summary','stock_used','loss_justification','moved_by','moved_at','launched_to_core','file_path','attachments','event_name','stock_reserved','payment_code','is_internal','is_terceirizado','discount_value'],
        order_items:     ['id','order_id','product_id','quantity','price','product_snapshot_name','color_variant_id','color_name'],
        catalogue_items: ['id','title','description','image_url','created_at'],
        suppliers:       ['id','name','phone','website','description','created_at'],
        dispatch_costs:  ['id','order_id','carrier','amount','created_at','launched_to_core'],
    };

    // Baixa tudo do Firebase
    console.log('📥 Baixando dados do Firebase...\n');
    const allData = {};
    for (const col of Object.keys(collections)) {
        process.stdout.write(`  ⬇️  Baixando ${col}...`);
        allData[col] = await downloadCollection(col);
        console.log(` ${allData[col].length} registros`);
    }

    // Salva cópia local como backup
    fs.writeFileSync(EXPORT_PATH, JSON.stringify(allData, null, 2), 'utf-8');
    console.log('\n💾 Backup salvo em scripts/db_export.json');

    // Importa para o SQLite local
    console.log('\n📂 Importando para banco local...\n');
    localDb.serialize(() => {
        const tasks = Object.entries(collections).map(([table, cols]) =>
            cb => insertRows(table, allData[table], cols, cb)
        );

        let i = 0;
        function next() {
            if (i >= tasks.length) {
                localDb.close();
                console.log('\n✅ Importação concluída! Reinicie o servidor.\n');
                process.exit(0);
            }
            tasks[i++](next);
        }
        next();
    });
}

run().catch(err => {
    console.error('\n❌ Erro ao importar do Firebase:', err.message);
    process.exit(1);
});
