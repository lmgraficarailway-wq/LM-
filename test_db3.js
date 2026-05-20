const db = require('./server/database/db.js');
db.all("SELECT username, plain_password FROM users WHERE role = 'cliente' LIMIT 5", (err, rows) => {
    console.log(rows);
});
