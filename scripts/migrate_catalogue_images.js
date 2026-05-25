const admin = require('firebase-admin');
const fs = require('fs');
const https = require('https');
const { uploadFile, isStorageUrl } = require('../server/utils/firebaseStorage');

const creds = require('../firebase-credentials.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(creds) });
const db = admin.firestore();

// Fetch an image from Railway and upload to Firebase
async function fetchAndUpload(urlPath) {
    if (isStorageUrl(urlPath)) return urlPath; // already in firebase

    const fullUrl = `https://lm-passo-production.up.railway.app${urlPath}`;
    return new Promise((resolve, reject) => {
        https.get(fullUrl, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch ${fullUrl}, status: ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const filename = urlPath.split('/').pop();
                    let mime = 'image/jpeg';
                    if (filename.endsWith('.png')) mime = 'image/png';
                    if (filename.endsWith('.webp')) mime = 'image/webp';
                    
                    const storageUrl = await uploadFile(buffer, filename, mime, 'uploads');
                    resolve(storageUrl);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function parseImageUrl(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch(e) { return []; }
}

async function run() {
    console.log('🔄 Iniciando migração de imagens do catálogo (Railway -> Firebase)...');
    const snap = await db.collection('catalogue_items').get();
    
    let updatedCount = 0;

    for (const doc of snap.docs) {
        const item = doc.data();
        if (!item.image_url) continue;

        let images = parseImageUrl(item.image_url);
        if (!Array.isArray(images)) images = [item.image_url];
        
        let changed = false;
        const newImages = [];

        for (const img of images) {
            if (!img || img.startsWith('http')) {
                newImages.push(img);
                continue; // already absolute or storage
            }
            if (img.startsWith('/uploads/')) {
                console.log(`⏳ Baixando e enviando: ${img}`);
                try {
                    const newUrl = await fetchAndUpload(img);
                    newImages.push(newUrl);
                    changed = true;
                    console.log(`✅ Sucesso: ${newUrl}`);
                } catch (err) {
                    console.error(`❌ Erro em ${img}:`, err.message);
                    newImages.push(img); // keep original if failed
                }
            } else {
                newImages.push(img);
            }
        }

        if (changed) {
            const newJson = JSON.stringify(newImages);
            await db.collection('catalogue_items').doc(doc.id).update({ image_url: newJson });
            updatedCount++;
        }
    }
    
    console.log(`\n🎉 Migração concluída. ${updatedCount} itens atualizados!`);
    process.exit(0);
}

run().catch(e => {
    console.error('Erro fatal:', e);
    process.exit(1);
});
