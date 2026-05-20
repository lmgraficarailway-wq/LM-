const db = require('../database/db');
const fs = require('fs');
const path = require('path');

exports.getAllItems = (req, res) => {
    db.all(`SELECT * FROM catalogue_items ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const mappedRows = rows.map(row => {
            let images = [];
            if (row.image_url) {
                try {
                    images = JSON.parse(row.image_url);
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

exports.createItem = (req, res) => {
    const { title, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Ao menos uma imagem é obrigatória.' });
    }

    const image_urls = files.map(file => `/uploads/${file.filename}`);
    const image_url_json = JSON.stringify(image_urls);

    db.run(`INSERT INTO catalogue_items (title, description, image_url) VALUES (?, ?, ?)`, 
    [title || '', description || '', image_url_json], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, title, description, image_url: image_url_json, images: image_urls });
    });
};

exports.updateItem = (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const files = req.files;

    if (files && files.length > 0) {
        const image_urls = files.map(file => `/uploads/${file.filename}`);
        const image_url_json = JSON.stringify(image_urls);

        // Fetch old images to delete them
        db.get(`SELECT image_url FROM catalogue_items WHERE id = ?`, [id], (err, row) => {
            if (row && row.image_url) {
                let images = [];
                try {
                    images = JSON.parse(row.image_url);
                    if (!Array.isArray(images)) images = [row.image_url];
                } catch(e) {
                    images = [row.image_url];
                }

                images.forEach(imgUrl => {
                    if (imgUrl) {
                        const filename = path.basename(imgUrl);
                        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                                console.error('Erro ao excluir imagem física ao editar catálogo:', unlinkErr);
                            }
                        });
                    }
                });
            }

            db.run(`UPDATE catalogue_items SET title = ?, description = ?, image_url = ? WHERE id = ?`,
                [title, description, image_url_json, id],
                function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    res.json({ success: true, image_url: image_url_json, images: image_urls });
                }
            );
        });
    } else {
        // update only texts
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

exports.deleteItem = (req, res) => {
    const { id } = req.params;
    
    // First, fetch the item to find the image URL
    db.get(`SELECT image_url FROM catalogue_items WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item não encontrado.' });

        const image_url = row.image_url;

        db.run(`DELETE FROM catalogue_items WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            // delete the physical files securely
            if (image_url) {
                let images = [];
                try {
                    images = JSON.parse(image_url);
                    if (!Array.isArray(images)) images = [image_url];
                } catch(e) {
                    images = [image_url];
                }

                images.forEach(imgUrl => {
                    if (imgUrl) {
                        const filename = path.basename(imgUrl);
                        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                                console.error('Erro ao excluir imagem física do catálogo:', unlinkErr);
                            }
                        });
                    }
                });
            }

            res.json({ success: true });
        });
    });
};
