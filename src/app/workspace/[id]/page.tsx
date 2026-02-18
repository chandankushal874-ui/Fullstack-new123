
import { WorkspaceDetail } from "@/components/WorkspaceDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <WorkspaceDetail workspaceId={id} />;
}
