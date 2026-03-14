import { pricingPlans } from '@/lib/data/pricing.config';
import { PricingCard } from '@/components/pricing/pricing-card';

export default function PricingPage() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Simple SaaS Pricing
          </h2>

          <p className="text-muted-foreground text-lg">
            Start exploring the multi-tenant SaaS platform with a free trial,
            scale with professional features, or deploy a fully white-label
            enterprise solution.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
