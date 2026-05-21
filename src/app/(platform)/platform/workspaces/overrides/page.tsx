import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { hasPermission } from '@/modules/permissions/permissions.services';
import { PlatformWorkspaceFeatureOverridesTable } from '@/modules/platform/components/workspaces/platform-workspace-feature-overrides-table';
import { PlatformWorkspaceLimitOverridesTable } from '@/modules/platform/components/workspaces/platform-workspace-limit-overrides-table';
import { requirePlatformAnyPermission } from '@/modules/platform/server/require-platform-admin';
import { getPlatformWorkspaceOverridesPageData } from '@/modules/entitlements/server/platform-workspace-overrides-page-data';

export default async function PlatformWorkspaceOverridesPage() {
  const actor = await requirePlatformAnyPermission([
    'featureOverride.read',
    'limitOverride.read',
  ]);
  const data = await getPlatformWorkspaceOverridesPageData();
  const canReadFeatureOverrides = hasPermission(
    actor.permissions ?? [],
    'featureOverride.read',
  );
  const canCreateFeatureOverrides = hasPermission(
    actor.permissions ?? [],
    'featureOverride.update',
  );
  const canEditFeatureOverrides = hasPermission(
    actor.permissions ?? [],
    'featureOverride.update',
  );
  const canReadLimitOverrides = hasPermission(
    actor.permissions ?? [],
    'limitOverride.read',
  );
  const canCreateLimitOverrides = hasPermission(
    actor.permissions ?? [],
    'limitOverride.update',
  );
  const canEditLimitOverrides = hasPermission(
    actor.permissions ?? [],
    'limitOverride.update',
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Feature overrides</p>
            <CardTitle className="text-3xl">
              {data.summary.featureOverrides}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Enabled feature overrides</p>
            <CardTitle className="text-3xl">
              {data.summary.enabledFeatureOverrides}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <p className="text-sm text-muted-foreground">Limit overrides</p>
            <CardTitle className="text-3xl">{data.summary.limitOverrides}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {canReadFeatureOverrides ? (
        <PlatformWorkspaceFeatureOverridesTable
          rows={data.featureRows}
          canCreateOverride={canCreateFeatureOverrides}
          canEditOverride={canEditFeatureOverrides}
        />
      ) : null}
      {canReadLimitOverrides ? (
        <PlatformWorkspaceLimitOverridesTable
          rows={data.limitRows}
          canCreateOverride={canCreateLimitOverrides}
          canEditOverride={canEditLimitOverrides}
        />
      ) : null}
    </div>
  );
}
