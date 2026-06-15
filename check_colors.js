const db = require('./server/database/db');

// Checar tabela de cores
db.all('SELECT pv.*, p.name as product_name FROM product_color_variants pv JOIN products p ON p.id = pv.product_id ORDER BY p.name, pv.color LIMIT 50', [], (e, r) => {
    if (e) { console.error('Erro:', e.message); process.exit(1); }
    if (!r || r.length === 0) {
        console.log('Nenhuma cor cadastrada no banco local!');
    } else {
        console.log('Cores no banco local:');
        console.log(JSON.stringify(r, null, 2));
    }

    // Checar produtos do tipo pulseira
    db.all("SELECT id, name, type, stock FROM products WHERE name LIKE '%pulseira%' OR type LIKE '%pulseira%'", [], (e2, r2) => {
        if (e2) { console.error('Erro:', e2.message); process.exit(1); }
        console.log('\nProdutos pulseira:');
        console.log(JSON.stringify(r2, null, 2));
        process.exit(0);
    });
});
