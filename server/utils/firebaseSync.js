const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { getServiceAccount } = require('./firebaseAuth');

// Inicializa Firebase apenas se existir a chave
let firestoreDb = null;
let isSyncing = false;

function initFirebase() {
    const serviceAccount = getServiceAccount();

    if (serviceAccount && !admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            firestoreDb = admin.firestore();
            console.log('🔥 Worker de Sincronização Firebase Ativado!');
        } catch (e) {
            console.error('Erro ao iniciar Firebase Sync Worker:', e.message);
        }
    }
}

async function processQueue() {
    if (!firestoreDb || isSyncing) return;
    
    isSyncing = true;
    
    // Puxa as 50 alterações mais antigas da fila
    db.all(`SELECT * FROM firebase_sync_queue ORDER BY id ASC LIMIT 50`, async (err, rows) => {
        if (err || !rows || rows.length === 0) {
            isSyncing = false;
            return;
        }

        const batch = firestoreDb.batch();
        const idsToDelete = [];

        try {
            for (const row of rows) {
                const { id, table_name, record_id, action } = row;
                const docRef = firestoreDb.collection(table_name).doc(String(record_id));
                
                if (action === 'DELETE') {
                    batch.delete(docRef);
                    idsToDelete.push(id);
                } else {
                    // Para INSERT e UPDATE, precisamos buscar os dados atuais no SQLite
                    const record = await new Promise((resolve, reject) => {
                        db.get(`SELECT * FROM ${table_name} WHERE id = ?`, [record_id], (err, result) => {
                            if (err) reject(err);
                            else resolve(result);
                        });
                    });

                    if (record) {
                        // Converte nulls para strings vazias (Firestore compatibility)
                        const cleanRecord = {};
                        for (const [k, v] of Object.entries(record)) {
                            cleanRecord[k] = v === null ? '' : v;
                        }
                        batch.set(docRef, cleanRecord, { merge: true });
                        idsToDelete.push(id);
                    } else {
                        // Se não encontrou o registro (ex: deletado logo depois de ser inserido),
                        // ainda precisamos remover da fila para não travar
                        idsToDelete.push(id);
                    }
                }
            }

            // Commita o batch no Firebase
            if (idsToDelete.length > 0) {
                await batch.commit();
                
                // Remove os itens processados da fila local
                const marks = idsToDelete.map(() => '?').join(',');
                db.run(`DELETE FROM firebase_sync_queue WHERE id IN (${marks})`, idsToDelete);
            }
            
        } catch (error) {
            console.error('Erro ao sincronizar com Firebase:', error);
        } finally {
            isSyncing = false;
            
            // Se tinha 50 itens, pode ser que tenha mais, já chama de novo rapidamente
            if (rows.length === 50) {
                setTimeout(processQueue, 100);
            }
        }
    });
}

function startWorker() {
    initFirebase();
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        // Verifica a fila a cada 2.5 segundos
        setInterval(processQueue, 2500);
    } else {
        console.log('ℹ️  Firebase Sync desativado (Credenciais não encontradas).');
    }
}

module.exports = { startWorker };
