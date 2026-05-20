const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccount = require('./firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestoreDb = admin.firestore();

const data = JSON.parse(fs.readFileSync('./scripts/db_export.json', 'utf8'));

async function pushChat() {
    const chatData = data['team_chat'];
    if (!chatData || chatData.length === 0) return console.log('Sem dados de chat.');
    
    console.log(`Enviando ${chatData.length} mensagens para o Firebase...`);
    for (let i = 0; i < chatData.length; i += 400) {
        const chunk = chatData.slice(i, i + 400);
        const batch = firestoreDb.batch();
        for (const row of chunk) {
            const docRef = firestoreDb.collection('team_chat').doc(String(row.id));
            const clean = {};
            for (const [k, v] of Object.entries(row)) clean[k] = v === null ? '' : v;
            batch.set(docRef, clean, { merge: true });
        }
        await batch.commit();
    }
    console.log('Mensagens sincronizadas!');
}
pushChat().then(() => process.exit(0));
