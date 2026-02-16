import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error('GROQ_API_KEY is missing in environment variables');
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        const body = await req.json();
        const { documentId, question } = body;

        if (!documentId || !question) {
            return NextResponse.json({ error: 'Missing documentId or question' }, { status: 400 });
        }

        const doc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Basic system prompt + Context
        // Truncate content to ~25k characters to stay within reasonable token limits for Llama 3 8b (~8k context)
        // 1 token ~= 4 chars, so 25000 chars is ~6000 tokens. leaving 2k for response.
        const truncatedContent = doc.content.slice(0, 25000);
        const systemPrompt = `You are a helpful assistant. Answer the user's question based strictly on the provided context.
    
Context:
${truncatedContent}
`;

        console.log(`Starting chat for doc ${doc.id}, question length: ${question.length}`);

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
            ],
            model: 'llama-3.3-70b-versatile', // Upgraded to a better model if available, or fallback to 8b
            stream: true,
        }).catch(err => {
            console.error('Groq API Error:', err);
            throw new Error('Failed to generate response from AI');
        });

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                    controller.close();
                } catch (streamError) {
                    console.error('Streaming error:', streamError);
                    controller.error(streamError);
                }
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
