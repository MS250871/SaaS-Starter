# Action / Workflow Prisma Cleanup Plan

## Purpose

Bring the codebase back into the full app architecture contract:

- `db.ts`
  - database specs and query constraints only
- `services`
  - all model-level data access and reusable functions
- `actions`
  - thin HTTP/form entry layer
  - may call services or workflows
  - must not call `prisma` directly
- `workflows`
  - orchestration only
  - may call services or other workflows
  - must not call `prisma` directly

This plan is based on a full audit of:

- `src/modules/**/actions/*.ts`
- `src/modules/**/workflows/*.ts`
- `src/modules/**/server/*.ts`

## Audit Summary

### Result

Direct `prisma` usage inside actions/workflows is currently concentrated in the `workspace` module.

- violating actions: `6`
- violating workflows: `12`
- total violating files: `18`

### Modules Reviewed

Reviewed action/workflow files under `src/modules`.

Observed outcome:

- `workspace`
  - has direct `prisma` usage in actions/workflows
- `auth`
  - no direct `prisma` usage in actions/workflows from this audit
- `billing`
  - no direct `prisma` usage in actions/workflows from this audit
- `notifications`
  - no direct `prisma` usage in actions/workflows from this audit
- other modules
  - no direct `prisma` usage in actions/workflows from this audit

### Important Scope Note

This plan now covers three app-boundary layers:

- `actions`
- `workflows`
- `server` page-data files

It still does **not** yet clean up direct `prisma` calls already living inside `services`.

That should remain a separate pass if we later want to make the service layer itself more internally uniform.

## Server Page-Data Audit

### Result

The main page-data architecture exception is concentrated in:

- [src/modules/workspace/server/workspace-admin-page-data.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\server\workspace-admin-page-data.ts)

This file currently contains a large volume of direct `prisma` queries across:

- overview
- team
- theme
- access
- customers
- features & limits
- API keys
- support queues
- support threads
- domains
- notification inbox data

### Why It Should Be Included

Even though `server` page-data files are not HTTP actions, they are still an application boundary layer. In this codebase they play the same role that controllers/view-model assemblers do in other architectures.

So if we want the architecture to be followed consistently, these files should:

- orchestrate page data
- call services
- optionally call small aggregator helpers
- avoid reaching into `prisma` directly

### Recommended Treatment

Do **not** move all page-data logic into one giant generic service.

Instead:

- keep page composition in `server` files
- move raw lookups/counts/list queries into service helpers by model/module
- let page-data files assemble returned service results into the UI shape

That keeps the page-data layer useful without letting it become a second service layer with embedded DB access.

## Violations Found

### Actions

1. [src/modules/workspace/actions/create-workspace-custom-domain.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-custom-domain.action.ts)
- direct `prisma.subscription.findFirst`
- direct `prisma.workspaceDomain.count`
- issue:
  - plan/domain entitlement lookups are being done in the action
- target:
  - move into workspace/domain service helpers

2. [src/modules/workspace/actions/create-workspace-invite.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-invite.action.ts)
- direct `prisma.workspace.findUnique`
- direct `prisma.identity.findUnique`
- direct `prisma.roleDefinition.findUnique`
- issue:
  - invite metadata hydration is being done in the action
- target:
  - use existing services for workspace, identity, and role lookups

3. [src/modules/workspace/actions/create-workspace-redirect-alias.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-redirect-alias.action.ts)
- direct `prisma.subscription.findFirst`
- direct `prisma.workspaceDomain.findFirst` for primary route
- direct `prisma.workspaceDomain.findFirst` for existing alias
- issue:
  - entitlement and domain existence checks are inside the action
- target:
  - move into workspace/domain service helpers

4. [src/modules/workspace/actions/refresh-workspace-custom-domain-verification.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\refresh-workspace-custom-domain-verification.action.ts)
- direct `prisma.workspaceDomain.findUnique`
- issue:
  - action is loading domain ownership/type directly
- target:
  - use domain services for workspace-scoped lookup

5. [src/modules/workspace/actions/mark-workspace-notification-read.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\mark-workspace-notification-read.action.ts)
- direct `prisma.notification.findFirst`
- issue:
  - action is validating notification ownership directly
- target:
  - use notification service helper for workspace identity scoped notification lookup

6. [src/modules/workspace/actions/send-workspace-notification.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\send-workspace-notification.action.ts)
- direct `prisma.identity.findUnique`
- issue:
  - action is loading sender profile directly
- target:
  - use identity service helper

### Workflows

1. [src/modules/workspace/workflows/add-workspace-support-ticket-reply.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\add-workspace-support-ticket-reply.workflow.ts)
- direct `prisma.supportTicket.findUnique`
- target:
  - support service helper for workspace-scoped ticket lookup

2. [src/modules/workspace/workflows/add-workspace-support-ticket-internal-note.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\add-workspace-support-ticket-internal-note.workflow.ts)
- direct `prisma.supportTicket.findUnique`
- target:
  - support service helper for workspace-scoped ticket lookup

3. [src/modules/workspace/workflows/get-workspace-support-attachment-access.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\get-workspace-support-attachment-access.workflow.ts)
- direct `prisma.fileAttachment.findFirst`
- target:
  - attachment/media service helper for workspace support attachment access lookup

4. [src/modules/workspace/workflows/remove-workspace-member.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\remove-workspace-member.workflow.ts)
- direct `prisma.membership.findUnique`
- target:
  - membership service helper for membership-with-role snapshot

5. [src/modules/workspace/workflows/revoke-workspace-api-key.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\revoke-workspace-api-key.workflow.ts)
- direct `prisma.apiKey.findUnique`
- target:
  - API key service helper for workspace-scoped API key lookup

6. [src/modules/workspace/workflows/rotate-workspace-api-key.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\rotate-workspace-api-key.workflow.ts)
- direct `prisma.apiKey.findUnique`
- target:
  - API key service helper for workspace-scoped API key lookup

7. [src/modules/workspace/workflows/revoke-workspace-user-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\revoke-workspace-user-permission-override.workflow.ts)
- direct `prisma.userPermission.findUnique`
- target:
  - permission service helper for workspace-scoped override lookup

8. [src/modules/workspace/workflows/send-workspace-notification.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\send-workspace-notification.workflow.ts)
- direct `prisma.membership.findMany`
- direct `prisma.customer.findMany`
- target:
  - membership service helper for workspace notification recipients
  - customer service helper for workspace notification recipients

9. [src/modules/workspace/workflows/update-workspace-role-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-role-permission-override.workflow.ts)
- direct `prisma.workspaceRolePermission.findFirst`
- direct `prisma.workspaceRolePermission.delete`
- direct `prisma.workspaceRolePermission.update`
- direct `prisma.workspaceRolePermission.create`
- target:
  - permission or workspace access service helper for role override CRUD

10. [src/modules/workspace/workflows/update-workspace-support-ticket-assignment.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-support-ticket-assignment.workflow.ts)
- direct `prisma.supportTicket.findUnique`
- direct `prisma.membership.findFirst`
- target:
  - support service helper for workspace-scoped ticket lookup
  - membership service helper for active workspace member lookup by identity

11. [src/modules/workspace/workflows/update-workspace-support-ticket-status.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-support-ticket-status.workflow.ts)
- direct `prisma.supportTicket.findUnique`
- target:
  - support service helper for workspace-scoped ticket lookup

12. [src/modules/workspace/workflows/update-workspace-user-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-user-permission-override.workflow.ts)
- direct `prisma.membership.findFirst`
- direct `prisma.userPermission.findFirst`
- direct `prisma.userPermission.update`
- direct `prisma.userPermission.create`
- target:
  - membership service helper for active workspace member lookup
  - permission service helper for workspace user override upsert

## Service Changes Required

The cleanup should not just “move queries somewhere.” It should add reusable model/service functions that fit the app’s existing service boundaries.

### 1. Workspace Domain / Subscription Helpers

Likely homes:

- [src/modules/workspace/services/domains.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\domains.services.ts)
- [src/modules/workspace/services/subscription.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\subscription.services.ts)

Add helpers such as:

- `findActiveWorkspaceSubscriptionPlan(workspaceId)`
- `countPrimaryCustomWorkspaceDomains(workspaceId)`
- `findPrimaryCustomWorkspaceDomain(workspaceId)`
- `findExistingRedirectAliasDomain(workspaceId)`
- `getWorkspaceDomainById(id)`
- `getWorkspaceCustomDomainByIdForWorkspace(workspaceId, workspaceDomainId)`

### 2. Invite Metadata Helpers

Likely homes:

- [src/modules/workspace/services/workspace.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\workspace.services.ts)
- [src/modules/auth/services/identity.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\auth\services\identity.services.ts)
- [src/modules/roles/role.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\roles\role.services.ts)

Add helpers such as:

- `getWorkspaceSummaryById(workspaceId)`
- `getIdentityDisplayProfile(identityId)`
- `getRoleDefinitionSummaryById(roleDefinitionId)`

### 3. Support Ticket Lookup Helpers

Likely home:

- [src/modules/support/support.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\support\support.services.ts)

Add helpers such as:

- `getSupportTicketWorkspaceSnapshot(ticketId)`
- `getWorkspaceSupportTicketById(workspaceId, ticketId)`
- `getSupportTicketAssignmentCandidate(workspaceId, identityId)` or rely on membership service

### 4. Support Attachment Access Helpers

Likely home:

- new service under workspace or media/support boundary, for example:
  - `workspace-support-attachments.services.ts`
  - or `media.services.ts` if kept generic

Add helper such as:

- `getWorkspaceSupportAttachmentAccess(workspaceId, mediaId)`

### 5. Membership Lookup Helpers

Likely home:

- [src/modules/workspace/services/membership.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\membership.services.ts)

Add helpers such as:

- `getMembershipWorkspaceSnapshot(membershipId)`
- `findActiveWorkspaceMembershipByIdentity(workspaceId, identityId)`
- `countActiveWorkspaceOwners(workspaceId)`
- `listWorkspaceNotificationRecipientMembers(workspaceId, mode, recipientId, requireEmail)`

### 6. Customer Notification Recipient Helpers

Likely home:

- [src/modules/customer/services/customer.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\customer\services\customer.services.ts)

Add helpers such as:

- `listWorkspaceNotificationRecipientCustomers(workspaceId, mode, recipientId, requireEmail)`

### 7. API Key Lookup Helpers

Likely home:

- [src/modules/workspace/services/apikey.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\services\apikey.services.ts)

Add helpers such as:

- `getApiKeyWorkspaceSnapshot(apiKeyId)`
- `getWorkspaceApiKeyById(workspaceId, apiKeyId)`

### 8. Notification Ownership Helpers

Likely home:

- [src/modules/notifications/notification.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\notifications\notification.services.ts)

Add helpers such as:

- `getWorkspaceIdentityNotification(workspaceId, identityId, notificationId)`

### 9. Permission Override Helpers

Likely home:

- [src/modules/permissions/permissions.services.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\permissions\permissions.services.ts)

Add helpers such as:

- `getWorkspaceUserPermissionOverride(workspaceId, userPermissionId)`
- `findLatestManualWorkspaceUserPermissionOverride(workspaceId, identityId, permissionId)`
- `upsertWorkspaceUserPermissionOverride(...)`
- `findWorkspaceRolePermissionOverride(workspaceId, roleDefinitionId, permissionId)`
- `setWorkspaceRolePermissionOverride(...)`
- `clearWorkspaceRolePermissionOverride(...)`

## Refactor Plan

### Phase 1: Add Missing Service Helpers

Goal:

- add all lookup/upsert/delete helpers first
- do not change behavior yet
- keep workflows/actions compiling while we build the service API

Recommended order:

1. membership helpers
2. support lookup helpers
3. notification ownership helpers
4. API key helpers
5. permission override helpers
6. domain/subscription entitlement helpers
7. invite metadata helpers
8. page-data query helpers needed by workspace admin surfaces

### Phase 2: Refactor Workflows First

Why first:

- workflows are the main orchestration boundary
- removing `prisma` from workflows reduces the deepest architecture violation first

Recommended order:

1. support workflows
2. API key workflows
3. membership removal workflow
4. notification send workflow
5. permission override workflows
6. attachment access workflow

### Phase 3: Refactor Actions

Why after workflows:

- actions should become thin wrappers over already-clean workflows/services

Recommended order:

1. notification mark-read/send actions
2. invite action
3. domain actions

### Phase 4: Refactor Server Page-Data

Goal:

- remove direct `prisma` usage from `server` page-data files
- keep page assembly there
- move raw DB lookups into services

Recommended order:

1. notification inbox data
2. support queue/thread data
3. API keys page data
4. team page data
5. customers page data
6. access page data
7. domains page data
8. overview and features/limits summary data

### Phase 5: Verification

After each module slice:

- run focused ESLint on changed files
- run `tsc --noEmit`
- smoke-test the relevant UI flow

Suggested smoke tests:

- invite member
- custom domain create / alias create / verification refresh
- API key rotate / revoke
- support reply / internal note / status / assignment
- access override update / revoke
- send notification / mark read
- remove workspace member
- workspace page navigation and page-data loads

## Concrete File-by-File Refactor Map

### Support Slice

Files to clean:

- [add-workspace-support-ticket-reply.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\add-workspace-support-ticket-reply.workflow.ts)
- [add-workspace-support-ticket-internal-note.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\add-workspace-support-ticket-internal-note.workflow.ts)
- [update-workspace-support-ticket-status.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-support-ticket-status.workflow.ts)
- [update-workspace-support-ticket-assignment.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-support-ticket-assignment.workflow.ts)
- [get-workspace-support-attachment-access.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\get-workspace-support-attachment-access.workflow.ts)

Service work:

- extend support services for workspace-scoped ticket snapshot/lookups
- extend membership services for assignee validation
- add attachment access helper

### Membership / Team Slice

Files to clean:

- [remove-workspace-member.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\remove-workspace-member.workflow.ts)
- [create-workspace-invite.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-invite.action.ts)

Service work:

- membership snapshot and owner count helpers
- workspace summary helper
- identity display helper
- role summary helper

### API Key Slice

Files to clean:

- [rotate-workspace-api-key.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\rotate-workspace-api-key.workflow.ts)
- [revoke-workspace-api-key.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\revoke-workspace-api-key.workflow.ts)

Service work:

- workspace-scoped API key lookup helper

### Access / Permission Slice

Files to clean:

- [update-workspace-role-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-role-permission-override.workflow.ts)
- [update-workspace-user-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\update-workspace-user-permission-override.workflow.ts)
- [revoke-workspace-user-permission-override.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\revoke-workspace-user-permission-override.workflow.ts)

Service work:

- workspace role override CRUD helpers
- workspace user override lookup/upsert/revoke helpers
- active workspace membership lookup

### Domains Slice

Files to clean:

- [create-workspace-custom-domain.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-custom-domain.action.ts)
- [create-workspace-redirect-alias.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\create-workspace-redirect-alias.action.ts)
- [refresh-workspace-custom-domain-verification.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\refresh-workspace-custom-domain-verification.action.ts)

Service work:

- active plan helper
- custom domain count helper
- primary route domain helper
- redirect alias helper
- workspace-scoped domain lookup helper

### Notifications Slice

Files to clean:

- [send-workspace-notification.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\send-workspace-notification.action.ts)
- [mark-workspace-notification-read.action.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\actions\mark-workspace-notification-read.action.ts)
- [send-workspace-notification.workflow.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\workflows\send-workspace-notification.workflow.ts)

Service work:

- sender identity display helper
- notification ownership helper
- workspace member recipient list helper
- workspace customer recipient list helper

### Page-Data Slice

Files to clean:

- [src/modules/workspace/server/workspace-admin-page-data.ts](C:\Users\munir\Documents\skillmaxx-org\src\modules\workspace\server\workspace-admin-page-data.ts)

Service work:

- workspace summary helpers
- notification inbox read-model helpers
- support queue/thread read-model helpers
- team read-model helpers
- access read-model helpers
- domain read-model helpers
- customer list/detail read-model helpers
- API key read-model helpers
- features/limits read-model helpers

## Sequencing Recommendation

Best implementation order:

1. support
2. API keys
3. access / permissions
4. notifications
5. domains
6. membership / invite
7. workspace page-data extraction

Reason:

- support and API key slices are narrow and easiest to stabilize
- access/notification slices have more downstream UI usage, so they benefit from helper patterns established earlier
- domains and invite slices have more cross-service dependencies

## Definition of Done

This cleanup is complete when:

- no `actions/*.ts` import `@/lib/prisma`
- no `workflows/*.ts` import `@/lib/prisma`
- no `server/*.ts` import `@/lib/prisma` for page-data/query purposes
- all direct CRUD/lookups moved behind service helpers
- typecheck and focused lint pass
- smoke-tested workspace flows still behave the same

## Out of Scope For This Pass

- refactoring existing service files that still use direct `prisma`
- changing business behavior
- Prisma schema changes

Those can be planned separately after this action/workflow cleanup is complete.
