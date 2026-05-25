const admin = require('firebase-admin');
const creds = require('./firebase-credentials.json');
admin.initializeApp({credential: admin.credential.cert(creds)});
const db = admin.firestore();

async function run() {
    const snap = await db.collection('orders').get();
    const byClient = {};
    snap.docs.forEach(d => {
        const cid = d.data().client_id;
        byClient[cid] = (byClient[cid]||0)+1;
    });
    const top = Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,10);
    console.log('Top clients with orders:', top.map(([k,v])=>`client_id=${k}(${typeof k}):${v} orders`).join('\n'));
    
    // Test client 5 specifically
    const r1 = await db.collection('orders').where('client_id', '==', 5).get();
    console.log('\nclient_id==5 (int):', r1.size);
    
    // Check clients collection for client 5
    const c5 = await db.collection('clients').doc('5').get();
    console.log('Client doc 5 exists:', c5.exists, c5.exists ? c5.data().name : 'N/A');
    
    process.exit(0);
}
run().catch(console.error);
