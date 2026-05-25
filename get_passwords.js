const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.all("SELECT username, plain_password FROM users WHERE role='master'", (err, rows) => {
    console.log(rows);
});
