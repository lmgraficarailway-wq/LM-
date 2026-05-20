/**
 * get_railway_token.js
 * Extrai o token do Railway CLI e usa a API GraphQL para corrigir o startCommand
 */

const { execSync } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');

// O Railway CLI usa keytar/keychain no Windows
// Tenta ler do registro ou arquivo de config
function findRailwayToken() {
    // Tenta 1: Variável de ambiente
    if (process.env.RAILWAY_TOKEN) {
        console.log('Token encontrado via env RAILWAY_TOKEN');
        return process.env.RAILWAY_TOKEN;
    }
    
    // Tenta 2: Arquivo de config do railway CLI (versões antigas)
    const possiblePaths = [
        path.join(os.homedir(), '.railway', 'config.json'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'railway', 'config.json'),
        path.join(os.homedir(), 'AppData', 'Local', 'railway', 'config.json'),
        path.join(os.homedir(), '.config', 'railway', 'config.json'),
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            try {
                const config = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (config.token) {
                    console.log('Token encontrado em:', p);
                    return config.token;
                }
                if (config.user && config.user.token) {
                    console.log('Token (user) encontrado em:', p);
                    return config.user.token;
                }
                console.log('Config encontrada mas sem token:', p, JSON.stringify(config).substring(0, 200));
            } catch (e) {
                console.log('Erro ao ler config:', p, e.message);
            }
        }
    }
    
    // Tenta 3: PowerShell para ler keychain do Windows
    try {
        const result = execSync(`powershell -ExecutionPolicy Bypass -Command "
            [void][Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType = WindowsRuntime]
            $vault = New-Object Windows.Security.Credentials.PasswordVault
            try {
                $cred = $vault.Retrieve('railway', 'token')
                $cred.RetrievePassword()
                Write-Host $cred.Password
            } catch {
                Write-Host 'NOT_FOUND'
            }
        "`, { encoding: 'utf8' }).trim();
        
        if (result && result !== 'NOT_FOUND' && result.length > 10) {
            console.log('Token encontrado via Windows Vault');
            return result;
        }
    } catch (e) {
        console.log('Windows Vault não acessível:', e.message);
    }
    
    return null;
}

async function callRailwayGraphQL(token, query, variables) {
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
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({ raw: body });
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    const token = findRailwayToken();
    
    if (!token) {
        console.error('❌ Não foi possível encontrar o token do Railway CLI.');
        console.error('Dica: Execute "railway login" primeiro.');
        process.exit(1);
    }
    
    console.log('✅ Token encontrado! Conectando à API do Railway...');
    
    // SERVICE_ID do lm-passo (da lista de variáveis)
    const serviceId = 'aace4273-4c36-4df5-8376-781e61cefd30';
    const environmentId = 'e762833f-c52e-4e40-9ca8-289d960f0360';
    
    // Primeiro verifica o serviço atual
    const query = `
        query GetService($serviceId: String!, $environmentId: String!) {
            service(id: $serviceId) {
                id
                name
                serviceInstances {
                    edges {
                        node {
                            startCommand
                            environmentId
                        }
                    }
                }
            }
        }
    `;
    
    try {
        const result = await callRailwayGraphQL(token, query, { serviceId, environmentId });
        console.log('Resposta da API:', JSON.stringify(result, null, 2).substring(0, 1000));
        
        if (result.errors) {
            console.error('Erros GraphQL:', result.errors);
        }
        
        // Mutation para corrigir o startCommand
        const mutation = `
            mutation UpdateServiceInstance($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
                serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
            }
        `;
        
        const mutationVars = {
            serviceId,
            environmentId,
            input: {
                startCommand: 'node server.js'
            }
        };
        
        console.log('\nAtualizando startCommand para "node server.js"...');
        const mutationResult = await callRailwayGraphQL(token, mutation, mutationVars);
        console.log('Resultado da mutation:', JSON.stringify(mutationResult, null, 2));
        
    } catch (e) {
        console.error('Erro:', e.message);
    }
}

main();
