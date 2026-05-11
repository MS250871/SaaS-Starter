import { WorkspaceFeaturesPanel } from '@/modules/workspace/components/workspace-features-panel';
import { getWorkspaceFeaturesPageData } from '@/modules/workspace/server/workspace-admin-page-data';

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
      canUpgrade={
        actor.permissions.includes('subscription.create') ||
        actor.permissions.includes('payment.create')
      }
    />
  );
}
