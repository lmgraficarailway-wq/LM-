
// Helper para parsear image_url (SQLite=JSON string, Firestore=array)
function parseImageUrl(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        // Se for uma string simples (URL) e não um JSON array
        if (v.startsWith('http') || v.startsWith('/uploads/')) return [v];
        try { 
            const parsed = JSON.parse(v); 
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch(e) { 
            return [v]; 
        }
    }
    return [v];
}

const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const { uploadFile, deleteFile, isStorageUrl } = require('../utils/firebaseStorage');

// ── Helper: determina se deve usar Storage (produção) ou disco (local) ────────
const USE_STORAGE = process.env.NODE_ENV === 'production' || process.env.USE_FIREBASE_STORAGE === 'true';

/**
 * Processa arquivos recebidos pelo multer:
 * - Em produção (Cloud Run): envia para Firebase Storage e retorna URLs públicas
 * - Em desenvolvimento (local): salva em public/uploads/ e retorna paths locais
 */
async function processUploadedFiles(files) {
    if (!files || files.length === 0) return [];

    if (USE_STORAGE) {
        // Upload para Firebase Storage
        const urls = await Promise.all(files.map(file => {
            const buffer = file.buffer; // multer memoryStorage
            return uploadFile(buffer, file.originalname, file.mimetype, 'uploads');
        }));
        return urls;
    } else {
        // Modo local: arquivo já foi salvo em disco pelo multer diskStorage
        return files.map(file => `/uploads/${file.filename}`);
    }
}

/**
 * Deleta imagens anteriores (Storage ou disco local)
 */
async function deleteOldImages(imageUrls) {
    for (const imgUrl of imageUrls) {
        if (!imgUrl) continue;
        if (isStorageUrl(imgUrl)) {
            await deleteFile(imgUrl);
        } else {
            // Arquivo local
            const filename = path.basename(imgUrl.split('?')[0]);
            const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Erro ao excluir imagem local:', err.message);
                }
            });
        }
    }
}

// ── Controladores ─────────────────────────────────────────────────────────────

exports.getAllItems = (req, res) => {
    db.all(`SELECT * FROM catalogue_items ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const mappedRows = rows.map(row => {
            let images = [];
            if (row.image_url) {
                try {
                    images = parseImageUrl(row.image_url)
                    if (!Array.isArray(images)) images = [row.image_url];
                } catch(e) {
                    images = [row.image_url];
                }
            }
            return {
                ...row,
                images,
                image_url: images.length > 0 ? images[0] : ''
            };
        });

        res.json({ data: mappedRows });
    });
};

exports.createItem = async (req, res) => {
    const { title, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Ao menos uma imagem é obrigatória.' });
    }

    try {
        const image_urls = await processUploadedFiles(files);
        const image_url_json = JSON.stringify(image_urls);

        db.run(`INSERT INTO catalogue_items (title, description, image_url) VALUES (?, ?, ?)`,
            [title || '', description || '', image_url_json], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ id: this.lastID, title, description, image_url: image_url_json, images: image_urls });
            });
    } catch (e) {
        console.error('[Catalogue] Erro no upload:', e.message);
        res.status(500).json({ error: 'Erro ao fazer upload das imagens: ' + e.message });
    }
};

exports.updateItem = async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const files = req.files;

    if (files && files.length > 0) {
        try {
            const image_urls = await processUploadedFiles(files);
            const image_url_json = JSON.stringify(image_urls);

            // Buscar imagens antigas para deletar
            db.get(`SELECT image_url FROM catalogue_items WHERE id = ?`, [id], async (err, row) => {
                if (row && row.image_url) {
                    let oldImages = [];
                    try {
                        oldImages = parseImageUrl(row.image_url)
                        if (!Array.isArray(oldImages)) oldImages = [row.image_url];
                    } catch(e) {
                        oldImages = [row.image_url];
                    }
                    await deleteOldImages(oldImages);
                }

                db.run(`UPDATE catalogue_items SET title = ?, description = ?, image_url = ? WHERE id = ?`,
                    [title, description, image_url_json, id],
                    function(updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({ success: true, image_url: image_url_json, images: image_urls });
                    }
                );
            });
        } catch (e) {
            console.error('[Catalogue] Erro ao atualizar imagens:', e.message);
            res.status(500).json({ error: 'Erro ao fazer upload das imagens: ' + e.message });
        }
    } else {
        // Atualizar apenas texto
        db.run(`UPDATE catalogue_items SET title = ?, description = ? WHERE id = ?`,
            [title, description, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Item não encontrado.' });
                res.json({ success: true });
            }
        );
    }
};

exports.deleteItem = async (req, res) => {
    const { id } = req.params;

    db.get(`SELECT image_url FROM catalogue_items WHERE id = ?`, [id], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item não encontrado.' });

        db.run(`DELETE FROM catalogue_items WHERE id = ?`, [id], async function(err) {
            if (err) return res.status(500).json({ error: err.message });

            // Deletar arquivos (Storage ou local)
            if (row.image_url) {
                let images = [];
                try {
                    images = parseImageUrl(row.image_url)
                    if (!Array.isArray(images)) images = [row.image_url];
                } catch(e) {
                    images = [row.image_url];
                }
                await deleteOldImages(images);
            }

            res.json({ success: true });
        });
    });
};
