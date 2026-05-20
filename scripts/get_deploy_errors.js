/**
 * get_deploy_errors.js
 * Verifica os erros detalhados do deployment mais recente
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
    const deployId = '18317bfa-c344-402a-a600-0dfc18c2d03e';
    
    // Verifica o deployment
    const q = `{
        deployment(id: "${deployId}") {
            id
            status
            createdAt
            canRedeploy
            meta
            url
            environmentId
        }
    }`;
    
    const result = await callGraphQL(token, q);
    
    if (result.errors) {
        console.log('Errors:', JSON.stringify(result.errors.map(e => e.message)));
    }
    
    const dep = result.data?.deployment;
    if (dep) {
        console.log('ID:', dep.id);
        console.log('Status:', dep.status);
        console.log('Criado:', dep.createdAt);
        console.log('URL:', dep.url);
        console.log('\nMeta completo:');
        console.log(JSON.stringify(dep.meta, null, 2));
    }
}

main().catch(console.error);
