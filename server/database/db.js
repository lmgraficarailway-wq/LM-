/**
 * db.js — Ponto de entrada do banco de dados
 *
 * LOCAL  (USE_SQLITE=true no .env): usa SQLite — funciona sem internet e sem cota
 * RENDER (FIREBASE_CREDENTIALS set): usa Firestore — modo 24h online
 *
 * Se sqlite3 não estiver instalado, usa Firestore automaticamente.
 */

const useLocal = process.env.USE_SQLITE === 'true' || !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_SERVICE_ID;

if (useLocal) {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const fs = require('fs');

        const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
        let dbPath = path.resolve(process.cwd(), 'database.sqlite');
        
        if (volumePath) {
            // Garante que o diretório do volume existe
            if (!fs.existsSync(volumePath)) {
                fs.mkdirSync(volumePath, { recursive: true });
            }
            dbPath = path.join(volumePath, 'database.sqlite');
            console.log(`🗄️  Modo RAILWAY: usando SQLite no volume (${dbPath})`);
        } else {
            console.log('🗄️  Modo LOCAL: usando SQLite (database.sqlite)');
        }

        const db = new sqlite3.Database(dbPath);
        
        // Inicializa tabelas automaticamente (caso banco seja novo)
        const { initDatabase } = require('./initDb');
        initDatabase(db).catch(e => console.error('Erro na inicialização do banco:', e.message));
        
        module.exports = db;
    } catch (e) {
        console.log('⚠️  SQLite indisponível, usando Firebase...');
        module.exports = require('./firestore');
    }
} else {
    module.exports = require('./firestore');
}
