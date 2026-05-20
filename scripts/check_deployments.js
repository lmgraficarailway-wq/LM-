/**
 * check_deployments.js
 * Verifica os últimos deployments e seu status
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
    
    // Verifica deployments recentes
    const q = `
        query {
            deployments(
                input: {
                    serviceId: "${serviceId}",
                    environmentId: "${environmentId}"
                }
                first: 5
            ) {
                edges {
                    node {
                        id
                        status
                        createdAt
                        url
                        staticUrl
                        meta {
                            ... on DeploymentMeta {
                                startCommand
                            }
                        }
                    }
                }
            }
        }
    `;
    
    const result = await callGraphQL(token, q);
    
    if (result.errors) {
        console.error('Errors:', JSON.stringify(result.errors, null, 2));
        
        // Tenta outra query
        const q2 = `
            query {
                service(id: "${serviceId}") {
                    id
                    name
                    deployments(first: 5) {
                        edges {
                            node {
                                id
                                status
                                createdAt
                            }
                        }
                    }
                }
            }
        `;
        const r2 = await callGraphQL(token, q2);
        console.log('Service deployments:', JSON.stringify(r2.data || r2, null, 2));
        return;
    }
    
    const deployments = result.data?.deployments?.edges || [];
    console.log(`\n📋 Últimos ${deployments.length} deployments:\n`);
    deployments.forEach(({ node }) => {
        console.log(`  ID: ${node.id}`);
        console.log(`  Status: ${node.status}`);
        console.log(`  Criado: ${node.createdAt}`);
        console.log(`  URL: ${node.url || node.staticUrl || 'N/A'}`);
        console.log('  ---');
    });
}

main().catch(console.error);
