const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE clients SET loyalty_status = 0 WHERE name LIKE '%Arena%'", function(err) {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`Updated ${this.changes} client(s) named Arena.`);
    }
    db.close();
});
