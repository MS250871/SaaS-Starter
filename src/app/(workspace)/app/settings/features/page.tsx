import { WorkspaceFeaturesPanel } from '@/modules/workspace/components/workspace-features-panel';
import { getWorkspaceFeaturesPageData } from '@/modules/entitlements/server/workspace-features-page-data';
import { hasAnyPermission } from '@/modules/permissions/services/permissions.services';

export default async function WorkspaceSettingsFeaturesPage() {
  const {
    actor,
    workspaceId,
    activePlan,
    featuresByCategory,
    limitsByCategory,
    overridesSummary,
  } = await getWorkspaceFeaturesPageData();

  if (!workspaceId) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground shadow-sm">
          Workspace context missing for this route.
        </div>
      </div>
    );
  }

  return (
    <WorkspaceFeaturesPanel
      activePlan={activePlan}
      featuresByCategory={featuresByCategory}
      limitsByCategory={limitsByCategory}
      overridesSummary={overridesSummary}
      canUpgrade={hasAnyPermission(actor.permissions, [
        'subscription.create',
        'payment.create',
      ])}
    />
  );
}
