require('dotenv').config();
const { getAIEstimate } = require('./server/utils/ai_helper');

const testItems = [
    { name: 'Adesivo 5x5', quantity: 100 },
    { name: 'Impressão A3', quantity: 10 }
];
const testDesc = 'Teste de estimativa';

console.log('Solicitando estimativa para:', testItems);
getAIEstimate(testItems, testDesc).then(res => {
    console.log('Resultado:', res);
    process.exit(0);
}).catch(err => {
    console.error('Erro no teste:', err);
    process.exit(1);
});
