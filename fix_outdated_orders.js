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
    console.log('🔍 Verificando pedidos com STATUS diferente entre Railway e Firestore...\n');

    const [rOrders, rArchived, fsSnap] = await Promise.all([
        railwayGet('/api/orders'),
        railwayGet('/api/orders/archived'),
        db.collection('orders').get()
    ]);

    const allRailway = [...(rOrders.data || []), ...(rArchived.data || [])];
    const fsById = {};
    fsSnap.docs.forEach(d => { fsById[parseInt(d.id)] = { id: parseInt(d.id), ...d.data() }; });

    const outdated = [];
    allRailway.forEach(ro => {
        const fo = fsById[ro.id];
        if (!fo) return; // já é novo, será adicionado

        // Compara campos críticos
        const statusDiff = fo.status !== ro.status;
        const phaseDiff = fo.kanban_phase !== ro.kanban_phase;
        const noteDiff = fo.production_notes !== ro.production_notes;

        if (statusDiff || phaseDiff || noteDiff) {
            outdated.push({
                id: ro.id,
                client: (ro.client_name || ro.description || '').substring(0, 25),
                date: (ro.created_at || '').substring(0, 10),
                fs_status: fo.status, rail_status: ro.status,
                fs_phase: fo.kanban_phase, rail_phase: ro.kanban_phase,
                railwayData: ro
            });
        }
    });

    console.log(`📊 Pedidos com dados diferentes: ${outdated.length}\n`);
    outdated.forEach(o => {
        console.log(`ID ${o.id} | ${o.client} | ${o.date}`);
        if (o.fs_status !== o.rail_status) console.log(`  status: "${o.fs_status}" → "${o.rail_status}"`);
        if (o.fs_phase !== o.rail_phase)   console.log(`  phase:  "${o.fs_phase}" → "${o.rail_phase}"`);
    });

    if (outdated.length > 0) {
        console.log('\n🔄 Atualizando no Firestore...');
        let count = 0;
        for (const o of outdated) {
            await db.collection('orders').doc(String(o.id)).set(o.railwayData, { merge: true });
            count++;
            if (count % 10 === 0) console.log(`   ${count}/${outdated.length}...`);
        }
        console.log(`✅ ${count} pedidos atualizados!`);
    }

    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
