const http = require('http');

// Build a simple multipart/form-data body manually
const boundary = '----TestBoundary12345';
const body = `--${boundary}\r\nContent-Disposition: form-data; name="_prevent_empty"\r\n\r\n1\r\n--${boundary}--\r\n`;

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/275/conclude',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
        
        // Now check DB
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database('database.sqlite');
        db.get("SELECT id, status FROM orders WHERE id = 275", (err, row) => {
            console.log('DB Status:', row ? row.status : 'not found', err ? err.message : '');
        });
    });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(body);
req.end();
