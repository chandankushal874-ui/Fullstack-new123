import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractTextFromPDF } from '@/lib/pdf-loader';

export async function POST(req: NextRequest) {
    try {
        console.log('Upload API called');
        const session = await auth();
        if (!session?.user?.email) {
            console.log('Unauthorized request to upload API');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.log('No file provided in upload request');
            return new NextResponse('No file uploaded', { status: 400 });
        }

        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

        let content = '';

        if (file.type === 'application/pdf') {
            console.log('Extracting text from PDF...');
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            content = await extractTextFromPDF(buffer);
            console.log('PDF text extracted, length:', content.length);
        } else if (file.type === 'text/plain') {
            console.log('Reading text file...');
            content = await file.text();
            console.log('Text file read, length:', content.length);
        } else {
            console.log('Unsupported file type:', file.type);
            return new NextResponse('Unsupported file type', { status: 400 });
        }

        if (!content.trim()) {
            console.log('extracted content is empty');
            return new NextResponse('Could not extract text from file', { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            console.log('User not found in database');
            return new NextResponse('User not found', { status: 404 });
        }

        console.log('Creating document in database...');
        const doc = await prisma.document.create({
            data: {
                title: file.name,
                content,
                userId: user.id,
            },
        });
        console.log('Document created:', doc.id);

        return NextResponse.json(doc);
    } catch (error) {
        console.error('Upload error detail:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
