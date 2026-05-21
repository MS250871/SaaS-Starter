import { WorkspaceDomainType } from '@/generated/prisma/client';
import { hasPermission } from '@/modules/permissions/permissions.services';
import { PlatformWorkspaceDomainDetailView } from '@/modules/platform/components/workspaces/platform-workspace-domain-detail-view';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceDomainDetailPageData } from '@/modules/workspace/server/platform-workspace-domain-page-data';

export default async function PlatformWorkspaceDomainDetailPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const actor = await requirePlatformPermission('platformWorkspace.read');
  const { domainId } = await params;
  const data = await getPlatformWorkspaceDomainDetailPageData(domainId);

  return (
    <PlatformWorkspaceDomainDetailView
      data={data}
      canRefreshVerification={
        data.domain.type === WorkspaceDomainType.CUSTOM &&
        hasPermission(actor.permissions, 'workspaceDomain.verify')
      }
      canSetPrimary={
        data.domain.type === WorkspaceDomainType.CUSTOM &&
        data.domain.isVerified &&
        !data.domain.isPrimary &&
        hasPermission(actor.permissions, 'workspaceDomain.setPrimary')
      }
      canDelete={
        data.domain.type === WorkspaceDomainType.CUSTOM &&
        hasPermission(actor.permissions, 'workspaceDomain.delete')
      }
    />
  );
}
