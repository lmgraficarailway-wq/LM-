const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const EXPORT_PATH = path.resolve(process.cwd(), 'scripts', 'db_export.json');

console.log('Lendo banco de dados local atualizado...');

const db = new sqlite3.Database(DB_PATH);
const tables = [
    'clients', 'products', 'orders', 'order_items', 'catalogue_items', 
    'suppliers', 'dispatch_costs', 'users', 'product_color_variants', 
    'material_cost_movements', 'purchase_requests', 'team_chat',
    'product_kit_templates', 'product_kit_items', 'stock_movements', 'comments'
];
const result = {};
let done = 0;

tables.forEach(table => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        result[table] = err ? [] : rows;
        done++;
        if (done === tables.length) {
            fs.writeFileSync(EXPORT_PATH, JSON.stringify(result, null, 2));
            console.log('✅ Dados convertidos com sucesso!');
            
            console.log('Enviando para o Firebase...');
            const { execSync } = require('child_process');
            try {
                execSync('node scripts/export_to_firebase.js', { stdio: 'inherit' });
                console.log('\n🎉 MEGA SUCESSO! Dados mais atualizados do Railway agora estao no Firebase!');
            } catch(e) {
                console.log('\n❌ Erro no envio pro Firebase:', e.message);
            }
        }
    });
});
