
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractTextFromPDF } from "@/lib/pdf-loader";
import { storeDocument } from "@/lib/vector-store";
import { auth } from "@/auth"; // Assuming auth is set up

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        console.log("Upload API Session:", session?.user?.id);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        console.log("Upload API FormData Keys:", Array.from(formData.keys()));
        const file = formData.get("file") as File;
        const workspaceId = formData.get("workspaceId") as string;

        if (!file || !workspaceId) {
            return NextResponse.json({ error: "Missing file or workspaceId" }, { status: 400 });
        }

        // Verify workspace belongs to user
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace || workspace.userId !== session.user.id) {
            return NextResponse.json({ error: "Workspace not found or unauthorized" }, { status: 404 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = "";

        if (file.type === "application/pdf") {
            text = await extractTextFromPDF(buffer);
        } else {
            // Basic text handling for now
            text = buffer.toString("utf-8");
        }

        if (!text.trim()) {
            return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
        }

        // Create Document record
        const document = await prisma.document.create({
            data: {
                title: file.name,
                content: text, // Store full text as well? Yes, useful for reference.
                userId: session.user.id,
                workspaceId: workspaceId,
            },
        });

        // Generate Embeddings and Store Chunks
        // Note: Embedding API is unavailable for this key. Skipping vector storage.
        // We will use full-document context in chat/route.ts instead.
        try {
            // await storeDocument(document.id, text);
        } catch (e) {
            console.warn("Skipping embedding generation (API not supported).");
        }

        return NextResponse.json({ success: true, documentId: document.id });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
