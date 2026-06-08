/**
 * AUTO-SYNC DESATIVADO
 * =====================
 * O aplicativo agora roda 100% no Firebase/Cloud Run.
 * O Railway não é mais utilizado.
 *
 * MOTIVO DA DESATIVAÇÃO:
 * O sync buscava pedidos do Railway (lm-passo-production.up.railway.app).
 * Como o Railway não responde mais, retornava lista vazia.
 * O código então considerava TODOS os pedidos do Firestore como "fantasmas"
 * e os DELETAVA a cada 30 segundos — causando o desaparecimento dos pedidos.
 */

async function syncRailwayToFirestore(db) {
    // Desativado — não faz nada
    return;
}

function startAutoSync(db) {
    // Desativado — não inicia sync
    console.log('🔄 AutoSync Railway→Firestore DESATIVADO (app rodando 100% no Firebase)');
}

module.exports = { startAutoSync, syncRailwayToFirestore };
