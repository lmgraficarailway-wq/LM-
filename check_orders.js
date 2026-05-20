const db = require('./server/database/db');
db.all("SELECT id, client_id, status, created_at FROM orders WHERE status = 'em_balcao' LIMIT 5", (err, rows) => {
    if (err) { console.error(err); process.exit(1); }
    console.log('Em Balcao orders:', JSON.stringify(rows, null, 2));
    process.exit(0);
});
