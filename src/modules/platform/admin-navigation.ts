import type {
  AdminBreadcrumbOverride,
  AdminNavGroup,
} from "@/components/admin/admin-shell"
import { hasAnyPermission } from '@/modules/permissions/permissions.services'

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
        requiredPermissions: ["platformWorkspace.read"],
        children: [
          {
            title: "Domains & Routing",
            href: "/platform/workspaces/domains",
            requiredPermissions: ["platformWorkspace.read"],
          },
          {
            title: "Members & Invites",
            href: "/platform/workspaces/access",
            requiredPermissions: ["platformWorkspace.read"],
          },
          {
            title: "Entitlement Overrides",
            href: "/platform/workspaces/overrides",
            requiredPermissions: ["featureOverride.read", "limitOverride.read"],
          },
        ],
      },
      {
        title: "Identities",
        href: "/platform/identities",
        icon: "users",
        requiredPermissions: ["identity.read", "customer.read"],
        children: [
          {
            title: "Customers",
            href: "/platform/identities/customers",
            requiredPermissions: ["customer.read"],
          },
          {
            title: "Accounts & Auth",
            href: "/platform/identities/accounts",
            requiredPermissions: ["identity.read"],
          },
          {
            title: "Sessions & OTP",
            href: "/platform/identities/sessions",
            requiredPermissions: ["identity.read"],
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
        requiredPermissions: [
          "platformMembership.read",
          "platformInvite.read",
          "platformPermission.read",
          "platformAudit.read",
          "*",
        ],
        children: [
          {
            title: "Platform Team",
            href: "/platform/governance/team",
            requiredPermissions: ["platformMembership.read", "platformInvite.read", "*"],
          },
          {
            title: "Roles & Permissions",
            href: "/platform/governance/roles",
            requiredPermissions: ["platformPermission.read", "*"],
          },
          {
            title: "Audit Log",
            href: "/platform/governance/audit",
            requiredPermissions: ["platformAudit.read", "*"],
          },
        ],
      },
      {
        title: "Catalog",
        href: "/platform/catalog",
        icon: "settings",
        requiredPermissions: ["*"],
        children: [
          {
            title: "Plans",
            href: "/platform/catalog/plans",
            requiredPermissions: ["*"],
          },
          {
            title: "Products",
            href: "/platform/catalog/products",
            requiredPermissions: ["*"],
          },
          {
            title: "Prices",
            href: "/platform/catalog/prices",
            requiredPermissions: ["*"],
          },
          {
            title: "Features",
            href: "/platform/catalog/features",
            requiredPermissions: ["*"],
          },
          {
            title: "Limits",
            href: "/platform/catalog/limits",
            requiredPermissions: ["*"],
          },
        ],
      },
      {
        title: "Billing",
        href: "/platform/billing",
        icon: "billing",
        requiredPermissions: ["platformBilling.read"],
        children: [
          {
            title: "Subscriptions",
            href: "/platform/billing/subscriptions",
            requiredPermissions: ["platformBilling.read"],
          },
          {
            title: "Payments & Invoices",
            href: "/platform/billing/payments",
            requiredPermissions: ["platformBilling.read"],
          },
          {
            title: "One-Time Purchases",
            href: "/platform/billing/purchases",
            requiredPermissions: ["platformBilling.read"],
          },
          {
            title: "Refunds",
            href: "/platform/billing/refunds",
            requiredPermissions: ["platformBilling.read"],
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
        requiredPermissions: ["platformSupport.read", "notification.read", "media.read", "*"],
        children: [
          {
            title: "Support",
            href: "/platform/operations/support",
            requiredPermissions: ["platformSupport.read", "*"],
          },
          {
            title: "Notifications",
            href: "/platform/operations/notifications",
            requiredPermissions: ["notification.read", "*"],
          },
          {
            title: "Webhooks & Outbox",
            href: "/platform/operations/integrations",
            requiredPermissions: ["*"],
          },
          {
            title: "Media & Files",
            href: "/platform/operations/media",
            requiredPermissions: ["media.read", "*"],
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
  "/platform/billing/purchases": {
    title: "One-Time Purchases",
    description:
      "Track direct commercial purchases separately from recurring subscriptions, including owner, status, invoices, and refund posture.",
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

export const platformBreadcrumbOverrides: AdminBreadcrumbOverride[] = [
  {
    pattern: "/platform/workspaces/[workspaceId]/routing",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Domains & Routing", href: "/platform/workspaces/domains" },
      { label: "Workspace Routing" },
    ],
  },
  {
    pattern: "/platform/workspaces/domains/[domainId]",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Domains & Routing", href: "/platform/workspaces/domains" },
      { label: "Domain Details" },
    ],
  },
  {
    pattern: "/platform/workspaces/overrides/features/create",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Entitlement Overrides", href: "/platform/workspaces/overrides" },
      { label: "Feature Overrides" },
    ],
  },
  {
    pattern: "/platform/workspaces/overrides/features/[overrideId]/edit",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Entitlement Overrides", href: "/platform/workspaces/overrides" },
      { label: "Feature Overrides" },
    ],
  },
  {
    pattern: "/platform/workspaces/overrides/limits/create",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Entitlement Overrides", href: "/platform/workspaces/overrides" },
      { label: "Limit Overrides" },
    ],
  },
  {
    pattern: "/platform/workspaces/overrides/limits/[overrideId]/edit",
    breadcrumbs: [
      { label: "Workspaces", href: "/platform/workspaces" },
      { label: "Entitlement Overrides", href: "/platform/workspaces/overrides" },
      { label: "Limit Overrides" },
    ],
  },
]

export function getPlatformRouteMeta(pathname: string) {
  return platformRouteMeta[pathname] ?? null
}

export function filterPlatformNavGroupsByPermissions(
  navGroups: AdminNavGroup[],
  permissions: string[],
) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) =>
              !child.requiredPermissions ||
              hasAnyPermission(permissions, child.requiredPermissions),
          ),
        }))
        .filter((item) => {
          const itemAllowed =
            !item.requiredPermissions ||
            hasAnyPermission(permissions, item.requiredPermissions)
          const hasVisibleChildren = (item.children?.length ?? 0) > 0

          return itemAllowed || hasVisibleChildren
        }),
    }))
    .filter((group) => group.items.length > 0)
}
