const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const fs = require('fs');
        const uploadPath = path.join(process.cwd(), 'public/uploads/');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const clientController = require('../controllers/client_controller');
const productController = require('../controllers/product_controller');

// Clients
router.get('/clients', clientController.getAllClients);
router.post('/clients', clientController.createClient);
router.put('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);
router.post('/clients/:id/toggle-access', clientController.toggleClientAccess);
router.post('/clients/:id/reset-access', clientController.resetClientAccess);
router.post('/clients/:id/sync-access-name', clientController.syncAccessName);
router.get('/clients/:id/access-credentials', clientController.getClientAccess);
router.get('/clients/:id/credit-movements', clientController.getCreditMovements);
router.post('/clients/:id/credit', clientController.addCreditTransaction);
router.put('/clients/:id/reset-points', clientController.resetPoints);
router.delete('/clients/movements/:id', clientController.deleteCreditMovement);

// Products
router.get('/products', productController.getAllProducts);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
// Color variants (pulseiras)
router.get('/products/:id/colors', productController.getColorVariants);
router.put('/products/:id/colors', productController.saveColorVariants);
router.patch('/products/colors/:id/debit', productController.debitColorVariant);
// Product cost history
router.get('/products/:id/costs', productController.getCostHistory);
// Product Kits
router.get('/products/:id/kits', productController.getKits);
router.post('/products/:id/kits', productController.saveKits);

// Orders
const orderController = require('../controllers/order_controller');
router.get('/orders', orderController.getAllOrders);
router.post('/orders', orderController.createOrder);
router.post('/orders/:id/attachments', upload.array('files', 10), orderController.uploadAttachments);
router.get('/orders/:id/items', orderController.getOrderItems);
router.put('/orders/:id/accept', orderController.acceptOrder);
router.put('/orders/:id/pay', orderController.markAsPaid);
router.put('/orders/:id/checklist', orderController.updateChecklist);
router.put('/orders/:id/reject', orderController.rejectOrder);
router.put('/orders/:id/finalize', orderController.finalizeOrder);
router.put('/orders/:id/move-status', orderController.moveOrderStatus);
router.post('/orders/:id/conclude', upload.single('pickup_photo'), orderController.concludeOrder);
router.put('/orders/:id/conclude-simple', orderController.concludeSimple);
router.get('/orders/archived', orderController.getArchivedOrders);
router.put('/orders/:id/archive', orderController.archiveOrder);
router.delete('/orders/:id', orderController.deleteOrder);

// Comments
router.get('/orders/:id/comments', orderController.getComments);
router.post('/orders/:id/comments', orderController.addComment);

router.post('/clients/:id/ack-tier', clientController.ackTierNotification);

// Reports
router.get('/reports/sales', orderController.getSalesReport);
router.get('/reports/client-orders/:clientId', orderController.getClientOrders);
router.get('/reports/client-financial/:clientId', orderController.getClientFinancial);
router.post('/reports/core-entry', orderController.createCoreEntry);
router.put('/reports/entry/:id', orderController.editFinancialEntry);
router.put('/orders/:id/launch-core', orderController.launchToCore);
router.put('/orders/:id/file-path', orderController.updateFilePath);
router.post('/orders/open-folder', orderController.openFolder);
// Material costs report
router.get('/reports/material-costs', orderController.getMaterialCostsReport);
// Product demand report (monthly & quarterly)
router.get('/reports/product-demand', orderController.getProductDemand);

// Dispatch costs report
router.get('/reports/dispatch-costs', orderController.getDispatchCosts);
// Delete individual material cost entry (admin only)
router.delete('/material-costs/:id', orderController.deleteMaterialCost);
// Delete / update dispatch cost entry (admin only)
router.delete('/dispatch-costs/:id', orderController.deleteDispatchCost);
router.put('/dispatch-costs/:id', orderController.updateDispatchCost);
router.put('/dispatch-costs/:id/launch-core', orderController.launchDispatchToCore);

// Stock
const stockController = require('../controllers/stock_controller');
router.get('/stock', stockController.getStockOverview);
router.post('/stock/adjust', stockController.adjustStock);
router.get('/stock/movements', stockController.getStockMovements);
router.put('/stock/min/:id', stockController.updateMinStock);

// Suppliers
const supplierController = require('../controllers/supplier_controller');
router.get('/suppliers', supplierController.getAllSuppliers);
router.post('/suppliers', supplierController.createSupplier);
router.put('/suppliers/:id', supplierController.updateSupplier);
router.delete('/suppliers/:id', supplierController.deleteSupplier);

// Purchase Requests
const purchaseController = require('../controllers/purchase_controller');
router.get('/purchases', purchaseController.getAllPurchases);
router.post('/purchases', purchaseController.createPurchase);
router.put('/purchases/:id/receive', purchaseController.receivePurchase);
router.put('/purchases/:id/cancel', purchaseController.cancelPurchase);
router.delete('/purchases/:id', purchaseController.deletePurchase);

// Catalogue
const catalogueController = require('../controllers/catalogue_controller');
router.get('/catalogue', catalogueController.getAllItems);
router.post('/catalogue', upload.array('images', 10), catalogueController.createItem);
router.put('/catalogue/:id', upload.array('images', 10), catalogueController.updateItem);
router.delete('/catalogue/:id', catalogueController.deleteItem);

// Import catalogue items from images already on disk (recovery tool)
router.post('/catalogue/import-from-disk', (req, res) => {
    const fsLocal = require('fs');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const db = require('../database/db');

    const imageExts = ['.jpg', '.jpeg', '.jfif', '.jpe', '.png', '.gif', '.webp', '.bmp', '.avif', '.tiff', '.tif', '.svg'];

    if (!fsLocal.existsSync(uploadDir)) {
        return res.status(500).json({ error: `Pasta não encontrada: ${uploadDir}`, cwd: process.cwd() });
    }

    const allRawFiles = fsLocal.readdirSync(uploadDir);
    const allFiles = allRawFiles.filter(f => imageExts.includes(path.extname(f).toLowerCase()));

    if (allFiles.length === 0) {
        // Return diagnostic info
        const extMap = {};
        allRawFiles.forEach(f => {
            const ext = path.extname(f).toLowerCase() || '(sem extensão)';
            extMap[ext] = (extMap[ext] || 0) + 1;
        });
        return res.json({
            message: 'Nenhum arquivo de imagem encontrado na pasta uploads.',
            imported: 0,
            diagnostico: {
                cwd: process.cwd(),
                uploadDir,
                totalArquivos: allRawFiles.length,
                extensoesEncontradas: extMap,
                primeiroArquivo: allRawFiles[0] || null
            }
        });
    }

    // Get existing image_urls to avoid duplicates
    db.all('SELECT image_url FROM catalogue_items', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const existingFiles = new Set();
        rows.forEach(row => {
            try {
                const imgs = JSON.parse(row.image_url);
                (Array.isArray(imgs) ? imgs : [row.image_url]).forEach(url => {
                    const filename = (url || '').split('/').pop().split('?')[0];
                    existingFiles.add(filename);
                });
            } catch(e) {
                const filename = (row.image_url || '').split('/').pop().split('?')[0];
                existingFiles.add(filename);
            }
        });

        const newFiles = allFiles.filter(f => !existingFiles.has(f));

        if (newFiles.length === 0) {
            return res.json({ message: 'Todas as imagens já estão registradas no catálogo.', imported: 0 });
        }

        let inserted = 0;
        let done = 0;

        newFiles.forEach(filename => {
            const imageUrlJson = JSON.stringify([`/uploads/${filename}`]);
            const title = filename.replace(/\.[^.]+$/, '').replace(/^\d+-\d+-?/, '').replace(/-/g, ' ').trim() || filename;
            db.run(
                'INSERT INTO catalogue_items (title, description, image_url) VALUES (?, ?, ?)',
                [title || 'Sem título', '', imageUrlJson],
                function(insertErr) {
                    if (!insertErr) inserted++;
                    done++;
                    if (done === newFiles.length) {
                        res.json({ message: `${inserted} imagem(ns) importada(s) com sucesso!`, imported: inserted, skipped: newFiles.length - inserted });
                    }
                }
            );
        });
    });
});


router.get('/debug-cat', (req, res) => {
    const fs = require('fs');
    const db = require('../database/db');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    db.all('SELECT id, title, image_url FROM catalogue_items', (err, rows) => {
        const diskFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
        const diskSet = new Set(diskFiles);

        const report = rows.map(row => {
            let images = [];
            try {
                images = JSON.parse(row.image_url);
                if (!Array.isArray(images)) images = [row.image_url];
            } catch(e) {
                images = row.image_url ? [row.image_url] : [];
            }
            const result = images.map(imgUrl => {
                const filename = (imgUrl || '').split('/').pop();
                return { url: imgUrl, filename, exists: diskSet.has(filename) };
            });
            const allOk = result.every(r => r.exists);
            return { id: row.id, title: row.title, files: result, allOk };
        });

        const broken = report.filter(r => !r.allOk);
        res.json({
            summary: { total: rows.length, broken: broken.length, ok: rows.length - broken.length },
            broken,
            uploadDir,
            diskFileCount: diskFiles.length,
            error: err?.message || null
        });
    });
});

const chatController = require('../controllers/chat_controller');
router.get('/chat/stream', chatController.stream);
router.get('/chat/history', chatController.getHistory);
router.post('/chat/message', chatController.sendMessage);
router.post('/chat/upload', upload.single('image'), chatController.uploadImage);
router.put('/chat/message/:id', chatController.editMessage);
router.delete('/chat/message/:id', chatController.deleteMessage);
router.post('/chat/typing', chatController.typing);


// Open URL in Microsoft Edge (Windows only)
const { exec } = require('child_process');
router.post('/open-edge', (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith('https://')) {
        return res.status(400).json({ error: 'URL inválida.' });
    }
    // Uses the microsoft-edge: protocol – if Edge is already open, opens in the existing window
    exec(`cmd /c start "" "microsoft-edge:${url}"`, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ── Backup ────────────────────────────────────────────────────────────────────
const fs  = require('fs');
const jwt = require('jsonwebtoken');
const BACKUP_SECRET = 'lm-passo-secret-key-change-me';

router.get('/backup/db', (req, res) => {
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const decoded = jwt.verify(token, BACKUP_SECRET);
        if (decoded.role !== 'master') return res.status(403).json({ error: 'Apenas master pode fazer backup' });
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }

    const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');
    if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'Banco não encontrado' });

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const filename = `backup_lmpasso_${stamp}.sqlite`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(dbPath);
});

// ── Restart Server ─────────────────────────────────────────────────────────────
// Exit code 0 signals the .bat to restart the process automatically.
// Only masters can trigger this.
// ── Temporary: Git Push via HTTP ───────────────────────────────────────────
// Allows pushing to remote from the browser (no terminal needed). Master only.
router.post('/admin/git-push', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const decoded = jwt.verify(token, BACKUP_SECRET);
        if (decoded.role !== 'master') return res.status(403).json({ error: 'Apenas master pode fazer push' });
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
    const cwd = process.cwd();
    exec('git add . && git commit -m "sync: auto-push from local server" && git push origin main', { cwd }, (err, stdout, stderr) => {
        if (err && !stdout.includes('nothing to commit') && !stderr.includes('Everything up-to-date')) {
            return res.json({ success: false, error: err.message, stdout, stderr });
        }
        res.json({ success: true, stdout: stdout || 'Nothing new to push (already up-to-date)', stderr });
    });
});

router.post('/admin/restart', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const decoded = jwt.verify(token, BACKUP_SECRET);
        if (decoded.role !== 'master') return res.status(403).json({ error: 'Apenas master pode reiniciar o servidor' });
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
    // Send response before exiting
    res.json({ message: 'Servidor reiniciando...' });
    setTimeout(() => process.exit(0), 300);
});

// ── Export Data (para migração Railway → Firebase) ────────────────────────────
const EXPORT_SECRET = 'lmpasso-migrate-2026';
router.get('/export-data', (req, res) => {
    if (req.query.secret !== EXPORT_SECRET) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    const db = require('../database/db');
    const tables = ['clients','products','orders','order_items','catalogue_items','suppliers','dispatch_costs','users'];
    const result = {};
    let done = 0;
    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            result[table] = err ? [] : rows;
            done++;
            if (done === tables.length) {
                res.json({ success: true, data: result });
            }
        });
    });
});

// Reminders (Lembretes & pedidos internos)
const reminderController = require('../controllers/reminder_controller');
router.get('/reminders', reminderController.getAll);
router.get('/reminders/pending-count', reminderController.getPendingCount);
router.post('/reminders', reminderController.create);
router.put('/reminders/reorder', reminderController.updateOrder);
router.put('/reminders/:id', reminderController.update);
router.put('/reminders/:id/toggle', reminderController.toggle);
router.delete('/reminders/:id', reminderController.remove);

// Menu Orders (Cardápios para lançar no CORE)
const menuOrdersController = require('../controllers/menu_orders_controller');
router.get('/menu-orders', menuOrdersController.getAll);
router.post('/menu-orders', menuOrdersController.create);
router.put('/menu-orders/reorder', menuOrdersController.updateOrder);
router.put('/menu-orders/:id', menuOrdersController.update);
router.put('/menu-orders/:id/launch-core', menuOrdersController.launchToCore);
router.delete('/menu-orders/:id', menuOrdersController.remove);

module.exports = router;



