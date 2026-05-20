require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Sometimes listing is only available on v1beta
        // But the SDK often handles this.
        // There isn't a direct listModels in the JS SDK usually, or it's limited.
        // Let's try the gemini-pro which is the most stable 1.0 name.
        console.log("Checking gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Gemini Pro response:", await result.response.text());
    } catch (err) {
        console.error("List Test Error:", err.message);
    }
}

listModels();
