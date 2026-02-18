'use client';

import { useState } from 'react';
import { summarizeVideo } from '@/actions/summarize';
import ReactMarkdown from 'react-markdown';
import { Loader2, Youtube, FileText, BookOpen } from 'lucide-react';

export default function YouTubeSummarizer() {
    const [url, setUrl] = useState('');
    const [manualTranscript, setManualTranscript] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [studyNotes, setStudyNotes] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSummary(null);
        setStudyNotes(null);

        try {
            const result = await summarizeVideo(url, manualTranscript);
            if (result.error) {
                setError(result.error);
                // If there is an error, suggest manual input if not already shown
                if (!showManualInput && result.error.includes("Transcript failed")) {
                    setShowManualInput(true);
                }
            } else {
                setSummary(result.summary);
                setStudyNotes(result.studyNotes);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setShowManualInput(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow mt-8">
            <div className="flex items-center gap-2 mb-4">
                <Youtube className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold">AI YouTube Summarizer</h2>
            </div>

            <p className="text-gray-600 mb-6 text-sm">
                Paste a YouTube video link to get a concise summary and detailed study notes.
            </p>

            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Paste any YouTube link (youtube.com, youtu.be, shorts, etc.)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                        type="submit"
                        disabled={loading || !url}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Summarize'
                        )}
                    </button>
                </div>

                <div className="flex justify-end mb-2">
                    <button
                        type="button"
                        onClick={() => setShowManualInput(!showManualInput)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        {showManualInput ? 'Hide Manual Transcript' : 'Having trouble? Paste transcript manually'}
                    </button>
                </div>

                {showManualInput && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Manual Transcript (Optional)
                        </label>
                        <textarea
                            value={manualTranscript}
                            onChange={(e) => setManualTranscript(e.target.value)}
                            placeholder="Paste the full transcript here if automatic fetching fails..."
                            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all h-32"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Tip: On YouTube, click "More" in description -&gt; "Show transcript" -&gt; Toggle timestamps off -&gt; Copy all text.
                        </p>
                    </div>
                )}
            </form>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200 text-sm">
                    <strong>Error:</strong> {error}
                    {!showManualInput && (
                        <div className="mt-2">
                            <button
                                onClick={() => setShowManualInput(true)}
                                className="text-red-800 underline font-medium hover:text-red-900"
                            >
                                Try pasting transcript manually
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(summary || studyNotes) && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {summary && (
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-5 h-5 text-blue-900" />
                                <h3 className="font-extrabold text-lg text-gray-950">Video Summary</h3>
                            </div>
                            <p className="text-gray-950 font-semibold leading-relaxed text-sm lg:text-base">
                                {summary}
                            </p>
                        </div>
                    )}

                    {studyNotes && (
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-5 h-5 text-green-900" />
                                <h3 className="font-extrabold text-lg text-gray-950">Study Notes</h3>
                            </div>
                            <div
                                className="text-gray-950 font-semibold text-sm lg:text-base leading-relaxed"
                                style={{
                                    color: '#030712',
                                    fontWeight: 600,
                                }}
                            >
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => <h1 style={{ color: '#030712', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', marginTop: '1rem' }}>{children}</h1>,
                                        h2: ({ children }) => <h2 style={{ color: '#030712', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem', marginTop: '0.8rem' }}>{children}</h2>,
                                        h3: ({ children }) => <h3 style={{ color: '#030712', fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem', marginTop: '0.6rem' }}>{children}</h3>,
                                        p: ({ children }) => <p style={{ color: '#111827', fontWeight: 600, marginBottom: '0.5rem' }}>{children}</p>,
                                        li: ({ children }) => <li style={{ color: '#111827', fontWeight: 600, marginBottom: '0.2rem' }}>{children}</li>,
                                        ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ul>,
                                        ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ol>,
                                        strong: ({ children }) => <strong style={{ color: '#030712', fontWeight: 900 }}>{children}</strong>,
                                        em: ({ children }) => <em style={{ color: '#111827', fontWeight: 600 }}>{children}</em>,
                                    }}
                                >
                                    {studyNotes}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
