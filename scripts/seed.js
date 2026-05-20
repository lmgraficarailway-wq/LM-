const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/database/database.sqlite');
const db = new sqlite3.Database(dbPath);

const users = [
    { username: 'admin', password: '123', role: 'master', name: 'Administrador' },
    { username: 'vendedor', password: '123', role: 'vendedor', name: 'Vendedor Teste' },
    { username: 'financeiro', password: '123', role: 'financeiro', name: 'Financeiro Teste' },
    { username: 'interno', password: '123', role: 'interno', name: 'Interno Producao' },
    { username: 'producao', password: '123', role: 'producao', name: 'Produção' }
];

console.log('Seeding users...');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        name TEXT
    )`);

    users.forEach(user => {
        db.get("SELECT id FROM users WHERE username = ?", [user.username], (err, row) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!row) {
                const hash = bcrypt.hashSync(user.password, 10);
                db.run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)",
                    [user.username, hash, user.role, user.name],
                    (err) => {
                        if (err) console.error(`Error creating ${user.username}:`, err);
                        else console.log(`Created user: ${user.username} (pass: ${user.password})`);
                    }
                );
            } else {
                console.log(`User ${user.username} already exists.`);
            }
        });
    });
});

setTimeout(() => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Seeding finished.');
    });
}, 2000);
