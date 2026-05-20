/**
 * get_runtime_logs.js
 * Obtém os logs de runtime do deployment via API do Railway
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getToken() {
    const configPath = path.join(os.homedir(), '.railway', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.user.token;
}

async function callGraphQL(token, query) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query });
        const options = {
            hostname: 'backboard.railway.com',
            port: 443,
            path: '/graphql/v2',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { resolve({ raw: body }); }
            });
        });
        req.setTimeout(30000, () => { reject(new Error('Timeout')); req.destroy(); });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    const token = getToken();
    const deployId = 'eb656013-5e44-4ebf-b28e-ad8f3db9fdd0';
    
    // Tenta pegar os logs via buildLogs ou deploymentLogs
    const queries = [
        `{ buildLogs(deploymentId: "${deployId}") { message timestamp } }`,
        `{ deploymentLogs(deploymentId: "${deployId}") { message timestamp } }`,
        `{ deployment(id: "${deployId}") { id status buildLogs { message } } }`,
        `{ deployment(id: "${deployId}") { id status deploymentLogs { message } } }`,
    ];
    
    for (const q of queries) {
        const result = await callGraphQL(token, q);
        if (!result.errors) {
            console.log('Query funcional:', q.substring(0, 50));
            console.log(JSON.stringify(result.data, null, 2).substring(0, 2000));
            break;
        } else {
            console.log('Erro em:', q.substring(0, 50), '->', result.errors[0]?.message);
        }
    }
}

main().catch(console.error);
