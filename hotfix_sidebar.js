// Hotfix: Injeta correção do CSS da sidebar no servidor Railway via endpoint existente
const https = require('https');
const fs = require('fs');
const path = require('path');

const RAILWAY_HOST = 'lm-passo-production.up.railway.app';
const TOKEN = 'lm-passo-admin-upload-123';

// Ler o kanban.js atual
const kanbanPath = path.join(__dirname, 'public/js/components/kanban.js');
let kanbanContent = fs.readFileSync(kanbanPath, 'utf8');

// Snippet de injeção de CSS — corrige sidebar sem redeploy
const cssInjection = `// === HOTFIX SIDEBAR CSS 2026-05-18-v3 ===
(function() {
    const old = document.getElementById('sidebar-hotfix-css');
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = 'sidebar-hotfix-css';
    style.textContent = \`
        .sidebar { overflow: hidden !important; }
        .sidebar:hover { width: 280px !important; padding: 0.75rem 1rem !important; }
        .sidebar-header { flex-shrink: 0 !important; margin-bottom: 1.4rem !important; padding-bottom: 0.75rem !important; overflow: hidden !important; }
        .sidebar-header img { width: 26px !important; height: 26px !important; }
        .sidebar-header .nav-text { font-size: 0.95rem !important; margin-left: 0.4rem !important; }
        .nav-links { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; }
        .nav-item { margin-bottom: 0.45rem !important; }
        .nav-link { height: 38px !important; padding: 0.4rem 0.8rem !important; }
        .nav-text { font-size: 0.75rem !important; margin-left: 0.8rem !important; }
        .sidebar-clock { flex-shrink: 0 !important; overflow: hidden !important; }
        .sidebar:hover .sidebar-clock { opacity: 1 !important; max-height: 70px !important; padding: 0.35rem 0.5rem !important; }
        .clock-time { font-size: 0.9rem !important; letter-spacing: 0.03em !important; }
        .clock-date { font-size: 0.6rem !important; margin-top: 1px !important; }
        .user-info { flex-shrink: 0 !important; padding-top: 0.35rem !important; }
        .user-info .nav-link { height: 34px !important; }
        .user-info div.nav-text { font-size: 0.68rem !important; margin-bottom: 0.2rem !important; }
    \`;
    document.head.appendChild(style);
})();
// === FIM HOTFIX ===

`;

// Prepend o CSS fix no kanban.js
const fixedContent = cssInjection + kanbanContent;

// Enviar para o Railway via endpoint update-kanban
const base64 = Buffer.from(fixedContent).toString('base64');
const body = JSON.stringify({ token: TOKEN, kanban_base64: base64 });

console.log('Enviando hotfix CSS para Railway via kanban endpoint...');
console.log('Tamanho:', Math.round(fixedContent.length / 1024) + 'KB');

const options = {
    hostname: RAILWAY_HOST,
    path: '/api/admin/update-kanban',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status HTTP:', res.statusCode);
        try {
            const parsed = JSON.parse(data);
            if (parsed.success) {
                console.log('✅ Hotfix enviado com sucesso!');
                console.log('Tamanho no servidor:', parsed.size, 'chars');
                console.log('\n🎉 Recarregue o sistema agora (CTRL+F5)!');
            } else {
                console.log('❌ Erro:', parsed.error);
            }
        } catch(e) {
            console.log('Resposta bruta:', data.substring(0, 300));
        }
    });
});

req.on('error', err => console.error('Erro de conexão:', err.message));
req.write(body);
req.end();
