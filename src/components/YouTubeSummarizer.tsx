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
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
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
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-3 text-blue-800">
                                <FileText className="w-5 h-5" />
                                <h3 className="font-semibold text-lg">Video Summary</h3>
                            </div>
                            <p className="text-gray-800 leading-relaxed text-sm lg:text-base">
                                {summary}
                            </p>
                        </div>
                    )}

                    {studyNotes && (
                        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-3 text-green-800">
                                <BookOpen className="w-5 h-5" />
                                <h3 className="font-semibold text-lg">Study Notes</h3>
                            </div>
                            <div className="prose prose-sm max-w-none prose-headings:text-green-900 prose-p:text-gray-800 prose-li:text-gray-800">
                                <ReactMarkdown>{studyNotes}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
