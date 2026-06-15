// Corrigir os 12 registros corrompidos no Firestore
const admin = require('firebase-admin');
const path = require('path');

const credPath = path.resolve(__dirname, '..', 'firebase-credentials.json');
admin.initializeApp({ credential: admin.credential.cert(require(credPath)) });
const db = admin.firestore();

// IDs corrompidos identificados
const corrompidos = [
    { id: '419', description: 'Cardápio Lançado - Evento: Gravação do DVD do Fábio Teclas | DESCONTAR NO FECHAMENTO DO EVENTO' },
    { id: '420', description: 'Cardápio Lançado - Evento: EXPO PÃO | DESCONTAR NO FECHAMENTO DO EVENTO' },
    { id: '421', description: 'Cardápio Lançado - Evento: FORRÓ DO PAULO | DESCONTAR NO FECHAMENTO DO EVENTO' },
    { id: '448', description: 'Cardápio Lançado - Evento: PAGODE DO DIFERENTÃO' },
    { id: '450', description: 'Cardápio Lançado - Evento: PARK BEER | DESCONTAR NO FECHAMENTO DO EVENTO' },
    { id: '451', description: 'Cardápio Lançado - Evento: RUMO AO HEXA - MILI MOREIRA' },
    { id: '453', description: 'Cardápio Lançado - Evento: FORRÓ DO PAULO | DESCONTAR NO FECHAMENTO DO EVENTO' },
    { id: '454', description: 'Cardápio Lançado - Evento: BOSTON ARENA FEST' },
    { id: '455', description: 'Cardápio Lançado - Evento: AYMORÉS X IPATINGA' },
    { id: '456', description: 'Cardápio Lançado - Evento: ARRAIÁ DO TI ZÉ' },
    { id: '457', description: 'Cardápio Lançado - Evento: ARENA NA COPA CATAGUASES' },
    { id: '458', description: 'Cardápio Lançado - Evento: ARENA NA COPA' },
];

async function fix() {
    console.log('Corrigindo', corrompidos.length, 'registros no Firestore...\n');

    for (const item of corrompidos) {
        try {
            // Verificar description atual antes de corrigir
            const doc = await db.collection('orders').doc(item.id).get();
            if (!doc.exists) {
                console.log(`  [${item.id}] NAO ENCONTRADO — pulando`);
                continue;
            }
            const atual = doc.data().description || '';
            console.log(`  [${item.id}] Antes : ${atual}`);
            
            await db.collection('orders').doc(item.id).update({
                description: item.description
            });
            console.log(`  [${item.id}] Depois: ${item.description}`);
            console.log('  ---');
        } catch (e) {
            console.error(`  [${item.id}] ERRO: ${e.message}`);
        }
    }

    console.log('\nConcluido!');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
