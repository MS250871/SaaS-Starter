import { GovernancePageHeader } from '@/modules/platform/components/governance/governance-page-header';
import { PlatformRoleForm } from '@/modules/platform/components/governance/platform-role-form';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernanceRoleEditorData } from '@/modules/roles/server/platform-governance-roles-page-data';

export default async function PlatformGovernanceCreateRolePage() {
  await requirePlatformAdmin();
  const data = await getPlatformGovernanceRoleEditorData();

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title="Create Role"
        description="Create a new platform or workspace role and attach the direct permission grants it should resolve with."
        backHref="/platform/governance/roles"
        backLabel="Back to Roles"
      />
      <PlatformRoleForm mode="create" {...data} />
    </section>
  );
}
