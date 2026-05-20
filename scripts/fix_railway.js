/**
 * fix_railway.js
 * Usa Playwright para abrir o Railway, extrair o token de auth
 * e chamar a API GraphQL para corrigir o startCommand
 */

const { chromium } = require('playwright');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function fixRailway() {
    console.log('Iniciando Playwright...');
    
    // Usa o perfil do Edge existente para aproveitar a sessão
    const userDataDir = `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\User Data`;
    
    const context = await chromium.launchPersistentContext(userDataDir, {
        channel: 'msedge',
        headless: false,
        viewport: { width: 1280, height: 800 },
        args: ['--profile-directory=Default']
    });
    
    const page = await context.newPage();
    
    console.log('Navegando para Railway settings...');
    await page.goto(`https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c/service/${SERVICE_ID}/settings`, {
        waitUntil: 'networkidle',
        timeout: 30000
    });
    
    console.log('Página carregada. Capturando screenshot...');
    await page.screenshot({ path: 'scripts/railway_playwright.png' });
    
    // Tenta extrair o token de auth
    const token = await page.evaluate(() => {
        // Tenta localStorage
        for (const key of Object.keys(localStorage)) {
            if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
                return localStorage.getItem(key);
            }
        }
        return null;
    });
    
    if (token) {
        console.log('Token encontrado:', token.substring(0, 20) + '...');
    }
    
    // Tenta clicar na aba Settings se não estiver lá
    try {
        const settingsTab = await page.locator('text=Settings').first();
        await settingsTab.click();
        await page.waitForTimeout(2000);
    } catch (e) {
        console.log('Já está na aba Settings');
    }
    
    // Procura o campo de startCommand
    const startCmdSelectors = [
        'input[value*="node server"]',
        'input[value*="curl"]',
        'input[placeholder*="command"]',
        'input[placeholder*="Command"]',
        '[data-testid="startCommand"]',
        'input[name="startCommand"]'
    ];
    
    let found = false;
    for (const selector of startCmdSelectors) {
        try {
            const el = await page.locator(selector).first();
            const count = await el.count();
            if (count > 0) {
                console.log(`Campo encontrado com seletor: ${selector}`);
                await el.fill(TARGET_START_CMD);
                console.log('Valor preenchido:', TARGET_START_CMD);
                found = true;
                break;
            }
        } catch (e) {}
    }
    
    if (!found) {
        // Tenta via API GraphQL diretamente
        console.log('Campo não encontrado - tentando via API GraphQL...');
        
        const result = await page.evaluate(async ({ serviceId, environmentId, cmd }) => {
            const response = await fetch('https://backboard.railway.com/graphql/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            return response.json();
        }, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, cmd: TARGET_START_CMD });
        
        console.log('Resultado GraphQL:', JSON.stringify(result, null, 2));
        
        if (result.errors) {
            console.log('ERROS:', JSON.stringify(result.errors));
        } else {
            console.log('SUCCESS! startCommand atualizado para:', TARGET_START_CMD);
        }
    }
    
    await page.screenshot({ path: 'scripts/railway_playwright_final.png' });
    console.log('Screenshot salva: scripts/railway_playwright_final.png');
    
    await context.close();
}

fixRailway().catch(console.error);
