/**
 * push_local_db.js
 * Script para enviar o database.sqlite local para o Railway e restaurá-lo
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

async function main() {
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Banco de dados local não encontrado:', dbPath);
        process.exit(1);
    }
    
    console.log('📦 Lendo banco de dados local...');
    const buffer = fs.readFileSync(dbPath);
    const base64 = buffer.toString('base64');
    console.log(`✅ Lidos ${buffer.length} bytes.`);
    
    console.log('🚀 Enviando para o Railway...');
    
    const payload = JSON.stringify({
        token: 'lm-passo-admin-upload-123',
        database_base64: base64
    });
    
    const options = {
        hostname: 'lm-passo-production.up.railway.app',
        port: 443,
        path: '/api/admin/restore-db',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };
    
    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('\n📡 Resposta do Servidor (' + res.statusCode + '):');
            console.log(body);
        });
    });
    
    req.on('error', (err) => {
        console.error('❌ Erro de conexão:', err.message);
    });
    
    req.write(payload);
    req.end();
}

main().catch(console.error);
