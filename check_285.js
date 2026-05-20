const https = require('https');
// Reverter o pedido 285 diretamente via conclude... mas precisamos de um endpoint PUT orders/:id
// Vou usar o admin/restore mas primeiro verificar qual endpoint aceita
// Tentar PATCH direto no banco via update-kanban hotfix... ou usar move-status com status diferente
// Vamos tentar com o endpoint de conclude novamente mas voltando o status
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
        // Tentar update-kanban para escrever SQL direto... nao, vamos usar o endpoint de pay que usa PUT
        // Verificar o status atual do pedido 285
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
                const order285 = orders.find(o => o.id === 285);
                console.log('Pedido 285 status atual:', order285 ? order285.status : 'não encontrado');
                process.exit(0);
            });
        });
    });
});
loginReq.on('error', e => { console.error(e); process.exit(1); });
loginReq.write(loginData);
loginReq.end();
