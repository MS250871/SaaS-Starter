# API Surface Map

This project now has a planned API split for future expansion. Existing live routes have been reorganized with App Router route groups so the internal folder structure is cleaner without changing the public `/api/...` URLs.

## Target Surfaces

### `src/app/api/app`
First-party product APIs for web and mobile clients.

- Auth model: session, bearer token, or future first-party app auth
- Wrappers: `createRouteHandler(...)`
- Actor types in audit: `IDENTITY` or `CUSTOMER`
- Typical consumers:
  - customer mobile app
  - customer web app
  - workspace admin app
  - platform admin app when HTTP APIs are needed

### `src/app/api/integrations`
Server-to-server APIs for API keys and enterprise integrations.

- Auth model: workspace or platform API keys
- Wrappers: `createApiKeyRouteHandler(...)`
- Actor type in audit: `API_KEY`
- Typical consumers:
  - enterprise sync jobs
  - CRM or ERP integrations
  - partner middleware

### `src/app/api/public`
Unauthenticated inbound callbacks from external providers.

- Auth model: provider signatures, shared secrets, or explicit public verification
- Wrappers: `createRouteHandler(...)` plus `withPublicContext(...)` until we add a dedicated public-route helper
- Actor type in audit: usually `SYSTEM`
- Typical consumers:
  - payment webhooks
  - email provider callbacks
  - public verification callbacks

### `src/app/api/internal`
Non-public internal utilities and developer-only endpoints.

- Auth model: env guard, internal secret, or local-only checks
- Wrappers: `createRouteHandler(...)`
- Actor type in audit: usually `SYSTEM`, sometimes `IDENTITY`
- Typical consumers:
  - debug helpers
  - maintenance hooks
  - local testing endpoints

### `src/app/api/worker`
Job and machine-driven endpoints triggered by queues, cron, or internal systems.

- Auth model: worker secret or internal dispatch
- Wrappers: `createRouteHandler(...)` plus `withSystemJobContext(...)`
- Actor type in audit: usually `SYSTEM`
- Typical consumers:
  - notification delivery jobs
  - billing reconciliation jobs
  - internal async processors

## Folder Blueprint

```text
src/app/api/
  (app)/
  (internal)/
  (public)/
  (worker)/
  app/
    auth/
    customer/
    platform/
    workspace/
  integrations/
    platform/
    workspace/
  internal/
    debug/
    maintenance/
    testing/
  public/
    callbacks/
    webhooks/
  worker/
    billing/
    integrations/
    maintenance/
    notifications/
```

The parenthesized folders are route groups used only for code organization. They do not appear in the public URL.

## Entry-Point Rule

Routes should stay thin.

- UI actions and HTTP routes are sibling entry points
- they should not call each other
- both should call the same workflow or service underneath
- use workflows for multi-step business flows
- use services directly only when the operation is truly simple and is already the correct use-case boundary

## Current Routes Mapped To Their Future Homes

These are the current live routes and where similar endpoints now live in the repo.

| Public route | Repo home |
| --- | --- |
| `/api/auth/session/heartbeat` | `src/app/api/(app)/auth/session/heartbeat` |
| `/api/workspace/media/[mediaId]/download` | `src/app/api/(app)/workspace/media/[mediaId]/download` |
| `/api/workspace/library-media/[mediaId]/download` | `src/app/api/(app)/workspace/library-media/[mediaId]/download` |
| `/api/customer/media/[mediaId]/download` | `src/app/api/(app)/customer/media/[mediaId]/download` |
| `/api/platform/media/[mediaId]/download` | `src/app/api/(app)/platform/media/[mediaId]/download` |
| `/api/public/razorpay/webhook` | `src/app/api/(public)/public/razorpay/webhook` |
| `/api/worker/notifications/deliveries` | `src/app/api/(worker)/worker/notifications/deliveries` |
| `/api/debug-context` | `src/app/api/(internal)/debug-context` |
| `/api/test-login` | `src/app/api/(internal)/test-login` |

## Future API Direction

When we add more APIs, we should avoid putting them directly into:

- `src/app/api/workspace`
- `src/app/api/customer`
- `src/app/api/platform`
- `src/app/api/auth`

Those existing folders stay live for now, but new growth should happen inside the new surface buckets so we can separate:

- first-party app APIs
- API-key integrations
- public inbound callbacks
- internal utilities
- worker endpoints

## Audit Expectations

The new audit backbone supports all of these API families.

- `app` routes should audit identity or customer actors
- `integrations` routes should audit API-key actors
- `public` routes should audit provider/system events only when they are mutation or security relevant
- `internal` routes should audit only meaningful admin or maintenance changes
- `worker` routes should audit job-driven business mutations, not every heartbeat-style call
