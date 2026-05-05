import { Check, Minus } from 'lucide-react';
import { PricingCard } from '@/components/pricing/pricing-card';
import { getPricingPageData } from '@/modules/billing/services/pricing.services';
import { Separator } from '@/components/ui/separator';

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
  const { plans, featureCatalog, limitCatalog } = await getPricingPageData();

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            SaaS Starter Example
          </p>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            LMS pricing example powered by your seeded catalog
          </h2>

          <p className="text-lg text-muted-foreground">
            This page demonstrates how a SaaS starter can drive pricing from
            real plan, feature, limit, product, and price tables. The example
            here uses an LMS SaaS model.
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
                      const enabled = plan.featureSet.has(feature.key);

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
                      const limitValue = plan.limitMap.get(limit.key);

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
