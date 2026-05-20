const https = require('https');

// Login primeiro
const loginData = JSON.stringify({ username: 'gerente', password: 'gerente123' });
const loginOpts = {
    hostname: 'lm-passo-production.up.railway.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
};

const loginReq = https.request(loginOpts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const { token } = JSON.parse(d);
        
        // Pegar pedidos em em_balcao
        const getOpts = {
            hostname: 'lm-passo-production.up.railway.app',
            path: '/api/orders',
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token }
        };
        
        https.get({ ...getOpts }, res2 => {
            let d2 = '';
            res2.on('data', c => d2 += c);
            res2.on('end', () => {
                const { data: orders } = JSON.parse(d2);
                const emBalcao = orders.filter(o => o.status === 'em_balcao');
                console.log(`Pedidos em em_balcao: ${emBalcao.length}`);
                
                if (emBalcao.length === 0) {
                    console.log('Nenhum pedido em em_balcao para testar');
                    process.exit(0);
                }
                
                // Testar conclude-simple no primeiro pedido
                const orderId = emBalcao[0].id;
                console.log(`Testando conclude-simple no pedido ID: ${orderId} (${emBalcao[0].client_name || 'N/A'})`);
                
                const body = JSON.stringify({ carrier: null, dispatch_amount: 0 });
                const putOpts = {
                    hostname: 'lm-passo-production.up.railway.app',
                    path: `/api/orders/${orderId}/conclude-simple`,
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    }
                };
                
                const putReq = https.request(putOpts, res3 => {
                    let d3 = '';
                    res3.on('data', c => d3 += c);
                    res3.on('end', () => {
                        console.log('Status:', res3.statusCode);
                        console.log('Resposta:', d3);
                        
                        if (res3.statusCode === 200) {
                            console.log('\n✅ PEDIDO FINALIZADO COM SUCESSO!');
                        } else {
                            console.log('\n❌ FALHOU:', d3);
                        }
                        process.exit(0);
                    });
                });
                putReq.on('error', err => { console.error(err); process.exit(1); });
                putReq.write(body);
                putReq.end();
            });
        }).on('error', err => { console.error(err); process.exit(1); });
    });
});
loginReq.on('error', err => { console.error(err); process.exit(1); });
loginReq.write(loginData);
loginReq.end();
