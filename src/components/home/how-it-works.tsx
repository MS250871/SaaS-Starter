import { steps } from '@/lib/data/steps.config';
import { StepCard } from './step-card';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            How Multi-Tenant SaaS Works
          </h2>

          <p className="text-muted-foreground text-lg">
            Experience a fully functional multi-tenant platform with
            organization isolation, configurable branding, and flexible tenant
            routing.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              step={index + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>

        {/* Routing Explanation */}
        <div className="mt-20 max-w-3xl mx-auto text-center space-y-6">
          <h3 className="text-xl font-semibold">Flexible Tenant Routing</h3>

          <p className="text-muted-foreground">
            The platform dynamically resolves tenants from incoming requests and
            supports multiple routing strategies to enable white-label SaaS
            deployments.
          </p>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="font-medium">Path Based</p>
              <p className="text-muted-foreground mt-1">platform.com/tenant</p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="font-medium">Subdomain</p>
              <p className="text-muted-foreground mt-1">tenant.platform.com</p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="font-medium">Custom Domain</p>
              <p className="text-muted-foreground mt-1">tenant.com</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
