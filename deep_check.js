/**
 * Diagnóstico completo: verifica se há pedidos em Railway com IDs maiores
 * que o máximo atual no Firestore, e também verifica o contador de IDs
 */
const https = require('https');
const admin = require('firebase-admin');
const creds = require('./firebase-credentials.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

function railwayGet(path) {
    return new Promise(resolve => {
        const req = https.get(`https://lm-passo-production.up.railway.app${path}`, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({ raw: b.substring(0, 200) }); } });
        });
        req.on('error', () => resolve({}));
        req.setTimeout(15000, () => { req.destroy(); resolve({}); });
    });
}

async function run() {
    console.log('🔍 Diagnóstico profundo - ' + new Date().toLocaleString('pt-BR') + '\n');

    // 1. Verifica o contador de IDs no Firestore
    const [counterSnap, fsOrdersSnap] = await Promise.all([
        db.collection('_counters').get(),
        db.collection('orders').get()
    ]);
    
    console.log('📊 CONTADORES FIRESTORE:');
    counterSnap.docs.forEach(d => console.log(`   ${d.id}: seq=${d.data().seq}`));
    
    console.log('\n📦 5 últimos pedidos no Firestore (por ID):');
    const fsOrders = await db.collection('orders').get();
    const allFsOrders = fsOrders.docs.map(d => ({ id: parseInt(d.id), ...d.data() })).sort((a,b) => b.id - a.id);
    allFsOrders.slice(0, 5).forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,25)} | ${o.status}`));

    const maxFsId = allFsOrders[0]?.id || 0;
    console.log(`\n   → Máximo ID Firestore: ${maxFsId}`);

    // 2. Tenta buscar pedido com ID > máximo no Railway (para ver se existem)
    console.log('\n🔍 Verificando se Railway tem IDs > ' + maxFsId + '...');
    for (let testId = maxFsId + 1; testId <= maxFsId + 15; testId++) {
        // Tenta GET /api/orders (não tem endpoint por ID público sem auth normalmente)
    }

    // 3. Busca tudo no Railway com timestamps recentes
    const [rOrders, rArchived] = await Promise.all([
        railwayGet('/api/orders'),
        railwayGet('/api/orders/archived')
    ]);
    
    const allRailway = [...(rOrders.data || []), ...(rArchived.data || [])];
    const railwayMaxId = Math.max(...allRailway.map(o => o.id || 0));
    console.log(`   → Máximo ID Railway: ${railwayMaxId}`);
    console.log(`   → Railway tem ${allRailway.length} pedidos (${rOrders.data?.length} ativos + ${rArchived.data?.length} arquivados)`);
    
    if (railwayMaxId > maxFsId) {
        const missing = allRailway.filter(o => o.id > maxFsId);
        console.log(`\n⚠️  PEDIDOS NOVOS NO RAILWAY (ID > ${maxFsId}):`);
        missing.forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,30)} | ${o.status}`));
        
        // Sincroniza imediatamente
        console.log('\n🔄 Sincronizando...');
        for (let i = 0; i < missing.length; i += 400) {
            const batch = db.batch();
            missing.slice(i, i + 400).forEach(o => batch.set(db.collection('orders').doc(String(o.id)), o, { merge: true }));
            await batch.commit();
        }
        await db.collection('_counters').doc('orders').set({ seq: railwayMaxId }, { merge: true });
        console.log(`✅ ${missing.length} pedidos sincronizados!`);
    } else {
        console.log(`   → Firestore está atualizado! (max ${maxFsId} ≥ Railway max ${railwayMaxId})`);
    }

    // 4. Verifica pedidos dos últimos 5 dias
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const recentFsOrders = allFsOrders.filter(o => (o.created_at || '') >= fiveDaysAgo);
    console.log(`\n📅 Pedidos no Firestore dos últimos 5 dias (desde ${fiveDaysAgo}):`);
    if (recentFsOrders.length === 0) {
        console.log('   ⚠️  NENHUM pedido recente! Verificar se novos pedidos estão sendo criados.');
    } else {
        recentFsOrders.forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,25)} | ${o.status}`));
    }

    // 5. Kanban columns distribution
    const kanbanCounts = { aguardando_aceite: 0, producao: 0, em_balcao: 0, finalizado: 0, arquivado: 0, outros: 0 };
    allFsOrders.forEach(o => {
        if (kanbanCounts[o.status] !== undefined) kanbanCounts[o.status]++;
        else kanbanCounts.outros++;
    });
    console.log('\n📋 Distribuição do Kanban (Firestore):');
    Object.entries(kanbanCounts).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
