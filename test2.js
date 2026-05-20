const fetch = require('node-fetch');
const FormData = require('form-data');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

db.get("SELECT id FROM orders WHERE status='em_balcao' LIMIT 1", async (err, order) => {
    if (!order) return console.log('No em_balcao orders');
    console.log('Testing with order', order.id);
    
    const form = new FormData();
    form.append('_prevent_empty', '1');
    
    try {
        const res = await fetch('http://localhost:3000/api/orders/' + order.id + '/conclude', {
            method: 'POST',
            body: form
        });
        const text = await res.text();
        console.log('Response:', res.status, text);
        
        db.get('SELECT status FROM orders WHERE id=?', [order.id], (e, r) => {
            console.log('DB Status after POST:', r ? r.status : 'Not found');
        });
    } catch (e) {
        console.error('Fetch error:', e);
    }
});
