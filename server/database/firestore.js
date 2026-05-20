/**
 * CAMADA DE COMPATIBILIDADE FIRESTORE
 * =====================================
 * Este módulo expõe a mesma API do SQLite (db.run, db.get, db.all, db.serialize)
 * mas usa o Firebase Firestore por baixo.
 *
 * Cada "tabela" vira uma Coleção no Firestore.
 * IDs numéricos são emulados com um contador atômico em Firestore.
 *
 * IMPORTANTE: Queries SQL complexas (JOINs, GROUP BY, etc.) são reescritas
 * via o módulo de queries personalizado (firestoreQueries.js).
 */

const admin = require('firebase-admin');
const path = require('path');

// ── Inicializar Firebase Admin (não-bloqueante) ───────────────────────────────
let db = null;
let _dbReady = false;
const _pendingQueue = [];

// Retorna uma promise que resolve quando o db estiver pronto
function waitForDb() {
    if (_dbReady) return Promise.resolve(db);
    return new Promise(resolve => _pendingQueue.push(resolve));
}

function _flushQueue() {
    _dbReady = true;
    while (_pendingQueue.length) _pendingQueue.shift()(db);
}

// Inicializa em background sem bloquear o startup do servidor
(async () => {
    try {
        let creds;
        if (process.env.FIREBASE_CREDENTIALS) {
            creds = JSON.parse(process.env.FIREBASE_CREDENTIALS);
            if (!admin.apps.length) {
                admin.initializeApp({ credential: admin.credential.cert(creds) });
            }
            console.log('🔥 Firebase: Inicializado via variável de ambiente.');
        } else {
            const credsPath = path.resolve(process.cwd(), 'firebase-credentials.json');
            creds = require(credsPath);
            if (!admin.apps.length) {
                admin.initializeApp({ credential: admin.credential.cert(creds) });
            }
            console.log('🔥 Firebase: Inicializado via arquivo local.');
        }
        db = admin.firestore();
        db.settings({ ignoreUndefinedProperties: true });
        _flushQueue();
        console.log('✅ Firestore conectado com sucesso!');
    } catch (err) {
        console.error('❌ ERRO ao inicializar Firebase:', err.message);
        process.exit(1);
    }
})();


// ── Contador de IDs Atômico ───────────────────────────────────────────────────
// Firestore não tem auto-increment. Usamos um documento "_counters" para isso.
async function getNextId(tableName) {
    const counterRef = db.collection('_counters').doc(tableName);
    const newId = await db.runTransaction(async (tx) => {
        const doc = await tx.get(counterRef);
        const current = doc.exists ? (doc.data().seq || 0) : 0;
        const next = current + 1;
        tx.set(counterRef, { seq: next }, { merge: true });
        return next;
    });
    return newId;
}

// ── Helpers de Conversão ──────────────────────────────────────────────────────
function docToRow(doc) {
    if (!doc || !doc.exists) return null;
    return { id: parseInt(doc.id), ...doc.data() };
}

function docsToRows(snapshot) {
    if (!snapshot || snapshot.empty) return [];
    return snapshot.docs.map(d => ({ id: parseInt(d.id), ...d.data() }));
}

// ── Módulo de Queries Avançadas ───────────────────────────────────────────────
// Lazy-load para evitar dependência circular
let _queries = null;
function getQueries() {
    if (!_queries) _queries = require('./firestoreQueries');
    return _queries;
}

// ── INTERFACE PRINCIPAL ───────────────────────────────────────────────────────

/**
 * db.run(sql, params, callback)
 * Executa INSERT, UPDATE ou DELETE.
 * O callback recebe (err) e `this` tem `lastID` e `changes`.
 */
async function run(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    const cb = callback || (() => {});

    try {
        await waitForDb(); // aguarda Firebase estar pronto
        const q = sql.trim().toUpperCase();

        // ── INSERT ──────────────────────────────────────────────────────────
        if (q.startsWith('INSERT')) {
            const table = extractTable(sql, 'INSERT');
            const columns = extractColumns(sql);
            const newId = await getNextId(table);

            const data = {};
            columns.forEach((col, i) => {
                data[col] = params[i] !== undefined ? params[i] : null;
            });
            data.created_at = data.created_at || new Date().toISOString();

            await db.collection(table).doc(String(newId)).set(data);
            getQueries().invalidateCache(table);
            cb.call({ lastID: newId, changes: 1 }, null);
        }

        // ── UPDATE ──────────────────────────────────────────────────────────
        else if (q.startsWith('UPDATE')) {
            const changes = await handleUpdate(sql, params);
            getQueries().invalidateCache(extractTable(sql, 'UPDATE'));
            cb.call({ lastID: null, changes }, null);
        }

        // ── DELETE ──────────────────────────────────────────────────────────
        else if (q.startsWith('DELETE')) {
            const changes = await handleDelete(sql, params);
            getQueries().invalidateCache(extractTable(sql, 'DELETE'));
            cb.call({ lastID: null, changes }, null);
        }

        // ── CREATE TABLE, ALTER TABLE, CREATE TRIGGER, BEGIN, COMMIT, ROLLBACK ──
        else if (q.startsWith('CREATE') || q.startsWith('ALTER') || 
                 q.startsWith('BEGIN') || q.startsWith('COMMIT') || 
                 q.startsWith('ROLLBACK') || q.startsWith('PRAGMA')) {
            // No-op: Firestore é schemaless, transações são gerenciadas de outra forma
            cb.call({ lastID: null, changes: 0 }, null);
        }

        else {
            console.warn('[Firestore] run() - SQL não reconhecido:', sql.substring(0, 80));
            cb.call({ lastID: null, changes: 0 }, null);
        }

    } catch (err) {
        console.error('[Firestore] Erro em run():', err.message, '\nSQL:', sql.substring(0, 100));
        cb(err);
    }
}

/**
 * db.get(sql, params, callback)
 * Retorna UMA linha. callback(err, row).
 */
async function get(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    const cb = callback || (() => {});

    try {
        const _db = await waitForDb(); // aguarda Firebase estar pronto
        const queries = getQueries();
        const result = await queries.handleGet(sql, params, _db);
        cb(null, result);
    } catch (err) {
        console.error('[Firestore] Erro em get():', err.message, '\nSQL:', sql.substring(0, 100));
        cb(err, null);
    }
}

/**
 * db.all(sql, params, callback)
 * Retorna MÚLTIPLAS linhas. callback(err, rows).
 */
async function all(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    const cb = callback || (() => {});

    try {
        const _db = await waitForDb(); // aguarda Firebase estar pronto
        const queries = getQueries();
        const results = await queries.handleAll(sql, params, _db);
        cb(null, results);
    } catch (err) {
        console.error('[Firestore] Erro em all():', err.message, '\nSQL:', sql.substring(0, 100));
        cb(err, []);
    }
}

/**
 * db.serialize(fn)
 * No SQLite, serializa operações em fila. No Firestore, apenas executa fn() imediatamente.
 */
function serialize(fn) {
    if (typeof fn === 'function') fn();
}

/**
 * db.prepare(sql)
 * Retorna um objeto com método .run() e .finalize() para compatibilidade.
 */
function prepare(sql) {
    return {
        run(...args) {
            let params = [];
            let cb = () => {};
            if (args.length >= 2 && typeof args[args.length - 1] === 'function') {
                cb = args.pop();
                params = Array.isArray(args[0]) ? args[0] : args;
            } else {
                params = Array.isArray(args[0]) ? args[0] : args;
            }
            run(sql, params, cb);
        },
        finalize(cb) { if (typeof cb === 'function') cb(null); }
    };
}

// ── Handlers de UPDATE/DELETE ─────────────────────────────────────────────────

async function handleUpdate(sql, params) {
    const table = extractTable(sql, 'UPDATE');
    const { setClause, whereClause } = extractUpdateParts(sql);
    
    const setColumns = parseSetColumns(setClause, params);
    const whereParams = params.slice(Object.keys(setColumns).length);
    
    const docIds = await resolveWhereIds(table, whereClause, whereParams, db);
    
    if (docIds.length === 0) return 0;
    
    const batch = db.batch();
    docIds.forEach(id => {
        const ref = db.collection(table).doc(String(id));
        batch.update(ref, setColumns);
    });
    await batch.commit();
    return docIds.length;
}

async function handleDelete(sql, params) {
    const table = extractTable(sql, 'DELETE');
    const whereClause = extractWhereClause(sql);
    
    const docIds = await resolveWhereIds(table, whereClause, params, db);
    
    if (docIds.length === 0) return 0;
    
    const batch = db.batch();
    docIds.forEach(id => {
        batch.delete(db.collection(table).doc(String(id)));
    });
    await batch.commit();
    return docIds.length;
}

// ── Resolução de WHERE Simples ────────────────────────────────────────────────

/**
 * Resolve IDs de documentos que atendem a uma cláusula WHERE simples.
 * Suporta: WHERE id = ?, WHERE campo = ?, WHERE campo IN (...), WHERE campo != ?
 */
async function resolveWhereIds(table, whereClause, params, firestoreDb) {
    if (!whereClause || whereClause.trim() === '') {
        // Sem WHERE: todos os documentos
        const snap = await firestoreDb.collection(table).get();
        return snap.docs.map(d => d.id);
    }

    const clause = whereClause.trim();
    
    // WHERE id = ?
    const idMatch = clause.match(/^id\s*=\s*\?$/i);
    if (idMatch) {
        return [String(params[0])];
    }

    // WHERE campo = ?
    const simpleMatch = clause.match(/^(\w+)\s*=\s*\?$/i);
    if (simpleMatch) {
        const field = simpleMatch[1];
        const snap = await firestoreDb.collection(table).where(field, '==', params[0]).get();
        return snap.docs.map(d => d.id);
    }

    // WHERE campo != ?
    const notEqMatch = clause.match(/^(\w+)\s*!=\s*\?$/i);
    if (notEqMatch) {
        const field = notEqMatch[1];
        const snap = await firestoreDb.collection(table).where(field, '!=', params[0]).get();
        return snap.docs.map(d => d.id);
    }

    // WHERE campo = ? AND campo2 = ?
    const andMatch = clause.match(/^(\w+)\s*=\s*\?\s+AND\s+(\w+)\s*=\s*\?$/i);
    if (andMatch) {
        const field1 = andMatch[1];
        const field2 = andMatch[2];
        const snap = await firestoreDb.collection(table)
            .where(field1, '==', params[0])
            .where(field2, '==', params[1])
            .get();
        return snap.docs.map(d => d.id);
    }

    // WHERE campo IN (?)
    const inMatch = clause.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
    if (inMatch) {
        const field = inMatch[1];
        const values = params; // params já tem os valores
        if (values.length === 0) return [];
        const snap = await firestoreDb.collection(table).where(field, 'in', values).get();
        return snap.docs.map(d => d.id);
    }

    // Fallback: buscar todos com cache (para WHERE complexos)
    console.warn(`[Firestore] WHERE complexo, usando cache: "${clause.substring(0, 60)}"`);
    const { getCachedCollection: getCC } = require('./firestoreQueries');
    const allDocs = await (async () => { const snap = await firestoreDb.collection(table).get(); return snap.docs.map(d => d.id); })();
    return allDocs;
}

// ── Parsers de SQL ────────────────────────────────────────────────────────────

function extractTable(sql, operation) {
    let match;
    if (operation === 'INSERT') {
        match = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    } else if (operation === 'UPDATE') {
        match = sql.match(/UPDATE\s+(\w+)/i);
    } else if (operation === 'DELETE') {
        match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    } else if (operation === 'SELECT') {
        match = sql.match(/FROM\s+(\w+)/i);
    }
    return match ? match[1].toLowerCase() : '';
}

function extractColumns(sql) {
    const match = sql.match(/\(([^)]+)\)\s+VALUES/i);
    if (!match) return [];
    return match[1].split(',').map(c => c.trim().replace(/[`"']/g, ''));
}

function extractUpdateParts(sql) {
    const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/is);
    const whereMatch = sql.match(/WHERE\s+(.*?)$/is);
    return {
        setClause: setMatch ? setMatch[1].trim() : '',
        whereClause: whereMatch ? whereMatch[1].trim() : ''
    };
}

function parseSetColumns(setClause, params) {
    const parts = setClause.split(',').map(p => p.trim());
    const result = {};
    let paramIdx = 0;
    parts.forEach(part => {
        const eqMatch = part.match(/^(\w+)\s*=\s*(.*)$/i);
        if (eqMatch) {
            const col = eqMatch[1];
            const valExpr = eqMatch[2].trim();
            if (valExpr === '?') {
                result[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
            } else if (valExpr.match(/^\w+\s*[\+\-]\s*\?/)) {
                // Expressão como "stock = stock + ?" — resolveremos via update field
                result[col] = admin.firestore.FieldValue.increment(params[paramIdx++]);
            } else {
                result[col] = valExpr.replace(/['"]/g, '');
            }
        }
    });
    return result;
}

function extractWhereClause(sql) {
    const match = sql.match(/WHERE\s+(.*?)$/is);
    return match ? match[1].trim() : '';
}

// ── Exportar ──────────────────────────────────────────────────────────────────
module.exports = {
    run,
    get,
    all,
    serialize,
    prepare,
    // Utilitários internos expostos para o módulo de queries
    _db: db,
    _admin: admin,
    _docToRow: docToRow,
    _docsToRows: docsToRows,
    _getNextId: getNextId,
    _resolveWhereIds: resolveWhereIds,
    _extractTable: extractTable
};
