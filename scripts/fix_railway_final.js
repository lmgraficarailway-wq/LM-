const { chromium } = require('playwright');
const path = require('path');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function run() {
    console.log('Iniciando Playwright com perfil do Edge...');
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data');
    
    // Usando o Edge do sistema
    const context = await chromium.launchPersistentContext(userDataDir, {
        channel: 'msedge',
        headless: false,
        args: ['--profile-directory=Default', '--disable-extensions']
    });
    
    const page = await context.newPage();
    console.log('Navegando para o Railway...');
    
    // Carrega a página inicial só para que as requisições para a API não sejam bloqueadas por CORS/Sec-Fetch-Site
    await page.goto('https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c', { timeout: 30000 });
    console.log('Página carregada, injetando chamada GraphQL...');
    
    const result = await page.evaluate(async ({ serviceId, environmentId, cmd }) => {
        try {
            const response = await fetch('https://backboard.railway.com/graphql/v2', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query: `mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) { 
                        serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input) 
                    }`,
                    variables: {
                        serviceId: serviceId,
                        environmentId: environmentId,
                        input: { startCommand: cmd }
                    }
                }),
                credentials: 'include'
            });
            return await response.json();
        } catch (e) {
            return { error: e.message };
        }
    }, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, cmd: TARGET_START_CMD });
    
    console.log('Resultado GraphQL:', JSON.stringify(result, null, 2));
    
    if (result && result.data && result.data.serviceInstanceUpdate) {
        console.log('SUCESSO! O comando de inicializacao foi corrigido para: node server.js');
    } else {
        console.log('FALHOU ou retornou erros.');
    }
    
    await context.close();
}

run().catch(e => {
    console.error('Erro na execução:', e.message);
    process.exit(1);
});
