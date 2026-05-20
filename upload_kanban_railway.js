// Script para fazer upload do kanban.js correto diretamente para o Railway via HTTP
const https = require('https');
const fs = require('fs');
const path = require('path');

// Ler o arquivo kanban.js local (corrigido)
const kanbanPath = path.join(__dirname, 'public/js/components/kanban.js');
const kanbanContent = fs.readFileSync(kanbanPath, 'utf8');
const kanbanBase64 = Buffer.from(kanbanContent).toString('base64');

console.log('kanban.js local:', kanbanContent.length, 'chars');
console.log('Tem conclude-btn?', kanbanContent.includes('conclude-btn') ? 'SIM ✅' : 'NAO ❌');

// Login
const loginData = JSON.stringify({ username: 'gerente', password: 'gerente123' });
const loginOptions = {
    hostname: 'lm-passo-production.up.railway.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
};

console.log('\nFazendo login...');
const loginReq = https.request(loginOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.token) {
            uploadKanban(parsed.token);
        } else {
            console.log('Login falhou:', data);
        }
    });
});
loginReq.on('error', err => console.error('Erro:', err));
loginReq.write(loginData);
loginReq.end();

function uploadKanban(token) {
    const body = JSON.stringify({ token: 'lm-passo-admin-upload-123', kanban_base64: kanbanBase64 });
    const options = {
        hostname: 'lm-passo-production.up.railway.app',
        path: '/api/admin/update-kanban',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': 'Bearer ' + token
        }
    };

    console.log('Enviando kanban.js para Railway...');
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Resposta:', data.substring(0, 200));
            process.exit(0);
        });
    });
    req.on('error', err => console.error('Erro upload:', err));
    req.write(body);
    req.end();
}
