/**
 * auto_push.js
 * ============================================
 * Monitora mudanças no projeto e envia automaticamente
 * para o GitHub, que dispara o deploy no Render.
 *
 * Roda em background quando INICIAR_REDE.bat é iniciado.
 */

const { execSync, exec } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_INTERVAL = 30 * 1000; // verifica a cada 30 segundos
let lastPushTime = 0;
const MIN_PUSH_INTERVAL = 60 * 1000; // mínimo 1 minuto entre pushes

function runGit(cmd) {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function hasChanges() {
    try {
        const status = runGit('git status --porcelain -- server/ public/ server.js package.json render.yaml .npmrc');
        return status.length > 0;
    } catch {
        return false;
    }
}

function isAheadOfRemote() {
    try {
        const ahead = runGit('git rev-list @{u}..HEAD --count');
        return parseInt(ahead) > 0;
    } catch {
        return false;
    }
}

function getChangedFiles() {
    try {
        return runGit('git diff --name-only HEAD').split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

async function checkAndPush() {
    const now = Date.now();
    if (now - lastPushTime < MIN_PUSH_INTERVAL) return;

    try {
        const changed = hasChanges();
        const ahead = isAheadOfRemote();

        if (!changed && !ahead) return;

        console.log('\n🚀 [Auto-Deploy] Mudanças detectadas, preparando envio...');

        if (changed) {
            // Adiciona só arquivos de código (não dados nem logs)
            runGit('git add server/ public/ server.js package.json render.yaml .npmrc scripts/');
            
            const status = runGit('git status --porcelain');
            if (!status) {
                if (!ahead) return; // nada novo
            } else {
                const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                runGit(`git commit -m "auto: atualizacao automatica - ${timestamp}"`);
                console.log(`   ✅ Commit criado`);
            }
        }

        // Push para GitHub
        console.log('   📤 Enviando para GitHub...');
        runGit('git push origin main');
        lastPushTime = Date.now();
        console.log('   ✅ Enviado! Render está fazendo o deploy automaticamente.');
        console.log(`   🌐 Acompanhe em: https://lm-passo.onrender.com\n`);

    } catch (err) {
        // Silencioso para não poluir o terminal do usuário
        if (process.env.DEBUG_AUTOPUSH) {
            console.log('[Auto-Deploy] Erro:', err.message);
        }
    }
}

// Inicia o monitoramento
console.log('👁️  Auto-Deploy ativo — mudanças serão enviadas automaticamente ao Render');
setInterval(checkAndPush, CHECK_INTERVAL);

// Verificação inicial após 10 segundos
setTimeout(checkAndPush, 10 * 1000);
