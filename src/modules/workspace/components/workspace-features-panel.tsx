'use client';

import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type FeatureCategory = {
  category: string;
  features: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    baseEnabled: boolean;
    isOverridden: boolean;
  }>;
};

type LimitCategory = {
  category: string;
  limits: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    unit: string | null;
    value: number;
    baseValue: number;
    isOverridden: boolean;
  }>;
};

function formatCategoryLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPlanLabel(planKey?: string | null) {
  if (planKey === 'business') {
    return 'Business';
  }

  if (planKey === 'pro') {
    return 'Pro';
  }

  return 'Free Trial';
}

function formatLimitValue(value: number, unit?: string | null) {
  const formattedValue = value.toLocaleString('en-IN');

  if (!unit) {
    return formattedValue;
  }

  return `${formattedValue} ${unit}`;
}

function buildPaymentHref(params: {
  plan: 'pro' | 'business';
  planName: string;
  upgrade: 'subdomain' | 'custom-domain';
}) {
  const search = new URLSearchParams({
    plan: params.plan,
    planName: params.planName,
    upgrade: params.upgrade,
    source: 'workspace-features',
  });

  return `/payment?${search.toString()}`;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="workspace-info-card border bg-background/85">
      <CardHeader className="gap-2">
        <p className="workspace-info-label text-sm font-medium">{label}</p>
        <CardTitle className="workspace-info-value text-2xl font-semibold">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function UpgradeButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button asChild>
      <Link href={href}>
        {label}
        <ArrowUpRightIcon className="size-4" />
      </Link>
    </Button>
  );
}

export function WorkspaceFeaturesPanel({
  activePlan,
  featuresByCategory,
  limitsByCategory,
  overridesSummary,
  canUpgrade,
}: {
  activePlan: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    status: string | null;
    sortOrder: number;
    currentPeriodEnd: string | null;
  } | null;
  featuresByCategory: FeatureCategory[];
  limitsByCategory: LimitCategory[];
  overridesSummary: {
    featureOverrideCount: number;
    limitOverrideCount: number;
  };
  canUpgrade: boolean;
}) {
  const currentPlanKey = activePlan?.key ?? 'trial';
  const enabledFeatureCount = featuresByCategory.reduce(
    (count, group) =>
      count + group.features.filter((feature) => feature.enabled).length,
    0,
  );
  const showProUpgrade = currentPlanKey === 'trial';
  const showBusinessUpgrade =
    currentPlanKey === 'trial' || currentPlanKey === 'pro';

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Plan"
          value={formatPlanLabel(currentPlanKey)}
        />
        <StatCard
          label="Enabled Features"
          value={enabledFeatureCount}
        />
        <StatCard
          label="Feature Overrides"
          value={overridesSummary.featureOverrideCount}
        />
        <StatCard
          label="Limit Overrides"
          value={overridesSummary.limitOverrideCount}
        />
      </div>

      {(showProUpgrade || showBusinessUpgrade) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {showProUpgrade && (
            <Card className="border-border/70 bg-background/85">
              <CardHeader>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Best next step when you need subdomain routing, commerce,
                  analytics, automation, and broader LMS team workflows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Subdomain routing</Badge>
                  <Badge variant="secondary">Advanced analytics</Badge>
                  <Badge variant="secondary">API access</Badge>
                  <Badge variant="secondary">Team management</Badge>
                </div>
                <UpgradeButton
                  href={buildPaymentHref({
                    plan: 'pro',
                    planName: 'Pro',
                    upgrade: 'subdomain',
                  })}
                  label={canUpgrade ? 'Continue to Pro' : 'Pro upgrade unavailable'}
                />
              </CardContent>
            </Card>
          )}

          {showBusinessUpgrade && (
            <Card className="border-border/70 bg-background/85 xl:col-span-2">
              <CardHeader>
                <CardTitle>Upgrade to Business</CardTitle>
                <CardDescription>
                  Move to Business for white-label domains, enterprise
                  integrations, and the highest feature and quota tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Custom domains</Badge>
                  <Badge variant="secondary">SSO</Badge>
                  <Badge variant="secondary">SCORM / LTI</Badge>
                  <Badge variant="secondary">High usage caps</Badge>
                </div>
                <UpgradeButton
                  href={buildPaymentHref({
                    plan: 'business',
                    planName: 'Business',
                    upgrade: 'custom-domain',
                  })}
                  label={
                    canUpgrade
                      ? 'Continue to Business'
                      : 'Business upgrade unavailable'
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Read-only feature visibility for this workspace, grouped by product
            area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featuresByCategory.map((group) => (
            <Card key={group.category} className="border-border/70 bg-background/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {formatCategoryLabel(group.category)}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {group.features.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {feature.name}
                        </p>
                        <Badge
                          variant={feature.enabled ? 'secondary' : 'outline'}
                        >
                          {feature.enabled ? 'Enabled' : 'Not included'}
                        </Badge>
                        {feature.isOverridden && (
                          <Badge variant="outline">Platform override</Badge>
                        )}
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {feature.key}
                      </p>
                      {feature.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/85">
        <CardHeader>
          <CardTitle>Limits</CardTitle>
          <CardDescription>
            Current usage ceilings resolved for this workspace after plan rules
            and any platform-managed overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {limitsByCategory.map((group) => (
            <Card key={group.category} className="border-border/70 bg-background/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {formatCategoryLabel(group.category)}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {group.limits.map((limit) => (
                  <div
                    key={limit.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {limit.name}
                        </p>
                        {limit.isOverridden && (
                          <Badge variant="outline">Platform override</Badge>
                        )}
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {limit.key}
                      </p>
                      {limit.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {limit.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatLimitValue(limit.value, limit.unit)}
                      </p>
                      {limit.isOverridden && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Base plan: {formatLimitValue(limit.baseValue, limit.unit)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
