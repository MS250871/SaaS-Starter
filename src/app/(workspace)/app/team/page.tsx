import { WorkspaceTeamPanel } from "@/modules/workspace/components/workspace-admin-dashboard"
import { getWorkspaceTeamPageData } from "@/modules/workspace/server/workspace-admin-page-data"
import { hasAnyPermission, hasPermission } from "@/modules/permissions/services/permissions.services"

export default async function WorkspaceTeamPage() {
  const { actor, members, invites, assignableRoles, workspaceId } =
    await getWorkspaceTeamPageData()

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
    <WorkspaceTeamPanel
      members={members}
      initialInvites={invites}
      assignableRoles={assignableRoles}
      canInvite={hasPermission(actor.permissions, "workspaceInvite.create")}
      canRemoveMembers={hasAnyPermission(actor.permissions, [
        "membership.delete",
        "membership.deactivate",
      ])}
      actorMembershipId={actor.membershipId}
    />
  )
}
