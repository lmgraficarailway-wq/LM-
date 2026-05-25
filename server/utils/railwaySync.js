/**
 * AUTO-SYNC: Sincroniza dados novos do Railway → Firestore a cada 5 minutos
 * Garante que o aplicativo Firebase sempre tenha os dados mais recentes.
 * 
 * Inclui no server.js via: require('./server/utils/railwaySync')
 */

const https = require('https');

function railwayGet(path) {
    return new Promise(resolve => {
        const options = {
            hostname: 'lm-passo-production.up.railway.app',
            path,
            timeout: 10000
        };
        const req = https.get(options, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                try { resolve(JSON.parse(b)); }
                catch { resolve({}); }
            });
        });
        req.on('error', () => resolve({}));
        req.on('timeout', () => { req.destroy(); resolve({}); });
    });
}

async function syncRailwayToFirestore(db) {
    try {
        // Busca em paralelo para ser rápido
        const [
            railwayOrders,
            railwayArchived,
            railwayClients,
            railwayReminders,
            fsOrdersSnap,
            fsClientsSnap,
            fsRemindersSnap
        ] = await Promise.all([
            railwayGet('/api/orders'),
            railwayGet('/api/orders/archived'),
            railwayGet('/api/clients'),
            railwayGet('/api/reminders'),
            db.collection('orders').get(),
            db.collection('clients').get(),
            db.collection('reminders').get()
        ]);

        // ── Pedidos ────────────────────────────────────────────────────────
        const allRailwayOrders = [...(railwayOrders.data || []), ...(railwayArchived.data || [])];
        const fsOrdersById = {};
        fsOrdersSnap.docs.forEach(d => { fsOrdersById[parseInt(d.id)] = d.data(); });

        const ordersToWrite = allRailwayOrders.filter(ro => {
            const fo = fsOrdersById[ro.id];
            if (!fo) return true; // novo: adiciona sempre

            // ── Respeita mudanças feitas no Firebase ──────────────────────────
            // Se o Firestore tem moved_at mais recente que o Railway, o card
            // foi movido no Firebase e NÃO deve ser sobrescrito pelo sync.
            const roTime = ro.moved_at ? new Date(ro.moved_at).getTime() :
                           ro.created_at ? new Date(ro.created_at).getTime() : 0;
            const foMovedAtStr = fo.moved_at && fo.moved_at !== 'CURRENT_TIMESTAMP' ? fo.moved_at : null;
            const foTime = foMovedAtStr ? new Date(foMovedAtStr).getTime() :
                           fo.created_at ? new Date(fo.created_at).getTime() : 0;

            // Firebase é mais recente (com folga de 10s): preserva, não sobrescreve
            if (foTime > roTime + 10000) return false;

            // Caso contrário: atualiza se Railway tiver dado diferente
            return fo.status !== ro.status ||
                   fo.kanban_phase !== ro.kanban_phase ||
                   fo.production_notes !== ro.production_notes ||
                   fo.payment_status !== ro.payment_status ||
                   fo.moved_at !== ro.moved_at;
        });

        // ── Clientes ────────────────────────────────────────────────────────
        const fsClientIds = new Set(fsClientsSnap.docs.map(d => String(d.data().id || d.id)));
        const newClients = (railwayClients.data || []).filter(c => !fsClientIds.has(String(c.id)));

        // ── Lembretes ───────────────────────────────────────────────────────
        const fsReminderIds = new Set(fsRemindersSnap.docs.map(d => String(d.data().id || d.id)));
        const newReminders = (railwayReminders.data || []).filter(r => !fsReminderIds.has(String(r.id)));

        // ── Pedidos Fantasma: existem no Firestore mas não no Railway ────────
        // Remove pedidos ativos no Firestore que não existem mais no Railway
        const railwayIdSet = new Set(allRailwayOrders.map(o => String(o.id)));
        const ghostOrders = fsOrdersSnap.docs.filter(d => {
            const status = d.data().status;
            const isActive = status && status !== 'arquivado';
            return isActive && !railwayIdSet.has(d.id);
        });
        if (ghostOrders.length > 0) {
            const ghostBatch = db.batch();
            ghostOrders.forEach(d => ghostBatch.delete(d.ref));
            await ghostBatch.commit();
            console.log(`[AutoSync] 🗑️  ${ghostOrders.length} pedido(s) fantasma removido(s): ${ghostOrders.map(d=>d.id).join(', ')}`);
        }

        const totalChanges = ordersToWrite.length + newClients.length + newReminders.length;
        if (totalChanges === 0) return; // Nada mudou, sai silenciosamente

        console.log(`[AutoSync] ${ordersToWrite.length} pedidos, ${newClients.length} clientes, ${newReminders.length} lembretes para atualizar`);

        // Salva em batches de 400 (limite Firestore é 500)
        const BATCH_SIZE = 400;
        const allWrites = [
            ...ordersToWrite.map(o => ({ col: 'orders', id: String(o.id), data: o })),
            ...newClients.map(c => ({ col: 'clients', id: String(c.id), data: c })),
            ...newReminders.map(r => ({ col: 'reminders', id: String(r.id), data: r })),
        ];

        for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
            const batch = db.batch();
            allWrites.slice(i, i + BATCH_SIZE).forEach(({ col, id, data }) => {
                batch.set(db.collection(col).doc(id), data, { merge: true });
            });
            await batch.commit();
        }

        // Atualiza contadores de IDs
        const updates = [];
        if (ordersToWrite.length > 0) {
            const maxId = Math.max(...allRailwayOrders.map(o => Number(o.id) || 0));
            const counterRef = db.collection('_counters').doc('orders');
            const doc = await counterRef.get();
            if (!doc.exists || (doc.data().seq || 0) < maxId) {
                updates.push(counterRef.set({ seq: maxId }, { merge: true }));
            }
        }
        if (newClients.length > 0) {
            const maxId = Math.max(...(railwayClients.data || []).map(c => Number(c.id) || 0));
            const counterRef = db.collection('_counters').doc('clients');
            const doc = await counterRef.get();
            if (!doc.exists || (doc.data().seq || 0) < maxId) {
                updates.push(counterRef.set({ seq: maxId }, { merge: true }));
            }
        }
        await Promise.all(updates);

        // Invalida cache para forçar refresh nos próximos requests
        try {
            const { invalidateQueryCache, invalidateCache } = require('../database/firestoreQueries');
            if (ordersToWrite.length > 0) { invalidateQueryCache('orders'); invalidateCache('orders'); }
            if (newClients.length > 0) { invalidateQueryCache('clients'); invalidateCache('clients'); }
            if (newReminders.length > 0) { invalidateQueryCache('reminders'); invalidateCache('reminders'); }
        } catch(e) { /* ignora */ }

        console.log(`[AutoSync] ✅ Sync concluído: ${ordersToWrite.length} pedidos atualizados`);

    } catch (err) {
        console.warn('[AutoSync] Erro (não crítico):', err.message);
    }
}

/**
 * Inicia o auto-sync a cada 2 minutos.
 * @param {FirebaseFirestore.Firestore} db 
 */
function startAutoSync(db) {
    const INTERVAL_MS = 30 * 1000; // 30 segundos — sincronização quase em tempo real

    // Executa imediatamente no boot
    setTimeout(() => syncRailwayToFirestore(db), 3000);

    // Depois a cada 30 segundos
    setInterval(() => syncRailwayToFirestore(db), INTERVAL_MS);

    console.log('🔄 AutoSync Railway→Firestore iniciado (intervalo: 30s)');
}

module.exports = { startAutoSync, syncRailwayToFirestore };
