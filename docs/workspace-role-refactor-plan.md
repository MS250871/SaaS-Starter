# Role System Refactor Plan

## Goal

Replace both the hardcoded `WorkspaceRole` and `PlatformRole` enums with a
single database-defined role system, using a coordinated development-time reset
instead of a live production migration.

This refactor is needed because:

- workspace roles must vary by vertical
- platform roles are currently using much of the same plumbing
- doing workspace first and platform later would repeat the deepest parts of
  the auth, permission, and RLS refactor

## Development Reset Assumption

This plan assumes all of the following are acceptable:

- resetting the development database
- reseeding test data
- invalidating all current sessions and cookies
- recreating test invites and memberships as needed

Because of that, we do **not** need to optimize for:

- backfilling old test records
- preserving existing invite rows
- carrying dual-read or dual-write compatibility for weeks
- keeping enum-backed role columns around just for rollout safety

That reduces migration complexity a lot, but it does **not** remove the need
for coordinated changes across:

- schema
- auth/session payloads
- request and actor context
- permission resolution
- SQL constraints
- RLS helpers
- UI/forms

## Recommendation

Build **one generic role infrastructure now** for both scopes:

- `WORKSPACE`
- `PLATFORM`

But keep the operational model different by scope:

- workspace roles become flexible and starter-friendly
- platform roles remain seeded and system-managed at first

This is the best balance because:

- the deep plumbing is shared
- the starter needs flexible workspace roles from day 1
- platform role customization can stay restricted even on dynamic
  infrastructure

## Current State Audit

The app currently has two hardcoded role systems that share a lot of
infrastructure.

## 1. Database schema

Current enums and enum-backed columns:

- `prisma/schema.prisma`
  - `enum WorkspaceRole`
  - `Membership.role`
  - `WorkspaceInvite.role`
  - `Session.workspaceRole`
  - `RolePermission.workspaceRole`
  - `WorkspaceRolePermission.workspaceRole`
  - `enum PlatformRole`
  - `PlatformMembership.role`
  - `PlatformInvite.role`
  - `RolePermission.platformRole`

## 2. Auth cookie and session payload

The signed session payload currently hardcodes both scopes:

- `src/lib/auth/auth.schema.ts`
  - `sessionPayloadSchema.workspaceRole`
  - `sessionPayloadSchema.platformRoles`

Important nuance:

- workspace role is singular
- platform roles are plural in the session cookie

## 3. Request, actor, and DB context plumbing

These rebuild actor state from headers and session data:

- `src/lib/middleware/actor-headers.ts`
- `src/lib/request/withRequestContext.ts`
- `src/lib/request/withActionContext.ts`
- `src/lib/request/with-server-request-context.ts`
- `src/lib/context/build-actor.ts`
- `src/lib/context/actor-context.ts`
- `src/lib/request/read-actor-context.ts`
- `src/lib/context/apply-db-context.ts`

Important current limitation:

- the session cookie can carry multiple platform roles
- headers include `x-platform-roles`
- but `ActorContext` only keeps a single `platformRole`
- and `apply-db-context.ts` only sets one `app.platform_role` for RLS

So the platform side is already semantically richer than the DB/RLS layer is
currently modeling.

## 4. Membership and invite creation

Workspace role assignment is enum-based in:

- `src/modules/workspace/services/membership.services.ts`
- `src/modules/workspace/services/invite.services.ts`
- `src/modules/workspace/workflows/create-workspace.workflow.ts`
- `src/modules/workspace/workflows/create-workspace-invite.workflow.ts`
- `src/modules/workspace/actions/create-workspace.action.ts`

Platform role assignment is enum-based in:

- `src/modules/platform/services/membership.services.ts`
- `src/modules/platform/services/invite,services.ts`

## 5. Permission resolution

Permission lookup depends directly on both enums:

- `src/modules/permissions/permissions.services.ts`
- `prisma/seed-role-permissions.ts`

Current shape:

1. workspace role base permissions come from `RolePermission.workspaceRole`
2. platform role base permissions come from `RolePermission.platformRole`
3. workspace overrides come from `WorkspaceRolePermission`
4. user overrides come from `UserPermission`

## 6. Business rules and semantics

Workspace business logic is hardcoded to enum semantics in:

- `src/modules/workspace/workflows/remove-workspace-member.workflow.ts`
  - role hierarchy map
  - owner removal guard
  - "last owner" logic

Platform business semantics are hardcoded in RLS helpers and actor helpers:

- `src/lib/context/build-actor.ts`
  - `PLATFORM_ADMIN`
- `src/lib/mig_rls.sql`
  - `PLATFORM_ADMIN`
  - `BILLING_AGENT`
  - `SUPPORT_AGENT`
  - `PLATFORM_STAFF`

## 7. UI and validation

Workspace UI currently hardcodes roles in:

- `src/modules/workspace/schema.ts`
- `src/modules/workspace/components/workspace-admin-dashboard.tsx`

Platform UI is lighter today, but platform role display and platform routes
still assume hardcoded role names:

- `src/app/(platform)/platform/page.tsx`
- `src/components/layout/dashboard-href.ts`

## 8. SQL constraints and RLS

There are SQL-level assumptions about both role systems:

- `src/lib/mig.sql`
  - one-owner-per-workspace partial index
  - session consistency checks
- `src/lib/mig_rls.sql`
  - `app.is_platform_admin()`
  - `app.is_platform_staff()`
  - `app.is_platform_billing()`
  - `app.is_platform_support()`
  - `app.can_manage_workspace(...)` checks `m.role IN ('OWNER', 'ADMIN')`

This is one of the biggest reasons to do both scopes together now.

## Invariants We Must Preserve

These behaviors should remain true after the refactor:

1. Workspace creator becomes the owner-equivalent role.
2. A workspace member has exactly one workspace role at a time.
3. A platform identity may hold multiple platform roles at the same time.
4. Multiple workspace owners are allowed, but at least one active owner must
   always remain.
5. Lower-ranked workspace users cannot remove higher-ranked users.
6. Platform admin, billing, support, and staff semantics remain explicit and
   enforceable.
7. Membership, invite, and session state carry enough role data to preserve
   semantics without relying on enum literals.
8. Freshly issued sessions and request headers can rebuild actor context
   safely.
9. Permission resolution still works for:
   - workspace base role permissions
   - platform base role permissions
   - workspace role overrides
   - user overrides
10. One reset-and-reseed should be enough to make the app internally
    consistent again.

## Target Design

## 1. New generic role definition table

Replace the two enum systems with one global role-definition table.

Suggested shape:

- `RoleDefinition`
  - `id`
  - `scope` with values `WORKSPACE | PLATFORM`
  - `key`
  - `name`
  - `description`
  - `isSystem`
  - `systemKey`
  - `hierarchyRank`
  - `isDefault`
  - `isAssignable`
  - `isActive`
  - `createdAt`
  - `updatedAt`

Suggested meaning:

- `scope`
  - distinguishes workspace and platform roles
- `key`
  - stable product-facing identifier like `teacher`, `designer`,
    `platform-staff`
- `systemKey`
  - reserved semantic slot for built-ins
- `hierarchyRank`
  - mainly meaningful for workspace roles
- `isDefault`
  - used for default invite/member role selection
- `isAssignable`
  - controls whether the role may appear in UI assignment flows

Recommended built-in system keys:

- workspace:
  - `WORKSPACE_OWNER`
  - `WORKSPACE_ADMIN`
  - `WORKSPACE_STAFF`
  - `WORKSPACE_VIEWER`
- platform:
  - `PLATFORM_ADMIN`
  - `PLATFORM_STAFF`
  - `PLATFORM_BILLING_AGENT`
  - `PLATFORM_SUPPORT_AGENT`

## 2. Role references on runtime models

Because a development reset is acceptable, we can move directly to the target
role model instead of carrying old enum columns temporarily.

Suggested field changes:

- `Membership`
  - `roleDefinitionId`
  - `roleKey`
  - `roleSystemKey`
- `WorkspaceInvite`
  - `roleDefinitionId`
  - `roleKey`
  - `roleSystemKey`
- `PlatformMembership`
  - `roleDefinitionId`
  - `roleKey`
  - `roleSystemKey`
- `PlatformInvite`
  - `roleDefinitionId`
  - `roleKey`
  - `roleSystemKey`
- `Session`
  - `workspaceRoleDefinitionId`
  - `workspaceRoleKey`
  - `workspaceRoleSystemKey`
- `RolePermission`
  - `roleDefinitionId`
- `WorkspaceRolePermission`
  - `roleDefinitionId`

Recommended cleanup:

- remove `WorkspaceRole` enum
- remove `PlatformRole` enum
- remove enum-backed role columns

Optional naming cleanup:

- `WorkspaceRolePermission` could be renamed later to something clearer like
  `WorkspaceScopedRolePermission`, because it represents workspace-local
  overrides for workspace roles, not global role definitions.

## 3. Keep role snapshots on runtime records

Do not rely only on a foreign key to `RoleDefinition`.

We still need snapshot values like:

- `roleKey`
- `roleSystemKey`

Reasons:

- middleware and actor reconstruction need lightweight strings
- sessions need stable role snapshots
- SQL constraints and indexes are easier on snapshots than joins
- owner and platform semantic helpers should not depend on runtime joins

## 4. Make scope semantics explicit

The app needs more than labels.

Workspace semantics:

- owner-equivalent role
- admin-equivalent role
- default member role
- hierarchy ordering

Platform semantics:

- admin-equivalent role
- staff-equivalent role
- billing-equivalent role
- support-equivalent role

These should be modeled from `systemKey`, not inferred from display names.

## 5. Keep platform and workspace management policy different

Even with one shared infrastructure:

- workspace roles should become starter-flexible
- platform roles should remain seeded and system-managed initially

That means:

- platform can manage both scopes
- workspace does not create its own roles yet
- platform custom roles can be postponed, even if the infrastructure could
  support them later

## 6. Recommended owner semantics

Recommended rule:

- multiple owners are allowed
- at least one active owner must always remain

Why:

- it matches the current application workflow more closely than the current SQL
  index does
- it supports shared ownership and transfer-of-control scenarios
- it is less brittle than enforcing exactly one owner forever

This means the old partial unique index on owner rows should be removed rather
than recreated.

## Why Doing Both Together Is Better Now

If we refactor only workspace roles now and platform roles later, we would
touch many of the same deep layers twice:

- auth schema
- session payload
- request and actor context
- DB context / RLS config
- permission seeding
- permission resolution
- role-based SQL helpers

Doing both together gives us:

- one schema refactor
- one session payload redesign
- one actor/header redesign
- one RLS redesign
- one permission-mapping redesign

The scopes are not identical semantically, but they are close enough
structurally that one generic role system is the better foundation.

## Refactor Phases

## Phase 0. Freeze semantics and scope

Lock these decisions before code changes:

- one generic role system for both scopes
- platform manages both workspace and platform role definitions
- workspace does not create roles yet
- platform roles remain seeded/system-managed initially
- workspace roles remain one-per-membership
- platform roles remain many-per-identity
- multiple owners are allowed, but at least one active owner must remain

## Phase 1. Replace the schema

Replace the role schema in one coordinated pass:

- add `RoleDefinition`
- replace workspace role columns with role-definition references and snapshots
- replace platform role columns with role-definition references and snapshots
- replace `RolePermission.workspaceRole/platformRole` with `roleDefinitionId`
- keep workspace-local override table, but make it reference `roleDefinitionId`

Remove:

- `WorkspaceRole` enum
- `PlatformRole` enum
- enum-backed role columns

## Phase 2. Rewrite SQL constraints and RLS first

Before application code is fully updated, replace SQL assumptions that depend
on enum literals.

Workspace side:

- remove the one-owner partial unique index
- rewrite workspace-management helpers to use role snapshots

Platform side:

- stop treating platform role context as a single string
- replace `app.platform_role` assumptions with a multi-role representation
- update helpers like:
  - `app.is_platform_admin()`
  - `app.is_platform_staff()`
  - `app.is_platform_billing()`
  - `app.is_platform_support()`

Recommended direction:

- store platform role system keys in the DB context as a JSON or delimited
  string list
- make RLS helpers check membership in that list

## Phase 3. Seed built-in role definitions

Seed built-ins into `RoleDefinition`:

- workspace:
  - owner
  - admin
  - staff
  - viewer
- platform:
  - platform-admin
  - platform-staff
  - billing-agent
  - support-agent

Each should include:

- stable `key`
- `scope`
- `systemKey`
- assignable/system flags
- hierarchy rank where relevant

Before running any seed command, re-review all of:

- permission seed/catalog data
- role-permission seed data
- default built-in role definitions

This is required because once role ids replace enums, seed data becomes part of
the role-system contract and cannot be treated as a blind carry-over.

Recommended seed order:

1. `prisma/seedPermissions.ts`
2. `prisma/seed-role-definitions.ts`
3. `prisma/seed-role-permissions.ts`
4. `prisma/seed-catalog.ts`

## Phase 4. Introduce a generic role service layer

Add a dedicated service module for roles, for example:

- `getRoleDefinitionById`
- `getRoleDefinitionByKey`
- `listRoleDefinitionsByScope`
- `listAssignableWorkspaceRoles`
- `listAssignablePlatformRoles`
- `getSystemRole(scope, systemKey)`
- `getDefaultWorkspaceRoleDefinition`

This becomes the single source of truth instead of scattered enum checks.

## Phase 5. Refactor write paths

Update all role-writing flows to use role definitions directly.

Workspace side:

- workspace creation
- membership creation
- membership role changes
- invite creation
- invite acceptance

Platform side:

- platform invite creation
- platform membership creation
- platform invite acceptance
- platform membership updates

Shared/session side:

- final session construction
- session refresh/extension

## Phase 6. Refactor auth, session, headers, and actor context

Update these areas together:

- auth session payload builder
- middleware actor headers
- request-context reconstruction
- actor context types
- DB context application
- server-request actor reads

Recommended session payload shape:

- workspace:
  - `workspaceRoleId`
  - `workspaceRoleKey`
  - `workspaceRoleSystemKey`
- platform:
  - `platformRoleIds`
  - `platformRoleKeys`
  - `platformRoleSystemKeys`

Important change:

- `ActorContext` should no longer collapse platform access to a single role
- it should carry multiple platform role system keys

## Phase 7. Refactor permission resolution

Refactor permission lookup to use `roleDefinitionId`.

Changes:

- `RolePermission` becomes generic by role definition
- workspace role overrides use `roleDefinitionId`
- workspace base permissions resolve from the workspace role definition
- platform base permissions resolve from all assigned platform role definitions

The permission engine should stay layered as:

1. workspace base role permissions
2. platform base role permissions
3. workspace-local role overrides
4. user overrides

## Phase 8. Rewrite business rules to use semantics, not enum strings

Workspace rules:

- role hierarchy comparisons
- owner checks
- management checks
- default invite role selection

Platform rules:

- platform admin checks
- support/billing/staff checks
- DB-context helper behavior

Examples:

- `remove-workspace-member.workflow.ts`
  - replace hardcoded rank map with `hierarchyRank`
  - replace `role === OWNER` with `roleSystemKey === WORKSPACE_OWNER`
- platform helper checks should use `platformRoleSystemKeys`

## Phase 9. Update UI and validation

UI should stop hardcoding role literals.

Workspace UI:

- invite form
- team/member role display
- future access screens

Platform UI:

- platform invite flows
- platform membership display/editing
- future platform access screens

Validation should submit role ids, not enum strings.

## Phase 10. Reset and reseed

Once the code compiles against the new model:

1. reset the development database
2. run migrations
3. reseed in this order:
   - permissions
   - role definitions
   - role permissions
   - catalog/plans
4. clear browser cookies/session storage if needed
5. recreate test workspaces, memberships, and invites

## Phase 11. Validate all flows

After reset, validate the full auth and access lifecycle against the new role
system.

## Biggest Risks

## 1. Session and header breakage

If the payload and header shape are updated incompletely, users may get
redirected or see auth errors until cookies are cleared.

## 2. RLS mismatch

If the app starts using role ids and role-system keys but RLS still checks old
enum values or a single platform role string, queries may fail or
over-authorize.

## 3. Workspace owner semantics

The current app code and SQL are not aligned on owner behavior. That must be
resolved early.

## 4. Platform multi-role semantics

The current session/header path already allows multiple platform roles, but the
actor and DB context collapse them. This must be fixed deliberately, not
implicitly.

## 5. Permission drift

If `RolePermission` and workspace-local overrides are migrated inconsistently,
the sidebar and access checks may diverge from expected role behavior.

## 6. Reset assumptions hiding integration gaps

Because reset is allowed, it will be tempting to move fast. But the shared
layers still need to be updated in a coordinated way.

## Suggested Implementation Order

1. Finalize generic role semantics and system keys.
2. Replace schema for both scopes.
3. Rewrite SQL constraints and RLS helpers.
4. Re-review permission and role-permission seed data.
5. Seed built-in role definitions.
6. Add generic role service layer.
7. Refactor workspace and platform write paths.
8. Refactor auth/session/header/actor plumbing.
9. Refactor permission resolution.
10. Refactor business rules.
11. Update workspace and platform UI/forms.
12. Reset DB, reseed, and clear cookies.
13. Run compatibility checks on all flows.

## Test Plan

Minimum flows to validate:

1. Create a workspace.
2. Ensure creator gets owner-equivalent workspace role.
3. Invite a workspace user and accept the invite.
4. Log in as invited workspace user.
5. Resolve permissions for:
   - owner
   - admin
   - staff/viewer
   - one custom workspace role
6. Remove a member with lower rank.
7. Verify higher-rank removal is blocked.
8. Verify last-owner removal is blocked.
9. Create a platform invite and accept it.
10. Log in as a platform user.
11. Verify platform admin, staff, billing, and support semantics individually.
12. Verify an identity with multiple platform roles resolves correctly.
13. Verify session refresh/heartbeat still works.
14. Verify middleware headers and sidebar permissions still match.
15. Verify RLS-protected queries still succeed for valid actors and fail for
    invalid actors.

## Recommended Next Step

Start with:

1. finalizing the generic `RoleDefinition` schema
2. locking the `systemKey` naming convention
3. confirming the role snapshot fields on:
   - memberships
   - invites
   - sessions
4. then implementing the schema replacement for both scopes before touching the
   service layer

After that, the application layer can be refactored from the schema outward.
