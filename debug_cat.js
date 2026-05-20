const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
const fs = require('fs');
const path = require('path');

db.all('SELECT * FROM catalogue_items', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("=== CATALOGUE ITEMS ===");
    rows.forEach(r => {
        const filePath = path.join(__dirname, 'public', r.image_url);
        const exists = fs.existsSync(filePath);
        console.log(`ID: ${r.id} | Title: ${r.title} | URL: ${r.image_url} | Exists on disk: ${exists}`);
    });
    console.log("=======================");
});
