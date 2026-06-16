const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database/database.sqlite');
db.all('SELECT id, name, type, stock FROM products', [], (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
});
