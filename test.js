const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.run("INSERT INTO dispatch_costs (order_id, carrier, amount) VALUES (1, 'UNIDA', 50)", function(err) {
    console.log(err || 'Success');
});
