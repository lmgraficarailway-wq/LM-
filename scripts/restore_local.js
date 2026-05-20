/**
 * restore_local.js — Restaura dados do db_export.json para o database.sqlite local
 * Uso: node scripts/restore_local.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const exportPath = path.resolve(process.cwd(), 'scripts', 'db_export.json');

if (!fs.existsSync(exportPath)) {
    console.error('❌ Arquivo scripts/db_export.json não encontrado!');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
const db = new sqlite3.Database(dbPath);

console.log('\n🔄 Restaurando dados do db_export.json...\n');

// Insere registros de uma tabela com upsert (ignora conflitos)
function insertRows(table, rows, columns, done) {
    if (!rows || rows.length === 0) {
        console.log(`  ⚠️  ${table}: sem dados para importar`);
        return done();
    }
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    let count = 0;
    let completed = 0;
    rows.forEach(row => {
        const values = columns.map(c => row[c] !== undefined ? row[c] : null);
        db.run(sql, values, function(err) {
            if (!err && this.changes > 0) count++;
            completed++;
            if (completed === rows.length) {
                console.log(`  ✅ ${table}: ${count} inseridos (${rows.length - count} já existiam)`);
                done();
            }
        });
    });
}

db.serialize(() => {
    const tasks = [];

    if (data.clients && data.clients.length > 0) {
        const cols = Object.keys(data.clients[0]).filter(k => k !== 'id' || true);
        tasks.push(cb => insertRows('clients', data.clients,
            ['id','name','phone','origin','created_at','core_discount','address','city','zip_code','cpf','state'], cb));
    }

    if (data.products && data.products.length > 0) {
        tasks.push(cb => insertRows('products', data.products,
            ['id','name','type','production_time','price','stock','price_1_day','price_3_days','min_stock','terceirizado','cost_value','unit_cost'], cb));
    }

    if (data.users && data.users.length > 0) {
        tasks.push(cb => insertRows('users', data.users,
            ['id','username','password','role','name','client_id','plain_password'], cb));
    }

    if (data.orders && data.orders.length > 0) {
        tasks.push(cb => insertRows('orders', data.orders,
            ['id','client_id','product_id','description','total_value','payment_method','created_by',
             'created_at','status','deadline_type','deadline_at','production_notes','rejection_reason',
             'pickup_photo','checklist','group_id','quantity','products_summary','stock_used',
             'loss_justification','moved_by','moved_at','launched_to_core','file_path','attachments',
             'event_name','stock_reserved','payment_code','is_internal','is_terceirizado','discount_value'], cb));
    }

    if (data.order_items && data.order_items.length > 0) {
        tasks.push(cb => insertRows('order_items', data.order_items,
            ['id','order_id','product_id','quantity','price','product_snapshot_name','color_variant_id','color_name'], cb));
    }

    if (data.catalogue_items && data.catalogue_items.length > 0) {
        tasks.push(cb => insertRows('catalogue_items', data.catalogue_items,
            ['id','title','description','image_url','created_at'], cb));
    }

    if (data.suppliers && data.suppliers.length > 0) {
        tasks.push(cb => insertRows('suppliers', data.suppliers,
            ['id','name','phone','website','description','created_at'], cb));
    }

    if (data.dispatch_costs && data.dispatch_costs.length > 0) {
        tasks.push(cb => insertRows('dispatch_costs', data.dispatch_costs,
            ['id','order_id','carrier','amount','created_at','launched_to_core'], cb));
    }

    // Roda tasks em sequência
    let i = 0;
    function next() {
        if (i >= tasks.length) {
            db.close();
            console.log('\n✅ Restauração concluída! Reinicie o servidor para ver os dados.\n');
            return;
        }
        tasks[i++](next);
    }
    next();
});
