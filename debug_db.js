const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database.sqlite');
db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 5', [], (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log("Orders found:", rows.length);
        console.log(JSON.stringify(rows, null, 2));
    }
});
