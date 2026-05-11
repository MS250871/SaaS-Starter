import { WorkspaceOverviewPanel } from "@/modules/workspace/components/workspace-admin-dashboard"
import { getWorkspaceOverviewPageData } from "@/modules/workspace/server/workspace-admin-page-data"

export default async function WorkspaceAppPage() {
  const { actor, requestContext, workspaceSummary, workspaceId } =
    await getWorkspaceOverviewPageData()

  if (!workspaceId || !workspaceSummary) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    )
  }

  return (
    <WorkspaceOverviewPanel
      workspace={workspaceSummary}
      actor={actor}
      requestContext={requestContext}
    />
  )
}
