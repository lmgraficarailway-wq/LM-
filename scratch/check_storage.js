const admin = require('firebase-admin');
const creds = require('../firebase-credentials.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(creds)
    });
}

async function checkSpecificAvatars() {
    const bucket = admin.storage().bucket('lm-passo-uploads');
    const filesToCheck = [
        'uploads/1776375440513-56521745.JPG',
        'uploads/1776375432635-950132499.JPG',
        'uploads/1776375437217-223677288.JPG',
        'uploads/1776375425206-864674755.JPG'
    ];
    for (const name of filesToCheck) {
        const file = bucket.file(name);
        const [exists] = await file.exists();
        console.log(`${name} exists:`, exists);
    }
    process.exit(0);
}
checkSpecificAvatars();
