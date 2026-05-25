/**
 * QUERIES AVANÇADAS DO FIRESTORE
 * Traduz os SELECTs complexos dos controllers para chamadas Firestore.
 */

// ── Cache em Memória ──────────────────────────────────────────────────────────
// TTL de 15 min. O cache NUNCA é apagado por inteiro (smart-update):
// writes atualizam só o documento afetado, sem invalidar a coleção toda.
// Isso mantém latência baixa mesmo após operações de escrita.
const _cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Tabelas com dados que mudam pouco — TTL ainda maior (1h)
const SLOW_CHANGE_TABLES = new Set(['products', 'clients', 'suppliers', 'users', 'catalogue']);
const SLOW_TTL_MS = 60 * 60 * 1000; // 1 hora

async function getCachedCollection(tableName, db) {
    const now = Date.now();
    const cached = _cache.get(tableName);
    const ttl = SLOW_CHANGE_TABLES.has(tableName) ? SLOW_TTL_MS : CACHE_TTL_MS;

    if (cached) {
        const age = now - cached.ts;
        if (age < ttl) {
            // Cache válido: retorna imediatamente
            return cached.data;
        }
        // Cache vencido mas existe — stale-while-revalidate:
        // Retorna dado antigo AGORA e atualiza em background
        if (age < ttl * 3) {
            _refreshCache(tableName, db).catch(() => {});
            return cached.data; // não bloqueia o request
        }
    }

    // Cache ausente: precisa aguardar
    return _refreshCache(tableName, db);
}

async function _refreshCache(tableName, db) {
    const snap = await db.collection(tableName).get();
    const data = {};
    snap.docs.forEach(d => { data[d.id] = { id: parseInt(d.id), ...d.data() }; });
    _cache.set(tableName, { ts: Date.now(), data });
    return data;
}

/**
 * Smart cache update: ao invés de apagar a coleção do cache,
 * atualiza/insere/remove só o documento afetado.
 * 
 * @param {string} tableName - nome da coleção
 * @param {string} operation - 'upsert' | 'delete'
 * @param {string|number} docId - ID do documento
 * @param {object} [data] - dados do documento (para upsert)
 */
function patchCache(tableName, operation, docId, data = {}) {
    const cached = _cache.get(tableName);
    if (!cached) return; // sem cache: próxima leitura vai buscar tudo mesmo
    const key = String(docId);
    if (operation === 'delete') {
        delete cached.data[key];
    } else {
        // upsert: mescla com dados existentes
        cached.data[key] = { id: parseInt(docId), ...(cached.data[key] || {}), ...data };
    }
    // Atualiza o timestamp do cache para estender o TTL após escrita
    cached.ts = Date.now();
}

// Mantido por compatibilidade — agora só marca o cache como antigo (não deleta)
function invalidateCache(tableName) {
    const cached = _cache.get(tableName);
    if (cached) {
        // Marca como vencido mas preserva dados para stale-while-revalidate
        cached.ts = 0;
    }
}


// ── Cache de Resultado de Query ──────────────────────────────────────────────
// Para queries pesadas (orders, archived, reports), cacheia o resultado final
// completo (após JOIN em memória). TTL curto (2 min) pois dados mudam com frequência.
const _queryCache = new Map();
const QUERY_CACHE_TTL = 30 * 1000; // 30 segundos (dados frescos no Kanban)

function getQueryCacheKey(sql, params) {
    return sql.trim().replace(/\s+/g, ' ') + '|' + JSON.stringify(params);
}

function getCachedQuery(sql, params) {
    const key = getQueryCacheKey(sql, params);
    const cached = _queryCache.get(key);
    if (cached && (Date.now() - cached.ts) < QUERY_CACHE_TTL) return cached.data;
    return null;
}

function setCachedQuery(sql, params, data) {
    const key = getQueryCacheKey(sql, params);
    _queryCache.set(key, { ts: Date.now(), data });
}

function invalidateQueryCache(table) {
    // Remove todas as queries que envolvem esta tabela
    for (const [key] of _queryCache) {
        if (key.toLowerCase().includes(table.toLowerCase())) {
            _queryCache.delete(key);
        }
    }
}

async function handleGet(sql, params, db) {
    const s = sql.trim();
    const up = s.toUpperCase();

    // COUNT
    if (up.includes('COUNT(*)')) {
        const table = extractFrom(s);
        let q = db.collection(table);
        if (up.includes('WHERE')) q = applySimpleWhere(q, s, params);
        const snap = await q.get();
        return { count: snap.size };
    }

    // SELECT com WHERE id = ?
    if (/WHERE\s+\w+\.?id\s*=\s*\?/i.test(s) || /WHERE\s+id\s*=\s*\?/i.test(s)) {
        const id = params[0];
        const table = extractFrom(s);
        const doc = await db.collection(table).doc(String(id)).get();
        if (!doc.exists) return null;
        const row = { id: parseInt(doc.id), ...doc.data() };
        return await enrichRow(row, s, db);
    }

    // SELECT com WHERE campo = ? (sem JOIN)
    if (/WHERE\s+\w+\s*=\s*\?/i.test(s) && !up.includes('JOIN')) {
        const table = extractFrom(s);
        const field = extractSimpleWhereField(s);
        const snap = await db.collection(table).where(field, '==', params[0]).limit(1).get();
        if (snap.empty) return null;
        return { id: parseInt(snap.docs[0].id), ...snap.docs[0].data() };
    }

    // SELECT com múltiplos WHERE e possível JOIN (fallback: busca tudo em memória)
    const rows = await handleAll(sql, params, db);
    return rows.length > 0 ? rows[0] : null;
}

async function handleAll(sql, params, db) {
    // ── Query result cache (skip para pedidos – dados críticos precisam ser sempre frescos) ──
    const tableForCache = extractFrom(sql.trim());
    const skipCache = ['orders'].includes(tableForCache);
    if (!skipCache) {
        const cachedResult = getCachedQuery(sql, params);
        if (cachedResult) return cachedResult;
    }

    const s = sql.trim();
    const up = s.toUpperCase();
    const table = extractFrom(s);

    let snap;
    if (up.includes('WHERE') && !up.includes('JOIN')) {
        // Query simples com WHERE — tenta como número e string para garantir compatibilidade
        let q = db.collection(table);
        q = applySimpleWhere(q, s, params);
        snap = await q.get();
        // Se não encontrou resultados e o param é numérico, tenta como string e vice-versa
        if (snap.empty && params.length > 0) {
            const alt = applySimpleWhereAlt(db.collection(table), s, params);
            if (alt) {
                const altSnap = await alt.get();
                if (!altSnap.empty) snap = altSnap;
            }
        }
    } else {
        snap = await db.collection(table).get();
    }

    let rows = snap.docs.map(d => ({ id: parseInt(d.id), ...d.data() }));

    // Aplicar JOINs em memória
    if (up.includes('LEFT JOIN') || up.includes('JOIN')) {
        rows = await applyJoins(rows, s, db);
        // Mapear aliases do SELECT: "c.name as client_name" → row.client_name = row.c_name
        rows = applySelectAliases(rows, s);
    }

    // Filtro WHERE em memória — sempre aplica se há WHERE (inclui valores literais)
    if (up.includes('WHERE')) {
        rows = applyWhereInMemory(rows, s, params);
    }

    // ORDER BY em memória
    rows = applyOrderBy(rows, s);

    // LIMIT
    const limitMatch = s.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) rows = rows.slice(0, parseInt(limitMatch[1]));

    // Agregar campos calculados (GROUP BY / SUM / COALESCE)
    rows = applyAggregations(rows, s);

    // Hardcoded polyfill for orders subqueries (total_estimated_time, has_terceirizado, product_name, client_name, etc.)
    if (table === 'orders') {
        // Carrega todas as coleções necessárias em PARALELO para máxima velocidade
        const [orderItemsMap, productsMap, clientsMap, usersMap] = await Promise.all([
            getCachedCollection('order_items', db),
            getCachedCollection('products', db),
            getCachedCollection('clients', db),
            getCachedCollection('users', db)
        ]);

        // ⚡ Indexa order_items por order_id para lookup O(1) ao invés de O(n)
        // Elimina o loop quadrático O(164 pedidos × 500 itens) = 82.000 iterações
        const itemsByOrderId = {};
        Object.values(orderItemsMap).forEach(oi => {
            const oid = String(oi.order_id);
            if (!itemsByOrderId[oid]) itemsByOrderId[oid] = [];
            itemsByOrderId[oid].push(oi);
        });

        rows = rows.map(row => {
            let total_estimated_time = 0;
            let has_terceirizado = 0;

            // O(1): busca direto pelo índice ao invés de percorrer tudo
            const items = itemsByOrderId[String(row.id)] || [];
            items.forEach(oi => {
                const prod = productsMap[String(oi.product_id)];
                if (prod) {
                    total_estimated_time += parseFloat(prod.production_time || 0) * (oi.quantity || 1);
                    if (prod.terceirizado && parseFloat(prod.terceirizado) > 0) has_terceirizado = 1;
                }
            });

            if (items.length === 0 && row.product_id) {
                const prod = productsMap[String(row.product_id)];
                if (prod) total_estimated_time = parseFloat(prod.production_time || 0);
            }

            // COALESCE(o.products_summary, p.name) as product_name
            let product_name = row.product_name;
            if (!product_name) {
                if (row.products_summary) {
                    product_name = row.products_summary;
                } else if (row.product_id && productsMap[String(row.product_id)]) {
                    product_name = productsMap[String(row.product_id)].name;
                }
            }

            // client_name, client_phone, etc.
            let client_name = row.client_name;
            let client_phone = row.client_phone;
            let client_cpf = row.client_cpf;
            let client_address = row.client_address;
            let client_city = row.client_city;
            let client_state = row.client_state;
            let client_zip_code = row.client_zip_code;
            if (row.client_id && clientsMap[String(row.client_id)]) {
                const c = clientsMap[String(row.client_id)];
                client_name = client_name || c.name;
                client_phone = client_phone || c.phone;
                client_cpf = client_cpf || c.cpf;
                client_address = client_address || c.address;
                client_city = client_city || c.city;
                client_state = client_state || c.state;
                client_zip_code = client_zip_code || c.zip_code;
            }

            // created_by_name
            let created_by_name = row.created_by_name;
            if (row.created_by && usersMap[String(row.created_by)]) {
                created_by_name = created_by_name || usersMap[String(row.created_by)].name;
            }

            // moved_by_name
            let moved_by_name = row.moved_by_name;
            if (row.moved_by && usersMap[String(row.moved_by)]) {
                moved_by_name = moved_by_name || usersMap[String(row.moved_by)].name;
            }

            return {
                ...row,
                product_name,
                client_name, client_phone, client_cpf, client_address, client_city, client_state, client_zip_code,
                created_by_name, moved_by_name,
                total_estimated_time, has_terceirizado
            };
        });
    }

    // Armazena resultado no query cache
    setCachedQuery(sql, params, rows);

    return rows;
}

// ── Resolução de aliases do SELECT ─────────────────────────────────────────
// Traduz "c.name as client_name" em row.client_name = row.c_name
function applySelectAliases(rows, sql) {
    // Extrair tudo entre SELECT e FROM
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+/is);
    if (!selectMatch) return rows;

    const selectPart = selectMatch[1];
    // Encontrar padrões alias.campo AS alias_final
    const aliasRegex = /(\w+)\.(\w+)\s+[Aa][Ss]\s+(\w+)/g;
    const mappings = []; // { from: 'c_name', to: 'client_name' }
    let am;
    while ((am = aliasRegex.exec(selectPart)) !== null) {
        mappings.push({ from: `${am[1]}_${am[2]}`, to: am[3] });
    }

    if (mappings.length === 0) return rows;

    return rows.map(row => {
        const r = { ...row };
        mappings.forEach(({ from, to }) => {
            if (r[from] !== undefined && r[to] === undefined) {
                r[to] = r[from];
            }
        });
        return r;
    });
}

// ── JOINs em memória ───────────────────────────────────────────────────────

async function applyJoins(rows, sql, db) {
    const joins = [];
    // Captura: JOIN tabela alias ON campo1 = campo2
    const joinRegex = /(?:LEFT\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
    let m;
    while ((m = joinRegex.exec(sql)) !== null) {
        const onLeft = m[3];   // ex: "o.client_id"
        const onRight = m[4];  // ex: "c.id"
        const alias = m[2];    // ex: "c"

        // Determinar qual lado é a FK na tabela base e qual é o PK na tabela joinada
        // O lado que tem o alias da tabela joinada é o PK (geralmente "alias.id")
        let fkField, pkIsId;
        if (onRight.startsWith(alias + '.')) {
            // FK está no lado esquerdo: onLeft = base_alias.fk_field
            fkField = onLeft.includes('.') ? onLeft.split('.')[1] : onLeft;
            pkIsId = onRight.split('.')[1]; // geralmente 'id'
        } else {
            // FK está no lado direito
            fkField = onRight.includes('.') ? onRight.split('.')[1] : onRight;
            pkIsId = onLeft.split('.')[1];
        }

        joins.push({ table: m[1], alias, fkField, pkIsId });
    }

    for (const join of joins) {
        // Usa cache para evitar múltiplas leituras da mesma coleção
        const lookupMap = await getCachedCollection(join.table, db);


        rows = rows.map(row => {
            const fkVal = row[join.fkField];
            const joined = fkVal != null ? lookupMap[String(fkVal)] : null;

            if (joined) {
                // Adicionar todos os campos do join com prefixo do alias
                const prefixed = {};
                Object.keys(joined).forEach(k => {
                    if (k !== 'id') prefixed[`${join.alias}_${k}`] = joined[k];
                });
                // Também adicionar campos com nome comum esperado pelos controllers
                // Ex: c.name → client_name, u.name → created_by_name, etc.
                return { ...row, ...prefixed, [`${join.alias}_id`]: joined.id };
            }
            return row;
        });
    }

    return rows;
}

// ── WHERE em memória ───────────────────────────────────────────────────────

function applyWhereInMemory(rows, sql, params) {
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/is);
    if (!whereMatch) return rows;
    
    const clause = whereMatch[1].trim();

    // Dividir por AND (mas não dentro de parênteses de IN)
    const parts = splitByAnd(clause);
    
    return rows.filter(row => {
        // IMPORTANTE: pi deve ser resetado para cada linha para que o filtro
        // WHERE funcione corretamente em todas as linhas, não só na primeira.
        let pi = 0;
        return parts.every(part => {
            const p = part.trim();
            
            // campo = ? (param)
            const eqParam = p.match(/^[\w.]+\s*=\s*\?$/);
            if (eqParam && pi < params.length) {
                const field = p.split(/\s*=\s*/)[0].trim().replace(/\w+\./, '');
                return String(row[field]) === String(params[pi++]);
            }

            // campo != ? (param)
            const neqParam = p.match(/^[\w.]+\s*!=\s*\?$/);
            if (neqParam && pi < params.length) {
                const field = p.split(/\s*!=\s*/)[0].trim().replace(/\w+\./, '');
                return String(row[field]) !== String(params[pi++]);
            }

            // campo = 'valor_literal' ou campo = 0
            const eqLit = p.match(/^[\w.]+\s*=\s*'([^']*)'$/) || p.match(/^[\w.]+\s*=\s*(\d+)$/);
            if (eqLit) {
                const field = p.split(/\s*=\s*/)[0].trim().replace(/\w+\./, '');
                const val = eqLit[1];
                return String(row[field]) === String(val);
            }

            // campo != 'valor_literal' ou campo != 0
            const neqLit = p.match(/^[\w.]+\s*!=\s*'([^']*)'$/) || p.match(/^[\w.]+\s*!=\s*(\d+)$/);
            if (neqLit) {
                const field = p.split(/\s*!=\s*/)[0].trim().replace(/\w+\./, '');
                const val = neqLit[1];
                return String(row[field]) !== String(val);
            }

            // campo IN ('a', 'b', 'c') — valores literais
            const inLit = p.match(/^[\w.]+\s+IN\s*\(([^)]+)\)/i);
            if (inLit) {
                const field = p.split(/\s+IN\s+/i)[0].trim().replace(/\w+\./, '');
                const values = inLit[1].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
                // Se há params ?, substituir
                const resolvedValues = values.map(v => v === '?' ? String(params[pi++] ?? '') : v);
                return resolvedValues.includes(String(row[field]));
            }

            // campo NOT IN (...)
            const notInMatch = p.match(/^[\w.]+\s+NOT\s+IN\s*\(([^)]+)\)/i);
            if (notInMatch) {
                const field = p.split(/\s+NOT\s+IN\s+/i)[0].trim().replace(/\w+\./, '');
                const values = notInMatch[1].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
                return !values.includes(String(row[field]));
            }

            // campo IS NULL
            if (/^[\w.]+\s+IS\s+NULL$/i.test(p)) {
                const field = p.split(/\s+IS\s+/i)[0].trim().replace(/\w+\./, '');
                return row[field] == null;
            }

            // campo IS NOT NULL
            if (/^[\w.]+\s+IS\s+NOT\s+NULL$/i.test(p)) {
                const field = p.split(/\s+IS\s+NOT\s+/i)[0].trim().replace(/\w+\./, '');
                return row[field] != null;
            }

            // campo > ? ou campo >= ?
            const gtParam = p.match(/^([\w.]+)\s*(>=|>)\s*\?$/);
            if (gtParam && pi < params.length) {
                const field = gtParam[1].replace(/\w+\./, '');
                const op = gtParam[2];
                const val = params[pi++];
                return op === '>=' ? row[field] >= val : row[field] > val;
            }

            return true; // condição não reconhecida — não filtrar
        });
    });
}

// Divide cláusula WHERE por AND, ignorando ANDs dentro de parênteses
function splitByAnd(clause) {
    const parts = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < clause.length; i++) {
        const ch = clause[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (depth === 0 && clause.substring(i).match(/^\s+AND\s+/i)) {
            parts.push(current.trim());
            const m = clause.substring(i).match(/^\s+AND\s+/i);
            i += m[0].length - 1;
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts.length > 0 ? parts : [clause];
}

// ── ORDER BY em memória ────────────────────────────────────────────────────

function applyOrderBy(rows, sql) {
    const orderMatch = sql.match(/ORDER\s+BY\s+(.*?)(?:LIMIT|$)/is);
    if (!orderMatch) return rows;

    const clauses = orderMatch[1].split(',').map(c => {
        const parts = c.trim().split(/\s+/);
        return { field: parts[0].replace(/\w+\./, ''), dir: (parts[1] || 'ASC').toUpperCase() };
    });

    return rows.sort((a, b) => {
        for (const cl of clauses) {
            const av = a[cl.field], bv = b[cl.field];
            if (av == null && bv != null) return cl.dir === 'ASC' ? -1 : 1;
            if (av != null && bv == null) return cl.dir === 'ASC' ? 1 : -1;
            if (av < bv) return cl.dir === 'ASC' ? -1 : 1;
            if (av > bv) return cl.dir === 'ASC' ? 1 : -1;
        }
        return 0;
    });
}

// ── Agregações simples ─────────────────────────────────────────────────────

function applyAggregations(rows, sql) {
    const up = sql.toUpperCase();
    if (!up.includes('SUM(') && !up.includes('COUNT(') && !up.includes('MAX(')) return rows;

    const sumMatch = sql.match(/SUM\((\w+)\)\s+as\s+(\w+)/gi);
    const maxMatch = sql.match(/MAX\((\w+)\)\s+as\s+(\w+)/gi);

    rows = rows.map(row => {
        const r = { ...row };
        if (sumMatch) {
            sumMatch.forEach(expr => {
                const [, field, alias] = expr.match(/SUM\((\w+)\)\s+as\s+(\w+)/i);
                r[alias] = parseFloat(row[field]) || 0;
            });
        }
        if (maxMatch) {
            maxMatch.forEach(expr => {
                const [, field, alias] = expr.match(/MAX\((\w+)\)\s+as\s+(\w+)/i);
                r[alias] = row[field] || 0;
            });
        }
        return r;
    });

    return rows;
}

// ── Enriquecer row com dados de outras coleções (para GET by ID) ────────────

async function enrichRow(row, sql, db) {
    return row; // JOINs já tratados em handleAll se necessário
}

// ── Helpers de parsing SQL ─────────────────────────────────────────────────

function extractFrom(sql) {
    let s = sql;
    while(s.includes('(')) {
        let prev = s;
        s = s.replace(/\([^()]*\)/g, '');
        if (s === prev) break;
    }
    const m = s.match(/FROM\s+(\w+)/i);
    return m ? m[1].toLowerCase() : '';
}

function extractSimpleWhereField(sql) {
    const m = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    return m ? m[1] : 'id';
}

function applySimpleWhere(q, sql, params) {
    const whereMatch = sql.match(/WHERE\s+([\w.]+)\s*(=|!=|>|<|>=|<=)\s*(\?|'[^']+'|"[^"]+")/i);
    if (!whereMatch) return q;
    const field = whereMatch[1].replace(/\w+\./, '');
    const op = whereMatch[2];
    const opMap = { '=': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
    
    let val;
    if (whereMatch[3] === '?') {
        if (params.length === 0) return q;
        val = params[0];
    } else {
        val = whereMatch[3].replace(/['"]/g, '');
    }

    const isLikelyFkField = field.endsWith('_id') && field !== 'id';
    if (isLikelyFkField) {
        if (typeof val === 'string' && /^\d+$/.test(val)) val = parseInt(val);
    } else if (typeof val === 'string' && /^\d+$/.test(val)) {
        val = parseInt(val);
    }
    return q.where(field, opMap[op] || '==', val);
}

// Versão alternativa que troca o tipo do param (string→int ou int→string)
function applySimpleWhereAlt(q, sql, params) {
    const whereMatch = sql.match(/WHERE\s+([\w.]+)\s*(=|!=|>|<|>=|<=)\s*\?/i);
    if (!whereMatch || params.length === 0) return null;
    const field = whereMatch[1].replace(/\w+\./, '');
    const opMap = { '=': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
    const op = opMap[whereMatch[2]] || '==';
    const val = params[0];
    // Se era número, tenta como string; se era string, tenta como número
    const altVal = typeof val === 'number' ? String(val) : (isNaN(Number(val)) ? val : Number(val));
    return q.where(field, op, altVal);
}

module.exports = { handleGet, handleAll, invalidateCache, patchCache, getCachedCollection, invalidateQueryCache };
