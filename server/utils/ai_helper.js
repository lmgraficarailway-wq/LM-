const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calculates the production estimate for an order using Gemini AI.
 * Incorporates the specific time-of-production rules from LM Passo.
 * 
 * @param {Array} items - List of products in the order
 * @param {String} description - Description of the order
 * @returns {Promise<Object>} - minutes and breakdown
 */
exports.getAIEstimate = async (items, description) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not found in environment.");
            return { minutes: 0, breakdown: "Configuração de IA pendente." };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `
            Você é um especialista em produção gráfica da "LM Passo". Sua tarefa é calcular o TEMPO TOTAL de produção (em MINUTOS) para um novo pedido.
            
            Use estritamente as seguintes REGRAS DE TEMPO da LM Passo:
            1. Corte de adesivo: 1 min por adesivo.
            2. Impressão Jato de Tinta: 1 min por folha.
            3. Impressão Laser A4: 20 segundos por folha.
            4. Impressão Laser A3: 25 segundos por folha.
            5. Impressora A3 (Outros): 1 minuto e 30 segundos por folha.
            6. Laminação (A4 ou A3): 5 minutos por folha.
            7. Plastificação (A4 ou A3): 1 minuto por folha.
            
            Se o item não se encaixar exatamente nas regras acima, use sua inteligência para estimar um tempo médio de mercado para produtos similares.
            Sempre considere a quantidade (Qtd) de cada item.
            
            PEDIDO:
            Produtos: ${JSON.stringify(items)}
            Observações do Vendedor: "${description || 'Nenhuma'}"
            
            Responda APENAS em formato JSON com a seguinte estrutura:
            {
              "total_minutes": número_inteiro,
              "breakdown": "Explicação curta de como chegou no valor"
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean JSON response (sometimes Gemini adds ```json ... ```)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return {
                minutes: parseInt(data.total_minutes) || 0,
                breakdown: data.breakdown || ""
            };
        }
        
        return { minutes: 0, breakdown: "Falha ao processar resposta da IA." };
    } catch (err) {
        console.error("AI Estimate Error:", err);
        return { minutes: 0, breakdown: "Erro na comunicação com a IA." };
    }
};
