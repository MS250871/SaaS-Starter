import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformWorkspaceLimitOverrideForm } from '@/modules/platform/components/workspaces/platform-workspace-limit-override-form';
import { getPlatformWorkspaceLimitOverrideWorkspaceEditorData } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    overrideId: string;
  }>;
};

export default async function PlatformEditWorkspaceLimitOverridePage({
  params,
}: Props) {
  await requirePlatformPermission('limitOverride.update');
  const { overrideId } = await params;
  const data = await getPlatformWorkspaceLimitOverrideWorkspaceEditorData({
    overrideId,
  });

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Manage Limit Overrides"
        description="Review plan defaults and adjust workspace-specific quota values from one place."
        backHref="/platform/workspaces/overrides"
        backLabel="Back to Overrides"
      />
      <PlatformWorkspaceLimitOverrideForm {...data} />
    </section>
  );
}
