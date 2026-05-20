const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all('PRAGMA table_info(orders)', (err, rows) => {
    const cols = rows.map(r => r.name);
    console.log('COLUMNS:', JSON.stringify(cols));
    const hasMoved = cols.includes('moved_by');
    console.log('has moved_by:', hasMoved);
    db.all('SELECT id, status, moved_by FROM orders LIMIT 5', (err2, rows2) => {
        console.log('SAMPLE ORDERS:', JSON.stringify(rows2));
        db.close();
    });
});
