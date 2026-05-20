const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

// 1. Check for em_balcao orders
db.all("SELECT id, status FROM orders WHERE status='em_balcao' LIMIT 5", [], (err, rows) => {
    if (err) return console.error('ERROR:', err.message);
    console.log('Em Balcao orders:', JSON.stringify(rows));
    
    if (rows.length === 0) {
        console.log('Creating a test em_balcao order...');
        db.run("UPDATE orders SET status='em_balcao' WHERE id=(SELECT id FROM orders WHERE status='finalizado' LIMIT 1)", function(err2) {
            console.log('Updated to em_balcao:', this.changes, 'rows', err2 ? err2.message : '');
        });
    }
});
