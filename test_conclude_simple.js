const https = require('https');
const opts = {
    hostname: 'lm-passo-production.up.railway.app',
    path: '/api/orders/999/conclude-simple',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
};
const req = https.request(opts, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', d.substring(0, 200));
        // 404 means order not found (good - route exists!)
        // 404 with HTML means route doesn't exist (bad)
        if (res.statusCode === 404 && d.includes('Pedido não encontrado')) {
            console.log('\n✅ ROTA /conclude-simple EXISTE no Railway!');
        } else if (d.includes('cannot PUT') || d.includes('Cannot PUT')) {
            console.log('\n❌ ROTA /conclude-simple AINDA NAO EXISTE - deploy em andamento');
        } else {
            console.log('\nResposta:', d);
        }
        process.exit(0);
    });
});
req.on('error', err => { console.error('Erro:', err.message); process.exit(1); });
req.write(JSON.stringify({ carrier: null, dispatch_amount: 0 }));
req.end();
