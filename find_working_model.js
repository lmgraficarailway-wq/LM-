require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModel(name) {
    try {
        console.log(`Checking ${name}...`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent("Respond with 'OK'");
        const text = await result.response.text();
        console.log(`${name} is working: ${text}`);
        return true;
    } catch (err) {
        console.error(`${name} failed: ${err.message}`);
        return false;
    }
}

async function start() {
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.5-flash-8b"];
    for (const m of models) {
        if (await checkModel(m)) break;
    }
    process.exit(0);
}

start();
