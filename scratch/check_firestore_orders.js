// Script para verificar registros corrompidos no Firestore (producao)
const admin = require('firebase-admin');
const path = require('path');

const credPath = path.resolve(__dirname, '..', 'firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(require(credPath)) });
const db = admin.firestore();

async function check() {
    console.log('Buscando orders com "Card" na description...');
    const snap = await db.collection('orders')
        .where('description', '>=', 'Card')
        .where('description', '<', 'Care')
        .get();

    console.log('Total encontrado:', snap.size);
    
    const corrompidos = [];
    snap.forEach(doc => {
        const d = doc.data();
        const desc = d.description || '';
        // Verifica se tem chars corrompidos (? no lugar de acentos)
        if (desc.includes('?') || desc.includes('pio') && !desc.includes('ápio')) {
            corrompidos.push({ id: doc.id, description: desc });
        }
        console.log(`  [${doc.id}] ${desc.substring(0, 60)}`);
    });

    console.log('\n--- CORROMPIDOS:', corrompidos.length, '---');
    corrompidos.forEach(c => console.log(c));
    
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
