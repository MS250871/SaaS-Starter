# Server-Side Access Resolution Plan

## Goal

Move the app from:

- cookie-stored expanded `permissions`
- cookie-stored expanded `features`
- cookie-stored expanded `limits`

to:

- compact session claims in the signed cookie
- server-side resolution of effective access per request
- effective access injected into actor/request context for the current request only

This plan follows the `Option B` direction we discussed:

- keep the cookie compact
- resolve access on the server
- avoid client-side permission fetching
- avoid UI flicker

## Why This Refactor Is Needed

The current session model does not scale.

The platform login investigation already showed one concrete failure mode:

- `PLATFORM_ADMIN` expanded to a very large `permissions` array
- the encrypted cookie crossed browser size limits
- the browser stopped persisting the final session cookie reliably

This problem will grow as the app adds:

- more modules
- more tables
- more permissions
- more feature flags
- more limit definitions
- more override logic

So the issue is not only `PLATFORM_ADMIN`. The entire expanded-cookie model is the wrong long-term shape.

## Files Reviewed In This Scan

This plan is based on a full scan of the current final-session and request-entry path:

- [src/lib/auth/auth.schema.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\auth\auth.schema.ts)
- [src/modules/auth/workflows/post-login.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\auth\workflows\post-login.workflow.ts)
- [src/lib/context/actor-context.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\context\actor-context.ts)
- [src/lib/context/request-context.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\context\request-context.ts)
- [src/lib/request/withActionContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withActionContext.ts)
- [src/lib/request/withRequestContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withRequestContext.ts)
- [src/lib/request/read-actor-context.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\read-actor-context.ts)
- [src/lib/middleware/actor-headers.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\actor-headers.ts)
- [src/lib/middleware/request-headers.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\request-headers.ts)
- [src/lib/middleware/resolve-workspace.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\resolve-workspace.ts)
- [src/proxy.ts](C:\Users\munir\Documents\skillmaxx-org\src\proxy.ts)
- [src/modules/permissions/permissions.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\permissions\permissions.services.ts)
- [prisma/data/roleDefinitions.ts](C:\Users\munir\Documents\skillmaxx-org\prisma\data\roleDefinitions.ts)

## Current State Audit

## 1. Session cookie shape

Current final session payload in [auth.schema.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\auth\auth.schema.ts) contains both:

- compact identity/workspace/customer/role claims
- expanded effective access state

Current effective access fields in the cookie:

- `permissions: string[]`
- `features: string[]`
- `limits: Record<string, number>`

That means the signed cookie currently acts as both:

- a session-claim token
- a fully expanded access snapshot

## 2. Final session construction

Current final-session construction happens in [buildFinalSessionWorkflow](C:\Users\munir\Documents\skillmaxx-org\src\modules\auth\workflows\post-login.workflow.ts).

It currently:

1. identifies the actor context
2. resolves platform roles and workspace role context
3. calls `resolvePermissions(...)`
4. calls `resolveEntitlements(...)` when there is a workspace
5. writes the expanded result into the final session payload

So the cookie is inflated at session-creation time.

## 3. Request entrypoints

Current request/action entrypoints do **not** resolve permissions themselves.

They read them from headers:

- [withActionContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withActionContext.ts)
- [withRequestContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withRequestContext.ts)
- [read-actor-context.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\read-actor-context.ts)

Those headers are currently injected from the session by:

- [actor-headers.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\actor-headers.ts)

So today the data flow is:

1. final session stores expanded access
2. middleware copies expanded access from cookie to headers
3. server request/action context reads expanded access from headers
4. pages/actions do authorization from that expanded access

## 4. Middleware boundary constraint

[proxy.ts](C:\Users\munir\Documents\skillmaxx-org\src\proxy.ts) and [resolve-workspace.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\resolve-workspace.ts) currently operate on:

- cookies
- request headers
- Redis workspace/domain lookup

They do **not** currently use Prisma-based permission or entitlement resolution.

That is a useful boundary:

- the proxy layer should stay cheap and routing-focused
- full permission/entitlement expansion should happen in server request/action context, not in the proxy itself

## 5. Permission API weakness

Current permission checks are mixed:

- some code uses central helpers like `hasPermission` / `assertPermission`
- many pages/components/actions still use direct `permissions.includes(...)`

This matters because any future compact claim model or wildcard support becomes safer only if checks go through central helpers.

## 6. Platform-admin special case

Current role seed in [roleDefinitions.ts](C:\Users\munir\Documents\skillmaxx-org\prisma\data\roleDefinitions.ts) defines:

- `PLATFORM_ADMIN: ["*"]`

But `resolvePermissions(...)` expands that to all concrete permission keys.

That expansion is what pushed the platform cookie over the limit.

We already applied a temporary mitigation:

- `PLATFORM_ADMIN` final session now stores `permissions: ["*"]`

That was only to unblock platform login.
It is **not** the full architecture we want.

## Target Architecture

## Session cookie responsibilities

The session cookie should only store compact claims:

- `sessionId`
- `identityId`
- `customerId`
- `workspaceId`
- `membershipId`
- `workspaceRoleId`
- `workspaceRoleKey`
- `workspaceRoleSystemKey`
- `platformRoleIds`
- `platformRoleKeys`
- `platformRoleSystemKeys`
- device and audit metadata
- `isActive`
- `createdAt`
- `expiresAt`
- optional schema `version`

It should **not** store expanded:

- `permissions`
- `features`
- `limits`

## Access resolution responsibilities

Effective access should be resolved server-side per request:

- permissions
- features
- limits

These resolved values should be inserted into:

- `ActorContext`
- optionally a small access snapshot on `RequestContext` if needed later

There is no need for a third "server context".

Recommended context split:

- `RequestContext`
  - request metadata
  - workspace routing metadata
  - infrastructure concerns
- `ActorContext`
  - actor identity and role claims
  - effective permissions
  - effective features
  - effective limits

## No-flicker rule

Do **not** move permission fetching to the browser.

All access resolution must happen before render on the server, so pages render once with the final access model.

## Step-by-Step Plan

## Step 1. Define a compact session schema

Update [sessionPayloadSchema](C:\Users\munir\Documents\skillmaxx-org\src\lib\auth\auth.schema.ts) so the intended long-term session payload contains only compact claims.

During migration, keep temporary compatibility support for legacy session payloads that still include:

- `permissions`
- `features`
- `limits`

This lets old cookies keep working while new sessions start shrinking.

## Step 2. Introduce a server-side access hydration helper

Create one access-hydration helper, likely under:

- `src/lib/access/`
- or `src/modules/auth/services/`

It should take compact claims:

- `identityId`
- `workspaceId`
- `membershipId`
- `customerId`
- role ids/keys/system keys

and return:

- `permissions`
- `features`
- `limits`

It should internally call:

- `resolvePermissions(...)`
- `resolveEntitlements(...)`

and centralize special cases like:

- platform admin
- customer session
- identity-only platform session

## Step 3. Add a normalized "resolved actor access" type

Extend the actor model so `ActorContext` can carry:

- `permissions: string[]`
- `features?: string[]`
- `limits?: Record<string, number>`

This lets pages/actions consume resolved access from one place without caring whether it came from:

- legacy cookie snapshot
- or server hydration

## Step 4. Move access resolution into request entrypoints

Update server entrypoints so they resolve effective access from compact claims.

Main targets:

- [withActionContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withActionContext.ts)
- [withRequestContext.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\withRequestContext.ts)
- any equivalent server-page or route entry wrappers

These layers should:

1. read compact claims from headers
2. hydrate effective access server-side
3. build `ActorContext` with resolved access

That keeps authz server-side and avoids cookie bloat.

## Step 5. Stop sending expanded access from middleware

Update [actor-headers.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\middleware\actor-headers.ts) so middleware injects only compact claims:

- identity
- workspace
- customer
- membership
- role ids/keys/system keys

Do not inject expanded:

- `x-permissions`
- future `x-features`
- future `x-limits`

The proxy layer should stay focused on:

- routing
- session presence
- route guards

not full access computation.

## Step 6. Make `readActorContext()` read resolved request-state, not cookie-state

[read-actor-context.ts](C:\Users\munir\Documents\skillmaxx-org\src\lib\request\read-actor-context.ts) should eventually stop assuming permissions come from middleware headers.

It should either:

- use the same hydration helper directly for server-rendered pages
- or read from a new request-local resolved-access header if we choose to stamp one server-side after hydration

Recommendation:

- prefer direct server-side hydration in request setup over inventing more cross-process headers

## Step 7. Update final session creation

After request-side hydration is in place, shrink [buildFinalSessionWorkflow](C:\Users\munir\Documents\skillmaxx-org\src\modules\auth\workflows\post-login.workflow.ts) so new sessions stop embedding expanded:

- `permissions`
- `features`
- `limits`

At that point the temporary platform-admin cookie workaround can be removed because the entire session model will already be compact.

## Step 8. Add compatibility fallback during migration

During rollout:

- if request setup sees legacy expanded access in the session, keep honoring it
- if it sees compact claims only, hydrate server-side

This avoids breaking existing sessions while the codebase transitions.

Compatibility should be explicitly temporary.

## Step 9. Standardize permission checks behind helpers

Move toward a single authz API:

- `hasPermission(...)`
- `assertPermission(...)`

Then gradually replace direct:

- `permissions.includes(...)`

across pages, actions, and components.

Why this matters:

- wildcard claims become easier to support safely
- future permission-model changes become cheaper
- authz logic becomes more testable

This step can happen in parallel with the access-hydration work, but it does not need to block the cookie shrink.

## Step 10. Extend the same pattern to features and limits

Do not stop at permissions.

Move `features` and `limits` to the same server-side resolution model.

This is important because:

- feature catalogs will grow
- plan/override logic will get richer
- LMS/Clinic modules will add more entitlement surface area

The compact session + server hydration pattern should apply to all three:

- permissions
- features
- limits

## Step 11. Verify all actor flows

Regression-test all actor shapes after the first full pass:

- platform identity-only actor
- workspace owner/admin/staff/viewer actor
- workspace customer actor
- invite flows
- post-upgrade/downgrade host transfer flows

Key checks:

- login works
- no cookie overflow
- no permission flicker
- route guards still behave correctly
- workspace/customer separation remains correct

## Step 12. Remove legacy payload assumptions

Once new compact sessions are stable and the compatibility bridge is no longer needed:

- remove legacy payload fallback reads
- remove alias fields that only existed for transition
- tighten the session schema

That gives the codebase a clean end state instead of a permanent hybrid.

## Recommended First Implementation Slice

The safest first slice is:

1. add the access hydration helper
2. teach request/action context wrappers to hydrate access server-side
3. keep legacy cookie payload support temporarily
4. then shrink newly issued final sessions

This order is safer than shrinking the cookie first and hoping every consumer is already ready.

## Explicit Non-Goals For The First Pass

Do **not** do these in the first cut:

- client-side permission fetches
- a third "server context"
- static manifest / bitset refactor
- broad UI cleanup of all permission checks before hydration is working
- proxy-layer Prisma permission resolution

Those would either add unnecessary complexity or increase rollout risk.

## Decision Summary

The current direction should be:

- compact session cookie
- server-side access resolution
- resolved access injected into current-request actor context
- no client flicker
- no new third context layer
- compatibility bridge during migration

That is the most natural fit for the app's current:

- DB-driven permission model
- role-based access model
- workspace/customer/platform actor separation
- future multi-module growth
