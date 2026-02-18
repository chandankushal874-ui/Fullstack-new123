
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import prisma from './src/lib/prisma';
import { storeDocument, searchSimilarDocuments } from './src/lib/vector-store';
import { searchWeb } from './src/lib/firecrawl';
import crypto from 'crypto';

async function main() {
    console.log("--- Starting RAG Pipeline Verification ---");

    // 1. Setup User and Workspace
    console.log("\n1. Setting up User and Workspace...");
    // Find or create a test user
    let user = await prisma.user.findFirst({ where: { email: "test_rag@example.com" } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                name: "Test RAG User",
                email: "test_rag@example.com",
                password: "hashedpassword123", // Dummy
            }
        });
        console.log("Created Test User:", user.id);
    } else {
        console.log("Found Test User:", user.id);
    }

    const workspace = await prisma.workspace.create({
        data: {
            name: `Test Workspace ${Date.now()}`,
            userId: user.id
        }
    });
    console.log("Created Workspace:", workspace.id, workspace.name);

    // 2. Simulate Document Upload
    console.log("\n2. Simulating Document Upload...");
    const dummyText = `
    The Gemini 1.5 Pro model is a highly capable multimodal AI model from Google.
    It has a large context window of up to 1 million tokens.
    It excels at reasoning, coding, and understanding long documents.
    Firecrawl is a tool to crawl and search the web for LLMs.
  `;

    const doc = await prisma.document.create({
        data: {
            title: "Gemini Info.txt",
            content: dummyText,
            userId: user.id,
            workspaceId: workspace.id
        }
    });

    await storeDocument(doc.id, dummyText);
    console.log("Document Stored and Embedded:", doc.id);

    // 3. Test Vector Search
    console.log("\n3. Testing Vector Search...");
    const query = "What is the context window of Gemini 1.5 Pro?";
    console.log(`Query: "${query}"`);

    const results = await searchSimilarDocuments(query, workspace.id);
    console.log(`Found ${results.length} similar chunks.`);
    if (results.length > 0) {
        console.log("Top Result Content:", results[0].content.trim());
        if (results[0].content.includes("1 million tokens")) {
            console.log("✅ Vector Search Verification: PASSED");
        } else {
            console.warn("⚠️ Vector Search Verification: Content match not perfect.");
        }
    } else {
        console.error("❌ Vector Search Verification: FAILED (No results)");
    }

    // 4. Test Deep Search (Firecrawl)
    console.log("\n4. Testing Deep Search (Firecrawl)...");
    // Assuming API key is set or logic handles missing key gracefully
    if (process.env.FIRECRAWL_API_KEY) {
        const webQuery = "latest features of Next.js 15";
        const webResults = await searchWeb(webQuery);
        if (webResults && webResults.data && webResults.data.length > 0) {
            console.log(`✅ Deep Search Verification: PASSED. Found ${webResults.data.length} results.`);
            console.log("First Result Title:", webResults.data[0].title);
        } else {
            console.warn("⚠️ Deep Search Verification: No results or failed (check API limits/key).");
        }
    } else {
        console.log("ℹ️ Deep Search Verification: SKIPPED (No FIRECRAWL_API_KEY)");
    }

    console.log("\n--- Verification Complete ---");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
