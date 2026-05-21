import { GovernancePageHeader } from '@/modules/platform/components/governance/governance-page-header';
import { PlatformPermissionForm } from '@/modules/platform/components/governance/platform-permission-form';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernancePermissionEditorData } from '@/modules/permissions/server/platform-governance-permission-page-data';

export default async function PlatformGovernanceCreatePermissionPage() {
  await requirePlatformAdmin();
  const data = await getPlatformGovernancePermissionEditorData();

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title="Create Permission"
        description="Define a new canonical permission key for the authorization system."
        backHref="/platform/governance/roles"
        backLabel="Back to Roles & Permissions"
      />
      <PlatformPermissionForm mode="create" {...data} />
    </section>
  );
}
