const https = require('https');
const admin = require('firebase-admin');
const creds = require('./firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

function railwayGet(path) {
    return new Promise(resolve => {
        https.get(`https://lm-passo-production.up.railway.app${path}`, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
        }).on('error', () => resolve({}));
    });
}

async function run() {
    console.log('🔍 Comparando Railway vs Firestore...\n');

    // Compara contagens de cada tabela
    const tables = ['orders', 'clients', 'products', 'reminders', 'team_chat', 'order_items', 'suppliers', 'menu_orders'];
    
    const firestoreCounts = await Promise.all(tables.map(t => db.collection(t).get().then(s => ({ t, n: s.size }))));

    // Busca últimas ordens no Railway
    const railwayOrders = await railwayGet('/api/orders');
    const railwayClients = await railwayGet('/api/clients');
    const railwayReminders = await railwayGet('/api/reminders');

    console.log('📊 CONTAGENS:');
    console.log('Tabela              Railway   Firestore   Diff');
    console.log('─'.repeat(50));

    const rCounts = {
        orders: railwayOrders.data?.length,
        clients: railwayClients.data?.length,
        reminders: railwayReminders.data?.length,
    };

    firestoreCounts.forEach(({ t, n }) => {
        const r = rCounts[t] ?? '?';
        const diff = r !== '?' ? (r - n) : '?';
        const flag = diff > 0 ? ' ⚠️ RAILWAY TEM MAIS' : diff < 0 ? ' ℹ️' : '';
        console.log(`${t.padEnd(20)} ${String(r).padStart(7)}   ${String(n).padStart(9)}   ${diff}${flag}`);
    });

    // Última ordem no Railway
    if (railwayOrders.data?.length > 0) {
        const lastOrder = railwayOrders.data[railwayOrders.data.length - 1];
        console.log(`\n📦 Última ordem Railway: ID ${lastOrder.id} | ${lastOrder.created_at?.substring(0,10)} | ${(lastOrder.client_name||'').substring(0,20)}`);
    }

    // Última ordem no Firestore
    const fsLastOrder = await db.collection('orders').orderBy('id', 'desc').limit(1).get();
    if (!fsLastOrder.empty) {
        const d = fsLastOrder.docs[0].data();
        console.log(`📦 Última ordem Firestore: ID ${fsLastOrder.docs[0].id} | ${(d.created_at||'').substring(0,10)} | ${(d.client_name||d.description||'').substring(0,20)}`);
    }

    process.exit(0);
}
run().catch(console.error);
