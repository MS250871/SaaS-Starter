# Application Testing Plan

## Purpose

This document defines the full testing plan for the SkillMaxx application across marketing, authentication, workspace administration, customer experience, platform administration, billing, notifications, support, media, and API surfaces.

As of May 23, 2026, the app is a large Next.js App Router codebase with:

- `next@16.1.6`
- `react@19.2.3`
- Prisma with PostgreSQL
- Redis-backed routing/session helpers
- Razorpay billing flows
- email, SMS, media, webhook, and worker-style background flows

This plan is intended to be both:

- a review summary of the current test posture
- the working blueprint for introducing complete automated and manual coverage

## Current State Review

### What is in good shape

- Production build succeeds with `npm.cmd run build`.
- The repo has clear domain boundaries under `src/modules/*`.
- Routes, actions, workflows, services, and page-data loaders are separated in a way that is testable.
- The app already models critical operational domains explicitly in Prisma:
  - auth and sessions
  - workspaces and routing
  - customers
  - support
  - notifications
  - billing
  - audit
  - media
  - integrations and outbox

### Current risks

- There is no established automated test stack in `package.json` yet.
- There are no visible unit, integration, or end-to-end test directories in the repo.
- Lint currently fails, which means the CI quality gate is not clean even though the production build passes.

### Lint issues observed on May 23, 2026

- `prisma/seed-catalog.ts`
- `prisma/seedPermissions.ts`
- `src/components/home/step-card.tsx`
- `src/lib/crud/report-factory.ts`
- `src/lib/errors/app-error.ts`
- `src/lib/middleware/resolve-workspace.ts`

Main lint themes:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-require-imports`
- one `next/no-img-element` warning

### Testing conclusion

The app is functionally broad and structurally ready for testing, but the current posture is still early. The highest immediate need is to add a repeatable automated test foundation around business workflows and permission-sensitive flows, then cover the major user journeys end to end.

## Scope

This plan covers:

- UI routes in `src/app`
- server actions and route handlers
- workflows and services in `src/modules`
- middleware and request context helpers in `src/lib`
- Prisma data integrity, migrations, and seed behavior
- external-provider integrations through mocked or sandboxed test paths

This plan does not assume live production providers for routine CI.

## System Areas To Cover

### Public and marketing

- `/`
- `/pricing`
- `/workspace-home`

### Authentication and identity

- `/login`
- `/signup`
- `/verify-phone`
- `/verify-otp`
- `/post-login`
- `/host-transfer`
- `/select-workspace`
- `/create-workspace`

### Workspace app

- `/app`
- `/app/customers/*`
- `/app/domains`
- `/app/media/*`
- `/app/notifications`
- `/app/support/*`
- `/app/team`
- `/app/api-keys`
- `/app/billing`
- `/app/settings/*`

### Customer app

- `/customer`
- `/customer/support`
- `/customer/support/create`
- `/customer/support/[ticketId]`

### Platform app

- `/platform`
- `/platform/workspaces/*`
- `/platform/identities/*`
- `/platform/governance/*`
- `/platform/catalog/*`
- `/platform/billing/*`
- `/platform/operations/*`

### API families

- app APIs
- public webhook/callback APIs
- internal/debug APIs
- worker/job APIs

### Cross-cutting infrastructure

- request context
- action and route wrappers
- permission resolution
- audit writes
- routing resolution
- cookie and session handling
- Redis cache lookups
- media access control

## Target Test Pyramid

### 1. Static checks

- TypeScript
- ESLint
- Prisma schema validation
- migration verification

### 2. Unit tests

Use for pure logic and narrow domain helpers.

Priority targets:

- `src/lib/errors/app-error.ts`
- `src/lib/auth/permission-resolver.ts`
- `src/lib/http/resolve-public-redirect.ts`
- `src/lib/http/cookie-security.ts`
- `src/lib/request/session-claims.ts`
- `src/lib/security/crypto.ts`
- `src/lib/middleware/proxy-utils.ts`
- `src/modules/billing/services/proration.services.ts`
- `src/modules/entitlements/override-policy.ts`
- `src/modules/support/support-ownership.ts`
- `src/modules/workspace/defaults.ts`
- `src/modules/workspace/admin-routes.ts`

Unit suite goals:

- no database
- no network
- deterministic inputs and outputs
- edge-case heavy

### 3. Integration tests

Use for workflows, services, actions, and route handlers that touch the database, request context, or provider adapters.

Priority targets:

- auth workflows
- workspace creation and membership setup
- billing checkout creation
- billing payment verification and webhook processing
- support ticket creation and reply flows
- notification creation and delivery processing
- customer import preview and import flows
- API key creation, rotation, and revocation
- workspace domain verification and routing sync
- audit event creation around mutations

Integration suite goals:

- run against an isolated test database
- mock Redis, email, SMS, media, and Razorpay boundaries where possible
- verify transaction behavior and error handling
- assert DB side effects, not only return values

### 4. End-to-end tests

Use for full browser journeys across the biggest user paths and permission boundaries.

Priority targets:

- auth login/signup/OTP flows
- workspace creation and first-run setup
- paid and free workspace creation branches
- workspace admin management flows
- customer support submission and thread viewing
- platform admin oversight flows
- critical API/download endpoints

### 5. Manual exploratory and release QA

Use for areas where visual quality, external-provider behavior, or complex operational state still needs human verification.

Priority targets:

- responsive layout
- theme correctness
- accessibility review
- Razorpay sandbox verification
- domain/routing verification behavior
- operational audit review

## Recommended Tooling

### Test runner

- `vitest` for unit and integration tests

### UI/component helpers

- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`

### API and network mocking

- `msw` for HTTP mocking where useful

### End-to-end

- `@playwright/test`

### Data and DB support

- dedicated test Postgres database
- Prisma migrate/reset helpers for test setup
- seed factories for identities, workspaces, customers, roles, plans, payments, and support tickets

## Environment Plan

### Local developer environment

- run lint
- run unit tests
- run integration tests
- run focused Playwright smoke suite

### CI environment

- install dependencies
- validate Prisma schema
- run lint
- run unit tests
- run integration tests
- run Playwright smoke suite
- optionally run full end-to-end regression on protected branches or nightly

### Pre-release staging environment

- run full regression
- run manual payment sandbox verification
- run manual routing/domain verification
- run manual notification delivery verification

## Test Data Strategy

Create reusable fixtures for the following personas:

- anonymous visitor
- new identity with no workspace
- verified workspace owner
- workspace admin with limited permissions
- workspace member with read-only permissions
- workspace customer
- platform admin
- non-admin platform operator

Create reusable business-state fixtures for:

- free trial workspace
- paid active workspace
- workspace with custom domain pending verification
- workspace with custom domain verified
- subscription needing upgrade
- successful payment
- failed payment
- open support ticket
- escalated support ticket
- unread notifications
- media attachment linked to support

## Detailed Coverage Matrix

### A. Authentication

### Unit

- identifier parsing for email vs phone
- OTP expiration and session claim logic
- cookie encode/decode behavior
- redirect target resolution

### Integration

- `loginWorkflow`
- `signupWorkflow`
- `verifyWorkflow`
- `resendWorkflow`
- `logoutWorkflow`
- `postLoginWorkflow`
- `session-heartbeat.workflow.ts`

Assertions:

- verified accounts only can log in
- OTP requests are created with correct purpose and expiry
- resend limits and attempt limits work
- session records and cookies are consistent
- post-login redirects respect workspace/customer/platform context

### E2E

- sign up with valid data
- login with existing verified account
- invalid OTP shows correct error
- expired OTP path is handled
- workspace selection after login behaves correctly

### B. Authorization and Access Control

### Unit

- permission aggregation and override resolution
- workspace admin path normalization
- required-permission filtering for nav groups

### Integration

- workspace permission overrides
- workspace role permission overrides
- permission-derived page data access
- platform admin guard behavior

Assertions:

- denied actors receive forbidden responses or guarded UI
- role changes affect visible navigation and data
- API key actors are isolated from identity actors
- audit outcomes mark denied actions correctly

### E2E

- workspace owner can access full settings
- limited workspace member cannot access restricted settings
- platform admin can access governance and operations
- non-platform-admin is blocked from protected platform routes

### C. Workspace Creation and Routing

### Integration

- `createWorkspaceWorkflow`
- domain creation workflow
- domain verification refresh workflow
- routing sync service
- Redis-backed workspace resolution helpers

Assertions:

- duplicate slugs are rejected
- owner membership is created
- default settings are created
- free trial subscription is attached for free flow
- pending billing linkage is required for paid flow
- routing state chooses correct primary host

### E2E

- create free workspace
- create paid workspace after successful payment
- view domain state in workspace admin
- verify routing/admin links resolve to correct surface

### D. Billing

### Unit

- amount conversion helpers
- proration calculations
- unused-value calculations
- checkout note/prefill builders

### Integration

- `createBillingCheckoutWorkflow`
- `verifyBillingPaymentWorkflow`
- `recordBillingPaymentFailureWorkflow`
- `processRazorpayWebhookWorkflow`
- `changeWorkspacePlanWorkflow`
- refund services
- subscription services

Assertions:

- one-time and subscription modes create correct local payment state
- provider order/subscription IDs persist correctly
- failed provider calls mark payment failed
- upgrade paths handle both direct proration and restart-with-refund branches
- webhook retries are idempotent
- payment success updates subscription, invoices, workspace settings, and routing when required

### E2E

- plan checkout from public or signup flow
- workspace upgrade from billing/settings/features entry points
- failed checkout recovery messaging

### Manual

- Razorpay sandbox subscription flow
- webhook signature handling
- refund issuance and status propagation

### E. Customers

### Integration

- create customer workflow
- preview CSV import workflow
- import CSV workflow
- workspace customer provisioning services

Assertions:

- duplicate or malformed CSV rows are reported clearly
- preview does not commit data
- import creates the right records
- workspace scoping is enforced

### E2E

- create customer manually
- preview bulk import
- import valid file
- view customer details

### F. Support

### Integration

- workspace support ticket creation
- customer support ticket creation
- assignment workflows
- status update workflows
- reply workflows
- internal note workflows
- attachment access workflows

Assertions:

- target `platform` vs `customer` branches behave correctly
- attachments are linked to the correct entity
- customer cannot access platform-only notes
- assignee and status transitions are enforced

### E2E

- workspace creates support ticket
- workspace replies to ticket
- customer creates ticket
- customer views own ticket thread
- platform operator reviews and updates ticket

### G. Notifications

### Integration

- create notification workflow
- workspace/platform invite notification creation
- mark read / mark all read flows
- delivery processing workflow

Assertions:

- in-app channel marks delivered correctly
- email channel requires subject and content
- SMS channel requires template metadata
- failures mark delivery failed with error detail

### E2E

- unread notification appears in workspace UI
- mark single notification read
- mark all notifications read

### Manual

- verify email rendering in real provider sandbox
- verify SMS provider acceptance in sandbox if available

### H. Media and File Access

### Integration

- platform/workspace/customer media access workflows
- download route authorization
- media service CRUD behavior
- file attachment linking

Assertions:

- actors can access only allowed files
- deleted or missing media is handled cleanly
- support attachment links honor context boundaries

### E2E

- workspace opens media list and detail
- authorized download works
- unauthorized direct route access fails

### I. Platform Administration

### Integration

- platform overview page-data loaders
- governance page-data loaders
- catalog page-data loaders
- billing admin page-data loaders
- operations page-data loaders

Assertions:

- pages load with correct filtering and counts
- permission-gated modules omit hidden sections
- route metadata and breadcrumbs remain consistent for deep links

### E2E

- navigate all top-level platform sections
- open representative detail screens for:
  - workspace
  - identity
  - role
  - permission
  - product
  - price
  - plan
  - feature
  - limit
  - payment
  - refund
  - support ticket
  - notification
  - media

### J. API Routes

Cover all currently live routes:

- `/api/auth/session/heartbeat`
- `/api/workspace/media/[mediaId]/download`
- `/api/workspace/library-media/[mediaId]/download`
- `/api/customer/media/[mediaId]/download`
- `/api/platform/media/[mediaId]/download`
- `/api/public/razorpay/webhook`
- `/api/worker/notifications/deliveries`
- `/api/debug-context`
- `/api/test-login`

### Integration assertions

- wrapper returns consistent `{ success, data }` and `{ success, error }` shapes
- request context is available
- transaction mode works when enabled
- audit-on-success and audit-on-error hooks execute
- unauthorized requests are rejected
- invalid payloads return stable error codes and status values

### K. Middleware, Request Context, and Routing

### Unit

- hostname normalization
- API key extraction
- free workspace path parsing

### Integration

- `resolveSession`
- `resolveWorkspace`
- actor/request context builders
- proxy header propagation

Assertions:

- expired session cookie resolves to null
- inactive session resolves to null
- workspace can resolve from API key, custom domain, free path, and subdomain forms
- malformed hostnames fail safely

### L. Audit and Operational Integrity

### Integration

- action audit success/error hooks
- route audit success/error hooks
- audit redaction
- audit actor typing across identity, customer, API key, and system flows

Assertions:

- sensitive data is not stored in clear text where redaction is expected
- success, failure, and denied outcomes are distinguishable
- platform and workspace scope tagging is correct

### M. Database, Migrations, and Seeds

### Automated checks

- `prisma validate`
- migration apply on empty database
- migration apply from previous snapshot
- seed scripts run in clean environment

### Assertions

- required enums and relations align with code assumptions
- latest migration set creates working schema
- seed scripts are idempotent where intended, or fail predictably where not

## Non-Functional Testing

### Security

- unauthorized route access attempts
- IDOR checks on media, support, customer, and workspace detail routes
- API key misuse attempts
- webhook signature validation
- cookie flags and expiry behavior
- audit logging for sensitive mutations

### Performance

- home page and pricing route render performance
- platform list pages with larger data sets
- customer import preview with large CSV
- billing and support detail pages under realistic row counts

### Accessibility

- keyboard navigation
- form labels and validation messages
- focus management in dialogs/sheets
- color contrast in light and dark themes
- screen-reader checks on core auth, workspace, and platform flows

### Reliability and Recovery

- provider timeout handling
- Redis miss behavior
- duplicate webhook delivery behavior
- repeated worker delivery attempts
- partial workflow failure rollback

## Recommended Rollout Order

### Phase 1: Quality gate baseline

- fix current lint failures
- add `vitest` and core test scripts
- add test DB setup
- add seed factories/fixtures

### Phase 2: Core domain integration coverage

- auth
- workspace creation
- billing
- support
- notifications
- media access

### Phase 3: Browser smoke coverage

- public auth flow
- workspace owner flow
- customer support flow
- platform admin navigation flow

### Phase 4: Deep regression

- permissions matrix
- catalog and governance CRUD
- billing edge cases
- webhook and worker retry behavior

## Definition of Done For Testing

A feature area should be considered properly covered when:

- lint and type checks pass
- critical pure logic has unit coverage
- workflows and route handlers have integration coverage
- at least one end-to-end happy path exists for user-visible flows
- key failure modes are tested
- permission boundaries are tested
- audit side effects are tested for sensitive mutations

## Minimum CI Gate Recommendation

For every pull request:

- `eslint`
- type/build verification
- unit tests
- integration tests
- Playwright smoke suite

For nightly or pre-release:

- full Playwright suite
- migration verification
- provider sandbox checks
- exploratory manual checklist

## Manual Release Checklist

- login, signup, OTP, logout
- create free workspace
- create paid workspace in sandbox
- workspace customer create/import
- workspace support ticket create/reply
- notification read/unread behavior
- media download authorization
- platform support review
- platform catalog edit flow
- platform governance access checks
- webhook delivery test in sandbox

## Notes

- This plan is intentionally app-specific. It follows the current route families, domain modules, and workflow boundaries already present in the repo.
- The first implementation milestone should be building the automated integration harness, because that gives the fastest confidence return for this codebase.
- Build success without lint and automated tests is not enough for a system with this many permission, billing, and workflow branches.
