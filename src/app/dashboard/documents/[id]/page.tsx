import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import ChatInterface from '@/components/ChatInterface';
import { notFound, redirect } from 'next/navigation';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DocumentChatPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user?.email) {
        redirect('/login');
    }

    // Await params before using (Next.js 15+ requirement, good practice generally)
    const { id } = await params;

    const document = await prisma.document.findUnique({
        where: { id },
    });

    if (!document) {
        notFound();
    }

    // Ensure user owns document
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user || user.id !== document.userId) {
        notFound(); // Or explicit 403
    }

    return (
        <div className="container mx-auto py-8 space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/documents" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl font-bold truncate max-w-xl">{document.title}</h1>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ChatInterface documentId={document.id} />
            </div>
        </div>
    );
}
