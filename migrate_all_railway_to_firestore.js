const https = require('https');
const admin = require('firebase-admin');
const fs = require('fs');

const creds = require('./firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(creds) });
const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });

const BASE_URL = 'https://lm-passo-production.up.railway.app/api';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        https.get(BASE_URL + path, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

async function uploadCollection(table, rows) {
    if (!rows || rows.length === 0) return 0;
    let maxId = 0;
    const BATCH_SIZE = 400;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = firestore.batch();
        const chunk = rows.slice(i, i + BATCH_SIZE);
        chunk.forEach(row => {
            const id = row.id;
            if (id > maxId) maxId = id;
            const ref = firestore.collection(table).doc(String(id));
            const data = {};
            Object.keys(row).forEach(k => { if (row[k] !== undefined && row[k] !== null) data[k] = row[k]; });
            batch.set(ref, data);
        });
        await batch.commit();
    }
    await firestore.collection('_counters').doc(table).set({ seq: maxId });
    console.log(`  ✅ ${table}: ${rows.length} registros migrados (max_id=${maxId})`);
    return rows.length;
}

async function run() {
    console.log('\n🚀 LENDO DADOS CORE...');
    const exportData = JSON.parse(fs.readFileSync('railway_export.json', 'utf8')).data;
    const tables = ['users', 'clients', 'products', 'orders', 'order_items', 'catalogue_items', 'suppliers', 'dispatch_costs'];
    for (const table of tables) {
        await uploadCollection(table, exportData[table] || []);
    }

    console.log('\n🚀 BUSCANDO DADOS ADICIONAIS...');
    const chat = await fetchJson('/chat/history');
    await uploadCollection('team_chat', chat ? chat.messages : []);

    const reminders = await fetchJson('/reminders');
    await uploadCollection('reminders', reminders ? reminders.data : []);

    const menu = await fetchJson('/menu-orders');
    await uploadCollection('menu_orders', menu ? menu.data : []);

    const stock = await fetchJson('/stock/movements');
    await uploadCollection('stock_movements', stock ? stock.data : []);

    const purchases = await fetchJson('/purchases');
    await uploadCollection('purchase_requests', purchases ? purchases.data : []);

    // Agregados
    console.log('\n🚀 BUSCANDO CORES E KITS (Produtos)...');
    let allColors = [];
    let allKits = [];
    let allKitItems = [];
    for (const p of exportData.products || []) {
        const colors = await fetchJson(`/products/${p.id}/colors`);
        if (colors && colors.data) allColors.push(...colors.data);
        
        const kits = await fetchJson(`/products/${p.id}/kits`);
        if (kits && kits.data) {
            allKits.push(...kits.data);
            kits.data.forEach(k => {
                if(k.items) allKitItems.push(...k.items);
            });
        }
    }
    await uploadCollection('product_color_variants', allColors);
    await uploadCollection('product_kit_templates', allKits);
    await uploadCollection('product_kit_items', allKitItems);

    console.log('\n🚀 BUSCANDO COMENTÁRIOS (Pedidos)...');
    let allComments = [];
    for (const o of exportData.orders || []) {
        const comments = await fetchJson(`/orders/${o.id}/comments`);
        if (comments && comments.data) allComments.push(...comments.data);
    }
    await uploadCollection('comments', allComments);

    console.log('\n✅ TODA A MIGRAÇÃO FINALIZADA!');
    process.exit(0);
}

run().catch(console.error);
