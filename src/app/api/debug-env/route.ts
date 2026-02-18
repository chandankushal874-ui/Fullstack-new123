
import { NextResponse } from "next/server";

export async function GET() {
    const key = process.env.GEMINI_API_KEY;
    return NextResponse.json({
        hasKey: !!key,
        keyStart: key ? key.substring(0, 5) : null,
        nodeEnv: process.env.NODE_ENV,
        embeddingModel: "models/embedding-001" // Current config
    });
}
