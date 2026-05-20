const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- Procurando orfão no financeiro ---');
db.get("SELECT * FROM orders WHERE description LIKE '%Cardápio Lançado%' ORDER BY id DESC LIMIT 1", (err, orderRow) => {
    if (err) return console.error(err);
    if (!orderRow) {
        console.log("Nenhum pedido de cardápio encontrado na tabela orders.");
        db.close();
        return;
    }

    console.log("Financeiro encontrado:", orderRow);

    const orderId = orderRow.id;
    // Puxa o order_items pra achar o produto e quantidade pra voltar
    db.get('SELECT * FROM order_items WHERE order_id = ? LIMIT 1', [orderId], (err, item) => {
        if (!err && item) {
             const productId = item.product_id;
             const quantity = item.quantity;
             console.log(`Revertendo estoque do produto ${productId} em ${quantity} unidades`);
             db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
        }
        
        db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], () => {
            db.run('DELETE FROM orders WHERE id = ?', [orderId], () => {
                console.log("Pedido " + orderId + " apagado com sucesso.");
                db.close();
            });
        });
    });
});
