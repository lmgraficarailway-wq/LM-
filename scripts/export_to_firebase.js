/**
 * export_to_firebase.js — Envia dados do db_export.json para o Firebase Firestore
 * Uso: node scripts/export_to_firebase.js
 *
 * Pré-requisito: arquivo firebase-credentials.json na pasta raiz do projeto
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const CRED_PATH = path.resolve(process.cwd(), 'firebase-credentials.json');
const EXPORT_PATH = path.resolve(process.cwd(), 'scripts', 'db_export.json');

// Verifica credenciais
if (!fs.existsSync(CRED_PATH)) {
    console.error('\n❌ Arquivo firebase-credentials.json não encontrado!');
    console.error('   1. Acesse: https://console.firebase.google.com');
    console.error('   2. Seu projeto → Configurações → Contas de serviço');
    console.error('   3. Gerar nova chave privada → salvar como firebase-credentials.json');
    console.error('   4. Coloque o arquivo na pasta do LM PASSO\n');
    process.exit(1);
}

// Verifica export
if (!fs.existsSync(EXPORT_PATH)) {
    console.error('\n❌ Arquivo scripts/db_export.json não encontrado!');
    console.error('   Execute primeiro: node scripts/pull_from_network.js\n');
    process.exit(1);
}

// Inicializa Firebase
const serviceAccount = require(CRED_PATH);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const data = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf-8'));

console.log('\n🔥 Conectado ao Firebase Firestore!');
console.log('   Iniciando exportação...\n');

// Envia uma coleção inteira em batches de 500 (limite do Firestore)
async function uploadCollection(collectionName, rows) {
    if (!rows || rows.length === 0) {
        console.log(`  ⚠️  ${collectionName}: sem dados`);
        return;
    }

    const colRef = db.collection(collectionName);
    let total = 0;

    // Processa em batches de 400
    for (let i = 0; i < rows.length; i += 400) {
        const batch = db.batch();
        const chunk = rows.slice(i, i + 400);

        for (const row of chunk) {
            const docId = String(row.id || `doc_${i}_${Math.random()}`);
            const docRef = colRef.doc(docId);
            // Converte null para string vazia para compatibilidade Firestore
            const cleanRow = {};
            for (const [k, v] of Object.entries(row)) {
                cleanRow[k] = v === null ? '' : v;
            }
            batch.set(docRef, cleanRow, { merge: true });
            total++;
        }

        await batch.commit();
    }

    console.log(`  ✅ ${collectionName}: ${total} registros enviados`);
}

async function run() {
    const collections = [
        'clients', 'products', 'orders', 'order_items',
        'catalogue_items', 'suppliers', 'dispatch_costs', 'users'
    ];

    for (const col of collections) {
        if (data[col]) {
            await uploadCollection(col, data[col]);
        }
    }

    // Salva timestamp do último sync
    await db.collection('_meta').doc('last_sync').set({
        timestamp: new Date().toISOString(),
        source: 'local_export',
        records: Object.values(data).reduce((s, arr) => s + (arr?.length || 0), 0)
    });

    console.log('\n✅ Exportação concluída com sucesso!');
    console.log('   Dados disponíveis no Firebase Firestore.\n');
    process.exit(0);
}

run().catch(err => {
    console.error('\n❌ Erro ao enviar para Firebase:', err.message);
    process.exit(1);
});
