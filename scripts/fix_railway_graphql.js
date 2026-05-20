/**
 * fix_railway_graphql.js
 * Usa Playwright com Chromium headless para fazer login no Railway
 * e chamar a GraphQL API para corrigir o startCommand
 */

const { chromium } = require('playwright');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function fixRailway() {
    console.log('Iniciando Playwright Chromium...');
    
    const browser = await chromium.launch({
        headless: false, // Mostra o browser para debug
        args: ['--no-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    
    // Navega para o Railway
    console.log('Navegando para Railway...');
    await page.goto('https://railway.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Captura screenshot para ver estado
    await page.screenshot({ path: 'scripts/railway_step1.png' });
    console.log('Screenshot 1 salva');
    
    // Verifica se está logado
    const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('[href="/dashboard"]') !== null || 
               document.querySelector('.railway-logo') !== null ||
               window.location.pathname.includes('dashboard');
    });
    
    console.log('Logado:', isLoggedIn);
    
    // Se não estiver logado, aguarda e tenta novamente
    if (!isLoggedIn) {
        console.log('Não logado - navegando para login...');
        await page.goto('https://railway.com/login', { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: 'scripts/railway_login.png' });
        console.log('MANUAL: Por favor faça login manualmente na janela do browser...');
        await page.waitForTimeout(30000); // Aguarda 30s para login manual
    }
    
    // Tenta fazer a chamada GraphQL com as cookies da sessão
    console.log('Tentando chamada GraphQL para corrigir startCommand...');
    
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
                        serviceId,
                        environmentId,
                        input: { startCommand: cmd }
                    }
                }),
                credentials: 'include'
            });
            const data = await response.json();
            return { ok: true, data };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, cmd: TARGET_START_CMD });
    
    console.log('Resultado GraphQL:', JSON.stringify(result, null, 2));
    
    if (result.ok && !result.data.errors) {
        console.log('✅ SUCCESS! startCommand corrigido para:', TARGET_START_CMD);
    } else {
        console.log('❌ Falhou. Erros:', result.data?.errors || result.error);
        
        // Alternativa: navega para as settings e tenta editar diretamente
        console.log('Tentando editar via interface...');
        await page.goto(
            `https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c/service/${SERVICE_ID}/settings`,
            { waitUntil: 'networkidle', timeout: 30000 }
        );
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'scripts/railway_settings.png' });
        console.log('Screenshot settings salva');
    }
    
    await browser.close();
}

fixRailway().catch(e => {
    console.error('Erro fatal:', e.message);
    process.exit(1);
});
