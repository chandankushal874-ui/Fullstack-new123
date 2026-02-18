
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Workspace {
    id: string;
    name: string;
    createdAt: string;
    _count?: { documents: number };
}

export default function WorkspaceList() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch("/api/workspaces");
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data);
            }
        } catch (error) {
            console.error("Failed to fetch workspaces", error);
        } finally {
            setLoading(false);
        }
    };

    const createWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim()) return;

        try {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newWorkspaceName }),
            });

            if (res.ok) {
                const workspace = await res.json();
                setWorkspaces([workspace, ...workspaces]);
                setNewWorkspaceName("");
                router.push(`/workspace/${workspace.id}`);
            }
        } catch (error) {
            console.error("Failed to create workspace", error);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Your Workspaces</h1>

            {/* Create Workspace Form */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4">Create New Workspace</h2>
                <form onSubmit={createWorkspace} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Workspace Name (e.g., Biology 101, Project Alpha)"
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create
                    </button>
                </form>
            </div>

            {/* Workspace List */}
            {loading ? (
                <div className="text-center py-10">Loading workspaces...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map((ws) => (
                        <Link key={ws.id} href={`/workspace/${ws.id}`} className="block">
                            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                                <h3 className="text-xl font-bold mb-2 text-gray-800">{ws.name}</h3>
                                <p className="text-gray-500 text-sm">
                                    Created {new Date(ws.createdAt).toLocaleDateString()}
                                </p>
                                {/* <p className="mt-4 text-blue-600">View Workspace &rarr;</p> */}
                            </div>
                        </Link>
                    ))}

                    {workspaces.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No workspaces found. Create one to get started!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
