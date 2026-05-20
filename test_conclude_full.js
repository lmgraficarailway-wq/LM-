/**
 * Teste completo do fluxo de finalizar pedido Em Balcão
 * Simula exatamente o que o navegador faz
 */
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('=== TESTE COMPLETO DE FINALIZAÇÃO EM BALCÃO ===\n');

    // 1. Verificar pedidos em_balcao
    const orders = await new Promise((res, rej) => {
        db.all("SELECT id, status FROM orders WHERE status='em_balcao' LIMIT 3", [], (err, rows) => {
            if (err) rej(err); else res(rows);
        });
    });

    console.log('Pedidos Em Balcão:', JSON.stringify(orders));

    if (orders.length === 0) {
        // Pegar um pedido finalizado e mover para em_balcao para testar
        const lastFin = await new Promise((res, rej) => {
            db.get("SELECT id FROM orders WHERE status='finalizado' LIMIT 1", [], (err, row) => {
                if (err) rej(err); else res(row);
            });
        });
        if (lastFin) {
            await new Promise((res, rej) => {
                db.run("UPDATE orders SET status='em_balcao' WHERE id=?", [lastFin.id], function(err) {
                    if (err) rej(err); else res(this.changes);
                });
            });
            console.log('Movido pedido', lastFin.id, 'para em_balcao para teste');
            orders.push({ id: lastFin.id, status: 'em_balcao' });
        }
    }

    if (orders.length === 0) {
        console.log('ERRO: Nenhum pedido disponível para teste!');
        process.exit(1);
    }

    const testOrder = orders[0];
    console.log('\nTestando com pedido ID:', testOrder.id);

    // 2. Testar o endpoint /conclude com FormData simulado
    const boundary = '----TestBoundary' + Date.now();
    const formBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="_prevent_empty"',
        '',
        '1',
        `--${boundary}--`,
        ''
    ].join('\r\n');

    console.log('\n--- Enviando POST /api/orders/' + testOrder.id + '/conclude ---');
    
    const result = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/orders/${testOrder.id}/conclude`,
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(formBody)
        }
    }, formBody);

    console.log('Status HTTP:', result.status);
    console.log('Resposta:', result.body);

    // 3. Verificar no banco
    const updated = await new Promise((res, rej) => {
        db.get("SELECT id, status FROM orders WHERE id=?", [testOrder.id], (err, row) => {
            if (err) rej(err); else res(row);
        });
    });
    console.log('\nStatus no banco após POST:', JSON.stringify(updated));

    if (updated.status === 'finalizado') {
        console.log('\n✅ SUCESSO! O endpoint /conclude funciona corretamente.');
        console.log('O problema está no FRONTEND (browser do celular/rede).');
        console.log('\nDiagnóstico: O botão "Finalizar Pedido" na tela não está disparando o submit.');
        console.log('Causa provável: cache do browser no celular com versão antiga do kanban.js.');
    } else {
        console.log('\n❌ FALHA! O endpoint não atualizou o status para finalizado.');
        console.log('O problema está no SERVIDOR.');
    }

    // 4. Teste GET /api/orders para ver se retorna dados corretos
    console.log('\n--- Testando GET /api/orders ---');
    const ordersResult = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders',
        method: 'GET'
    });
    console.log('Status GET /api/orders:', ordersResult.status);
    
    try {
        const parsed = JSON.parse(ordersResult.body);
        const em_balcao = (parsed.data || []).filter(o => o.status === 'em_balcao');
        const finalizado = (parsed.data || []).filter(o => o.status === 'finalizado');
        console.log('Pedidos em_balcao na API:', em_balcao.length);
        console.log('Pedidos finalizado na API:', finalizado.length);
    } catch(e) {
        console.log('Erro ao parsear resposta:', e.message);
    }

    db.close();
    console.log('\n=== FIM DO TESTE ===');
}

run().catch(err => {
    console.error('ERRO FATAL:', err);
    db.close();
});
