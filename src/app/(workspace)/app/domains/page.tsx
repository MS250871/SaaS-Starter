import { WorkspaceDomainsPanel } from "@/modules/workspace/components/workspace-domains-panel"
import { getWorkspaceDomainsPageData } from "@/modules/workspace/server/workspace-admin-page-data"
import {
  hasAnyPermission,
  hasPermission,
} from "@/modules/permissions/permissions.services"

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
      workspaceSlug={workspace.slug}
      currentMode={currentMode}
      activePlan={activePlan}
      domainConfig={domainConfig}
      domains={domains}
      entitlements={entitlements}
      whiteLabelConfig={whiteLabelConfig}
      canUpgrade={hasAnyPermission(actor.permissions, [
        "subscription.create",
        "payment.create",
      ])}
      canManageDomains={hasPermission(
        actor.permissions,
        "workspaceDomain.create",
      )}
      canVerifyDomains={hasPermission(
        actor.permissions,
        "workspaceDomain.verify",
      )}
    />
  )
}
