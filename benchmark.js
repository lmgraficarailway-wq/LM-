/**
 * Mede o tempo real de cada endpoint para identificar os mais lentos
 */
const https = require('https');

function timeRequest(path) {
    return new Promise(resolve => {
        const start = Date.now();
        https.get(`https://lm-passo-api-61970172348.southamerica-east1.run.app${path}`, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                const ms = Date.now() - start;
                try {
                    const json = JSON.parse(b);
                    const count = json.data?.length ?? json.messages?.length ?? json.count ?? '?';
                    resolve({ path, ms, count, status: res.statusCode });
                } catch(e) {
                    resolve({ path, ms, count: '?', status: res.statusCode });
                }
            });
        }).on('error', e => resolve({ path, ms: -1, count: 0, status: 0 }));
    });
}

async function run() {
    const endpoints = [
        '/api/orders',
        '/api/clients',
        '/api/products',
        '/api/catalogue',
        '/api/stock',
        '/api/reminders',
        '/api/suppliers',
        '/api/orders/archived',
        '/api/menu-orders',
        '/api/chat/history',
        '/api/reports/sales',
        '/api/reports/product-demand',
        '/api/reports/dispatch-costs',
    ];

    console.log('\n⏱️  MEDINDO TEMPO DE RESPOSTA DOS ENDPOINTS (2 rodadas)\n');

    // Rodada 1 — cache frio
    console.log('--- RODADA 1 (cache frio) ---');
    const r1 = await Promise.all(endpoints.map(timeRequest));
    r1.sort((a, b) => b.ms - a.ms);
    r1.forEach(r => {
        const bar = '█'.repeat(Math.min(40, Math.floor(r.ms / 50)));
        const emoji = r.ms > 2000 ? '🔴' : r.ms > 800 ? '🟡' : '🟢';
        console.log(`${emoji} ${r.ms.toString().padStart(5)}ms [${r.count}] ${r.path}`);
    });

    // Aguarda 1s
    await new Promise(r => setTimeout(r, 1000));

    // Rodada 2 — cache quente
    console.log('\n--- RODADA 2 (cache quente) ---');
    const r2 = await Promise.all(endpoints.map(timeRequest));
    r2.sort((a, b) => b.ms - a.ms);
    r2.forEach(r => {
        const emoji = r.ms > 2000 ? '🔴' : r.ms > 800 ? '🟡' : '🟢';
        console.log(`${emoji} ${r.ms.toString().padStart(5)}ms [${r.count}] ${r.path}`);
    });

    const avg1 = Math.round(r1.reduce((s,r)=>s+r.ms,0)/r1.length);
    const avg2 = Math.round(r2.reduce((s,r)=>s+r.ms,0)/r2.length);
    console.log(`\n📊 Média rodada 1: ${avg1}ms | Média rodada 2: ${avg2}ms`);
    console.log(`📉 Ganho de cache: ${avg1 - avg2}ms (${Math.round((1-avg2/avg1)*100)}% mais rápido)\n`);

    process.exit(0);
}
run().catch(console.error);
