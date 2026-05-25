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
            res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
        });
        req.on('error', () => resolve({}));
        req.setTimeout(15000, () => { req.destroy(); resolve({}); });
    });
}

async function run() {
    console.log('🔍 Diagnóstico completo Railway vs Firestore - ' + new Date().toLocaleString('pt-BR') + '\n');

    const [rOrders, rArchived, fsSnap] = await Promise.all([
        railwayGet('/api/orders'),
        railwayGet('/api/orders/archived'),
        db.collection('orders').get()
    ]);

    const allRailway = [...(rOrders.data || []), ...(rArchived.data || [])];
    allRailway.sort((a, b) => b.id - a.id);
    
    const fsById = {};
    fsSnap.docs.forEach(d => { fsById[parseInt(d.id)] = { id: parseInt(d.id), ...d.data() }; });

    // IDs no Railway mas não no Firestore
    const missingInFs = allRailway.filter(o => !fsById[o.id]);
    // IDs com status diferente
    const statusDiff = allRailway.filter(o => fsById[o.id] && fsById[o.id].status !== o.status);
    // IDs no Firestore mas não no Railway (criados no Firebase diretamente)
    const railwayIds = new Set(allRailway.map(o => o.id));
    const onlyInFs = Object.values(fsById).filter(o => !railwayIds.has(o.id)).sort((a,b) => b.id - a.id);

    console.log(`📊 TOTAIS:`);
    console.log(`   Railway: ${allRailway.length} (${rOrders.data?.length} ativos + ${rArchived.data?.length} arquivados)`);
    console.log(`   Firestore: ${fsSnap.size}`);
    console.log(`   Faltando no Firestore: ${missingInFs.length}`);
    console.log(`   Status diferente: ${statusDiff.length}`);
    console.log(`   Só no Firestore (criados no app): ${onlyInFs.length}`);

    if (missingInFs.length > 0) {
        console.log('\n⚠️  PEDIDOS FALTANDO NO FIRESTORE:');
        missingInFs.forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,25)} | ${o.status}`));
    }

    if (statusDiff.length > 0) {
        console.log('\n⚠️  STATUS DIFERENTE:');
        statusDiff.slice(0, 20).forEach(o => {
            const fo = fsById[o.id];
            console.log(`   ID ${o.id} | FS: "${fo.status}" → Railway: "${o.status}" | ${(o.client_name||'').substring(0,20)}`);
        });
        if (statusDiff.length > 20) console.log(`   ... e mais ${statusDiff.length - 20}`);
    }

    console.log('\n📋 Top 10 mais recentes no Railway:');
    allRailway.slice(0, 10).forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,25)} | ${o.status}`));

    console.log('\n📋 Top 10 mais recentes no Firestore:');
    Object.values(fsById).sort((a,b) => b.id - a.id).slice(0, 10).forEach(o => console.log(`   ID ${o.id} | ${(o.created_at||'').substring(0,10)} | ${(o.client_name||'').substring(0,25)} | ${o.status}`));

    // Faz o sync se necessário
    if (missingInFs.length > 0 || statusDiff.length > 0) {
        console.log('\n🔄 Sincronizando...');
        const toWrite = [...missingInFs, ...statusDiff];
        for (let i = 0; i < toWrite.length; i += 400) {
            const batch = db.batch();
            toWrite.slice(i, i + 400).forEach(o => batch.set(db.collection('orders').doc(String(o.id)), o, { merge: true }));
            await batch.commit();
        }
        // Atualiza contador
        const maxId = Math.max(...allRailway.map(o => Number(o.id) || 0));
        const counterRef = db.collection('_counters').doc('orders');
        const doc = await counterRef.get();
        if (!doc.exists || (doc.data().seq || 0) < maxId) await counterRef.set({ seq: maxId }, { merge: true });
        console.log(`✅ ${toWrite.length} pedidos atualizados!`);
    } else {
        console.log('\n✅ Tudo sincronizado!');
    }

    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
