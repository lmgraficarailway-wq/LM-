/**
 * migrate_images_railway_to_storage.js
 * Baixa todas as imagens do catálogo do Railway e sobe no Firebase Storage,
 * atualizando as URLs no Firestore.
 */
const https = require('https');
const http = require('http');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const creds = require('./firebase-credentials.json');
admin.initializeApp({
    credential: admin.credential.cert(creds),
    storageBucket: 'lm-passo-uploads'
});
const firestore = admin.firestore();
const bucket = admin.storage().bucket();

const RAILWAY_BASE = 'https://lm-passo-production.up.railway.app';

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
        }).on('error', reject);
    });
}

async function uploadToStorage(buffer, contentType, filename) {
    const destination = `uploads/${filename}`;
    const file = bucket.file(destination);
    await file.save(buffer, {
        metadata: { contentType, cacheControl: 'public, max-age=31536000' }
    });
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${destination}`;
}

async function run() {
    console.log('\n🚀 MIGRAÇÃO DE IMAGENS: Railway → Firebase Storage\n');

    const snap = await firestore.collection('catalogue_items').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`📋 ${items.length} itens no catálogo.\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
        // image_url pode vir como string JSON '["/uploads/..."]' do Firestore
        let rawImageUrl = item.image_url || '';
        if (typeof rawImageUrl === 'string' && rawImageUrl.startsWith('[')) {
            try { rawImageUrl = JSON.parse(rawImageUrl)[0] || ''; } catch(e) {}
        }
        const images = item.images && item.images.length > 0
            ? item.images
            : (rawImageUrl ? [rawImageUrl] : []);

        if (images.length === 0) {
            console.log(`  ⚠️  ID ${item.id} "${item.title}": sem imagem, pulando.`);
            skipped++;
            continue;
        }

        const newImages = [];
        for (const rawUrl of images) {
            // Se já é URL do Firebase Storage, manter
            if (rawUrl && rawUrl.startsWith('https://storage.googleapis.com')) {
                newImages.push(rawUrl);
                continue;
            }

            // Montar URL completa do Railway
            let fullUrl = rawUrl;
            if (!rawUrl.startsWith('http')) {
                fullUrl = RAILWAY_BASE + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
            }

            try {
                const filename = path.basename(rawUrl.split('?')[0]);
                console.log(`  ⬇️  Baixando: ${filename}`);
                const { buffer, contentType } = await downloadBuffer(fullUrl);
                const publicUrl = await uploadToStorage(buffer, contentType, filename);
                newImages.push(publicUrl);
                console.log(`  ✅ Enviado: ${publicUrl.substring(0, 80)}...`);
                migrated++;
            } catch (e) {
                console.log(`  ❌ Erro em ${rawUrl}: ${e.message}`);
                newImages.push(rawUrl); // manter URL original se falhar
                errors++;
            }
        }

        // Atualizar Firestore com novas URLs
        if (item.id) {
            await firestore.collection('catalogue_items').doc(String(item.id)).update({
                image_url: newImages[0] || rawImageUrl,
                images: newImages
            });
            console.log(`  💾 Firestore atualizado para ID ${item.id}\n`);
        }
    }

    console.log(`\n✅ MIGRAÇÃO CONCLUÍDA!`);
    console.log(`   Migradas: ${migrated} imagens`);
    console.log(`   Puladas:  ${skipped} itens sem imagem`);
    console.log(`   Erros:    ${errors}\n`);
    process.exit(0);
}

run().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
