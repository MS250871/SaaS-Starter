import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformWorkspaceFeatureOverrideForm } from '@/modules/platform/components/workspaces/platform-workspace-feature-override-form';
import { getPlatformWorkspaceFeatureOverrideWorkspaceEditorData } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCreateWorkspaceFeatureOverridePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission('featureOverride.update');
  const resolvedSearchParams = await searchParams;
  const workspaceId =
    typeof resolvedSearchParams.workspaceId === 'string'
      ? resolvedSearchParams.workspaceId
      : null;
  const data = await getPlatformWorkspaceFeatureOverrideWorkspaceEditorData({
    workspaceId,
  });

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Manage Feature Overrides"
        description="Choose a workspace and adjust its effective feature set against the base plan."
        backHref="/platform/workspaces/overrides"
        backLabel="Back to Overrides"
      />
      <PlatformWorkspaceFeatureOverrideForm
        key={data.selectedWorkspaceId ?? 'workspace-feature-overrides'}
        {...data}
      />
    </section>
  );
}
