/**
 * QUERIES AVANÇADAS DO FIRESTORE
 * Traduz os SELECTs complexos dos controllers para chamadas Firestore.
 */

// Cache em memória para coleções de lookup (JOINs) — TTL de 30 segundos
// Isso evita ler a coleção completa em cada request e reduz drasticamente leituras
const _cache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

async function getCachedCollection(tableName, db) {
    const now = Date.now();
    const cached = _cache.get(tableName);
    if (cached && (now - cached.ts) < CACHE_TTL_MS) {
        return cached.data;
    }
    const snap = await db.collection(tableName).get();
    const data = {};
    snap.docs.forEach(d => { data[d.id] = { id: parseInt(d.id), ...d.data() }; });
    _cache.set(tableName, { ts: now, data });
    return data;
}

// Invalida cache de uma coleção (chamar após writes)
function invalidateCache(tableName) {
    _cache.delete(tableName);
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
    const s = sql.trim();
    const up = s.toUpperCase();
    const table = extractFrom(s);

    let snap;
    if (up.includes('WHERE') && !up.includes('JOIN')) {
        // Query simples com WHERE
        let q = db.collection(table);
        q = applySimpleWhere(q, s, params);
        snap = await q.get();
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
    const m = sql.match(/FROM\s+(\w+)/i);
    return m ? m[1].toLowerCase() : '';
}

function extractSimpleWhereField(sql) {
    const m = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    return m ? m[1] : 'id';
}

function applySimpleWhere(q, sql, params) {
    const whereMatch = sql.match(/WHERE\s+([\w.]+)\s*(=|!=|>|<|>=|<=)\s*\?/i);
    if (!whereMatch || params.length === 0) return q;
    const field = whereMatch[1].replace(/\w+\./, '');
    const op = whereMatch[2];
    const opMap = { '=': '==', '!=': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
    return q.where(field, opMap[op] || '==', params[0]);
}

module.exports = { handleGet, handleAll, invalidateCache };
