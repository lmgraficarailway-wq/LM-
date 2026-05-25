/**
 * firebaseStorage.js — Helper para upload/delete de arquivos no Firebase Storage
 * =============================================================================
 * Substitui o armazenamento local de imagens (public/uploads/) pelo
 * Firebase Storage, que persiste arquivos indefinidamente na nuvem.
 *
 * URLs geradas: https://storage.googleapis.com/lm-passo.firebasestorage.app/uploads/...
 */

const admin = require('firebase-admin');
const path = require('path');

// Garante que o Firebase Admin já foi inicializado (feito em firestore.js)
function getBucket() {
    const BUCKET = 'lm-passo-uploads';
    try {
        return admin.storage().bucket(BUCKET);
    } catch (e) {
        // Inicializa storage explicitamente se necessário
        const creds = process.env.FIREBASE_CREDENTIALS
            ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
            : require(path.resolve(process.cwd(), 'firebase-credentials.json'));

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(creds),
                storageBucket: BUCKET
            });
        }
        return admin.storage().bucket(BUCKET);
    }
}

/**
 * Faz upload de um arquivo (buffer ou stream) para o Firebase Storage.
 * @param {Buffer} buffer - Conteúdo do arquivo
 * @param {string} originalName - Nome original do arquivo
 * @param {string} mimetype - MIME type (ex: 'image/jpeg')
 * @param {string} [folder='uploads'] - Pasta de destino no Storage
 * @returns {Promise<string>} URL pública do arquivo
 */
async function uploadFile(buffer, originalName, mimetype, folder = 'uploads') {
    const bucket = getBucket();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(originalName) || '.jpg';
    const filename = `${uniqueSuffix}${ext}`;
    const destination = `${folder}/${filename}`;

    const file = bucket.file(destination);

    await file.save(buffer, {
        metadata: {
            contentType: mimetype,
            cacheControl: 'public, max-age=31536000'
        }
    });

    // Tornar público
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    return publicUrl;
}

/**
 * Deleta um arquivo do Firebase Storage a partir da URL pública.
 * @param {string} publicUrl - URL pública do arquivo
 */
async function deleteFile(publicUrl) {
    try {
        if (!publicUrl || !publicUrl.includes('storage.googleapis.com')) return;
        const bucket = getBucket();
        // Extrai o path do arquivo da URL
        const urlPath = new URL(publicUrl).pathname;
        // Remove o prefixo /<bucket-name>/
        const filePath = urlPath.split('/').slice(2).join('/');
        await bucket.file(filePath).delete({ ignoreNotFound: true });
    } catch (e) {
        console.warn('[Storage] Erro ao deletar arquivo:', e.message);
    }
}

/**
 * Verifica se a URL é do Firebase Storage (produção) ou local (desenvolvimento)
 */
function isStorageUrl(url) {
    return url && url.startsWith('https://storage.googleapis.com');
}

module.exports = { uploadFile, deleteFile, isStorageUrl };
