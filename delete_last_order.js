const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- Apagando ultimo menu lançado ---');
db.get("SELECT * FROM menu_orders WHERE launched_to_core = 1 ORDER BY id DESC LIMIT 1", (err, row) => {
    if (err) return console.error(err);
    if (!row) return console.log("Nenhum cardápio recém lançado encontrado.");

    console.log("Encontrado cardápio:", row);

    let getOrderIdSql = row.order_id 
        ? 'SELECT id FROM orders WHERE id = ?'
        : 'SELECT id FROM orders WHERE description LIKE ? AND client_id = ? ORDER BY id DESC LIMIT 1';
    let getOrderIdParams = row.order_id 
        ? [row.order_id]
        : [`%Cardápio Lançado - Evento: ${row.event_name}%`, row.client_id];

    db.get(getOrderIdSql, getOrderIdParams, (err, orderRow) => {
        if (err) return console.error(err);
        if (!orderRow) {
            console.log("Pedido correspondente não encontrado na tabela orders.");
            db.run(`UPDATE menu_orders SET launched_to_core = 0 WHERE id = ?`, [row.id], () => db.close());
            return;
        }

        const orderId = orderRow.id;
        const productId = row.print_type === 'frente_e_verso' ? 94 : 54;
        
        console.log("Revertendo estoque e apagando order ID:", orderId);
        
        db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [row.quantity, productId], () => {
            db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], () => {
                db.run('DELETE FROM orders WHERE id = ?', [orderId], () => {
                    db.run(`UPDATE menu_orders SET launched_to_core = 0, status = 'pendente', order_id = NULL WHERE id = ?`, [row.id], () => {
                        console.log("Estorno e exclusão concluídos com sucesso.");
                        db.close();
                    });
                });
            });
        });
    });
});
