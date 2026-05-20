const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

const db = new sqlite3.Database(dbPath);

console.log('\n=== DIAGNÓSTICO DO CATÁLOGO ===\n');
console.log('DB:', dbPath);
console.log('Uploads:', uploadDir);
console.log('Uploads existe?', fs.existsSync(uploadDir));

const diskFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
console.log('Arquivos em disco:', diskFiles.length);
console.log('');

db.all('SELECT id, title, image_url FROM catalogue_items', [], (err, rows) => {
    if (err) { console.error('ERRO DB:', err.message); process.exit(1); }
    console.log('Itens no catálogo:', rows.length);
    console.log('');

    rows.forEach(row => {
        let images = [];
        try {
            images = JSON.parse(row.image_url);
            if (!Array.isArray(images)) images = [row.image_url];
        } catch(e) {
            images = row.image_url ? [row.image_url] : [];
        }

        console.log(`--- Item #${row.id}: "${row.title}" ---`);
        images.forEach(imgUrl => {
            const filename = (imgUrl || '').split('/').pop().split('?')[0];
            const exists = diskFiles.includes(filename);
            console.log(`  URL no BD: ${imgUrl}`);
            console.log(`  Arquivo:   ${filename}`);
            console.log(`  Existe?    ${exists ? '✓ SIM' : '✗ NÃO'}`);
        });
        console.log('');
    });

    db.close();
});
