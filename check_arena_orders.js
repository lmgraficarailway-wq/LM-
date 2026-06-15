const https = require('https');

const API_BASE = 'https://lm-passo-api-61970172348.southamerica-east1.run.app';

const get = (path) => new Promise((resolve, reject) => {
    https.get(API_BASE + path, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch(e) { resolve({ raw: data.slice(0, 500) }); }
        });
    }).on('error', reject);
});

async function main() {
    console.log('=== Verificando pedidos Arena na API de produção ===\n');

    // 1. Arena financial endpoint atual
    const arena = await get('/api/reports/arena-financial');
    console.log(`Arena financial (client_id=7): ${arena.total || 0} pedidos`);
    if (arena.data && arena.data.length > 0) {
        arena.data.slice(0, 5).forEach(o => 
            console.log(`  [${o.status}] ${o.client_name || 'N/A'} - R$${o.total_value} - ${o.payment_method} - ${o.products_summary?.slice(0,40)}`));
    }

    // 2. Todos os pedidos (para ver status existentes)
    const all = await get('/api/orders');
    const orders = all.data || all || [];
    const arenaOrders = orders.filter(o => 
        o.client_id === 7 || 
        (o.client_name && o.client_name.toLowerCase().includes('arena'))
    );
    console.log(`\nTodos os pedidos com arena (qualquer status): ${arenaOrders.length}`);
    
    const byStatus = {};
    arenaOrders.forEach(o => {
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });
    console.log('Por status:', JSON.stringify(byStatus));
    
    arenaOrders.slice(0, 10).forEach(o =>
        console.log(`  [ID:${o.id}][${o.status}] client_id:${o.client_id} nome:${o.client_name} - R$${o.total_value} - ${o.payment_method} - lançado_core:${o.launched_to_core}`));
}

main().catch(e => console.error('Erro:', e.message));
