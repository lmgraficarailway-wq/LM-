const { chromium } = require('playwright');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function run() {
    console.log('Conectando ao Chrome em execução...');
    try {
        const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        const defaultContext = browser.contexts()[0];
        
        console.log('Criando nova aba...');
        const page = await defaultContext.newPage();
        
        console.log('Acessando Railway...');
        await page.goto('https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c', { timeout: 30000 });
        
        console.log('Tentando corrigir o startCommand via GraphQL...');
        const result = await page.evaluate(async ({ serviceId, environmentId, cmd }) => {
            try {
                const response = await fetch('https://backboard.railway.com/graphql/v2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        query: `mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { 
                            serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) 
                        }`,
                        variables: { serviceId, environmentId, input: { startCommand: cmd } }
                    }),
                    credentials: 'include'
                });
                return await response.json();
            } catch (e) {
                return { error: e.message };
            }
        }, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, cmd: TARGET_START_CMD });
        
        console.log('Resultado:', JSON.stringify(result, null, 2));
        
        if (result && result.data && result.data.serviceInstanceUpdate) {
            console.log('✅ SUCESSO! Alterado para: node server.js');
        } else {
            console.log('❌ FALHOU. Result:', result);
        }
        
        await page.close();
        await browser.close();
    } catch (e) {
        console.error('Erro geral:', e.message);
    }
}
run();
