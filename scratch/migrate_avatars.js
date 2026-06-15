const https = require('https');
const admin = require('firebase-admin');

const creds = require('../firebase-credentials.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(creds),
        storageBucket: 'lm-passo-uploads'
    });
}
const firestore = admin.firestore();
const bucket = admin.storage().bucket();

const RAILWAY_BASE = 'https://lm-passo-production.up.railway.app';

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function run() {
    // We will fetch all users from Firestore
    console.log("Fetching users from Firestore...");
    const snap = await firestore.collection('users').get();
    console.log(`Found ${snap.docs.length} users.`);

    for (const doc of snap.docs) {
        const user = doc.data();
        const avatar = user.avatar;
        if (avatar && avatar.startsWith('/uploads/')) {
            const filename = avatar.split('/').pop();
            const fullUrl = `${RAILWAY_BASE}${avatar}`;
            console.log(`Processing user ${user.name} (${user.username})`);
            console.log(`  Downloading from Railway: ${fullUrl}`);
            try {
                const buffer = await downloadBuffer(fullUrl);
                console.log(`  Downloaded ${buffer.length} bytes.`);
                
                const destination = `uploads/${filename}`;
                const file = bucket.file(destination);
                await file.save(buffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                        cacheControl: 'public, max-age=31536000'
                    }
                });
                await file.makePublic();
                
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                console.log(`  Uploaded to Firebase Storage: ${publicUrl}`);
                
                // Update Firestore
                await doc.ref.update({ avatar: publicUrl });
                console.log(`  Updated user ${user.name} avatar in Firestore!`);
            } catch (e) {
                console.error(`  Failed to migrate avatar for user ${user.name}:`, e.message);
            }
        } else {
            console.log(`User ${user.name} does not have a local avatar path. Current: ${avatar}`);
        }
    }
    console.log("Migration complete!");
    process.exit(0);
}

run();
