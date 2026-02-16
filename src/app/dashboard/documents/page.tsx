import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import FileUpload from '@/components/FileUpload';
import Link from 'next/link';
import { FileText, MessageSquare, Trash2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function DocumentsPage() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            documents: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold">Your Documents</h2>
                    {user.documents.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                            <p className="text-gray-500">No documents uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {user.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{doc.title}</h3>
                                            <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/dashboard/documents/${doc.id}`}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Chat
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
                        <FileUpload />
                    </div>
                </div>
            </div>
        </div>
    );
}
