/**
 * check_deploy_logs.js
 * Verifica os logs de um deployment específico
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

async function callGraphQL(token, query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });
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
    
    // Pega o deployment mais recente (FAILED)
    const deployId = '911126c1-124a-44ab-bc59-bd3b204243c1';
    
    // Tenta pegar logs do deployment
    const q = `
        query {
            deployment(id: "${deployId}") {
                id
                status
                createdAt
                logs(limit: 100) {
                    timestamp
                    message
                }
            }
        }
    `;
    
    const result = await callGraphQL(token, q);
    
    if (result.errors) {
        console.log('GraphQL errors:', JSON.stringify(result.errors.map(e => e.message), null, 2));
        
        // Tenta sem os logs
        const q2 = `
            query {
                deployment(id: "${deployId}") {
                    id
                    status
                    createdAt
                    canRedeploy
                    url
                    meta
                }
            }
        `;
        const r2 = await callGraphQL(token, q2);
        console.log('Deployment info:', JSON.stringify(r2.data || r2, null, 2));
    } else {
        const d = result.data?.deployment;
        if (d) {
            console.log('Status:', d.status);
            console.log('Criado:', d.createdAt);
            console.log('\nLogs:');
            (d.logs || []).forEach(l => console.log(l.timestamp, ':', l.message));
        } else {
            console.log('Response:', JSON.stringify(result, null, 2));
        }
    }
}

main().catch(console.error);
