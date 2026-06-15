// Correção definitiva: mantém APENAS a entrada mais recente por (product_id, color)
// e recalcula o stock de cada produto

const db = require('./server/database/db');

console.log('=== CORREÇÃO DEFINITIVA ===\n');

db.serialize(() => {
    // 1. Listar todas as cores atuais
    db.all("SELECT * FROM product_color_variants ORDER BY product_id, color, id", [], (e, all) => {
        if (e) { console.error(e.message); process.exit(1); }
        
        console.log(`Total de entradas: ${all.length}`);
        
        // 2. Identificar qual ID manter (o mais recente = maior id) por (product_id, color)
        const keep = {}; // key: "product_id|color" -> melhor id
        const toDelete = [];
        
        all.forEach(row => {
            const key = `${row.product_id}|${row.color}`;
            const qty = parseInt(row.quantity);
            const isValid = !isNaN(qty);
            
            if (!keep[key]) {
                keep[key] = row;
            } else {
                const existing = keep[key];
                const existingQty = parseInt(existing.quantity);
                const existingValid = !isNaN(existingQty);
                
                // Preferir: (1) valor válido, (2) maior ID (mais recente)
                if (!existingValid && isValid) {
                    // novo é válido, existente não — manter novo
                    toDelete.push(existing.id);
                    keep[key] = row;
                } else if (existingValid && !isValid) {
                    // existente é válido, novo não — deletar novo
                    toDelete.push(row.id);
                } else {
                    // ambos válidos ou ambos inválidos — manter o maior ID
                    if (row.id > existing.id) {
                        toDelete.push(existing.id);
                        keep[key] = row;
                    } else {
                        toDelete.push(row.id);
                    }
                }
            }
        });
        
        console.log(`\nEntradas a manter: ${Object.keys(keep).length}`);
        console.log(`Entradas a deletar: ${toDelete.length}`);
        
        if (toDelete.length === 0) {
            console.log('Nada a deletar.');
            return recalcStock();
        }
        
        // 3. Deletar duplicatas e entradas corrompidas
        const placeholders = toDelete.map(() => '?').join(',');
        db.run(`DELETE FROM product_color_variants WHERE id IN (${placeholders})`, toDelete, function(e) {
            if (e) { console.error('Erro ao deletar:', e.message); process.exit(1); }
            console.log(`✅ Deletadas ${this.changes} entradas.`);
            
            // 4. Mostrar o que ficou
            db.all("SELECT * FROM product_color_variants ORDER BY product_id, color", [], (e2, remaining) => {
                console.log('\nEntradas restantes:');
                remaining.forEach(r => {
                    const qtyValid = !isNaN(parseInt(r.quantity));
                    console.log(`  id=${r.id} | pid=${r.product_id} | ${r.color}: ${r.quantity} ${qtyValid ? '✓' : '⚠️ CORROMPIDO'}`);
                });
                
                recalcStock(remaining);
            });
        });
    });
});

function recalcStock(variants) {
    if (!variants) {
        db.all("SELECT * FROM product_color_variants", [], (e, v) => recalcStock(v));
        return;
    }
    
    // Agrupar por product_id e somar quantidades
    const stockByProduct = {};
    variants.forEach(v => {
        const qty = parseInt(v.quantity) || 0;
        const pid = String(v.product_id);
        stockByProduct[pid] = (stockByProduct[pid] || 0) + qty;
    });
    
    console.log('\nAtualizando stock dos produtos:');
    const pids = Object.keys(stockByProduct);
    let pending = pids.length;
    
    if (pending === 0) {
        console.log('Nenhum produto para atualizar.');
        process.exit(0);
    }
    
    pids.forEach(pid => {
        const total = stockByProduct[pid];
        db.run("UPDATE products SET stock = ? WHERE id = ?", [total, pid], function(e) {
            if (e) console.error(`  Erro pid=${pid}:`, e.message);
            else console.log(`  pid=${pid}: stock = ${total} ✅`);
            
            pending--;
            if (pending === 0) {
                console.log('\n✅ Banco de dados corrigido com sucesso!');
                process.exit(0);
            }
        });
    });
}
