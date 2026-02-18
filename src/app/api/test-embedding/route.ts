
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "No API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const results: any = {};

    // Test 1: SDK with text-embedding-004
    try {
        console.log("Test Route: SDK text-embedding-004");
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent("Hello World");
        results.sdk_text_embedding_004 = { success: true, dims: result.embedding.values.length };
    } catch (e: any) {
        results.sdk_text_embedding_004 = { success: false, error: e.message };
    }

    // Test 2: Raw REST API with text-embedding-004
    try {
        console.log("Test Route: Raw REST text-embedding-004");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text: "Hello World" }] }
            })
        });
        const data = await response.json();
        if (response.ok) {
            results.raw_rest_text_embedding_004 = { success: true, dims: data.embedding.values.length };
        } else {
            results.raw_rest_text_embedding_004 = { success: false, error: data, status: response.status };
        }
    } catch (e: any) {
        results.raw_rest_text_embedding_004 = { success: false, error: e.message };
    }

    // Test 3: Raw REST API with models/embedding-001 (Legacy)
    try {
        console.log("Test Route: Raw REST models/embedding-001");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/embedding-001",
                content: { parts: [{ text: "Hello World" }] }
            })
        });
        const data = await response.json();
        if (response.ok) {
            results.raw_rest_embedding_001 = { success: true, dims: data.embedding.values.length };
        } else {
            results.raw_rest_embedding_001 = { success: false, error: data, status: response.status };
        }
    } catch (e: any) {
        results.raw_rest_embedding_001 = { success: false, error: e.message };
    }

    // Test 4: SDK with gemini-1.5-flash (checking if it supports embedContent)
    try {
        console.log("Test Route: SDK gemini-1.5-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.embedContent("Hello World");
        results.sdk_gemini_1_5_flash = { success: true, dims: result.embedding.values.length };
    } catch (e: any) {
        results.sdk_gemini_1_5_flash = { success: false, error: e.message };
    }

    return NextResponse.json(results);
}
