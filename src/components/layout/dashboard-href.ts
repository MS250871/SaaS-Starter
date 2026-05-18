import type { SessionPayload } from "@/lib/auth/auth.schema"
import { extractAppError } from "@/lib/errors/app-error"
import { ERR } from "@/lib/errors/codes"
import { withPublicContext } from "@/lib/request/withPublicContext"
import { resolveWorkspaceSurfaceRedirect } from "@/modules/auth/workflows/post-login.workflow"

export async function resolveDashboardHref(session: SessionPayload | null) {
  if (!session) {
    return "/app"
  }

  if (session.workspaceId) {
    const workspaceId = session.workspaceId

    try {
      const workspaceHref = await withPublicContext(() =>
        resolveWorkspaceSurfaceRedirect({
          workspaceId,
          fallbackPath: session.membershipId ? "/app" : "/customer",
        }),
      )

      return workspaceHref ?? "/app"
    } catch (error) {
      const appError = extractAppError(error)

      // Local DB resets can leave behind a stale session cookie that still
      // references a deleted workspace. Do not crash shared marketing chrome.
      if (appError?.code === ERR.NOT_FOUND) {
        if (
          (session.platformRoleKeys?.length ?? 0) > 0 ||
          (session.platformRoles?.length ?? 0) > 0
        ) {
          return "/platform"
        }

        return "/app"
      }

      throw error
    }
  }

  if (
    (session.platformRoleKeys?.length ?? 0) > 0 ||
    (session.platformRoles?.length ?? 0) > 0
  ) {
    return "/platform"
  }

  return "/app"
}
