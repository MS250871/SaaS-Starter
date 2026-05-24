import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BellRing,
  Blocks,
  Building2,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { GridBackground } from './grid-background';
import { resolveMarketingImagePair } from './marketing-image-manifest';
import { MarketingScreenshotFrame } from './marketing-screenshot-frame';

type SurfaceCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
};

type CapabilityCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
};

type ArchitectureCard = {
  title: string;
  description: string;
};

type BusinessModelCard = {
  title: string;
  description: string;
  bullets: string[];
};

type StackCard = {
  title: string;
  description: string;
  bullets: string[];
};

const surfaceCards: SurfaceCard[] = [
  {
    title: 'Platform admin',
    description:
      'A real control plane for operators who manage catalog, tenants, billing, governance, and operations.',
    icon: LayoutDashboard,
    bullets: [
      'Workspaces, identities, and routing controls',
      'Catalog, billing, purchases, and refunds',
      'Governance, audit, support, notifications, and media ops',
    ],
  },
  {
    title: 'Workspace admin',
    description:
      'A tenant operating surface for teams that need branding, billing, customers, access, and day-to-day administration.',
    icon: Building2,
    bullets: [
      'Domains, themes, features, limits, and access',
      'Team, customers, media, notifications, and support',
      'Billing, API keys, audit log, and white-label controls',
    ],
  },
  {
    title: 'Customer portal',
    description:
      'A dedicated end-user surface for customer-facing account and support flows without mixing them into the workspace admin.',
    icon: UsersRound,
    bullets: [
      'Customer support threads and ticket history',
      'Separate customer session and access context',
      'Clean extension point for future customer capabilities',
    ],
  },
];

const capabilityCards: CapabilityCard[] = [
  {
    title: 'Catalog and entitlements',
    description:
      'Plans, products, prices, features, limits, and workspace-level overrides are already wired together.',
    icon: Blocks,
    bullets: [
      'Seeded plan, price, product, and add-on structures',
      'Feature and limit enforcement resolves from plan plus overrides',
      'Platform-only override controls for sensitive entitlements',
    ],
  },
  {
    title: 'Billing and commerce',
    description:
      'Subscriptions and one-time purchases use the same billing foundation with admin tooling on both public and internal surfaces.',
    icon: WalletCards,
    bullets: [
      'Subscriptions, payments, one-time purchases, and refunds',
      'Pricing example page driven from real billing data',
      'Workspace and platform billing views with operational actions',
    ],
  },
  {
    title: 'Routing and white-labeling',
    description:
      'The starter supports path-based routing, subdomains, custom domains, theme-aware public surfaces, and routing sync flows.',
    icon: Globe2,
    bullets: [
      'Trial, subdomain, and custom domain strategies',
      'Verification, primary host, and DNS control surfaces',
      'Theme-aware placeholders ready for light and dark screenshots',
    ],
  },
  {
    title: 'Governance and access control',
    description:
      'Roles, permissions, invites, audits, and module-scoped policies are already part of the operating system.',
    icon: ShieldCheck,
    bullets: [
      'Platform team, roles, permissions, and audit log',
      'Workspace access policies and member overrides',
      'Surface access trimmed by permissions instead of generic admin checks',
    ],
  },
  {
    title: 'Support and notifications',
    description:
      'Customer tickets, workspace desks, platform escalations, notification delivery, and inbox flows are already implemented.',
    icon: LifeBuoy,
    bullets: [
      'Customer support queue plus upward platform escalations',
      'Replies, internal notes, assignment, and ownership rules',
      'Workspace and platform notification sending plus delivery tracking',
    ],
  },
  {
    title: 'Operations tooling',
    description:
      'The platform already has operational surfaces for webhooks, outbox jobs, media, notifications, and support workloads.',
    icon: Workflow,
    bullets: [
      'Webhook events, outbox queues, and replay/requeue actions',
      'Media assets, processing jobs, and attachment inspection',
      'Operational tables and detail views built with shared TanStack patterns',
    ],
  },
];

const architectureCards: ArchitectureCard[] = [
  {
    title: 'Routes compose, modules own',
    description:
      'App routes stay thin while data and behavior live in the owning module through services, server loaders, workflows, and actions.',
  },
  {
    title: 'Server-first by default',
    description:
      'Most page data resolves on the server, with loading boundaries, client islands kept purposeful, and shell-level state kept lean.',
  },
  {
    title: 'One design system across surfaces',
    description:
      'Public marketing, platform admin, workspace admin, and customer flows all share shadcn/ui primitives and reusable table patterns.',
  },
  {
    title: 'Real operating flows, not empty stubs',
    description:
      'Billing, domains, support, notifications, catalog, permissions, and routing all connect to the real data model rather than placeholder cards.',
  },
];

const businessModelCards: BusinessModelCard[] = [
  {
    title: 'B2C',
    description:
      'Run a direct customer product with public pricing, customer signup, customer support, and account-level access.',
    bullets: [
      'Public pricing example and one-time purchase patterns',
      'Customer support surface and customer session context',
      'Good fit for direct-to-user products and memberships',
    ],
  },
  {
    title: 'B2B',
    description:
      'Operate tenant workspaces with branding, domains, access control, workspace billing, and admin workflows.',
    bullets: [
      'Workspace admin for team, billing, media, and settings',
      'Subdomain and custom-domain white-label routing',
      'Team invites, permissions, roles, and audit patterns',
    ],
  },
  {
    title: 'B2B2C',
    description:
      'Combine platform control, workspace operators, and customer-facing support into one layered SaaS system.',
    bullets: [
      'Platform control plane above tenant workspaces',
      'Workspace-owned customer support plus platform escalations',
      'Useful for marketplaces, LMS, agency SaaS, and white-label products',
    ],
  },
];

const stackCards: StackCard[] = [
  {
    title: 'Frontend and app shell',
    description:
      'The UI stack is current and admin-heavy rather than landing-page-only.',
    bullets: [
      'Next.js 16 App Router with React 19 and TypeScript 5',
      'Tailwind CSS 4, shadcn/ui, Radix UI, Sonner',
      'TanStack Table and Recharts for operational surfaces',
    ],
  },
  {
    title: 'Data and backend foundation',
    description:
      'The repo is already set up for a real multi-tenant data model, not a fake in-memory demo.',
    bullets: [
      'Prisma 7 with PostgreSQL driver and Neon adapter',
      'Server-side loaders, workflows, and actions by owning module',
      'Support for jobs, audit, entitlements, billing, routing, and media domains',
    ],
  },
  {
    title: 'Payments, messaging, and queues',
    description:
      'The configured providers in the repo show the commerce and communication layer is already planned for production use.',
    bullets: [
      'Razorpay for subscriptions, payments, purchases, and refunds',
      'Resend email plus Combirds SMS/communication keys present',
      'Upstash Redis and QStash for queues, delivery, and background work',
    ],
  },
  {
    title: 'Storage, domains, and infrastructure',
    description:
      'The environment already expects the services needed for branded SaaS operations.',
    bullets: [
      'S3-compatible object storage through R2-style credentials',
      'Root-domain driven routing for path, subdomain, and custom-domain modes',
      'Built to support media, DNS guidance, verification, and routing control',
    ],
  },
];

const heroStats = [
  { label: 'Surfaces', value: '3' },
  { label: 'Core systems', value: '6+' },
  { label: 'Ready layers', value: 'Platform + workspace + customer' },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={cn(
        'space-y-4',
        align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl',
      )}
    >
      <Badge
        variant="outline"
        className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
      >
        {eyebrow}
      </Badge>
      <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-muted-foreground md:text-lg">
        {description}
      </p>
    </div>
  );
}

function SurfaceCardView({ card }: { card: SurfaceCard }) {
  const Icon = card.icon;

  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-background/92 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
            <Icon className="size-5" />
          </div>
          <Badge variant="outline">{card.title}</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {card.title}
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground">
            {card.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm leading-6 text-foreground/90">
          {card.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <Sparkles className="mt-1 size-3.5 shrink-0 text-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CapabilityCardView({ card }: { card: CapabilityCard }) {
  const Icon = card.icon;

  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-background/92 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
      <CardHeader className="space-y-4">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-foreground/4 text-foreground ring-1 ring-foreground/10">
          <Icon className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {card.title}
          </CardTitle>
          <CardDescription className="text-sm leading-6 text-muted-foreground">
            {card.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm leading-6 text-foreground/90">
          {card.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function MarketingHome() {
  const heroImage = resolveMarketingImagePair('hero-control-plane');
  const platformImage = resolveMarketingImagePair('platform-control-plane');
  const workspaceOverviewImage =
    resolveMarketingImagePair('workspace-overview');
  const catalogImage = resolveMarketingImagePair('catalog-pricing');
  const routingImage = resolveMarketingImagePair('domains-routing');
  const billingImage = resolveMarketingImagePair('billing-operations');
  const supportImage = resolveMarketingImagePair('support-escalations');
  const workspaceAdminImage = resolveMarketingImagePair(
    'workspace-administration',
  );

  return (
    <>
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden">
        <GridBackground />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-128 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.10),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.10),transparent_28%)]" />

        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center px-6 py-12 md:py-16">
          <div className="grid w-full gap-10 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
              >
                Multi-tenant SaaS starter
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-normal leading-tight md:text-6xl">
                  A production grade pre-wired SaaS starter.
                </h1>

                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Platform admin, workspace admin, customer support, billing,
                  catalog, routing, notifications, and governance are already
                  built in.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="min-w-45">
                  <Link href="/signup?intent=free">
                    <span>Start Free Trial</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="min-w-45"
                >
                  <Link href="/pricing">View Pricing Example</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroStats.map((item) => (
                  <Card
                    key={item.label}
                    size="sm"
                    className="rounded-[1.25rem] border-border/70 bg-background/90 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
                  >
                    <CardContent className="space-y-1.5 py-4">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="text-lg font-semibold tracking-tight md:text-xl">
                        {item.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <MarketingScreenshotFrame
              title="Starter overview"
              description="Use a clean platform overview or composite screenshot here so the first screen immediately shows what the product looks like."
              variant="platform"
              aspectClassName="aspect-[16/11]"
              className="mx-auto w-full max-w-3xl xl:translate-y-1"
              {...heroImage}
            />
          </div>
        </div>
      </section>

      <section id="capabilities" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Capabilities"
            title="Everything that makes the starter useful is already in the product story."
            description="Instead of shipping only authentication and a dashboard shell, this starter already models the three operating surfaces and the cross-cutting systems a real SaaS app needs."
            align="center"
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {surfaceCards.map((card) => (
              <SurfaceCardView key={card.title} card={card} />
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {capabilityCards.map((card) => (
              <CapabilityCardView key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Business models"
            title="Use the same foundation for B2C, B2B, or B2B2C."
            description="The product structure already supports direct customer apps, tenant-operated SaaS, and layered platform-plus-tenant businesses without pretending they are the same thing."
            align="center"
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {businessModelCards.map((card) => (
              <Card
                key={card.title}
                className="rounded-[1.5rem] border-border/70 bg-background/92 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
              >
                <CardHeader className="space-y-3">
                  <Badge variant="outline" className="w-fit">
                    {card.title}
                  </Badge>
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm leading-6 text-foreground/90">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="screens" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Screens"
            title="Real product surfaces deserve real screen real estate."
            description=""
          />

          <div className="mt-14 grid gap-6 xl:grid-cols-12">
            <MarketingScreenshotFrame
              title="Platform overview and control plane"
              description="Highlight the operator dashboard, revenue metrics, queues, and global system visibility."
              variant="platform"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-7"
              {...platformImage}
            />
            <MarketingScreenshotFrame
              title="Workspace overview"
              description="Show tenant-facing operations, branding, learner activity, and daily workspace administration."
              variant="workspace"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-5"
              {...workspaceOverviewImage}
            />
            <MarketingScreenshotFrame
              title="Catalog and pricing system"
              description="Use a catalog screen that proves plans, products, prices, features, and limits already exist as admin surfaces."
              variant="catalog"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-5"
              {...catalogImage}
            />
            <MarketingScreenshotFrame
              title="Domains and routing controls"
              description="Swap in the routing detail or DNS controls to show white-label depth rather than generic domain copy."
              variant="routing"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-7"
              {...routingImage}
            />
            <MarketingScreenshotFrame
              title="Billing operations"
              description="Show subscriptions, one-time purchases, payments, and refunds as a working commerce system."
              variant="billing"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-6"
              {...billingImage}
            />
            <MarketingScreenshotFrame
              title="Support and escalation threads"
              description="Use a support thread or queue screenshot to demonstrate customer, workspace, and platform support ownership."
              variant="support"
              aspectClassName="aspect-[16/10]"
              className="xl:col-span-6"
              {...supportImage}
            />
          </div>
        </div>
      </section>

      <section id="stack" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Full stack"
            title="The stack is already geared toward a real SaaS deployment."
            description=""
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {stackCards.map((card) => (
              <Card
                key={card.title}
                className="rounded-[1.5rem] border-border/70 bg-background/92 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
              >
                <CardHeader className="space-y-2">
                  <CardTitle className="text-xl font-semibold tracking-tight">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-muted-foreground">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm leading-6 text-foreground/90">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Built for real SaaS teams"
                title="Ship the parts most starters leave for later."
                description=""
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-[1.5rem] border-border/70 bg-background/92">
                  <CardContent className="space-y-3 py-6">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
                      <CreditCard className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        Billing that matches the catalog
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Public pricing, internal billing panels, refunds, and
                        one-time add-ons all read from the same product model.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[1.5rem] border-border/70 bg-background/92">
                  <CardContent className="space-y-3 py-6">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
                      <Network className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        Routing that respects entitlements
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Trial paths, subdomains, custom domains, and routing
                        sync all sit behind the real entitlement system.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[1.5rem] border-border/70 bg-background/92">
                  <CardContent className="space-y-3 py-6">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
                      <BellRing className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        Messaging and support flow through the app
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Notifications, ticket replies, internal notes,
                        escalations, and queues are already part of the product
                        behavior.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[1.5rem] border-border/70 bg-background/92">
                  <CardContent className="space-y-3 py-6">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/8 text-primary ring-1 ring-primary/15">
                      <Layers3 className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">
                        Admin surfaces feel related, not random
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Tables, cards, routes, toasts, and content sheets now
                        behave like one system across platform, workspace, and
                        customer areas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <MarketingScreenshotFrame
              title="Workspace administration"
              description="A workspace settings, access, domains, or media screenshot works well here to show tenant-side depth."
              variant="workspace"
              aspectClassName="aspect-[16/10]"
              {...workspaceAdminImage}
            />
          </div>
        </div>
      </section>

      <section id="architecture" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Architecture"
                title="The codebase is structured so the product can keep growing without turning brittle."
                description=""
              />

              <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
                <div className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Module pattern
                </div>
                <div className="rounded-3xl border border-border/70 bg-muted/25 p-5 font-mono text-sm leading-7 text-foreground/90">
                  <div>{`src/modules/<domain>/services/*`}</div>
                  <div>{`src/modules/<domain>/server/*`}</div>
                  <div>{`src/modules/<domain>/workflows/*`}</div>
                  <div>{`src/modules/<domain>/actions/*`}</div>
                  <div>{`src/modules/<surface>/components/*`}</div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Routes compose screens, but owner modules keep the data rules,
                  workflows, and mutations in the correct domain. The value
                  comes from ownership model, the server-driven data flow, and
                  the module boundaries that make the starter scalable.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {architectureCards.map((card) => (
                <Card
                  key={card.title}
                  className="rounded-[1.5rem] border-border/70 bg-background/92 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
                >
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-xl font-semibold tracking-tight">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-muted-foreground">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-28 pt-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-6 py-10 shadow-[0_22px_64px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.94),rgba(15,23,42,0.94))] md:px-10 md:py-12">
            <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="space-y-4">
                <Badge variant="outline" className="rounded-full">
                  Build faster
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                  Start from a SaaS foundation that already thinks like a
                  product.
                </h2>
                {/* <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
                  Use the starter as your platform admin, workspace admin,
                  public pricing example, white-label routing base, and support
                  operating system instead of rebuilding those layers after
                  auth.
                </p> */}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <Button size="lg" asChild className="min-w-[220px]">
                  <Link href="/signup?intent=free">
                    <span>Start Free Trial</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="min-w-[220px]"
                >
                  <Link href="/pricing">See Pricing Example</Link>
                </Button>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="text-sm font-medium">Platform</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Catalog, governance, workspaces, identities, billing,
                  operations.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="text-sm font-medium">Workspace</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Team, customers, domains, themes, access, media, support, API
                  keys.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="text-sm font-medium">Customer</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Support-facing customer surface with separate identity and
                  ownership flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
