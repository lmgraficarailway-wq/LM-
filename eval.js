const db = require('./server/database/db');
db.all("SELECT * FROM users WHERE role='cliente' LIMIT 1", [], (err, rows) => {
   if (err) console.error(err);
   console.log("CLIENT USER:", rows);
});
db.all("SELECT * FROM users WHERE username='admin' LIMIT 1", [], (err, rows) => {
   console.log("ADMIN USER:", rows);
});
