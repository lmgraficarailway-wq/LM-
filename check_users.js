const db = require('./server/database/db');
db.all('SELECT id, username, role FROM users', (err, rows) => {
    console.log('Users:', JSON.stringify(rows, null, 2));
    process.exit(0);
});
