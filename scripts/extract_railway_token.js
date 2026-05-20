/**
 * extract_railway_token.js
 * Lê o banco SQLite de cookies do Edge para extrair o token do Railway
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const cookiesPath = path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft', 'Edge', 'User Data', 'Default', 'Network', 'Cookies'
);

console.log('Lendo cookies de:', cookiesPath);

const db = new sqlite3.Database(cookiesPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Erro ao abrir cookies:', err.message);
        return;
    }
    
    db.all(
        "SELECT host_key, name, value, encrypted_value FROM cookies WHERE host_key LIKE '%railway%'",
        [],
        (err, rows) => {
            if (err) {
                console.error('Erro SQL:', err.message);
            } else {
                console.log(`Cookies do Railway (${rows.length} encontrados):`);
                rows.forEach(row => {
                    const val = row.value || '[criptografado - tamanho: ' + row.encrypted_value.length + ']';
                    console.log(`  ${row.host_key} | ${row.name}: ${val.substring(0, 80)}`);
                });
            }
            db.close();
        }
    );
});
