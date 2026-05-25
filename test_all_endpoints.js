const https = require('https');

const BASE = 'https://lm-passo-api-61970172348.southamerica-east1.run.app';

const endpoints = [
    '/api/orders',
    '/api/clients',
    '/api/products',
    '/api/catalogue',
    '/api/stock',
    '/api/stock/movements',
    '/api/suppliers',
    '/api/purchases',
    '/api/reminders',
    '/api/menu-orders',
    '/api/chat/history',
    '/api/reports/sales',
    '/api/reports/product-demand',
    '/api/reports/dispatch-costs',
    '/api/orders/archived',
    '/api/reminders/pending-count',
];

async function testEndpoint(path) {
    return new Promise(resolve => {
        const url = BASE + path;
        https.get(url, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(b);
                    const count = json.data ? json.data.length : (json.messages ? json.messages.length : (json.count !== undefined ? json.count : '?'));
                    resolve({ path, status: res.statusCode, ok: res.statusCode === 200, count, error: json.error || null });
                } catch(e) {
                    resolve({ path, status: res.statusCode, ok: false, count: 0, error: b.substring(0, 100) });
                }
            });
        }).on('error', e => resolve({ path, status: 0, ok: false, count: 0, error: e.message }));
    });
}

async function run() {
    console.log('\n🔍 TESTANDO TODOS OS ENDPOINTS...\n');
    const results = await Promise.all(endpoints.map(testEndpoint));
    
    let passed = 0, failed = 0;
    for (const r of results) {
        if (r.ok) {
            console.log(`  ✅ ${r.path} → ${r.count} registros`);
            passed++;
        } else {
            console.log(`  ❌ ${r.path} → HTTP ${r.status} | ${r.error}`);
            failed++;
        }
    }
    console.log(`\n📊 Resultado: ${passed} OK, ${failed} com PROBLEMA\n`);
    process.exit(0);
}

run().catch(console.error);
