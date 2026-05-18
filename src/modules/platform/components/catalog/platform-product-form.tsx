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
  createProductCatalogAction,
  updateProductCatalogAction,
} from '@/modules/billing/actions/product-catalog-admin.actions';

type ProductEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/billing/server/platform-billing-catalog-page-data').getPlatformProductEditorData
  >
>;

export function PlatformProductForm({
  mode,
  product,
  plans,
}: ProductEditorData & {
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
          ? await createProductCatalogAction(formData)
          : await updateProductCatalogAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/catalog/products/${response.data.productId}`);
      router.refresh();
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {mode === 'create' ? 'Create product failed' : 'Update product failed'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Product Profile</CardTitle>
          <CardDescription>
            Define the commercial offering and optionally link it back to a
            plan so pricing and entitlement intent stay aligned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input type="hidden" name="productId" value={product?.id ?? ''} />
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      name="name"
                      defaultValue={product?.name ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <FieldContent>
                    <Input
                      name="code"
                      defaultValue={product?.code ?? ''}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Plan Link</FieldLabel>
                  <FieldContent>
                    <select
                      name="planId"
                      defaultValue={product?.planId ?? ''}
                      disabled={isPending}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                    >
                      <option value="">No linked plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <FieldContent>
                    <select
                      name="type"
                      defaultValue={product?.type ?? 'SUBSCRIPTION'}
                      disabled={isPending}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                    >
                      <option value="SUBSCRIPTION">Subscription</option>
                      <option value="ONE_TIME">One-time</option>
                    </select>
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="description"
                    defaultValue={product?.description ?? ''}
                    disabled={isPending}
                  />
                </FieldContent>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={product?.isActive ?? true}
                  disabled={isPending}
                />
                Active
              </label>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating product...' : 'Saving product...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Product' : 'Save Product'}
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
