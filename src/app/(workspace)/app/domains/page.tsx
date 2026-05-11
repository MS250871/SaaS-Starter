import { WorkspaceDomainsPanel } from "@/modules/workspace/components/workspace-domains-panel"
import { getWorkspaceDomainsPageData } from "@/modules/workspace/server/workspace-admin-page-data"

export default async function WorkspaceDomainsPage() {
  const {
    actor,
    workspace,
    workspaceId,
    currentMode,
    activePlan,
    domainConfig,
    domains,
    entitlements,
    whiteLabelConfig,
  } = await getWorkspaceDomainsPageData()

  if (!workspaceId || !workspace) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    )
  }

  return (
    <WorkspaceDomainsPanel
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      currentMode={currentMode}
      activePlan={activePlan}
      domainConfig={domainConfig}
      domains={domains}
      entitlements={entitlements}
      whiteLabelConfig={whiteLabelConfig}
      canUpgrade={
        actor.permissions.includes("subscription.create") ||
        actor.permissions.includes("payment.create")
      }
      canManageDomains={actor.permissions.includes("workspaceDomain.create")}
      canVerifyDomains={actor.permissions.includes("workspaceDomain.verify")}
    />
  )
}
