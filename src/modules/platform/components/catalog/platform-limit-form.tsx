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
  createLimitCatalogAction,
  updateLimitCatalogAction,
} from '@/modules/entitlements/actions/limit-catalog-admin.actions';

type LimitEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/entitlements/server/platform-entitlements-catalog-page-data').getPlatformLimitEditorData
  >
>;

export function PlatformLimitForm({
  mode,
  limit,
}: LimitEditorData & {
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
          ? await createLimitCatalogAction(formData)
          : await updateLimitCatalogAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/catalog/limits/${response.data.limitId}`);
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {mode === 'create' ? 'Create limit failed' : 'Update limit failed'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Limit Profile</CardTitle>
          <CardDescription>
            Define reusable quantitative constraints like seats, credits,
            storage, or projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input type="hidden" name="limitId" value={limit?.id ?? ''} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      name="name"
                      defaultValue={limit?.name ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Key</FieldLabel>
                  <FieldContent>
                    <Input
                      name="key"
                      defaultValue={limit?.key ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Unit</FieldLabel>
                  <FieldContent>
                    <Input
                      name="unit"
                      defaultValue={limit?.unit ?? ''}
                      disabled={isPending}
                      placeholder="users, seats, GB, credits"
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
                      defaultValue={limit?.sortOrder ?? 0}
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
                    defaultValue={limit?.description ?? ''}
                    disabled={isPending}
                  />
                </FieldContent>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={limit?.isActive ?? true}
                  disabled={isPending}
                />
                Active
              </label>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating limit...' : 'Saving limit...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Limit' : 'Save Limit'}
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
