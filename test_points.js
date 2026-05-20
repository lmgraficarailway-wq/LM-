const db = require('./server/database/db.js');
const sql = `
        SELECT c.id, c.name, 
               COALESCE(SUM(m.amount), 0) as L90_spent,
               COUNT(m.id) as L90_orders
        FROM clients c
        LEFT JOIN client_credit_movements m ON m.client_id = c.id 
             AND m.type = 'order_debit' 
             AND m.created_at >= datetime('now', '-90 days')
        GROUP BY c.id
`;
db.all(sql, (err, rows) => {
    console.log(rows);
});
