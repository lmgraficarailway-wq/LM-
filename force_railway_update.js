// Script para forcar o servidor Railway a fazer git pull e atualizar o codigo
const https = require('https');

// Primeiro precisamos fazer login para pegar o token
const loginData = JSON.stringify({ username: 'gerente', password: 'gerente123' });

const loginOptions = {
    hostname: 'lm-passo-production.up.railway.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};

console.log('Fazendo login no Railway...');
const loginReq = https.request(loginOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Status login:', res.statusCode);
            if (parsed.token) {
                console.log('Token obtido:', parsed.token.substring(0, 30) + '...');
                console.log('Role:', parsed.user?.role);
                // Tentar git-push com o token
                triggerGitPush(parsed.token);
            } else {
                console.log('Resposta:', JSON.stringify(parsed));
            }
        } catch(e) {
            console.log('Erro parsear resposta:', e.message);
            console.log('Raw:', data.substring(0, 500));
        }
    });
});
loginReq.on('error', err => console.error('Erro login:', err.message));
loginReq.write(loginData);
loginReq.end();

function triggerGitPush(token) {
    const pushOptions = {
        hostname: 'lm-passo-production.up.railway.app',
        path: '/api/admin/git-push',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    };

    console.log('\nTentando git-push no servidor Railway...');
    const pushReq = https.request(pushOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Status git-push:', res.statusCode);
            try {
                console.log('Resposta:', JSON.stringify(JSON.parse(data), null, 2));
            } catch(e) {
                console.log('Raw:', data.substring(0, 500));
            }
            process.exit(0);
        });
    });
    pushReq.on('error', err => console.error('Erro git-push:', err.message));
    pushReq.end();
}
