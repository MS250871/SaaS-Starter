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
import {
  createPriceCatalogAction,
  updatePriceCatalogAction,
} from '@/modules/billing/actions/price-catalog-admin.actions';

type PriceEditorData = Awaited<
  ReturnType<
    typeof import('@/modules/billing/server/platform-billing-catalog-page-data').getPlatformPriceEditorData
  >
>;

export function PlatformPriceForm({
  mode,
  price,
  products,
}: PriceEditorData & {
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
          ? await createPriceCatalogAction(formData)
          : await updatePriceCatalogAction(formData);

      if (!response.success) {
        setError(response.error.message);
        return;
      }

      router.push(`/platform/catalog/prices/${response.data.priceId}`);
    });
  };

  return (
    <section className="grid gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{mode === 'create' ? 'Create price failed' : 'Update price failed'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Price Profile</CardTitle>
          <CardDescription>
            Define billable amounts, cadence, and provider references for a
            specific product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-6">
              {mode === 'edit' ? (
                <input type="hidden" name="priceId" value={price?.id ?? ''} />
              ) : null}

              <Field>
                <FieldLabel>Product</FieldLabel>
                <FieldContent>
                  <select
                    name="productId"
                    defaultValue={price?.productId ?? ''}
                    disabled={isPending}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.code}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel>Amount</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      name="amount"
                      defaultValue={price?.amount ?? 0}
                      disabled={isPending}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Currency</FieldLabel>
                  <FieldContent>
                    <select
                      name="currency"
                      defaultValue={price?.currency ?? 'INR'}
                      disabled={isPending}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Interval</FieldLabel>
                  <FieldContent>
                    <select
                      name="interval"
                      defaultValue={price?.interval ?? ''}
                      disabled={isPending}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                    >
                      <option value="">One-time</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Provider Price ID</FieldLabel>
                <FieldContent>
                  <Input
                    name="providerPriceId"
                    defaultValue={price?.providerPriceId ?? ''}
                    disabled={isPending}
                    placeholder="rzp_plan_..."
                  />
                </FieldContent>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={price?.isActive ?? true}
                  disabled={isPending}
                />
                Active
              </label>

              <Field>
                {isPending ? (
                  <SpinnerButton
                    className="w-full sm:w-auto"
                    message={mode === 'create' ? 'Creating price...' : 'Saving price...'}
                  />
                ) : (
                  <Button type="submit">
                    {mode === 'create' ? 'Create Price' : 'Save Price'}
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
