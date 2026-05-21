import { readActorContext } from "@/lib/request/read-actor-context"
import { WorkspaceSettingsIndexPanel } from "@/modules/workspace/components/workspace-settings-index-panel"
import { buildWorkspaceSurfacePath } from "@/modules/workspace/routing"
import { buildWorkspaceSettingsLinks } from "@/modules/workspace/settings-navigation"

export default async function WorkspaceSettingsPage() {
  const { actor, requestContext, session } = await readActorContext()
  const workspaceContext = requestContext?.workspace
  const workspaceBasePath =
    workspaceContext?.slug
      ? buildWorkspaceSurfacePath({
          strategy: workspaceContext.strategy,
          slug: workspaceContext.slug,
          path: "/app",
        })
      : session?.workspaceId || actor.workspaceId
        ? "/app"
        : "/"

  const links = buildWorkspaceSettingsLinks(
    actor.permissions,
    workspaceBasePath,
  )

  return <WorkspaceSettingsIndexPanel links={links} />
}
