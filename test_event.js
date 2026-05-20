const fetch = require('node-fetch');
const db = require('./server/database/db');

async function test() {
    try {
        db.get("SELECT id FROM products LIMIT 1", async (err, row) => {
            if (!row) {
                console.error("No products found.");
                return;
            }
            const prodId = row.id;

            console.log("Creating CORE order with event name...");
            const res = await fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: 7, // ARENA
                    description: 'Order from API Test',
                    payment_method: 'CORE',
                    total_value: 150.00,
                    created_by: 1,
                    deadline_option: '3D',
                    items: [{ product_id: prodId, quantity: 2 }],
                    is_internal: 0,
                    event_name: 'Festa da API 2026'
                })
            });
            const data = await res.json();
            console.log("Order Creation Response:", data);

            // simulate finalizing the order so it shows up in client financial report
            if (data.group_id) {
                await fetch(`http://localhost:3000/api/orders/${data.group_id}/finalize`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: [{ product_id: prodId, ordered: 2, used: 2 }] })
                });
                console.log("Order Finalized (moved to em_balcao).");
            }

            console.log("Fetching client financial...");
            const res2 = await fetch('http://localhost:3000/api/reports/client-financial/7');
            const data2 = await res2.json();
            const testOrder = data2.data.find(o => o.event_name === 'Festa da API 2026');
            
            if (testOrder) {
                console.log("SUCCESS! Found order with event_name in client financial report:", testOrder);
            } else {
                console.log("FAILED to find the event_name in client financial report.");
                console.log("Financial Data:", data2);
            }
        });
    } catch (e) {
        console.error(e);
    }
}
test();
