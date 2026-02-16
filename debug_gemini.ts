
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Or .env.local if .env doesn't exist/work in script
dotenv.config({ path: '.env.local' });

async function testGemini() {
    console.log("--- Testing Gemini API ---");
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`API Key present: ${!!apiKey}`);
    if (apiKey) {
        console.log(`API Key starts with: ${apiKey.substring(0, 5)}...`);
    } else {
        console.error("GEMINI_API_KEY not found in env!");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log("Generating content...");
    try {
        const result = await model.generateContent("Explain how to debug a 403 error in 1 sentence.");
        const text = result.response.text();
        console.log("Success! Response:");
        console.log(text);
    } catch (e: any) {
        console.error("Gemini Failure:", e.message);
        if (e.cause) console.error("Cause:", e.cause);
    }
}

testGemini();
