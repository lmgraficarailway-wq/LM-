/**
 * trigger_railway_redeploy.js
 * Usa o token do Railway para fazer redeploy via GraphQL API
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

async function callGraphQL(token, query, variables) {
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
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    const token = getToken();
    console.log('Token obtido!');
    
    const serviceId = 'aace4273-4c36-4df5-8376-781e61cefd30';
    const environmentId = 'e762833f-c52e-4e40-9ca8-289d960f0360';
    
    // 1. Verifica o startCommand atual
    const checkQuery = `
        query {
            serviceInstance(serviceId: "${serviceId}", environmentId: "${environmentId}") {
                startCommand
                source {
                    ... on ServiceSourceImage {
                        image
                    }
                    ... on ServiceSourceRepo {
                        repo
                        branch
                    }
                }
            }
        }
    `;
    
    console.log('\n📊 Verificando configuração atual do serviço...');
    const checkResult = await callGraphQL(token, checkQuery, {});
    console.log('Config atual:', JSON.stringify(checkResult.data || checkResult, null, 2));
    
    // 2. Dispara um novo deployment
    const deployMutation = `
        mutation {
            serviceInstanceRedeploy(serviceId: "${serviceId}", environmentId: "${environmentId}")
        }
    `;
    
    console.log('\n🚀 Disparando redeploy...');
    const deployResult = await callGraphQL(token, deployMutation, {});
    console.log('Resultado redeploy:', JSON.stringify(deployResult, null, 2));
}

main().catch(console.error);
