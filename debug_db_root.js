const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite'); // Correct path
db.all('SELECT id, status, deadline_type, total_value, created_at FROM orders ORDER BY id DESC LIMIT 5', [], (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log("Recent Orders:", JSON.stringify(rows, null, 2));
    }
});
