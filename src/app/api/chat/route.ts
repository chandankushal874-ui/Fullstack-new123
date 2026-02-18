
import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/firecrawl";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateWithGroq(prompt: string): Promise<string> {
    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content || "No response generated.";
}

async function generateWithGemini(prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { message, workspaceId, deepSearch } = body;

        if (!message || !workspaceId) {
            return NextResponse.json({ error: "Message and Workspace ID are required" }, { status: 400 });
        }

        // 1. Full Context Retrieval
        const documents = await prisma.document.findMany({
            where: { workspaceId },
            select: { title: true, content: true, id: true }
        });

        // Truncate context to ~15k chars to stay within token limits
        const MAX_CONTEXT_CHARS = 15000;
        let currentLength = 0;
        const contextParts: string[] = [];

        for (const doc of documents) {
            if (currentLength >= MAX_CONTEXT_CHARS) break;
            const contentToAdd = doc.content.substring(0, MAX_CONTEXT_CHARS - currentLength);
            contextParts.push(`[Document: ${doc.title}]\n${contentToAdd}`);
            currentLength += contentToAdd.length;
        }

        const context = contextParts.join("\n\n");
        const similarDocs = documents.map(d => ({ title: d.title, documentId: d.id }));

        let deepSearchContext = "";
        if (deepSearch) {
            const webResults = await searchWeb(message);
            if (webResults?.data) {
                deepSearchContext = webResults.data.map(
                    (result: any) => `[Web: ${result.title} (${result.url})]\n${result.description}\n${result.content || ""}`
                ).join("\n\n");
            }
        }

        // 2. Construct Prompt
        const prompt = `You are an intelligent assistant. Answer questions based on the provided context.

Context from Workspace Documents:
${context}

${deepSearch ? `Context from Web Search:\n${deepSearchContext}` : ""}

User Question: ${message}

Instructions:
- Answer using ONLY the provided context.
- If context is insufficient, say so clearly.
- Cite sources using [Document: Title] or [Web: Title].
- Be concise and accurate.`;

        // 3. Generate Answer - Try Groq first (fast, generous free tier), then Gemini as fallback
        let responseText: string;
        try {
            console.log("Attempting generation with Groq (llama-3.3-70b)...");
            responseText = await generateWithGroq(prompt);
            console.log("✅ Groq succeeded.");
        } catch (groqErr: any) {
            console.warn("Groq failed, falling back to Gemini:", groqErr.message);
            try {
                responseText = await generateWithGemini(prompt);
                console.log("✅ Gemini fallback succeeded.");
            } catch (geminiErr: any) {
                throw new Error(`Both providers failed. Groq: ${groqErr.message?.substring(0, 60)}. Gemini: ${geminiErr.message?.substring(0, 60)}`);
            }
        }

        return NextResponse.json({
            response: responseText,
            sources: similarDocs.map(d => ({ title: d.title, id: d.documentId }))
        });

    } catch (error: any) {
        console.error("Chat error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
