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
    console.log('🔄 Sincronizando dados novos do Railway → Firestore...\n');

    // ── 1. Clientes novos no Railway ────────────────────────────────────────
    const [railwayClients, fsClientsSnap] = await Promise.all([
        railwayGet('/api/clients'),
        db.collection('clients').get()
    ]);

    const fsClientIds = new Set(fsClientsSnap.docs.map(d => String(d.data().id || d.id)));
    const newClients = (railwayClients.data || []).filter(c => !fsClientIds.has(String(c.id)));
    
    console.log(`👥 Clientes: ${newClients.length} novo(s) no Railway`);
    if (newClients.length > 0) {
        const batch = db.batch();
        for (const c of newClients) {
            const ref = db.collection('clients').doc(String(c.id));
            batch.set(ref, c, { merge: true });
            console.log(`   ✅ Cliente ID ${c.id}: ${c.name}`);
        }
        await batch.commit();
        
        // Atualiza o contador se necessário
        const maxId = Math.max(...(railwayClients.data || []).map(c => c.id || 0));
        const counterRef = db.collection('_counters').doc('clients');
        const counterDoc = await counterRef.get();
        const currentSeq = counterDoc.exists ? (counterDoc.data().seq || 0) : 0;
        if (maxId > currentSeq) {
            await counterRef.set({ seq: maxId }, { merge: true });
            console.log(`   📊 Contador atualizado: ${currentSeq} → ${maxId}`);
        }
    }

    // ── 2. Pedidos novos no Railway (ativos) ────────────────────────────────
    const railwayOrders = await railwayGet('/api/orders');
    const fsOrdersSnap = await db.collection('orders').get();
    const fsOrderIds = new Set(fsOrdersSnap.docs.map(d => String(d.data().id || d.id)));
    const newOrders = (railwayOrders.data || []).filter(o => !fsOrderIds.has(String(o.id)));

    console.log(`\n📦 Pedidos ativos: ${newOrders.length} novo(s) no Railway`);
    if (newOrders.length > 0) {
        for (const o of newOrders.slice(0, 20)) {
            const ref = db.collection('orders').doc(String(o.id));
            await ref.set(o, { merge: true });
            console.log(`   ✅ Pedido ID ${o.id}: ${(o.client_name || '').substring(0, 25)} | ${o.created_at?.substring(0, 10)}`);
        }
        const maxId = Math.max(...(railwayOrders.data || []).map(o => o.id || 0));
        const counterRef = db.collection('_counters').doc('orders');
        const counterDoc = await counterRef.get();
        const currentSeq = counterDoc.exists ? (counterDoc.data().seq || 0) : 0;
        if (maxId > currentSeq) {
            await counterRef.set({ seq: maxId }, { merge: true });
        }
    }

    // ── 3. Pedidos arquivados novos ─────────────────────────────────────────
    const railwayArchived = await railwayGet('/api/orders/archived');
    const newArchived = (railwayArchived.data || []).filter(o => !fsOrderIds.has(String(o.id)));

    console.log(`\n📁 Pedidos arquivados: ${newArchived.length} novo(s) no Railway`);
    if (newArchived.length > 0) {
        for (const o of newArchived.slice(0, 30)) {
            const ref = db.collection('orders').doc(String(o.id));
            await ref.set(o, { merge: true });
            console.log(`   ✅ Arquivado ID ${o.id}: ${(o.client_name || '').substring(0, 25)}`);
        }
    }

    // ── 4. Lembretes novos ──────────────────────────────────────────────────
    const [railwayReminders, fsRemindersSnap] = await Promise.all([
        railwayGet('/api/reminders'),
        db.collection('reminders').get()
    ]);
    const fsReminderIds = new Set(fsRemindersSnap.docs.map(d => String(d.data().id || d.id)));
    const newReminders = (railwayReminders.data || []).filter(r => !fsReminderIds.has(String(r.id)));

    console.log(`\n🔔 Lembretes: ${newReminders.length} novo(s) no Railway`);
    if (newReminders.length > 0) {
        const batch = db.batch();
        for (const r of newReminders) {
            batch.set(db.collection('reminders').doc(String(r.id)), r, { merge: true });
            console.log(`   ✅ Lembrete ID ${r.id}: ${(r.title || '').substring(0, 40)}`);
        }
        await batch.commit();
    }

    // ── 5. Produtos novos ───────────────────────────────────────────────────
    const [railwayProducts, fsProductsSnap] = await Promise.all([
        railwayGet('/api/products'),
        db.collection('products').get()
    ]);
    const fsProductIds = new Set(fsProductsSnap.docs.map(d => String(d.data().id || d.id)));
    const newProducts = (railwayProducts.data || []).filter(p => !fsProductIds.has(String(p.id)));
    
    console.log(`\n📦 Produtos: ${newProducts.length} novo(s) no Railway`);
    if (newProducts.length > 0) {
        const batch = db.batch();
        for (const p of newProducts) {
            batch.set(db.collection('products').doc(String(p.id)), p, { merge: true });
            console.log(`   ✅ Produto ID ${p.id}: ${(p.name || '').substring(0, 40)}`);
        }
        await batch.commit();
    }

    console.log('\n✅ Sincronização concluída!');
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
