const SHARED_STOCK_MAP = {
    57: 58 // Pulseira Personalizada -> Pulseiras Não Personalizadas
};

function getMasterProductId(pid) {
    const num = parseInt(pid);
    return SHARED_STOCK_MAP[num] || num;
}

module.exports = {
    SHARED_STOCK_MAP,
    getMasterProductId
};
