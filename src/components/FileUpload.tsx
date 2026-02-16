'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FileUpload() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('File too large (max 10MB)');
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            router.refresh();
            router.push(`/dashboard/documents/${data.id}`);
        } catch (err) {
            console.error(err);
            setError('Failed to upload document');
        } finally {
            setUploading(false);
        }
    }, [router]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
      `}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center gap-4">
                {uploading ? (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-sm text-gray-500">Processing document...</p>
                    </>
                ) : (
                    <>
                        <div className="p-4 bg-gray-100 rounded-full">
                            <Upload className="w-8 h-8 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-lg font-medium">Click to upload or drag and drop</p>
                            <p className="text-sm text-gray-500">PDF or TXT (max 10MB)</p>
                        </div>
                    </>
                )}
                {error && (
                    <div className="flex items-center gap-2 text-red-500 mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm text-red-500">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
