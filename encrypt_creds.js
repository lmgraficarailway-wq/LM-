const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const credPath = path.join(__dirname, 'firebase-credentials.json');
const encPath = path.join(__dirname, 'firebase-credentials.enc');
const secretKey = process.env.GEMINI_API_KEY;

if (!fs.existsSync(credPath)) {
    console.log("Credenciais não encontradas.");
    process.exit(1);
}

if (!secretKey) {
    console.log("GEMINI_API_KEY não encontrada no .env");
    process.exit(1);
}

const algorithm = 'aes-256-ctr';
// O GEMINI_API_KEY tem 39 caracteres, o AES-256 precisa de 32 bytes
const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);

const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, key, iv);

const content = fs.readFileSync(credPath);
const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);

// Salva o IV junto com o dado criptografado (separado por ':')
fs.writeFileSync(encPath, iv.toString('hex') + ':' + encrypted.toString('hex'));
console.log("✅ firebase-credentials.json criptografado com sucesso em firebase-credentials.enc");
