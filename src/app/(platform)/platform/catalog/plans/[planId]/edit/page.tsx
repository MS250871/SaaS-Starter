import { CatalogPageHeader } from '@/modules/platform/components/catalog/catalog-page-header';
import { PlatformPlanForm } from '@/modules/platform/components/catalog/platform-plan-form';
import { getPlatformPlanEditorData } from '@/modules/entitlements/server/platform-entitlements-catalog-page-data';
import { requirePlatformAdmin } from '@/modules/platform/server/require-platform-admin';

type Props = {
  params: Promise<{
    planId: string;
  }>;
};

export default async function PlatformCatalogEditPlanPage({ params }: Props) {
  await requirePlatformAdmin();
  const { planId } = await params;
  const data = await getPlatformPlanEditorData(planId);

  return (
    <section className="grid gap-6">
      <CatalogPageHeader
        title={`Edit ${data.plan?.name ?? 'Plan'}`}
        description="Update the plan profile, feature bundle, limit values, and catalog visibility."
        backHref={`/platform/catalog/plans/${planId}`}
        backLabel="Back to Plan"
      />
      <PlatformPlanForm mode="edit" {...data} />
    </section>
  );
}
