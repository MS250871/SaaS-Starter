import { GovernancePageHeader } from '@/modules/platform/components/governance/governance-page-header';
import { PlatformRoleForm } from '@/modules/platform/components/governance/platform-role-form';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';
import { getPlatformGovernanceRoleEditorData } from '@/modules/roles/server/platform-governance-roles-page-data';

type Props = {
  params: Promise<{
    roleId: string;
  }>;
};

export default async function PlatformGovernanceEditRolePage({ params }: Props) {
  await requirePlatformAdmin();
  const { roleId } = await params;
  const data = await getPlatformGovernanceRoleEditorData(roleId);

  return (
    <section className="grid gap-6">
      <GovernancePageHeader
        title={`Edit ${data.role?.name ?? 'Role'}`}
        description="Update the role profile and adjust which permission keys it grants by default."
        backHref={`/platform/governance/roles/${roleId}`}
        backLabel="Back to Role"
      />
      <PlatformRoleForm mode="edit" {...data} />
    </section>
  );
}
