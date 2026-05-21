import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformWorkspaceFeatureOverrideForm } from '@/modules/platform/components/workspaces/platform-workspace-feature-override-form';
import { getPlatformWorkspaceFeatureOverrideWorkspaceEditorData } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';
import { requirePlatformPermission } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    overrideId: string;
  }>;
};

export default async function PlatformEditWorkspaceFeatureOverridePage({
  params,
}: Props) {
  await requirePlatformPermission('featureOverride.update');
  const { overrideId } = await params;
  const data = await getPlatformWorkspaceFeatureOverrideWorkspaceEditorData({
    overrideId,
  });

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={`Manage ${data.workspace?.name ?? 'Workspace'} Feature Overrides`}
        description="Adjust the current effective features for this workspace and let the system persist only the necessary overrides."
        backHref="/platform/workspaces/overrides"
        backLabel="Back to Overrides"
      />
      <PlatformWorkspaceFeatureOverrideForm
        key={data.selectedWorkspaceId ?? overrideId}
        {...data}
      />
    </section>
  );
}
