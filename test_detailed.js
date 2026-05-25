/**
 * Testa os endpoints que precisam de um ID específico e ações POST/PUT/DELETE
 */
const https = require('https');

const BASE = 'https://lm-passo-api-61970172348.southamerica-east1.run.app';

function req(method, path, body) {
    return new Promise(resolve => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'lm-passo-api-61970172348.southamerica-east1.run.app',
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = https.request(opts, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(b) });
                } catch(e) {
                    resolve({ status: res.statusCode, body: b.substring(0, 200) });
                }
            });
        });
        r.on('error', e => resolve({ status: 0, body: e.message }));
        if (data) r.write(data);
        r.end();
    });
}

async function run() {
    console.log('\n🔍 TESTANDO ENDPOINTS DETALHADOS...\n');

    // 1. Order items para um pedido
    const r1 = await req('GET', '/api/orders/100/items');
    console.log('GET /api/orders/100/items:', r1.status, r1.body?.data?.length ?? r1.body?.error ?? r1.body);

    // 2. Comments de um pedido
    const r2 = await req('GET', '/api/orders/100/comments');
    console.log('GET /api/orders/100/comments:', r2.status, r2.body?.data?.length ?? r2.body?.error ?? r2.body);

    // 3. Color variants de produto
    const r3 = await req('GET', '/api/products/15/colors');
    console.log('GET /api/products/15/colors:', r3.status, r3.body?.data?.length ?? r3.body?.error ?? r3.body);

    // 4. Kits de produto
    const r4 = await req('GET', '/api/products/15/kits');
    console.log('GET /api/products/15/kits:', r4.status, r4.body?.data?.length ?? r4.body?.error ?? r4.body);

    // 5. Client access credentials
    const r5 = await req('GET', '/api/clients/1/access-credentials');
    console.log('GET /api/clients/1/access-credentials:', r5.status, JSON.stringify(r5.body).substring(0, 80));

    // 6. Client credit movements
    const r6 = await req('GET', '/api/clients/1/credit-movements');
    console.log('GET /api/clients/1/credit-movements:', r6.status, r6.body?.data?.length ?? r6.body?.error ?? r6.body);

    // 7. Product costs
    const r7 = await req('GET', '/api/products/15/costs');
    console.log('GET /api/products/15/costs:', r7.status, r7.body?.data?.length ?? r7.body?.error ?? r7.body);

    // 8. Sales report com datas
    const r8 = await req('GET', '/api/reports/sales?start=2026-01-01&end=2026-12-31');
    console.log('GET /api/reports/sales (2026):', r8.status, r8.body?.data?.length ?? r8.body?.error ?? r8.body);

    // 9. Client orders report
    const r9 = await req('GET', '/api/reports/client-orders/1');
    console.log('GET /api/reports/client-orders/1:', r9.status, r9.body?.data?.length ?? r9.body?.error ?? JSON.stringify(r9.body).substring(0,80));

    // 10. Client financial report
    const r10 = await req('GET', '/api/reports/client-financial/1');
    console.log('GET /api/reports/client-financial/1:', r10.status, JSON.stringify(r10.body).substring(0,100));

    // 11. Auth login
    const r11 = await req('POST', '/api/auth/login', { username: 'master', password: 'master123' });
    console.log('POST /api/auth/login:', r11.status, r11.body?.token ? 'TOKEN OK' : (r11.body?.error ?? r11.body));

    // 12. Material costs report
    const r12 = await req('GET', '/api/reports/material-costs');
    console.log('GET /api/reports/material-costs:', r12.status, r12.body?.data?.length ?? r12.body?.error ?? r12.body);

    console.log('\n✅ Teste detalhado concluído!\n');
    process.exit(0);
}

run().catch(console.error);
