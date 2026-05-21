import { GovernancePageHeader } from '@/modules/platform/components/governance/governance-page-header';
import { PlatformPermissionForm } from '@/modules/platform/components/governance/platform-permission-form';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernancePermissionEditorData } from '@/modules/permissions/server/platform-governance-permission-page-data';

type Props = {
  params: Promise<{
    permissionId: string;
  }>;
};

export default async function PlatformGovernanceEditPermissionPage({
  params,
}: Props) {
  await requirePlatformAdmin();
  const { permissionId } = await params;
  const data = await getPlatformGovernancePermissionEditorData(permissionId);

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title={`Edit ${data.permission?.name ?? data.permission?.key ?? 'Permission'}`}
        description="Update the canonical permission key, entity, and active state."
        backHref={`/platform/governance/permissions/${permissionId}`}
        backLabel="Back to Permission"
      />
      <PlatformPermissionForm mode="edit" {...data} />
    </section>
  );
}
