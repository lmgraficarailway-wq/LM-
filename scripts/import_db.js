/**
 * import_db.js — Envia db_export.json para o servidor Railway via API
 * Rodar em: C:\Users\T.i\.gemini\antigravity\scratch\lm-passo
 * Comando:   node scripts/import_db.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const RAILWAY_URL = 'https://lm-passo-production.up.railway.app';
const IMPORT_SECRET = 'lmpasso-migrate-2026';

const dataPath = path.resolve(process.cwd(), 'scripts', 'db_export.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const body = JSON.stringify({ secret: IMPORT_SECRET, data });

const url = new URL('/api/import-data', RAILWAY_URL);

const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

console.log('Enviando dados para Railway...');
console.log('URL:', RAILWAY_URL + '/api/import-data');

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        try {
            const result = JSON.parse(responseBody);
            if (result.success) {
                console.log('\n✅ Importação concluída!');
                if (result.results) {
                    result.results.forEach(r => {
                        console.log(`  ${r.table}: ${r.imported} importados, ${r.skipped} ignorados`);
                    });
                }
            } else {
                console.error('\n❌ Erro:', result.error || responseBody);
            }
        } catch (e) {
            console.error('\n❌ Resposta inesperada:', responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error('Erro de conexão:', e.message);
});

req.write(body);
req.end();
