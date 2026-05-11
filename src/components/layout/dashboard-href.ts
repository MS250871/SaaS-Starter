import type { SessionPayload } from "@/lib/auth/auth.schema"
import { resolveWorkspaceSurfaceRedirect } from "@/modules/auth/workflows/post-login.workflow"

export async function resolveDashboardHref(session: SessionPayload | null) {
  if (!session) {
    return "/app"
  }

  if (session.workspaceId) {
    return resolveWorkspaceSurfaceRedirect({
      workspaceId: session.workspaceId,
      fallbackPath: session.membershipId ? "/app" : "/customer",
    })
  }

  if (
    (session.platformRoleKeys?.length ?? 0) > 0 ||
    (session.platformRoles?.length ?? 0) > 0
  ) {
    return "/platform"
  }

  return "/app"
}
