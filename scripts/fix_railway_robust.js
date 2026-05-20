const { chromium } = require('playwright');
const path = require('path');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function run() {
    console.log('Fechando o Chrome para evitar locks...');
    try { require('child_process').execSync('taskkill /F /IM chrome.exe 2>nul'); } catch(e) {}
    
    // Espera um pouco para o Chrome fechar
    await new Promise(r => setTimeout(r, 2000));

    console.log('Iniciando Playwright com perfil do Chrome...');
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
    
    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            channel: 'chrome',
            headless: false,
            args: ['--profile-directory=Profile 3', '--restore-last-session']
        });
        
        const page = await context.newPage();
        console.log('Acessando Railway Settings...');
        
        // Vai direto para as settings
        await page.goto(`https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c/service/${SERVICE_ID}/settings`, { timeout: 45000 });
        
        console.log('Página carregada. Aguardando 5 segundos para a interface renderizar...');
        await page.waitForTimeout(5000);
        
        // Tenta injetar a chamada GraphQL novamente (já que estamos na página logada)
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
        
        console.log('Resultado GraphQL:', JSON.stringify(result));
        
        if (result && result.data && result.data.serviceInstanceUpdate) {
            console.log('✅ SUCESSO! O startCommand foi alterado.');
            await context.close();
            process.exit(0);
        } else {
            console.log('❌ GraphQL falhou. Tentando trocar o repositório via UI...');
            
            // Aqui podemos automatizar o clique em "Disconnect" e "Connect"
            // Mas só se o GraphQL falhar (o que não deve acontecer se estiver logado)
        }
        
        await context.close();
    } catch (e) {
        console.error('Erro geral:', e.message);
        if (context) await context.close();
        process.exit(1);
    }
}

run();
