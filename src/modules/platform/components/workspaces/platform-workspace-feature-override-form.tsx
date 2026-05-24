'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { syncWorkspaceFeatureOverridesAction } from '@/modules/entitlements/actions/workspace-override-admin.actions';

type FeatureOverrideWorkspaceEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-workspace-overrides-page-data').getPlatformWorkspaceFeatureOverrideWorkspaceEditorData
  >
>;

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function PlatformWorkspaceFeatureOverrideForm({
  selectedWorkspaceId,
  workspace,
  activePlan,
  workspaces,
  overrideCount,
  featuresByCategory,
}: FeatureOverrideWorkspaceEditorData) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<'navigate' | 'save' | null>(
    null,
  );
  const [workspaceValue, setWorkspaceValue] = useState(selectedWorkspaceId ?? '');
  const initialEnabledIds = useMemo(
    () =>
      new Set(
        featuresByCategory.flatMap((group) =>
          group.features.filter((feature) => feature.enabled).map((feature) => feature.id),
        ),
      ),
    [featuresByCategory],
  );
  const initialBaseEnabledIds = useMemo(
    () =>
      new Set(
        featuresByCategory.flatMap((group) =>
          group.features
            .filter((feature) => feature.baseEnabled)
            .map((feature) => feature.id),
        ),
      ),
    [featuresByCategory],
  );
  const [selectedFeatureIds, setSelectedFeatureIds] =
    useState<Set<string>>(initialEnabledIds);
  const isNavigationPending = isPending && pendingIntent === 'navigate';
  const isSavePending = isPending && pendingIntent === 'save';
  const hasWorkspaceSelection = workspaceValue.length > 0;

  const toggleFeature = (featureId: string, checked: boolean) => {
    setSelectedFeatureIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(featureId);
      } else {
        next.delete(featureId);
      }

      return next;
    });
  };

  const navigateToWorkspace = (workspaceId: string) => {
    setError(null);
    setWorkspaceValue(workspaceId);
    setPendingIntent('navigate');
    startTransition(() => {
      router.push(
        workspaceId
          ? `/platform/workspaces/overrides/features/create?workspaceId=${workspaceId}`
          : '/platform/workspaces/overrides/features/create',
      );
    });
  };

  const submitSelectedFeatures = (featureIds: Set<string>) => {
    if (!selectedWorkspaceId) {
      setError('Choose a workspace before saving feature overrides.');
      return;
    }

    setError(null);
    setPendingIntent('save');

    startTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', selectedWorkspaceId);

      Array.from(featureIds).forEach((featureId) => {
        formData.append('featureIds', featureId);
      });

      const response = await syncWorkspaceFeatureOverridesAction(formData);

      if (!response.success) {
        setError(response.error.message);
        setPendingIntent(null);
        return;
      }

      router.push(
        `/platform/workspaces/overrides/features/create?workspaceId=${response.data.workspaceId}`,
      );
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Update feature overrides failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Workspace Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Workspace</span>
            <select
              className={selectClassName}
              value={workspaceValue}
              onChange={(event) => navigateToWorkspace(event.target.value)}
              disabled={isPending}
            >
              <option value="">Select workspace</option>
              {workspaces.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.slug})
                  {option.isActive ? '' : ' [inactive]'}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {workspace ? (
              <>
                <Badge variant="outline">{workspace.slug}</Badge>
                <Badge variant={workspace.isActive ? 'default' : 'outline'}>
                  {workspace.isActive ? 'Active workspace' : 'Inactive workspace'}
                </Badge>
                <Badge variant="outline">
                  {activePlan ? `Plan: ${activePlan.name}` : 'No active plan'}
                </Badge>
                <Badge variant="outline">{overrideCount} overrides saved</Badge>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!hasWorkspaceSelection ? (
        <Card className="border-border/70 bg-background/85">
          <CardContent className="py-10 text-sm text-muted-foreground">
            Choose a workspace to load its current feature state and manage overrides.
          </CardContent>
        </Card>
      ) : isNavigationPending ? (
        <Card className="border-border/70 bg-background/85">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="size-5" />
            <p>Loading workspace features...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Feature Access Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Checked = currently enabled</Badge>
                <Badge variant="outline">Plan enabled = part of base plan</Badge>
                <Badge variant="outline">Override = differs from base plan</Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {featuresByCategory.map((group) => (
                  <Card key={group.category} className="border-border/70 bg-background/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{group.category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.features.map((feature) => {
                        const isChecked = selectedFeatureIds.has(feature.id);

                        return (
                          <label
                            key={feature.id}
                            className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) =>
                                toggleFeature(feature.id, event.target.checked)
                              }
                              disabled={isPending || !feature.canOverride}
                              className="mt-1"
                            />
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{feature.name}</p>
                                {!feature.isActive ? (
                                  <Badge variant="outline">Inactive feature</Badge>
                                ) : null}
                                {feature.baseEnabled ? (
                                  <Badge variant="outline">Plan enabled</Badge>
                                ) : null}
                                {feature.isOverridden ? (
                                  <Badge variant="secondary">Override</Badge>
                                ) : null}
                                {!feature.canOverride ? (
                                  <Badge variant="outline">
                                    {feature.overridePolicyLabel}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                {feature.key}
                              </p>
                              {feature.description ? (
                                <p className="text-xs text-muted-foreground">
                                  {feature.description}
                                </p>
                              ) : null}
                              {!feature.canOverride ? (
                                <p className="text-xs text-muted-foreground">
                                  This feature follows the workspace plan and cannot be
                                  changed through overrides.
                                </p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/85">
            <CardContent className="flex flex-wrap gap-3 py-6">
              {isSavePending ? (
                <SpinnerButton
                  className="w-full sm:w-auto"
                  message="Saving feature overrides..."
                />
              ) : (
                <>
                  <Button onClick={() => submitSelectedFeatures(selectedFeatureIds)}>
                    Save Feature Overrides
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSelectedFeatureIds(new Set(initialBaseEnabledIds))
                    }
                  >
                    Reset Selection to Plan Defaults
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
