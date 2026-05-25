const https = require('https');
const admin = require('firebase-admin');
const creds = require('./firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

function railwayGet(path) {
    return new Promise(resolve => {
        const req = https.get(`https://lm-passo-production.up.railway.app${path}`, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
        });
        req.on('error', () => resolve({}));
        req.setTimeout(15000, () => { req.destroy(); resolve({}); });
    });
}

async function run() {
    console.log('🔍 Análise detalhada dos dados Railway vs Firestore...\n');

    // Busca TODOS os pedidos do Railway (ativos + arquivados)
    const [
        rOrders, rArchived, rMenuOrders, rChat,
        fsOrdersSnap, fsMenuSnap, fsChatSnap
    ] = await Promise.all([
        railwayGet('/api/orders'),
        railwayGet('/api/orders/archived'),
        railwayGet('/api/menu-orders'),
        railwayGet('/api/chat/history'),
        db.collection('orders').get(),
        db.collection('menu_orders').get(),
        db.collection('team_chat').get()
    ]);

    const allRailwayOrders = [...(rOrders.data || []), ...(rArchived.data || [])];
    allRailwayOrders.sort((a, b) => b.id - a.id);

    const fsOrderIds = new Set(fsOrdersSnap.docs.map(d => parseInt(d.id)));
    const fsMenuIds = new Set(fsMenuSnap.docs.map(d => parseInt(d.id)));

    // IDs no Railway que não estão no Firestore
    const missingOrders = allRailwayOrders.filter(o => !fsOrderIds.has(o.id));
    
    console.log(`📦 PEDIDOS:`);
    console.log(`   Railway total: ${allRailwayOrders.length} (${rOrders.data?.length} ativos + ${rArchived.data?.length} arquivados)`);
    console.log(`   Firestore total: ${fsOrdersSnap.size}`);
    console.log(`   FALTANDO no Firestore: ${missingOrders.length}`);
    
    if (missingOrders.length > 0) {
        console.log('\n   Pedidos faltando:');
        missingOrders.forEach(o => {
            console.log(`   → ID ${o.id} | ${o.created_at?.substring(0,10)} | ${(o.client_name||o.description||'').substring(0,30)} | status: ${o.status}`);
        });
    }

    // Menu orders
    const rMenuAll = rMenuOrders.data || [];
    const missingMenu = rMenuAll.filter(o => !fsMenuIds.has(o.id));
    console.log(`\n🍽️  PEDIDOS DE CARDÁPIO:`);
    console.log(`   Railway: ${rMenuAll.length} | Firestore: ${fsMenuSnap.size} | Faltando: ${missingMenu.length}`);
    if (missingMenu.length > 0) {
        missingMenu.forEach(o => console.log(`   → ID ${o.id} | ${o.created_at?.substring(0,10)} | ${(o.client_name||'').substring(0,25)}`));
    }

    // Chat messages
    const rChatMsgs = rChat.messages || [];
    console.log(`\n💬 CHAT:`);
    console.log(`   Railway: ${rChatMsgs.length} msgs | Firestore: ${fsChatSnap.size} msgs`);
    if (rChatMsgs.length > 0) {
        const last = rChatMsgs[rChatMsgs.length - 1];
        console.log(`   Última Railway: ID ${last.id} | ${last.created_at?.substring(0,16)} | ${(last.message||'').substring(0,30)}`);
    }
    if (!fsChatSnap.empty) {
        const fsIds = fsChatSnap.docs.map(d => parseInt(d.id)).sort((a,b)=>b-a);
        const lastFsChat = fsChatSnap.docs.find(d => parseInt(d.id) === fsIds[0]);
        const d = lastFsChat?.data();
        console.log(`   Última Firestore: ID ${fsIds[0]} | ${d?.created_at?.substring(0,16)} | ${(d?.message||'').substring(0,30)}`);
    }

    // Top 5 pedidos mais recentes no Firestore
    const fsOrdersSorted = fsOrdersSnap.docs
        .map(d => ({ id: parseInt(d.id), ...d.data() }))
        .sort((a, b) => b.id - a.id)
        .slice(0, 5);
    console.log('\n📋 Top 5 pedidos mais recentes no Firestore:');
    fsOrdersSorted.forEach(o => {
        console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||o.description||'').substring(0,30)} | ${o.status}`);
    });

    // Top 5 pedidos mais recentes no Railway
    console.log('\n📋 Top 5 pedidos mais recentes no Railway:');
    allRailwayOrders.slice(0, 5).forEach(o => {
        console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||o.description||'').substring(0,30)} | ${o.status}`);
    });

    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
