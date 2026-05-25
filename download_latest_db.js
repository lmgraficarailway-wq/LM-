const http = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const username = 'master';
const password = 'master123';
const data = JSON.stringify({username, password});

const req = http.request('https://lm-passo-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        try {
            const token = JSON.parse(body).token;
            if (token) {
                console.log('Token obtido. Baixando banco...');
                const dest = fs.createWriteStream('database_latest.sqlite');
                http.get('https://lm-passo-production.up.railway.app/api/backup/db?token='+token, response => {
                    response.pipe(dest);
                    dest.on('finish', () => {
                        console.log('Download concluido com sucesso!');
                        console.log('Sobrescrevendo banco local...');
                        fs.copyFileSync('database_latest.sqlite', 'database.sqlite');
                        console.log('Executando migração para o Firebase...');
                        try {
                            const out = execSync('node scripts/migrate_to_firestore.js');
                            console.log(out.toString());
                            console.log('Dados atualizados com sucesso!');
                        } catch(e) {
                            console.error('Erro na migracao:', e.stdout ? e.stdout.toString() : e.message);
                        }
                    });
                });
            } else {
                console.log('Falha no login da API:', body);
            }
        } catch(e) {
            console.log('Erro no parse:', body);
        }
    });
});
req.write(data);
req.end();
