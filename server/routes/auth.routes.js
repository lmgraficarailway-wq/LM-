const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

const multer = require('multer');
const path = require('path');
const USE_STORAGE = process.env.NODE_ENV === 'production' || process.env.USE_FIREBASE_STORAGE === 'true';

const storage = USE_STORAGE
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
            let dest = path.join(process.cwd(), 'public/uploads/');
            
            if (volumePath) {
                dest = path.join(volumePath, 'uploads/');
                const fs = require('fs');
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }
            }
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/users', authController.getAllUsers);
router.get('/users/passwords', authController.getUserPasswords);
router.put('/users/:id/password', authController.changePassword);
router.put('/users/:id/role', authController.updateRole);
router.delete('/users/:id', authController.deleteUser);
router.post('/users/:id/avatar', upload.single('avatar'), authController.uploadAvatar);

module.exports = router;

