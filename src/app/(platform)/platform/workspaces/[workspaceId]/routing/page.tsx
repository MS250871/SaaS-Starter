import { hasPermission } from '@/modules/permissions/services/permissions.services';
import { PlatformWorkspaceRoutingDetailView } from '@/modules/platform/components/workspaces/platform-workspace-routing-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceRoutingDetailPageData } from '@/modules/workspace/server/platform-workspace-domain-page-data';

export default async function PlatformWorkspaceRoutingDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const actor = await requirePlatformPermission('platformWorkspace.read');
  const { workspaceId } = await params;
  const data = await getPlatformWorkspaceRoutingDetailPageData(workspaceId);

  return (
    <PlatformWorkspaceRoutingDetailView
      data={data}
      canCreateDomains={hasPermission(actor.permissions, 'workspaceDomain.create')}
      canVerifyDomains={hasPermission(actor.permissions, 'workspaceDomain.verify')}
      canSetPrimaryDomains={hasPermission(
        actor.permissions,
        'workspaceDomain.setPrimary',
      )}
      canDeleteDomains={hasPermission(actor.permissions, 'workspaceDomain.delete')}
      canResyncRouting={hasPermission(actor.permissions, 'workspaceDomain.update')}
    />
  );
}
