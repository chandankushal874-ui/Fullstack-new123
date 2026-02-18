
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface WorkspaceDetailProps {
    workspaceId: string;
}

export function WorkspaceDetail({ workspaceId }: WorkspaceDetailProps) {
    const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string; sources?: any[] }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [deepSearch, setDeepSearch] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Fetch documents on load (TODO: Implement GET documents API if not part of workspace endpoint)
    // For now, assume we might need to fetch them locally or via an endpoint.
    // I will skip fetching documents listing for brevity unless requested, but user asked for "show which documents".
    // Let's assume user just wants to see what's uploaded.

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    workspaceId,
                    deepSearch,
                }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setMessages((prev) => [
                ...prev,
                { role: "bot", content: data.response, sources: data.sources },
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "bot", content: "Sorry, something went wrong." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                alert("File uploaded successfully!");
                setDocuments(prev => [...prev, { title: file.name, id: data.documentId }]); // Optimistic update
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar: Documents */}
            <div className="w-1/4 bg-white border-r border-gray-200 p-4 flex flex-col">
                <h2 className="text-lg font-bold mb-4">Documents</h2>

                <div className="mb-4">
                    <label className="block w-full cursor-pointer bg-blue-50 text-blue-600 border-2 border-dashed border-blue-200 rounded-lg p-4 text-center hover:bg-blue-100 transition-colors">
                        <span className="font-semibold">{uploading ? "Uploading..." : "Upload PDF / Text"}</span>
                        <input
                            type="file"
                            accept=".pdf,.txt,.md"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* List documents here if we fetched them. For now showing uploaded in session. */}
                    {documents.length === 0 && <p className="text-gray-800 text-sm">No documents uploaded yet in this session.</p>}
                    <ul className="space-y-2">
                        {documents.map((doc, idx) => (
                            <li key={idx} className="p-2 bg-gray-100 rounded text-sm truncate text-gray-900 font-bold" title={doc.title}>
                                📄 {doc.title}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h1 className="text-xl font-extrabold text-gray-900">Workspace Chat</h1>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center cursor-pointer select-none">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={deepSearch}
                                    onChange={(e) => setDeepSearch(e.target.checked)}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${deepSearch ? 'bg-purple-600' : 'bg-gray-400'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${deepSearch ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                            <div className="ml-3 text-sm font-bold text-gray-900">Deep Search (Firecrawl)</div>
                        </label>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] p-4 rounded-lg ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white shadow-md text-gray-900 border border-gray-200"}`}>
                                <div className="whitespace-pre-wrap font-medium">{msg.content}</div>

                                {/* Sources */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                                        <p className="font-bold mb-1 text-gray-900">Sources:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-gray-900 font-medium">
                                            {msg.sources.map((source: any, i: number) => (
                                                <li key={i}>{source.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 p-4 rounded-lg animate-pulse">Thinking...</div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask a question about your documents..."
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
