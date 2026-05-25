const https = require('https');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.USERPROFILE, '.railway', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.user.token;
const DEPLOY_ID = '07606690-4b23-4970-9b3f-0d1f70c0ce15';

function graphql(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query });
        const req = https.request({
            hostname: 'backboard.railway.app',
            path: '/graphql/v2',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    for (let i = 0; i < 15; i++) {
        const r = await graphql(`query { deployment(id: "${DEPLOY_ID}") { id status } }`);
        const status = r?.data?.deployment?.status;
        const ts = new Date().toLocaleTimeString('pt-BR');
        console.log(`[${ts}] Status: ${status}`);
        if (status === 'SUCCESS') { console.log('\n✅ ONLINE! https://lm-passo-production.up.railway.app'); break; }
        if (status === 'FAILED' || status === 'CRASHED') { console.log('\n❌ Falhou:', status); break; }
        await new Promise(r => setTimeout(r, 8000));
    }
}
main().catch(console.error);
