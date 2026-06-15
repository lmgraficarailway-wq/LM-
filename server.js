require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const os = require('os');
const fs = require('fs');

const db = require('./server/database/db');

// Error Logging Function
const logError = (err) => {
    const msg = err && err.message ? err.message : String(err);
    const stack = err && err.stack ? err.stack : 'Sem stack trace';
    console.error('\n❌ CRITICAL ERROR:', msg);
    if (err && err.stack) console.error(stack);
    try {
        const errorLogPath = path.join(process.cwd(), 'error_log.txt');
        const errorMessage = `[${new Date().toISOString()}] ERROR: ${msg}\nSTACK: ${stack}\n\n`;
        fs.appendFileSync(errorLogPath, errorMessage);
    } catch(e) {}
};

// Global Error Handlers
process.on('uncaughtException', (err) => {
    logError(err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logError(reason);
    process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações Globais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(compression());

// Proibir cache de arquivos JS no navegador — garante que celulares sempre carregam versão atualizada
app.use((req, res, next) => {
    // JS: nunca cachear — garante versão mais recente
    if (req.path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    // API: NUNCA cachear — pedidos criados devem aparecer imediatamente
    // Cache público (mesmo que curto) faz o Firebase CDN e o browser servirem dados antigos
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    // Keep-Alive para reutilizar conexões e reduzir latência
    res.setHeader('Connection', 'keep-alive');
    next();
});

// Servir arquivos estáticos (Frontend)
const diskPublic = path.join(process.cwd(), 'public');
app.use(express.static(diskPublic));

// Servir uploads do volume no Railway
const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
if (volumePath) {
    const fs = require('fs');
    const volumeUploads = path.join(volumePath, 'uploads/');
    if (!fs.existsSync(volumeUploads)) {
        fs.mkdirSync(volumeUploads, { recursive: true });
    }
    
    // Sincroniza arquivos locais para o volume
    const localUploads = path.join(process.cwd(), 'public/uploads');
    if (fs.existsSync(localUploads)) {
        try {
            const files = fs.readdirSync(localUploads);
            for (const file of files) {
                const src = path.join(localUploads, file);
                const dest = path.join(volumeUploads, file);
                if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
                    fs.copyFileSync(src, dest);
                }
            }
        } catch (err) {
            console.error('Erro ao sincronizar imagens do catálogo:', err.message);
        }
    }

    app.use('/uploads', express.static(volumeUploads));
}

// ── Rotas da API ─────────────────────────────────────────────────────────────
const apiRoutes = require('./server/routes/api.routes');
const authRoutes = require('./server/routes/auth.routes');

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// ── Auto-Sync Railway → Firestore (sem SSE — custo mínimo) ───────────────────
let _syncDb = null;
const { startAutoSync, syncRailwayToFirestore } = require('./server/utils/railwaySync');

// Inicializa o sync APENAS quando NÃO está em modo SQLite local.
// Em modo local, o sync não faz sentido (o banco é SQLite, não Firestore).
const useLocalSqlite = process.env.USE_SQLITE === 'true' || !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_SERVICE_ID;

function initSync() {
    if (useLocalSqlite) {
        // Em modo local, não tenta conectar ao Firebase para sync
        return;
    }
    try {
        const admin = require('firebase-admin');
        if (admin.apps.length > 0) {
            _syncDb = admin.firestore();
            startAutoSync(_syncDb);
            console.log('[Sync] Auto-sync iniciado.');
        } else {
            console.warn('[Sync] Firebase ainda não pronto, tentando em 5s...');
            setTimeout(initSync, 5000);
        }
    } catch(e) {
        console.warn('[Sync] Erro ao iniciar sync:', e.message, '— tentando em 10s...');
        setTimeout(initSync, 10000);
    }
}
if (!useLocalSqlite) {
    setTimeout(initSync, 2000);
}

// ── Rota legada /api/orders/stream — retorna resposta simples (SSE removido para economizar custo) ──
app.get('/api/orders/stream', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ type: 'disabled', message: 'SSE desativado para reduzir custo. Use polling.' });
});


// ── Rota de sync forçado ───────────────────────────────────────────────────────
app.post('/api/force-sync', async (req, res) => {
    try {
        if (!_syncDb) {
            const admin = require('firebase-admin');
            _syncDb = admin.apps.length ? admin.firestore() : null;
        }
        if (!_syncDb) return res.json({ ok: false, error: 'Firebase não inicializado' });
        await syncRailwayToFirestore(_syncDb);
        broadcastOrdersUpdate('force_sync');
        res.json({ ok: true, message: 'Sync concluído com sucesso', ts: new Date().toISOString() });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Rota de saúde
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), sync: !!_syncDb, sse_clients: 0 }));

// Rota de diagnóstico do banco (temporária)
app.get('/api/dbtest', async (req, res) => {
    try {
        const db = require('./server/database/db');
        db.get('SELECT * FROM users WHERE username = ?', ['gerente'], (err, row) => {
            if (err) return res.json({ ok: false, error: err.message, stack: err.stack?.substring(0, 300) });
            if (!row) return res.json({ ok: false, error: 'Usuario gerente nao encontrado no Firebase' });
            res.json({ ok: true, username: row.username, role: row.role, hasPassword: !!row.password });
        });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});

// Rota de emergência para atualizar kanban.js diretamente no Railway (hotfix sem redeploy)
app.post('/api/admin/update-kanban', async (req, res) => {
    const { token, kanban_base64 } = req.body;
    if (token !== 'lm-passo-admin-upload-123') return res.status(403).json({ error: 'Não autorizado' });
    if (!kanban_base64) return res.status(400).json({ error: 'Nenhum conteúdo enviado' });
    try {
        const kanbanPath = path.join(process.cwd(), 'public/js/components/kanban.js');
        const content = Buffer.from(kanban_base64, 'base64').toString('utf8');
        fs.writeFileSync(kanbanPath, content);
        console.log('✅ kanban.js atualizado via hotfix! Tamanho:', content.length, 'chars');
        res.json({ success: true, message: 'kanban.js atualizado com sucesso!', size: content.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota genérica para atualizar qualquer arquivo estático via hotfix
app.post('/api/admin/update-file', async (req, res) => {
    const { token, file_base64, file_path } = req.body;
    if (token !== 'lm-passo-admin-upload-123') return res.status(403).json({ error: 'Não autorizado' });
    if (!file_base64 || !file_path) return res.status(400).json({ error: 'Parâmetros faltando' });
    // Segurança: só permite arquivos dentro de public/
    if (!file_path.startsWith('public/')) return res.status(403).json({ error: 'Caminho inválido' });
    try {
        const fullPath = path.join(process.cwd(), file_path);
        const content = Buffer.from(file_base64, 'base64').toString('utf8');
        fs.writeFileSync(fullPath, content);
        console.log(`✅ ${file_path} atualizado via hotfix! Tamanho: ${content.length} chars`);
        res.json({ success: true, message: `${file_path} atualizado com sucesso!`, size: content.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota oculta para atualizar banco de dados de produção
app.post('/api/admin/restore-db', async (req, res) => {
    // Validação básica com a senha master
    const { token } = req.body;
    if (token !== 'lm-passo-admin-upload-123') return res.status(403).json({ error: 'Não autorizado' });
    
    if (!req.body.database_base64) return res.status(400).json({ error: 'Nenhum banco de dados enviado' });
    
    try {
        const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
        if (!volumePath) return res.status(400).json({ error: 'Não está rodando com volume Railway' });
        
        const dbPath = path.join(volumePath, 'database.sqlite');
        const buffer = Buffer.from(req.body.database_base64, 'base64');
        
        fs.writeFileSync(dbPath, buffer);
        console.log('✅ Banco de dados restaurado via upload!');
        res.json({ success: true, message: 'Banco atualizado com sucesso. Reinicie o app.' });
        
        // Finaliza o processo para o Railway reiniciar o container (para recarregar o banco de dados na memória)
        setTimeout(() => process.exit(0), 1000);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para o frontend (SPA Fallback)
app.get(/^(.*)$/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint não encontrado' });
    }
    res.sendFile(path.join(diskPublic, 'index.html'));
});

// Helper para pegar o IP da rede local
function getNetworkIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// ── Inicialização do Servidor ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    const localIp = getNetworkIP();
    console.log(`\n======================================================`);
    console.log(`✅ LM PASSO rodando em http://localhost:${PORT}`);
    console.log(`🌐 Rede local:       http://${localIp}:${PORT}`);
    console.log(`======================================================\n`);
    console.log('💡 Para acesso externo via ngrok: ngrok http ' + PORT);
    console.log('');
});

// ── Firebase Sync Worker — DESATIVADO (app 100% no Firebase/Cloud Run) ──────

// ── Backup Automático Firebase → Local ───────────────────────────────────────
// Só roda em modo Firebase (sem SQLite local) e fora da produção
if (process.env.USE_SQLITE !== 'true' && !process.env.RAILWAY_ENVIRONMENT_NAME && !process.env.RAILWAY_SERVICE_ID && process.env.NODE_ENV !== 'production') {
    const BACKUP_INTERVAL = 4 * 60 * 60 * 1000; // 4 horas

    const doBackup = async () => {
        try {
            const { runBackup } = require('./scripts/backup_firebase_to_sqlite');
            await runBackup();
        } catch (e) {
            console.log('⚠️  Backup automático falhou:', e.message);
        }
    };

    setTimeout(() => {
        doBackup();
        setInterval(doBackup, BACKUP_INTERVAL);
        console.log('💾 Backup automático ativado — cópia local do Firebase a cada 4h');
    }, 30 * 1000);
}

// ── Auto-Deploy: envia mudanças ao GitHub → Render deploya automaticamente ───
if (process.env.NODE_ENV !== 'production') {
    try {
        require('./scripts/auto_push');
    } catch (e) {
        // silencioso
    }
}
