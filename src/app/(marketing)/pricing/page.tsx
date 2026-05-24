import { Check, Minus } from 'lucide-react';
import Link from 'next/link';
import { PricingCard } from '@/components/pricing/pricing-card';
import { getPricingPageData } from '@/modules/billing/services/pricing.services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { withPublicContext } from '@/lib/request/withPublicContext';

export const dynamic = 'force-dynamic';

function formatLimitDisplay(value: number, unit?: string | null) {
  if (value === 0) {
    return 'Not included';
  }

  if (unit) {
    return `${value.toLocaleString('en-IN')} ${unit}`;
  }

  return value.toLocaleString('en-IN');
}

export default async function PricingPage() {
  const { plans, oneTimeOffers, featureCatalog, limitCatalog } = await withPublicContext(() =>
    getPricingPageData(),
  );

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Pricing Example
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            A public pricing page powered by the starter&apos;s seeded catalog
          </h2>

          <p className="text-lg text-muted-foreground">
            This route is here to demonstrate how the starter can power a real
            pricing surface from plans, products, prices, features, limits, and
            one-time offers. The example content uses an LMS SaaS model.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard
              key={plan.key}
              name={plan.name}
              price={plan.price}
              priceHint={plan.priceHint}
              description={plan.description}
              features={plan.features}
              button={plan.button}
              link={plan.link}
              highlight={plan.highlight}
            />
          ))}
        </div>

        <div className="mt-20">
          <div className="mb-8 space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight">
              One-time add-ons
            </h3>
            <p className="text-sm text-muted-foreground">
              These seeded one-time products use the same payment engine as subscriptions
              and give you a direct way to test one-time Razorpay checkout.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {oneTimeOffers.map((offer) => (
              <Card key={offer.priceId} className="border-border/70 bg-background/90">
                <CardHeader className="space-y-3">
                  <span className="inline-flex w-fit rounded-full border border-border/70 bg-muted/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    One-time purchase
                  </span>
                  <CardTitle>{offer.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                  <div className="text-2xl font-semibold text-primary">
                    {offer.amountLabel}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={offer.link}>Buy Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <div className="mb-8 space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight">
              Full feature and limit comparison
            </h3>
            <p className="text-sm text-muted-foreground">
              Below is the complete seeded catalog comparison across plans,
              including all LMS features and usage limits.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-left font-medium">Capability</th>
                  {plans.map((plan) => (
                    <th
                      key={plan.key}
                      className="px-4 py-3 text-left font-medium"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={plans.length + 1}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Features
                  </td>
                </tr>

                {featureCatalog.map((feature) => (
                  <tr key={feature.key} className="border-t border-border/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{feature.name}</div>
                      {feature.category && (
                        <div className="text-xs text-muted-foreground">
                          {feature.category}
                        </div>
                      )}
                    </td>
                    {plans.map((plan) => {
                      const enabled = (plan.featureKeys ?? []).includes(feature.key);

                      return (
                        <td key={`${plan.key}-${feature.key}`} className="px-4 py-3">
                          {enabled ? (
                            <span className="inline-flex items-center gap-2 text-foreground">
                              <Check size={16} className="text-primary" />
                              Included
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Minus size={16} />
                              No
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <td colSpan={plans.length + 1} className="px-0 py-0">
                    <Separator />
                  </td>
                </tr>

                <tr>
                  <td
                    colSpan={plans.length + 1}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  >
                    Limits
                  </td>
                </tr>

                {limitCatalog.map((limit) => (
                  <tr key={limit.key} className="border-t border-border/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{limit.name}</div>
                      {limit.unit && (
                        <div className="text-xs text-muted-foreground">
                          {limit.unit}
                        </div>
                      )}
                    </td>
                    {plans.map((plan) => {
                      const limitValue = plan.limitsByKey?.[limit.key];

                      return (
                        <td key={`${plan.key}-${limit.key}`} className="px-4 py-3">
                          {limitValue
                            ? formatLimitDisplay(limitValue.value, limitValue.unit)
                            : 'Not included'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
