const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { getServiceAccount } = require('./firebaseAuth');

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'database.sqlite');

/**
 * Função para importar as tabelas.
 * Retorna uma Promise.
 */
async function restoreFromFirebase() {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔍 Verificando necessidade de auto-restauração...');
            
            // Aguarda 2 segundos para garantir que o db.js terminou de criar as tabelas e os triggers (Race Condition)
            await new Promise(res => setTimeout(res, 2000));

            // Verifica se o banco existe e se possui dados na tabela clients (se tiver > 0, assume que tá intacto)
            if (fs.existsSync(DB_PATH)) {
                console.log('  Found DB file at:', DB_PATH);
                const checkDb = new sqlite3.Database(DB_PATH);
                
                const hasData = await new Promise((res) => {
                    checkDb.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='clients'", (err, row) => {
                        if (err) {
                            console.log('  ⚠️ Erro ao verificar sqlite_master:', err.message);
                            return res(false);
                        }
                        if (!row || row.count === 0) {
                            console.log('  ⚠️ Tabela clients não existe no sqlite_master.');
                            return res(false);
                        }
                        
                        checkDb.get("SELECT COUNT(*) as count FROM clients", (err2, row2) => {
                            if (err2) {
                                console.log('  ⚠️ Erro ao contar registros em clients:', err2.message);
                                return res(false);
                            }
                            const count = row2 ? row2.count : 0;
                            console.log(`  📊 Registros encontrados em clients: ${count}`);
                            res(count > 0);
                        });
                    });
                });
                
                try { checkDb.close(); } catch(e) {}

                if (hasData) {
                    console.log('✅ Banco de dados intacto (com dados). Pulando auto-restauração.');
                    return resolve(true);
                }
            } else {
                console.log('  ❌ Arquivo de banco de dados não encontrado em:', DB_PATH);
            }

            const serviceAccount = getServiceAccount();

            if (!serviceAccount) {
                console.log('⚠️ Credenciais do Firebase não encontradas. Ignorando auto-restauração.');
                return resolve(false);
            }

            console.log('\n======================================================');
            console.log('🔥 INICIANDO AUTO-RESTAURAÇÃO DO FIREBASE (Disco Vazio)');
            console.log('======================================================\n');

            if (!admin.apps.length) {
                admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            }
            const firestoreDb = admin.firestore();

            // Precisamos que o arquivo SQLite e a estrutura existam antes de inserir os dados.
            const localDb = new sqlite3.Database(DB_PATH);

            const collections = {
                users:           ['id','username','password','role','name','client_id','plain_password'],
                clients:         ['id','name','phone','origin','created_at','core_discount','address','city','zip_code','cpf','state'],
                products:        ['id','name','type','production_time','price','stock','price_1_day','price_3_days','min_stock','terceirizado','cost_value','unit_cost'],
                orders:          ['id','client_id','product_id','description','total_value','payment_method','created_by','created_at','status','deadline_type','deadline_at','production_notes','rejection_reason','pickup_photo','checklist','group_id','quantity','products_summary','stock_used','loss_justification','moved_by','moved_at','launched_to_core','file_path','attachments','event_name','stock_reserved','payment_code','is_internal','is_terceirizado','discount_value'],
                order_items:     ['id','order_id','product_id','quantity','price','product_snapshot_name','color_variant_id','color_name'],
                catalogue_items: ['id','title','description','image_url','created_at'],
                suppliers:       ['id','name','phone','website','description','created_at'],
                dispatch_costs:  ['id','order_id','carrier','amount','created_at','launched_to_core'],
                team_chat:       ['id','user_id','user_name','user_role','message','created_at','is_edited','edited_at','reply_to_id','reply_to_author','reply_to_msg','attachment_url'],
                reminders:       ['id','title','description','priority','status','created_by','created_at','concluded_at','position'],
                menu_orders:     ['id','client_id','quantity','event_name','producer_name','print_type','status','launched_to_core','order_id','created_by','created_at','position']
            };

            for (const [table, columns] of Object.entries(collections)) {
                console.log(`  ⬇️  Baixando ${table}...`);
                const snap = await firestoreDb.collection(table).get();
                if (snap.empty) {
                    console.log(`  ⚠️  ${table}: sem dados`);
                    continue;
                }
                const rows = snap.docs.map(doc => doc.data());
                
                await new Promise((resolveTable) => {
                    const placeholders = columns.map(() => '?').join(', ');
                    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
                    let completed = 0;
                    
                    localDb.serialize(() => {
                        localDb.run('BEGIN TRANSACTION');
                        const stmt = localDb.prepare(sql);
                        
                        rows.forEach(row => {
                            const values = columns.map(c => {
                                const v = row[c];
                                return (v === '' || v === undefined) ? null : v;
                            });
                            stmt.run(values, (err) => {
                                completed++;
                                if (err) console.error('Erro na inserção de', table, err.message);
                                if (completed === rows.length) {
                                    stmt.finalize();
                                    localDb.run('COMMIT', () => resolveTable());
                                }
                            });
                        });
                    });
                });
                console.log(`  ✅ ${table}: ${rows.length} registros restaurados`);
            }

            localDb.close();
            console.log('\n======================================================');
            console.log('✅ AUTO-RESTAURAÇÃO CONCLUÍDA!');
            console.log('======================================================\n');
            resolve(true);

        } catch (error) {
            console.error('\n❌ Falha Crítica na Auto-restauração:', error);

            // — FALLBACK FINAL: Garante que o usuário master existe mesmo assim —
            try {
                const sqlite3Fb = require('sqlite3').verbose();
                const bcryptFb = require('bcryptjs');
                const fallbackDb = new sqlite3Fb.Database(DB_PATH);
                const fallbackUsers = [
                    { username: 'master',  password: 'master123',  role: 'master', name: 'Master' },
                    { username: 'gerente', password: 'gerente123', role: 'master', name: 'Gerente' }
                ];
                for (const u of fallbackUsers) {
                    await new Promise((ok) => {
                        fallbackDb.get('SELECT id FROM users WHERE username = ?', [u.username], (e, row) => {
                            if (!row) {
                                const hash = bcryptFb.hashSync(u.password, 10);
                                fallbackDb.run(
                                    'INSERT INTO users (username, password, role, name, plain_password) VALUES (?, ?, ?, ?, ?)',
                                    [u.username, hash, u.role, u.name, u.password],
                                    () => ok()
                                );
                            } else { ok(); }
                        });
                    });
                }
                fallbackDb.close();
                console.log('✅ Fallback: usuários padrão garantidos após falha de restauração.');
            } catch (fb) {
                console.error('❌ Fallback também falhou:', fb.message);
            }

            resolve(false);
        }
    });
}

module.exports = { restoreFromFirebase };
