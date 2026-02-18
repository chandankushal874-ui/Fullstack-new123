
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "./prisma";
import crypto from "crypto";
// import { DocumentChunk } from "@prisma/client"; // Not strictly needed for types in raw query but good for ref

// Move client init inside to ensure env vars are ready
export async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in vector-store.ts");
        throw new Error("GEMINI_API_KEY is missing");
    }

    // Prioritize the model that worked in the test script: "models/embedding-001"
    const modelsToTry = ["models/embedding-001", "embedding-001", "text-embedding-004"];
    const genAI = new GoogleGenerativeAI(apiKey);

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying embedding with model: ${modelName}`);
            console.log(`Input text length: ${text.length}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.embedContent(text);
            if (result.embedding && result.embedding.values) {
                console.log(`✅ Success with ${modelName}`);
                return result.embedding.values;
            }
        } catch (error: any) {
            console.error(`❌ Failed with ${modelName}`);
            console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            if (error.response) {
                console.error("Response:", await error.response.text());
            }
            // Continue to next model
        }
    }

    throw new Error("All embedding models failed. Check server logs for details.");
}

export async function storeDocument(documentId: string, content: string) {
    // 1. Chunk the content (simple splitting for now)
    const chunks = splitTextIntoChunks(content, 1000); // ~1000 chars per chunk

    console.log(`Storing ${chunks.length} chunks for document ${documentId}`);

    // 2. Generate embeddings and save chunks
    let successfulChunks = 0;
    for (const chunk of chunks) {
        try {
            const embedding = await generateEmbedding(chunk);

            // Prisma raw query expects vector as a string suitable for casting, e.g. '[0.1,0.2,...]'
            const vectorString = `[${embedding.join(',')}]`;
            const id = crypto.randomUUID();

            // We will use $executeRaw to insert the vector data types.
            await prisma.$executeRaw`
                INSERT INTO "DocumentChunk" ("id", "content", "embedding", "documentId", "createdAt")
                VALUES (${id}, ${chunk}, ${vectorString}::vector, ${documentId}, NOW());
            `;
            successfulChunks++;
        } catch (error) {
            console.error("Error storing chunk, skipping:", error);
            // We continue to next chunk so we don't fail the whole file for one bad chunk
        }
    }

    if (successfulChunks === 0 && chunks.length > 0) {
        throw new Error("Failed to store any chunks for this document. Embedding service may be down.");
    }
}

export async function searchSimilarDocuments(query: string, workspaceId: string, limit: number = 5) {
    const embedding = await generateEmbedding(query);
    const vectorString = `[${embedding.join(',')}]`;

    // Perform vector similarity search using pgvector's <-> operator (L2 distance) or <=> (Cosine distance).
    // We'll use <=> for cosine similarity (lower is better, but typically we want 1 - distance).
    // However, pgvector <-> is Euclidean. Cosine is <=>.

    // We need to join with Document to filter by workspaceId.
    const results = await prisma.$queryRaw`
    SELECT chunk.id, chunk.content, chunk."documentId", doc.title, doc."workspaceId"
    FROM "DocumentChunk" AS chunk
    JOIN "Document" AS doc ON chunk."documentId" = doc.id
    WHERE doc."workspaceId" = ${workspaceId}
    ORDER BY chunk.embedding <=> ${vectorString}::vector
    LIMIT ${limit};
  `;

    return results as Array<{
        id: string;
        content: string;
        documentId: string;
        title: string;
        workspaceId: string;
    }>;
}

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}
