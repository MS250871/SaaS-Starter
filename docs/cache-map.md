# Redis Cache Map

This document is the source of truth for Redis-backed application caches in this repo.

It exists to enforce four rules:

1. Read-through caching may live in services or cache helpers.
2. Write invalidation must live in the orchestration boundary:
   - action
   - workflow
   - webhook handler
   - job handler
3. No raw Redis keys should be introduced outside the formal key builders in
   [src/lib/cache/cache-keys.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\cache\cache-keys.ts).
4. Cache writes or invalidations must happen only after the DB unit of work has succeeded.

## Core Rules

### Read Path

- Services may use `rememberRedisCache(...)`, `getRedisCache(...)`, or dedicated cache helpers.
- Read caching should be colocated with the shared read boundary so all callers benefit consistently.

### Write Path

- Mutation services should not invalidate Redis caches directly.
- Actions, workflows, webhook handlers, and job handlers own invalidation.
- If a flow uses `withUnitOfWork(...)`, invalidation must happen after that unit of work resolves.
- If a flow uses `createTxAction(...)`, invalidation must happen in the exported action function after a successful response, not inside the `createTxAction(...)` handler body.

### Exception: Routing Sync

Routing is the one cache family that uses a semantic sync step instead of a simple delete.

- The orchestration boundary calls `syncWorkspaceRoutingState(...)`.
- That helper is allowed to write routing Redis entries.
- But it must only be invoked after the write transaction has completed.

This keeps the ownership model intact:
- orchestration owns the timing
- the routing sync helper owns the cache payload mechanics

## Formal Cache Keys

Defined in [src/lib/cache/cache-keys.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\cache\cache-keys.ts).

### Version Keys

- `cache:version:catalog`
- `cache:version:permissions`
- `cache:version:workspace-entitlements:{workspaceId}`

### Data Keys

- `cache:routing:slug:{slug}`
- `cache:routing:domain:{domain}`
- `cache:workspace:settings:{workspaceId}`
- `cache:workspace:admin-surface-workspace:{workspaceId}`
- `cache:workspace:active-subscription-summary:{workspaceId}`
- `cache:catalog:public-pricing-plans:v{catalogVersion}`
- `cache:catalog:pricing-page-data:v{catalogVersion}`
- `cache:catalog:feature-catalog:v{catalogVersion}`
- `cache:catalog:limit-catalog:v{catalogVersion}`
- `cache:catalog:one-time-offers:v{catalogVersion}`
- `cache:catalog:plan-features:v{catalogVersion}:{planId}`
- `cache:catalog:plan-limits:v{catalogVersion}:{planId}`
- `cache:catalog:workspace-feature-overrides:v{catalogVersion}:{workspaceId}`
- `cache:catalog:workspace-limit-overrides:v{catalogVersion}:{workspaceId}`
- `cache:entitlements:resolved:catalog-v{catalogVersion}:workspace-v{workspaceVersion}:{workspaceId}:{planId|no-plan}`
- `cache:permissions:role-permissions:v{permissionsVersion}:{roleDefinitionId}`
- `cache:permissions:workspace-role-permissions:v{permissionsVersion}:{workspaceId}:{roleDefinitionId}`
- `cache:permissions:identity-permissions:v{permissionsVersion}:{identityId}`
- `cache:permissions:workspace-identity-permissions:v{permissionsVersion}:{workspaceId}:{identityId}`

## Cache Families

### 1. Routing

Keys:
- `routingSlug`
- `routingDomain`

Authoritative source:
- persisted workspace routing snapshot in `WorkspaceSettings.settings.domain`
- Redis is the mirror for middleware speed, not a second routing decision engine

Routing snapshot fields:
- `strategy`
- `intent`
- `slug`
- `rootDomain`
- `primaryHost`
- `customDomain`

Read boundary:
- middleware workspace resolution

Read helpers:
- [src/lib/middleware/resolve-workspace.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\resolve-workspace.ts)
- [src/modules/workspace/services/routing-cache.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\routing-cache.services.ts)
- [src/modules/workspace/services/workspace-routing.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\workspace-routing.services.ts)
- [src/modules/workspace/services/workspace-canonical.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\workspace-canonical.services.ts)

Write owner:
- orchestration boundary calls [syncWorkspaceRoutingState(...) in src/modules/workspace/services/workspace-routing.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\workspace-routing.services.ts)

Current invalidation/sync owners:
- workspace create workflow
- workspace custom-domain create workflow
- workspace custom-domain verification refresh workflow
- platform workspace domain workflows
- billing workflows when plan/domain-sensitive state changes
- workspace entitlement override workflows when routing-sensitive overrides change

Rule:
- never write or clear routing keys directly from domain mutation services
- always trigger routing sync after commit
- routing sync must compute from fresh DB state, not from Redis-backed read caches
- render-time canonical readers must consume the persisted routing snapshot, not re-derive routing from live billing/domain tables on every request

### 2. Workspace Surface

Keys:
- `workspaceSettings`
- `workspaceAdminSurfaceWorkspace`

Read helpers:
- [src/modules/workspace/services/workspace-cache.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\workspace-cache.services.ts)

Primary readers:
- workspace admin surface context
- workspace layouts
- domain/surface-dependent workspace UI

Write invalidation owners:
- workspace theme workflow
- workspace domain workflows
- workspace create workflow
- workspace billing workflows through `invalidateWorkspaceBillingCaches(...)`
- platform workspace activate/deactivate action

### 3. Workspace Billing Summary

Key:
- `workspaceActiveSubscriptionSummary`

Read helper:
- subscription services

Write invalidation owners:
- workspace plan change workflow
- payment verification workflow
- pending paid billing attach workflow
- Razorpay webhook processing workflow
- workspace create workflow
- platform subscription cancellation action

Note:
- this cache is intentionally bundled with surface invalidation through
  [src/modules/billing/services/billing-cache.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\billing\services\billing-cache.services.ts)

### 4. Catalog Versioned Family

Keys:
- `publicPricingPlans`
- `pricingPageData`
- `featureCatalog`
- `limitCatalog`
- `publicOneTimeOffers`
- `planFeatures`
- `planLimits`

Read helpers:
- pricing services
- billing catalog services
- entitlement services

Write invalidation mechanism:
- bump `cache:version:catalog`

Write invalidation owners:
- feature catalog admin actions
- limit catalog admin actions
- plan catalog admin actions
- product catalog admin actions
- price catalog admin actions
- provider plan-id update path in billing checkout workflow

Important rule:
- for `createTxAction(...)` catalog admin actions, version bumps must happen in the exported action function after a successful response, not inside the transactional handler callback

### 5. Workspace Override Family

Keys:
- `workspaceFeatureOverrides`
- `workspaceLimitOverrides`

Read helpers:
- entitlement services

Write invalidation owners:
- workspace feature override workflows
- workspace limit override workflows
- bulk workspace override sync workflows

Mechanics:
- clear override keys for the workspace at the orchestration boundary

### 6. Resolved Entitlements

Key:
- `resolvedEntitlements`

Read helpers:
- [src/modules/entitlements/services/entitlement-cache.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\entitlements\services\entitlement-cache.services.ts)
- entitlement resolution services

Write invalidation mechanism:
- bump `cache:version:workspace-entitlements:{workspaceId}`

Write invalidation owners:
- workspace create workflow
- workspace override workflows
- billing workflows that change plan/subscription state
- Razorpay webhook subscription state processing

### 7. Permissions Versioned Family

Keys:
- `rolePermissions`
- `workspaceRolePermissions`
- `identityPermissions`
- `workspaceIdentityPermissions`

Read helpers:
- permission services

Write invalidation mechanism:
- bump `cache:version:permissions`

Write invalidation owners:
- platform permission admin actions
- platform role workflows
- workspace role permission override workflows
- workspace user permission override workflows

Important rule:
- platform permission admin actions must invalidate after successful transactional action completion, not inside the `createTxAction(...)` handler body

## Known Non-Goals

These are not part of the formal Redis cache map:

- browser response headers
- request-local `react cache(...)`
- Next.js `revalidatePath(...)` / `revalidateTag(...)`
- old middleware API-key shortcut keys

The incomplete middleware API-key Redis lookup was intentionally removed. API key resolution is an auth concern, not a middleware routing cache concern.

## Checklist For Any New Redis Cache Family

Before adding a new cache family, define all of the following:

1. The formal key builder in [src/lib/cache/cache-keys.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\cache\cache-keys.ts)
2. The read helper or read-through service boundary
3. The TTL
4. The owner of write invalidation
5. The create flows that must update or invalidate it
6. The update flows that must update or invalidate it
7. The delete flows that must update or invalidate it
8. Whether the family should use:
   - direct key deletion
   - version bumping
   - semantic post-commit sync

If any of those are missing, the cache family is incomplete and should not be added.

## Regression Checklist

When reviewing a mutation PR, check:

1. Does this mutation affect any existing cache family?
2. If yes, is invalidation happening in the same orchestration layer as the mutation?
3. Is invalidation running only after successful commit?
4. Is there any new raw Redis key introduced outside `cache-keys.ts`?
5. If routing changes, is `syncWorkspaceRoutingState(...)` called post-commit?

If any answer is “no”, the PR is not cache-safe yet.
