/**
 * upload_images_storage.js
 * ========================
 * Migra todas as imagens da pasta public/uploads/ para o Firebase Storage
 * e atualiza os URLs no Firestore automaticamente.
 *
 * Execute UMA VEZ após o deploy:
 *   node scripts/upload_images_storage.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Inicializar Firebase ───────────────────────────────────────────────────────
const creds = process.env.FIREBASE_CREDENTIALS
    ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
    : require('../firebase-credentials.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(creds),
        storageBucket: `${creds.project_id}.firebasestorage.app`
    });
}

const firestore = admin.firestore();
firestore.settings({ ignoreUndefinedProperties: true });
const bucket = admin.storage().bucket();

// ── Configurações ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp', '.bmp', '.avif']);

function getMimetype(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jfif': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
        '.bmp': 'image/bmp', '.avif': 'image/avif'
    };
    return map[ext] || 'application/octet-stream';
}

async function uploadToStorage(localPath, filename) {
    const destination = `uploads/${filename}`;
    const file = bucket.file(destination);

    // Verificar se já existe no Storage
    const [exists] = await file.exists();
    if (exists) {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
        return { url: publicUrl, skipped: true };
    }

    await bucket.upload(localPath, {
        destination,
        metadata: {
            contentType: getMimetype(filename),
            cacheControl: 'public, max-age=31536000'
        }
    });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    return { url: publicUrl, skipped: false };
}

async function updateFirestoreUrls(oldUrl, newUrl) {
    // Atualizar catalogue_items
    const snap = await firestore.collection('catalogue_items').get();
    const batch = firestore.batch();
    let updated = 0;

    snap.docs.forEach(doc => {
        const data = doc.data();
        if (!data.image_url) return;

        let images;
        try {
            images = JSON.parse(data.image_url);
            if (!Array.isArray(images)) images = [data.image_url];
        } catch(e) {
            images = [data.image_url];
        }

        const mapped = images.map(url => {
            // Verifica se a URL local aponta para este arquivo
            if (url && (url === oldUrl || url.endsWith('/' + oldUrl.split('/').pop()))) {
                return newUrl;
            }
            return url;
        });

        if (JSON.stringify(mapped) !== JSON.stringify(images)) {
            batch.update(doc.ref, { image_url: JSON.stringify(mapped) });
            updated++;
        }
    });

    if (updated > 0) await batch.commit();
    return updated;
}

async function run() {
    console.log('\n🚀 MIGRAÇÃO DE IMAGENS: local → Firebase Storage\n');

    if (!fs.existsSync(UPLOADS_DIR)) {
        console.log('⚠️  Pasta public/uploads/ não encontrada. Nada a migrar.');
        process.exit(0);
    }

    const files = fs.readdirSync(UPLOADS_DIR).filter(f =>
        IMAGE_EXTS.has(path.extname(f).toLowerCase())
    );

    if (files.length === 0) {
        console.log('✓ Nenhuma imagem encontrada em public/uploads/. Nada a migrar.');
        process.exit(0);
    }

    console.log(`📁 ${files.length} imagem(ns) encontrada(s) para migrar\n`);

    let uploaded = 0, skipped = 0, errors = 0;

    for (const filename of files) {
        const localPath = path.join(UPLOADS_DIR, filename);
        const oldUrl = `/uploads/${filename}`;
        process.stdout.write(`  → ${filename} ... `);

        try {
            const { url, skipped: wasSkipped } = await uploadToStorage(localPath, filename);

            if (wasSkipped) {
                console.log('⏭️  já existe no Storage');
                skipped++;
            } else {
                // Atualizar URLs no Firestore
                const updatedDocs = await updateFirestoreUrls(oldUrl, url);
                console.log(`✅ enviado${updatedDocs > 0 ? ` (${updatedDocs} doc(s) atualizado(s) no Firestore)` : ''}`);
                uploaded++;
            }
        } catch (e) {
            console.log(`❌ ERRO: ${e.message}`);
            errors++;
        }
    }

    console.log(`
════════════════════════════════════════
✅ Migração concluída!
   Enviadas: ${uploaded}
   Ignoradas (já existiam): ${skipped}
   Erros: ${errors}
════════════════════════════════════════
`);

    process.exit(errors > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
