import { WorkspaceThemePanel } from "@/modules/workspace/components/workspace-admin-dashboard"
import { getWorkspaceThemePageData } from "@/modules/workspace/server/workspace-admin-page-data"

export default async function WorkspaceSettingsThemePage() {
  const { actor, initialTheme, workspaceId } = await getWorkspaceThemePageData()

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    )
  }

  return (
    <WorkspaceThemePanel
      initialTheme={initialTheme}
      canManageTheme={actor.permissions.includes("workspaceSettings.update")}
    />
  )
}
