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
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { syncWorkspaceLimitOverridesAction } from '@/modules/entitlements/actions/workspace-override-admin.actions';

type LimitOverrideWorkspaceEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-workspace-overrides-page-data').getPlatformWorkspaceLimitOverrideWorkspaceEditorData
  >
>;

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function PlatformWorkspaceLimitOverrideForm({
  selectedWorkspaceId,
  workspace,
  activePlan,
  workspaces,
  overrideCount,
  limitsByCategory,
}: LimitOverrideWorkspaceEditorData) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<'navigate' | 'save' | null>(
    null,
  );
  const [workspaceValue, setWorkspaceValue] = useState(selectedWorkspaceId ?? '');

  const initialLimitValues = useMemo(() => {
    const entries = limitsByCategory.flatMap((group) =>
      group.limits.map((limit) => [limit.id, String(limit.value)] as const),
    );

    return Object.fromEntries(entries) as Record<string, string>;
  }, [limitsByCategory]);

  const initialBaseValues = useMemo(() => {
    const entries = limitsByCategory.flatMap((group) =>
      group.limits.map((limit) => [limit.id, String(limit.baseValue)] as const),
    );

    return Object.fromEntries(entries) as Record<string, string>;
  }, [limitsByCategory]);

  const [limitValues, setLimitValues] =
    useState<Record<string, string>>(initialLimitValues);
  const isNavigationPending = isPending && pendingIntent === 'navigate';
  const isSavePending = isPending && pendingIntent === 'save';
  const hasWorkspaceSelection = workspaceValue.length > 0;

  const updateLimitValue = (limitId: string, value: string) => {
    setLimitValues((current) => ({
      ...current,
      [limitId]: value,
    }));
  };

  const resetLimitToBaseValue = (limitId: string) => {
    setLimitValues((current) => ({
      ...current,
      [limitId]: initialBaseValues[limitId] ?? '0',
    }));
  };

  const resetAllLimitsToBaseValues = () => {
    setLimitValues({ ...initialBaseValues });
  };

  const navigateToWorkspace = (workspaceId: string) => {
    setError(null);
    setWorkspaceValue(workspaceId);
    setPendingIntent('navigate');
    startTransition(() => {
      router.push(
        workspaceId
          ? `/platform/workspaces/overrides/limits/create?workspaceId=${workspaceId}`
          : '/platform/workspaces/overrides/limits/create',
      );
    });
  };

  const submitLimitValues = (values: Record<string, string>) => {
    if (!selectedWorkspaceId) {
      setError('Choose a workspace before saving limit overrides.');
      return;
    }

    const normalizedEntries: Array<[string, string]> = [];

    for (const [limitId, rawValue] of Object.entries(values)) {
      const normalizedValue = rawValue.trim();
      const parsedValue =
        normalizedValue.length === 0 ? 0 : Number.parseInt(normalizedValue, 10);

      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        setError('All limit values must be whole numbers greater than or equal to 0.');
        return;
      }

      normalizedEntries.push([limitId, String(parsedValue)]);
    }

    setError(null);
    setPendingIntent('save');

    startTransition(async () => {
      const formData = new FormData();
      formData.set('workspaceId', selectedWorkspaceId);

      normalizedEntries.forEach(([limitId, valueInt]) => {
        formData.append('limitDefinitionIds', limitId);
        formData.append('valueInts', valueInt);
      });

      const response = await syncWorkspaceLimitOverridesAction(formData);

      if (!response.success) {
        setError(response.error.message);
        setPendingIntent(null);
        return;
      }

      router.push(
        `/platform/workspaces/overrides/limits/create?workspaceId=${response.data.workspaceId}`,
      );
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Update limit overrides failed</AlertTitle>
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
            Choose a workspace to load its current limit values and manage overrides.
          </CardContent>
        </Card>
      ) : isNavigationPending ? (
        <Card className="border-border/70 bg-background/85">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="size-5" />
            <p>Loading workspace limits...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/70 bg-background/85">
            <CardHeader>
              <CardTitle>Limit Access Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Value = current effective limit</Badge>
                <Badge variant="outline">Plan default = base plan value</Badge>
                <Badge variant="outline">Override = differs from base plan</Badge>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {limitsByCategory.map((group) => (
                  <Card key={group.category} className="border-border/70 bg-background/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{group.category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.limits.map((limit) => (
                        <div
                          key={limit.id}
                          className="space-y-3 rounded-xl border border-border/60 px-3 py-3 text-sm"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{limit.name}</p>
                              {!limit.isActive ? (
                                <Badge variant="outline">Inactive limit</Badge>
                              ) : null}
                              {limit.isOverridden ? (
                                <Badge variant="secondary">Override</Badge>
                              ) : null}
                              {!limit.canOverride ? (
                                <Badge variant="outline">
                                  {limit.overridePolicyLabel}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                              {limit.key}
                            </p>
                            {limit.description ? (
                              <p className="text-xs text-muted-foreground">
                                {limit.description}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                Current: {Number(limitValues[limit.id] ?? '0').toLocaleString('en-IN')}
                                {limit.unit ? ` ${limit.unit}` : ''}
                              </Badge>
                              <Badge variant="outline">
                                Plan default: {limit.baseValue.toLocaleString('en-IN')}
                                {limit.unit ? ` ${limit.unit}` : ''}
                              </Badge>
                              {!limit.isOverridden ? (
                                <Badge variant="outline">Using plan default</Badge>
                              ) : null}
                            </div>
                            {!limit.canOverride ? (
                              <p className="text-xs text-muted-foreground">
                                This limit follows the workspace plan and cannot be
                                changed through overrides.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <label className="grid gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Update current value
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={limitValues[limit.id] ?? '0'}
                                  onChange={(event) =>
                                    updateLimitValue(limit.id, event.target.value)
                                  }
                                  disabled={isPending || !limit.canOverride}
                                  className="w-full min-w-[8rem] sm:max-w-48"
                                />
                                {limit.unit ? (
                                  <Badge variant="outline">{limit.unit}</Badge>
                                ) : null}
                              </div>
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isPending || !limit.canOverride}
                                onClick={() => resetLimitToBaseValue(limit.id)}
                              >
                                Reset to default
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                  message="Saving limit overrides..."
                />
              ) : (
                <>
                  <Button onClick={() => submitLimitValues(limitValues)}>
                    Save Limit Overrides
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAllLimitsToBaseValues}
                  >
                    Reset Values to Plan Defaults
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
