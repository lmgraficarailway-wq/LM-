const https = require('https');
// Reverter o pedido 285 para em_balcao via move-status
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
        const body = JSON.stringify({ status: 'em_balcao' });
        const putOpts = {
            hostname: 'lm-passo-production.up.railway.app',
            path: '/api/orders/285/move-status',
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Authorization: 'Bearer ' + token }
        };
        const putReq = https.request(putOpts, res2 => {
            let d2 = '';
            res2.on('data', c => d2 += c);
            res2.on('end', () => {
                console.log('Revert status:', res2.statusCode, d2);
                process.exit(0);
            });
        });
        putReq.on('error', e => { console.error(e); process.exit(1); });
        putReq.write(body);
        putReq.end();
    });
});
loginReq.on('error', e => { console.error(e); process.exit(1); });
loginReq.write(loginData);
loginReq.end();
