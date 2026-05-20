const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/db-status', (req, res) => {
    const tables = ['users', 'clients', 'products', 'orders'];
    const results = {};
    let completed = 0;

    tables.forEach(table => {
        db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
            results[table] = err ? err.message : (row ? row.count : 0);
            completed++;
            if (completed === tables.length) {
                res.json({
                    timestamp: new Date().toISOString(),
                    database: results,
                    env: {
                        has_gemini_key: !!process.env.GEMINI_API_KEY,
                        db_path: process.env.DB_PATH || 'default'
                    }
                });
            }
        });
    });
});

module.exports = router;
