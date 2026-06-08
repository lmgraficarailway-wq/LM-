/**
 * fix_menu_orders_types.js
 * Corrige tipos corrompidos na collection menu_orders do Firestore.
 * Campos afetados: launched_to_core, order_id, discount_on_close, unit_price, quantity, position
 */

const admin = require('firebase-admin');
const path = require('path');

// Init Firebase
let creds;
if (process.env.FIREBASE_CREDENTIALS) {
    creds = JSON.parse(process.env.FIREBASE_CREDENTIALS);
} else {
    creds = require('./firebase-credentials.json');
}
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
}
const db = admin.firestore();

const toIntOrNull = (v) => {
    if (v === null || v === undefined || String(v).toUpperCase() === 'NULL' || String(v).trim() === '') return null;
    const n = parseInt(v);
    return isNaN(n) ? null : n;
};

const toIntOrZero = (v) => {
    if (v === null || v === undefined || String(v).toUpperCase() === 'NULL') return 0;
    const n = parseInt(v);
    return isNaN(n) ? 0 : n;
};

const toFloatOrZero = (v) => {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

async function fixMenuOrders() {
    console.log('Buscando todos os menu_orders...');
    const snap = await db.collection('menu_orders').get();
    console.log('Total de registros:', snap.size);

    const batch = db.batch();
    let fixCount = 0;
    let skipCount = 0;

    snap.docs.forEach(doc => {
        const data = doc.data();
        const fixes = {};
        let needsFix = false;

        // launched_to_core: deve ser 0 ou 1 (number)
        const ltcRaw = data.launched_to_core;
        const ltcFixed = toIntOrZero(ltcRaw);
        if (ltcRaw !== ltcFixed) {
            fixes.launched_to_core = ltcFixed;
            needsFix = true;
            console.log(`  id=${doc.id}: launched_to_core ${JSON.stringify(ltcRaw)}(${typeof ltcRaw}) -> ${ltcFixed}(number)`);
        }

        // order_id: deve ser number ou null
        const oidRaw = data.order_id;
        const oidFixed = toIntOrNull(oidRaw);
        if (oidRaw !== oidFixed) {
            fixes.order_id = oidFixed;
            needsFix = true;
            console.log(`  id=${doc.id}: order_id ${JSON.stringify(oidRaw)}(${typeof oidRaw}) -> ${JSON.stringify(oidFixed)}`);
        }

        // discount_on_close: deve ser 0 ou 1 (number)
        const discRaw = data.discount_on_close;
        if (discRaw !== undefined) {
            const discFixed = toIntOrZero(discRaw);
            if (discRaw !== discFixed) {
                fixes.discount_on_close = discFixed;
                needsFix = true;
                console.log(`  id=${doc.id}: discount_on_close ${JSON.stringify(discRaw)} -> ${discFixed}`);
            }
        } else {
            // Campo não existe - adicionar com 0
            fixes.discount_on_close = 0;
            needsFix = true;
        }

        // unit_price: deve ser number
        const upRaw = data.unit_price;
        if (upRaw !== undefined && typeof upRaw === 'string') {
            const upFixed = toFloatOrZero(upRaw);
            fixes.unit_price = upFixed;
            needsFix = true;
            console.log(`  id=${doc.id}: unit_price ${JSON.stringify(upRaw)} -> ${upFixed}`);
        }

        // quantity: deve ser number
        const qRaw = data.quantity;
        if (qRaw !== undefined && typeof qRaw === 'string') {
            const qFixed = toIntOrZero(qRaw);
            fixes.quantity = qFixed;
            needsFix = true;
        }

        // position: deve ser number  
        const posRaw = data.position;
        if (posRaw !== undefined && typeof posRaw === 'string') {
            const posFixed = toIntOrZero(posRaw);
            fixes.position = posFixed;
            needsFix = true;
        }

        if (needsFix) {
            batch.update(doc.ref, fixes);
            fixCount++;
        } else {
            skipCount++;
        }
    });

    if (fixCount > 0) {
        console.log(`\nAplicando correções em ${fixCount} registros...`);
        await batch.commit();
        console.log('✅ Correções aplicadas com sucesso!');
    } else {
        console.log('\n✅ Nenhuma correção necessária - todos os registros estão OK!');
    }
    console.log(`Corrigidos: ${fixCount} | OK: ${skipCount}`);
}

fixMenuOrders()
    .then(() => { console.log('Concluído.'); process.exit(0); })
    .catch(err => { console.error('ERRO FATAL:', err.message); process.exit(1); });
