const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
        let dest = path.join(process.cwd(), 'public/uploads/');
        
        if (volumePath) {
            dest = path.join(volumePath, 'uploads/');
            // Certifique-se de que a pasta existe no volume
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
const upload = multer({ storage: storage });

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/users', authController.getAllUsers);
router.get('/users/passwords', authController.getUserPasswords);
router.put('/users/:id/password', authController.changePassword);
router.put('/users/:id/role', authController.updateRole);
router.delete('/users/:id', authController.deleteUser);
router.post('/users/:id/avatar', upload.single('avatar'), authController.uploadAvatar);

module.exports = router;

