const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SERVICE_ID = 'aace4277-e2be-4dc1-940f-5c35ff3c41e2';
const ENVIRONMENT_ID = 'f44cefb9-5266-4df0-a90d-3a0cef3b8ff6';
const TARGET_START_CMD = 'node server.js';

async function tryProfile(profileName) {
    console.log(`\n--- Testando ${profileName} ---`);
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
    
    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            channel: 'chrome',
            headless: true,
            args: [`--profile-directory=${profileName}`, '--disable-extensions']
        });
        
        const page = await context.newPage();
        console.log(`Acessando Railway com ${profileName}...`);
        await page.goto('https://railway.com/project/838e84c0-dd4a-415e-ace6-68803f1b847c', { timeout: 30000 });
        
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
        
        await context.close();
        
        if (result && result.data && result.data.serviceInstanceUpdate) {
            console.log(`✅ SUCESSO com ${profileName}!`);
            return true;
        } else {
            console.log(`❌ Falha com ${profileName}:`, JSON.stringify(result));
            return false;
        }
    } catch (e) {
        console.error(`Erro ao usar ${profileName}:`, e.message);
        if (context) await context.close();
        return false;
    }
}

async function run() {
    const profiles = ['Profile 3', 'Profile 4', 'Profile 9', 'Default'];
    for (const p of profiles) {
        const success = await tryProfile(p);
        if (success) {
            console.log('\nFinalizado com sucesso!');
            process.exit(0);
        }
    }
    console.log('\nNenhum perfil funcionou.');
    process.exit(1);
}

run();
