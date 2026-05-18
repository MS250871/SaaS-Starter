import type { AdminNavGroup } from "@/components/admin/admin-shell"

export type PlatformRouteMeta = {
  title: string
  description: string
}

export const platformNavGroups: AdminNavGroup[] = [
  {
    label: "Core",
    items: [
      {
        title: "Overview",
        href: "/platform",
        icon: "dashboard",
        exact: true,
      },
      {
        title: "Workspaces",
        href: "/platform/workspaces",
        icon: "briefcase",
        children: [
          {
            title: "Domains & Routing",
            href: "/platform/workspaces/domains",
          },
          {
            title: "Members & Invites",
            href: "/platform/workspaces/access",
          },
          {
            title: "Entitlement Overrides",
            href: "/platform/workspaces/overrides",
          },
        ],
      },
      {
        title: "Identities",
        href: "/platform/identities",
        icon: "users",
        children: [
          {
            title: "Customers",
            href: "/platform/identities/customers",
          },
          {
            title: "Accounts & Auth",
            href: "/platform/identities/accounts",
          },
          {
            title: "Sessions & OTP",
            href: "/platform/identities/sessions",
          },
        ],
      },
    ],
  },
  {
    label: "Control",
    items: [
      {
        title: "Governance",
        href: "/platform/governance",
        icon: "shield",
        children: [
          {
            title: "Platform Team",
            href: "/platform/governance/team",
          },
          {
            title: "Roles & Permissions",
            href: "/platform/governance/roles",
          },
          {
            title: "Audit Log",
            href: "/platform/governance/audit",
          },
        ],
      },
      {
        title: "Catalog",
        href: "/platform/catalog",
        icon: "settings",
        children: [
          {
            title: "Plans",
            href: "/platform/catalog/plans",
          },
          {
            title: "Products",
            href: "/platform/catalog/products",
          },
          {
            title: "Prices",
            href: "/platform/catalog/prices",
          },
          {
            title: "Features",
            href: "/platform/catalog/features",
          },
          {
            title: "Limits",
            href: "/platform/catalog/limits",
          },
        ],
      },
      {
        title: "Billing",
        href: "/platform/billing",
        icon: "billing",
        children: [
          {
            title: "Subscriptions",
            href: "/platform/billing/subscriptions",
          },
          {
            title: "Payments & Invoices",
            href: "/platform/billing/payments",
          },
          {
            title: "Refunds",
            href: "/platform/billing/refunds",
          },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Operations",
        href: "/platform/operations",
        icon: "lifebuoy",
        children: [
          {
            title: "Support",
            href: "/platform/operations/support",
          },
          {
            title: "Notifications",
            href: "/platform/operations/notifications",
          },
          {
            title: "Webhooks & Outbox",
            href: "/platform/operations/integrations",
          },
          {
            title: "Media & Files",
            href: "/platform/operations/media",
          },
        ],
      },
    ],
  },
]

export const platformRouteMeta: Record<string, PlatformRouteMeta> = {
  "/platform/workspaces": {
    title: "Workspaces",
    description:
      "Platform-facing workspace registry for reviewing tenant health, routing, configuration, and lifecycle state.",
  },
  "/platform/workspaces/domains": {
    title: "Domains & Routing",
    description:
      "Review free-path, subdomain, and custom-domain routing state, verification records, and canonical host decisions.",
  },
  "/platform/workspaces/access": {
    title: "Members & Invites",
    description:
      "Inspect workspace memberships, invite flows, and access posture across every managed workspace.",
  },
  "/platform/workspaces/overrides": {
    title: "Entitlement Overrides",
    description:
      "Manage workspace-level feature and limit overrides without mixing them into the base plan catalog.",
  },
  "/platform/identities": {
    title: "Identities",
    description:
      "Global identity directory spanning staff, admins, and learner-linked accounts before workspace-specific context is applied.",
  },
  "/platform/identities/customers": {
    title: "Customers",
    description:
      "Workspace-scoped customer records for learner and end-user relationships that sit alongside, but separate from, identity and membership data.",
  },
  "/platform/identities/accounts": {
    title: "Accounts & Auth",
    description:
      "Audit email, phone, password, OAuth, and account-verification state across the authentication layer.",
  },
  "/platform/identities/sessions": {
    title: "Sessions & OTP",
    description:
      "Trace active session surfaces, login context, OTP issuance, and verification activity across platform and workspace entry points.",
  },
  "/platform/governance": {
    title: "Governance",
    description:
      "Control-plane area for platform team membership, access rules, manual overrides, and cross-cutting governance decisions.",
  },
  "/platform/governance/team": {
    title: "Platform Team",
    description:
      "Manage platform operators, platform invites, and the effective control-plane team that can access the admin surface.",
  },
  "/platform/governance/roles": {
    title: "Roles & Permissions",
    description:
      "Define platform and workspace roles, permission grants, and escalation rules from the central authorization model.",
  },
  "/platform/governance/audit": {
    title: "Audit Log",
    description:
      "Review administrative actions, entity changes, and severity-tagged governance events for operational traceability.",
  },
  "/platform/catalog": {
    title: "Catalog",
    description:
      "Platform product definition area for plans, products, prices, and entitlement building blocks.",
  },
  "/platform/catalog/plans": {
    title: "Plans",
    description:
      "Manage public and private plans, ordering, activation, and the plan-level contract exposed to customers and workspaces.",
  },
  "/platform/catalog/products": {
    title: "Products",
    description:
      "Create, edit, activate, and retire the commercial products that sit between plans and billing prices.",
  },
  "/platform/catalog/prices": {
    title: "Prices",
    description:
      "Manage recurring and one-time price records, amount points, intervals, and provider-linked references.",
  },
  "/platform/catalog/features": {
    title: "Features",
    description:
      "Control the reusable feature flags that plans and workspace overrides can attach across the catalog.",
  },
  "/platform/catalog/limits": {
    title: "Limits",
    description:
      "Define reusable quantitative limits that shape seats, credits, projects, storage, and other quotas.",
  },
  "/platform/billing": {
    title: "Billing",
    description:
      "Money movement and billing-state control for subscriptions, charges, invoices, and refunds across the platform.",
  },
  "/platform/billing/subscriptions": {
    title: "Subscriptions",
    description:
      "Track subscription status, anchor windows, provider references, and workspace or customer billing ownership.",
  },
  "/platform/billing/payments": {
    title: "Payments & Invoices",
    description:
      "Review payment lifecycle, attempts, invoice generation, and provider reconciliation for recurring and one-time charges.",
  },
  "/platform/billing/refunds": {
    title: "Refunds",
    description:
      "Inspect refund initiation, final provider status, and upgrade-adjustment refunds tied to billing transitions.",
  },
  "/platform/operations": {
    title: "Operations",
    description:
      "Shared operational tooling for support, notification delivery, webhook processing, background jobs, and media pipelines.",
  },
  "/platform/operations/support": {
    title: "Support",
    description:
      "Review support tickets, message threads, assignment state, and internal notes across workspaces and customer contexts.",
  },
  "/platform/operations/notifications": {
    title: "Notifications",
    description:
      "Monitor notification creation, recipient state, and channel-level delivery outcomes across the messaging layer.",
  },
  "/platform/operations/integrations": {
    title: "Webhooks & Outbox",
    description:
      "Observe inbound webhook health, retry state, and outbound background-event processing from the integration backbone.",
  },
  "/platform/operations/media": {
    title: "Media & Files",
    description:
      "Inspect uploaded media, attachment usage, storage metadata, and queued media jobs across the platform.",
  },
}

export function getPlatformRouteMeta(pathname: string) {
  return platformRouteMeta[pathname] ?? null
}
