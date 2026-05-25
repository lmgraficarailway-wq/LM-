const admin = require('firebase-admin');
const creds = require('./firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(creds) });
const firestore = admin.firestore();

const tables = [
    'users', 'clients', 'products', 'orders', 'order_items', 'catalogue_items', 
    'suppliers', 'dispatch_costs', 'team_chat', 'reminders', 'menu_orders', 
    'stock_movements', 'purchase_requests', 'product_color_variants', 
    'product_kit_templates', 'product_kit_items', 'comments', '_counters'
];

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = firestore.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
  
    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}
  
async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.docs.length;
    if (batchSize === 0) {
        resolve();
        return;
    }
  
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
  
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

const db = firestore;

async function wipe() {
    console.log('🗑️ Apagando banco de dados inteiro...');
    for (const table of tables) {
        await deleteCollection(table, 500);
        console.log(`✅ Coleção ${table} apagada.`);
    }
    console.log('✨ Banco de dados limpo!');
    process.exit(0);
}

wipe().catch(console.error);
