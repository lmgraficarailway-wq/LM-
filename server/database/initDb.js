/**
 * initDb.js — Inicialização automática do banco de dados SQLite
 * 
 * Cria todas as tabelas necessárias caso não existam.
 * Executado automaticamente ao iniciar o servidor.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT,
    client_id INTEGER DEFAULT NULL,
    plain_password TEXT DEFAULT '',
    avatar TEXT
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    origin TEXT,
    core_discount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpf TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    zip_code TEXT DEFAULT '',
    credit_balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    loyalty_status INTEGER DEFAULT 0,
    billing_date INTEGER DEFAULT NULL,
    active INTEGER DEFAULT 1,
    loyalty_tier TEXT DEFAULT 'bronze',
    loyalty_tier_notified INTEGER DEFAULT 1,
    points_reset_at DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    production_time TEXT,
    price REAL,
    stock INTEGER DEFAULT 0,
    price_1_day REAL,
    price_3_days REAL,
    min_stock INTEGER DEFAULT 5,
    terceirizado INTEGER DEFAULT 0,
    cost_value REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    product_id INTEGER,
    description TEXT,
    total_value REAL,
    payment_method TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'aguardando_aceite',
    deadline_type TEXT,
    deadline_at DATETIME,
    production_notes TEXT,
    launched_to_core INTEGER DEFAULT 0,
    attachments TEXT DEFAULT '',
    is_internal INTEGER DEFAULT 0,
    moved_by INTEGER DEFAULT NULL,
    moved_at DATETIME DEFAULT NULL,
    is_terceirizado INTEGER DEFAULT 0,
    discount_value REAL DEFAULT 0,
    file_path TEXT DEFAULT '',
    rejection_reason TEXT,
    pickup_photo TEXT,
    checklist TEXT,
    group_id TEXT,
    quantity INTEGER DEFAULT 1,
    products_summary TEXT,
    stock_used INTEGER,
    loss_justification TEXT,
    event_name TEXT DEFAULT '',
    stock_reserved INTEGER DEFAULT 0,
    payment_code TEXT DEFAULT '',
    ai_estimated_time INTEGER DEFAULT 0,
    is_priority INTEGER DEFAULT 0,
    loyalty_discount REAL DEFAULT 0,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    product_snapshot_name TEXT,
    color_variant_id INTEGER,
    color_name TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    user_id INTEGER,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_role TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_edited INTEGER DEFAULT 0,
    edited_at DATETIME,
    reply_to_id INTEGER,
    reply_to_msg TEXT,
    reply_to_author TEXT,
    attachment_url TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pendente',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    concluded_at DATETIME,
    position INTEGER DEFAULT 0,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity_change INTEGER,
    type TEXT,
    reason TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    custom_product_name TEXT,
    supplier_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'pendente',
    requested_by INTEGER,
    received_by INTEGER,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(requested_by) REFERENCES users(id),
    FOREIGN KEY(received_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dispatch_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    carrier TEXT,
    amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    launched_to_core INTEGER DEFAULT 0,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS menu_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quantity INTEGER NOT NULL DEFAULT 1,
    event_name TEXT NOT NULL,
    producer_name TEXT NOT NULL,
    print_type TEXT NOT NULL DEFAULT 'frente',
    status TEXT DEFAULT 'pendente',
    launched_to_core INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_id INTEGER,
    order_id INTEGER,
    position INTEGER DEFAULT 0,
    launched_at DATETIME DEFAULT NULL,
    FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_color_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    color TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS product_kit_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    name TEXT,
    base_price REAL,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS product_kit_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    child_product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY(template_id) REFERENCES product_kit_templates(id),
    FOREIGN KEY(child_product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS material_cost_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    order_id INTEGER,
    cost_amount REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS firebase_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_credit_movement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    order_id INTEGER,
    created_by INTEGER DEFAULT NULL,
    amount REAL DEFAULT 0,
    type TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
);
`;

/**
 * Cria as tabelas necessárias, aplica seed de dados se banco estiver vazio,
 * e garante que o usuário master existe.
 * @param {object} db - Instância do banco de dados SQLite
 * @returns {Promise}
 */
function initDatabase(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Habilita WAL mode para melhor performance
            db.run('PRAGMA journal_mode=WAL;');
            db.run('PRAGMA foreign_keys=ON;');

            // Cria todas as tabelas
            SCHEMA.trim().split(';').forEach(stmt => {
                const s = stmt.trim();
                if (s) {
                    db.run(s + ';', err => {
                        if (err && !err.message.includes('already exists')) {
                            console.error('Erro ao criar tabela:', err.message);
                        }
                    });
                }
            });

            // Verifica se há usuários (banco novo = sem usuários)
            db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                const isEmpty = !err && row && row.count === 0;
                
                if (isEmpty) {
                    console.log('Banco vazio detectado — aplicando dados iniciais...');
                    
                    // Tenta carregar o seed de dados
                    const path = require('path');
                    const fs = require('fs');
                    const seedPath = path.join(__dirname, '../../scripts/seed_data.sql');
                    
                    if (fs.existsSync(seedPath)) {
                        const seedSql = fs.readFileSync(seedPath, 'utf8');
                        const statements = seedSql.split('\n').filter(function(l) { return l.trim() && !l.startsWith('--'); });
                        
                        statements.forEach(function(stmt) {
                            if (stmt.trim()) {
                                db.run(stmt, function(err) {
                                    // Silencia erros de UNIQUE constraint (dados duplicados)
                                });
                            }
                        });
                        
                        db.get('SELECT COUNT(*) as c FROM users', [], function(e2, r2) {
                            console.log('Seed aplicado — ' + (r2 ? r2.c : '?') + ' usuarios carregados');
                            resolve();
                        });
                    } else {
                        // Sem seed: cria apenas o usuário master
                        const bcrypt = require('bcryptjs');
                        const masterPassword = bcrypt.hashSync('master123', 10);
                        db.run(
                            'INSERT OR IGNORE INTO users (username, password, role, name, plain_password) VALUES (?, ?, ?, ?, ?)',
                            ['master', masterPassword, 'master', 'Master', 'master123'],
                            function(err) {
                                if (!err) console.log('Usuario master criado');
                                resolve();
                            }
                        );
                    }
                } else {
                    console.log('Banco de dados carregado (' + (row ? row.count : '?') + ' usuarios)');
                    resolve();
                }
            });
        });
    });
}


module.exports = { initDatabase };
