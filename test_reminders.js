const https = require('https');

function req(method, path, body) {
    return new Promise(resolve => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'lm-passo-api-61970172348.southamerica-east1.run.app',
            path, method,
            headers: {
                'Content-Type': 'application/json',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = https.request(opts, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
                catch(e) { resolve({ status: res.statusCode, body: b.substring(0, 300) }); }
            });
        });
        r.on('error', e => resolve({ status: 0, body: e.message }));
        if (data) r.write(data);
        r.end();
    });
}

async function run() {
    console.log('🔍 Testando lembretes...\n');

    // 1. GET lembretes
    const r1 = await req('GET', '/api/reminders');
    console.log('GET /api/reminders:', r1.status, '→', r1.body.data?.length, 'registros');
    if (r1.body.data?.length > 0) console.log('  Exemplo:', JSON.stringify(r1.body.data[0]).substring(0, 100));

    // 2. POST criar lembrete
    const r2 = await req('POST', '/api/reminders', { title: 'Teste lembrete Firebase', description: 'Descrição teste', priority: 'normal' });
    console.log('\nPOST /api/reminders:', r2.status, JSON.stringify(r2.body).substring(0, 200));

    // 3. Verificar se foi criado
    const r3 = await req('GET', '/api/reminders');
    console.log('\nGET /api/reminders depois:', r3.status, '→', r3.body.data?.length, 'registros');

    // 4. Testar toggle
    if (r1.body.data?.length > 0) {
        const id = r1.body.data[0].id;
        const r4 = await req('PUT', `/api/reminders/${id}/toggle`);
        console.log(`\nPUT /api/reminders/${id}/toggle:`, r4.status, JSON.stringify(r4.body));
    }

    // 5. Testar delete do que criamos (se criou)
    if (r2.status === 201 && r2.body.data?.id) {
        const id = r2.body.data.id;
        const r5 = await req('DELETE', `/api/reminders/${id}`);
        console.log(`\nDELETE /api/reminders/${id}:`, r5.status, JSON.stringify(r5.body));
    }

    process.exit(0);
}
run().catch(console.error);
