'use client';

import { type FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import {
  createPlanCatalogAction,
  updatePlanCatalogAction,
} from '@/modules/entitlements/actions/plan-catalog-admin.actions';

type PlanEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformPlanEditorData
  >
>;

export function PlatformPlanForm({
  mode,
  plan,
  features,
  limits,
}: PlanEditorData & {
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedFeatureIds = new Set(
    plan?.features.map((entry) => entry.featureId) ?? [],
  );
  const selectedLimitValues = new Map(
    plan?.limits.map((entry) => [entry.limitDefinitionId, entry.valueInt]) ?? [],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response =
        mode === 'create'
          ? await createPlanCatalogAction(formData)
          : await updatePlanCatalogAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/catalog/plans/${response.data.planId}`);
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{mode === 'create' ? 'Create plan failed' : 'Update plan failed'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Plan Profile</CardTitle>
          <CardDescription>
            Define the plan identity, visibility, and the attached entitlement
            bundle that workspaces will inherit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input type="hidden" name="planId" value={plan?.id ?? ''} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      name="name"
                      defaultValue={plan?.name ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Key</FieldLabel>
                  <FieldContent>
                    <Input
                      name="key"
                      defaultValue={plan?.key ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                  <FieldError>Use a stable lowercase key like `pro` or `business`.</FieldError>
                </Field>
              </div>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="description"
                    defaultValue={plan?.description ?? ''}
                    disabled={isPending}
                    placeholder="What commercial promise does this plan make?"
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel>Sort Order</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      name="sortOrder"
                      defaultValue={plan?.sortOrder ?? 0}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>

                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={plan?.isActive ?? true}
                    disabled={isPending}
                  />
                  Active
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isPublic"
                    defaultChecked={plan?.isPublic ?? true}
                    disabled={isPending}
                  />
                  Publicly visible
                </label>
              </div>

              <Card className="border-border/70 bg-muted/10">
                <CardHeader>
                  <CardTitle className="text-base">Feature Entitlements</CardTitle>
                  <CardDescription>
                    Pick the feature flags that should be bundled into this
                    plan by default.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {features.map((feature) => (
                    <label
                      key={feature.id}
                      className="flex gap-3 rounded-xl border border-border/70 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        name="featureIds"
                        value={feature.id}
                        defaultChecked={selectedFeatureIds.has(feature.id)}
                        disabled={isPending}
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{feature.name}</p>
                        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {feature.key}
                        </p>
                        {feature.description ? (
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-muted/10">
                <CardHeader>
                  <CardTitle className="text-base">Limit Assignments</CardTitle>
                  <CardDescription>
                    Add a number for any limit that belongs to this plan. Leave
                    it blank to keep the limit unassigned.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {limits.map((limit) => (
                    <Field key={limit.id}>
                      <FieldLabel>
                        {limit.name}
                        {limit.unit ? ` (${limit.unit})` : ''}
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          type="number"
                          min={0}
                          name={`limit:${limit.id}`}
                          defaultValue={selectedLimitValues.get(limit.id) ?? ''}
                          disabled={isPending}
                          placeholder="Leave blank if not included"
                        />
                      </FieldContent>
                    </Field>
                  ))}
                </CardContent>
              </Card>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating plan...' : 'Saving plan...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Plan' : 'Save Plan'}
                  </Button>
                )}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
