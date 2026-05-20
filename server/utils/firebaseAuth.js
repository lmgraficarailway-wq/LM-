const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getServiceAccount() {
    // 1. Prioridade para a Variável de Ambiente em texto puro (se o usuário preencher lá)
    if (process.env.FIREBASE_CREDENTIALS) {
        try {
            console.log('  ✅ Usando FIREBASE_CREDENTIALS da variável de ambiente.');
            return JSON.parse(process.env.FIREBASE_CREDENTIALS);
        } catch (e) {
            console.error('  ❌ Erro: FIREBASE_CREDENTIALS em texto é inválido.');
        }
    }

    // 2. Se não tem a variável, tenta ler o arquivo criptografado (Render Environment)
    const encPath = path.resolve(process.cwd(), 'firebase-credentials.enc');
    if (fs.existsSync(encPath)) {
        console.log('  📄 Arquivo criptografado encontrado:', encPath);
        if (process.env.GEMINI_API_KEY) {
            try {
                const secretKey = process.env.GEMINI_API_KEY;
                console.log('  🔑 Chave GEMINI_API_KEY encontrada. Decriptando...');
                
                const content = fs.readFileSync(encPath, 'utf8');
                const parts = content.split(':');
                if (parts.length < 2) throw new Error('Formato do arquivo .enc inválido');
                
                const iv = Buffer.from(parts.shift(), 'hex');
                const encryptedText = Buffer.from(parts.join(':'), 'hex');
                
                const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
                const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
                
                const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
                return JSON.parse(decrypted.toString());
            } catch (e) {
                console.error('  ❌ Erro ao decriptar firebase-credentials.enc:', e.message);
            }
        } else {
            console.log('  ⚠️ GEMINI_API_KEY não encontrada para decriptação.');
        }
    }

    // 3. Fallback: ler do arquivo .json local (Ambiente de Desenvolvimento)
    const credPath = path.resolve(process.cwd(), 'firebase-credentials.json');
    if (fs.existsSync(credPath)) {
        console.log('  ✅ Usando firebase-credentials.json local.');
        return require(credPath);
    }

    console.log('  ❌ Nenhuma fonte de credenciais Firebase encontrada.');
    return null;
}

module.exports = { getServiceAccount };
