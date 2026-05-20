/**
 * check_and_fix.js
 * Verifica o startCommand atual e faz update + redeploy
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
    const serviceId = 'aace4273-4c36-4df5-8376-781e61cefd30';
    const environmentId = 'e762833f-c52e-4e40-9ca8-289d960f0360';
    
    // 1. Verifica startCommand atual
    const checkQ = `
        query {
            serviceInstance(serviceId: "${serviceId}", environmentId: "${environmentId}") {
                startCommand
            }
        }
    `;
    const check = await callGraphQL(token, checkQ);
    const currentCmd = check.data?.serviceInstance?.startCommand;
    console.log('📊 StartCommand atual:', JSON.stringify(currentCmd));
    
    // 2. Atualiza startCommand para node server.js
    const updateM = `
        mutation {
            serviceInstanceUpdate(serviceId: "${serviceId}", environmentId: "${environmentId}", input: {startCommand: "node server.js"})
        }
    `;
    const update = await callGraphQL(token, updateM);
    console.log('✏️  Update result:', JSON.stringify(update.data));
    
    // 3. Verifica novamente
    const check2 = await callGraphQL(token, checkQ);
    const newCmd = check2.data?.serviceInstance?.startCommand;
    console.log('📊 StartCommand NOVO:', JSON.stringify(newCmd));
    
    // 4. Dispara redeploy
    const redeployM = `
        mutation {
            serviceInstanceRedeploy(serviceId: "${serviceId}", environmentId: "${environmentId}")
        }
    `;
    const redeploy = await callGraphQL(token, redeployM);
    console.log('🚀 Redeploy result:', JSON.stringify(redeploy.data));
    
    console.log('\n✅ Pronto! Aguardando o container inicializar...');
}

main().catch(console.error);
