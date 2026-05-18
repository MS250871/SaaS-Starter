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
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SpinnerButton } from '@/components/ui/spinner-button';
import { Textarea } from '@/components/ui/textarea';
import {
  createFeatureCatalogAction,
  updateFeatureCatalogAction,
} from '@/modules/entitlements/actions/feature-catalog-admin.actions';

type FeatureEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformFeatureEditorData
  >
>;

export function PlatformFeatureForm({
  mode,
  feature,
}: FeatureEditorData & {
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response =
        mode === 'create'
          ? await createFeatureCatalogAction(formData)
          : await updateFeatureCatalogAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/catalog/features/${response.data.featureId}`);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {mode === 'create' ? 'Create feature failed' : 'Update feature failed'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Feature Profile</CardTitle>
          <CardDescription>
            Define reusable capability flags that plans and overrides can
            compose later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input type="hidden" name="featureId" value={feature?.id ?? ''} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      name="name"
                      defaultValue={feature?.name ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Key</FieldLabel>
                  <FieldContent>
                    <Input
                      name="key"
                      defaultValue={feature?.key ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <FieldContent>
                    <Input
                      name="category"
                      defaultValue={feature?.category ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Sort Order</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      name="sortOrder"
                      defaultValue={feature?.sortOrder ?? 0}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="description"
                    defaultValue={feature?.description ?? ''}
                    disabled={isPending}
                  />
                </FieldContent>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={feature?.isActive ?? true}
                  disabled={isPending}
                />
                Active
              </label>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating feature...' : 'Saving feature...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Feature' : 'Save Feature'}
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
