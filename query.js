const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const sql = `
        SELECT mo.*, u.name AS created_by_name, u.role AS created_by_role, c.name as client_name, c.core_discount,
               p.price AS product_price,
               o.total_value AS launched_total,
               o.discount_value AS launched_discount
        FROM menu_orders mo
        LEFT JOIN users u ON mo.created_by = u.id
        LEFT JOIN clients c ON mo.client_id = c.id
        LEFT JOIN products p ON (CASE WHEN mo.print_type = 'frente_e_verso' THEN 94 ELSE 54 END) = p.id
        LEFT JOIN orders o ON mo.order_id = o.id
        ORDER BY mo.launched_to_core ASC, mo.created_at DESC
        LIMIT 1
`;
db.all(sql, [], (err, rows) => {
    if (err) return console.error(err);
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
