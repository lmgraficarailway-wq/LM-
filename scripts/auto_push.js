/**
 * auto_push.js
 * ============================================
 * Monitora mudanças no LM PASSO e envia automaticamente
 * para o GitHub + Railway (deploy automático).
 *
 * Roda em background quando INICIAR_LM_PASSO.bat é iniciado.
 * ============================================
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const CHECK_INTERVAL = 45 * 1000;       // verifica a cada 45 segundos
const MIN_PUSH_INTERVAL = 90 * 1000;    // mínimo 90s entre pushes
let lastPushTime = 0;
let deployInProgress = false;

function runGit(cmd) {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function runCmd(cmd) {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function log(msg) {
    const ts = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`[${ts}] ${msg}`);
}

function hasChanges() {
    try {
        // Monitora apenas arquivos de código importantes
        const status = runGit('git status --porcelain -- server/ public/ server.js package.json railway.json .railwayignore .gitignore');
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

function arteGeneratorExists() {
    return fs.existsSync(path.join(ROOT, 'arte-generator', 'index.html'));
}

async function checkAndDeploy() {
    if (deployInProgress) return;
    const now = Date.now();
    if (now - lastPushTime < MIN_PUSH_INTERVAL) return;

    try {
        const changed = hasChanges();
        const ahead   = isAheadOfRemote();

        if (!changed && !ahead) return;

        // ⚠️ Proteção: nunca deixar arte-generator entrar
        if (arteGeneratorExists()) {
            log('⚠️  arte-generator detectado — removendo antes do deploy...');
            try { fs.rmSync(path.join(ROOT, 'arte-generator'), { recursive: true, force: true }); } catch {}
            try { fs.unlinkSync(path.join(ROOT, 'arte-generator.zip')); } catch {}
        }

        deployInProgress = true;
        log('🔍 Mudanças detectadas no LM PASSO...');

        if (changed) {
            // Adiciona só arquivos de código (sem dados nem logs)
            runGit('git add server/ public/ server.js package.json railway.json .railwayignore .gitignore Procfile .nixpacksignore .npmrc');

            const staged = runGit('git status --porcelain');
            if (staged) {
                const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                runGit(`git commit -m "auto: LM PASSO atualizado em ${ts}"`);
                log('✅ Commit criado');
            }
        }

        // Push para GitHub → Railway detecta e faz deploy automático
        log('📤 Enviando para GitHub...');
        runGit('git push origin master');
        lastPushTime = Date.now();
        log('✅ Código enviado! Railway está atualizando automaticamente.');
        log('🌐 https://lm-passo-production.up.railway.app');

    } catch (err) {
        log('⚠️  Auto-deploy: ' + err.message.split('\n')[0]);
    } finally {
        deployInProgress = false;
    }
}

// Inicia o monitoramento
log('👁️  Auto-Deploy LM PASSO ativo — monitorando mudanças a cada 45s');
setInterval(checkAndDeploy, CHECK_INTERVAL);

// Verificação inicial após 15 segundos
setTimeout(checkAndDeploy, 15 * 1000);
