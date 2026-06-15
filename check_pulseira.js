const db = require('./server/database/db');

db.all("SELECT id, name, type, stock FROM products WHERE lower(name) LIKE '%pulseira%' OR lower(type) LIKE '%pulseira%'", [], (e, r) => {
    console.log('=== PRODUTOS PULSEIRA ===');
    console.log(JSON.stringify(r, null, 2));

    db.all("SELECT * FROM product_color_variants", [], (e2, r2) => {
        console.log('=== TODAS AS CORES CADASTRADAS ===');
        console.log(JSON.stringify(r2, null, 2));
        
        // Testar o endpoint diretamente
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/products',
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                const pulseiras = (json.data || []).filter(p => 
                    (p.name || '').toLowerCase().includes('pulseira') || 
                    (p.type || '').toLowerCase().includes('pulseira')
                );
                console.log('=== PULSEIRAS NA API LOCAL ===');
                console.log(JSON.stringify(pulseiras.map(p => ({ id: p.id, name: p.name, type: p.type, stock: p.stock, color_variants: p.color_variants })), null, 2));
                process.exit(0);
            });
        });
        req.on('error', (e) => {
            console.log('Servidor local não disponível:', e.message);
            process.exit(0);
        });
        req.end();
    });
});
