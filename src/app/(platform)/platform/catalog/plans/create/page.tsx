import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformPlanForm } from '@/modules/platform/components/catalog/platform-plan-form';
import { getPlatformPlanEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

export default async function PlatformCatalogCreatePlanPage() {
  await requirePlatformAdmin();
  const data = await getPlatformPlanEditorData();

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title="Create Plan"
        description="Define a plan, attach feature flags, and assign quantitative limits in one control-plane flow."
        backHref="/platform/catalog/plans"
        backLabel="Back to Plans"
      />
      <PlatformPlanForm mode="create" {...data} />
    </section>
  );
}
