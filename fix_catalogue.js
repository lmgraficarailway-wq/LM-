// fix_catalogue.js — Corrige referências quebradas no catálogo
// Limpa entradas com imagens não encontradas e importa os arquivos atuais

const path = require('path');
const fs = require('fs');

// Carrega o banco de dados
const DB_PATH = path.resolve(process.cwd(), 'database.sqlite');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DB_PATH);

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const imageExts = ['.jpg', '.jpeg', '.jfif', '.jpe', '.png', '.gif', '.webp', '.bmp'];

console.log('\n=====================================================');
console.log('  CORRIGINDO CATALOGO - LM PASSO');
console.log('=====================================================');
console.log('  Banco:', DB_PATH);
console.log('  Uploads:', uploadsDir);
console.log('=====================================================\n');

// Lista os arquivos reais no disco
const diskFiles = fs.readdirSync(uploadsDir).filter(f =>
    imageExts.includes(path.extname(f).toLowerCase())
);
console.log(`Arquivos no disco: ${diskFiles.length}`);
diskFiles.forEach(f => console.log('  ✓', f));

db.serialize(() => {

    // 1. Busca todos os itens do catálogo
    db.all('SELECT * FROM catalogue_items', [], (err, rows) => {
        if (err) { console.error('Erro ao ler banco:', err); process.exit(1); }

        console.log(`\nItens no banco de dados: ${rows.length}`);

        const broken = [];
        const ok = [];

        rows.forEach(row => {
            let images = [];
            try {
                images = JSON.parse(row.image_url);
                if (!Array.isArray(images)) images = [row.image_url];
            } catch(e) {
                images = row.image_url ? [row.image_url] : [];
            }

            const allExist = images.every(imgUrl => {
                const filename = path.basename(imgUrl || '');
                return filename && fs.existsSync(path.join(uploadsDir, filename));
            });

            if (allExist && images.length > 0) {
                ok.push(row);
            } else {
                broken.push(row);
            }
        });

        console.log(`  OK (imagens existem): ${ok.length}`);
        console.log(`  QUEBRADOS (imagens não encontradas): ${broken.length}`);

        if (broken.length > 0) {
            console.log('\nRemovendo entradas quebradas...');
            broken.forEach(row => {
                console.log(`  Removendo ID ${row.id}: "${row.title}"`);
                db.run('DELETE FROM catalogue_items WHERE id = ?', [row.id]);
            });
        }

        // 2. Importa arquivos do disco que ainda não estão no banco
        const existingFilenames = new Set();
        ok.forEach(row => {
            try {
                const imgs = JSON.parse(row.image_url);
                (Array.isArray(imgs) ? imgs : [row.image_url]).forEach(url => {
                    existingFilenames.add(path.basename(url || ''));
                });
            } catch(e) {
                existingFilenames.add(path.basename(row.image_url || ''));
            }
        });

        const newFiles = diskFiles.filter(f => !existingFilenames.has(f));

        console.log(`\nNovos arquivos para importar: ${newFiles.length}`);

        if (newFiles.length === 0) {
            console.log('\n✅ Tudo certo! Catálogo atualizado.');
            db.close();
            return;
        }

        let inserted = 0;
        let done = 0;

        newFiles.forEach(filename => {
            // Gera título a partir do nome do arquivo
            const title = filename
                .replace(/\.[^.]+$/, '')          // remove extensão
                .replace(/_/g, ' ')               // underscores → espaços
                .trim()
                || filename;

            const imageUrlJson = JSON.stringify([`/uploads/${filename}`]);

            db.run(
                'INSERT INTO catalogue_items (title, description, image_url) VALUES (?, ?, ?)',
                [title, '', imageUrlJson],
                function(insertErr) {
                    if (!insertErr) {
                        inserted++;
                        console.log(`  ✅ Importado: "${title}"`);
                    } else {
                        console.log(`  ❌ Erro ao importar "${filename}":`, insertErr.message);
                    }
                    done++;
                    if (done === newFiles.length) {
                        console.log('\n=====================================================');
                        console.log(`  CONCLUÍDO!`);
                        console.log(`  Removidos: ${broken.length} itens quebrados`);
                        console.log(`  Importados: ${inserted} novos itens`);
                        console.log(`  Total no catálogo: ${ok.length + inserted} itens`);
                        console.log('=====================================================\n');
                        db.close();
                    }
                }
            );
        });
    });
});
