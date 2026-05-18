# Module Ownership And App Structure Rules

These are the architecture rules we should keep following as the app grows.

## Module ownership

- Every Prisma model should have one owning module.
- The owning module is the module whose `db.ts` defines the CRUD/query access for that model.
- A model must not be owned by more than one module.
- If a module owns a model in `db.ts`, the resource-specific `services`, `actions`, and `workflows` for that model should live in that same module.

## Surface modules

- `platform`, `workspace`, and `customer` are surface modules first, not catch-all domain containers.
- Surface modules can keep:
  - route wiring
  - access guards
  - UI components
  - thin orchestration across modules
- Surface modules should not become the long-term home for resource-specific CRUD or domain workflows for tables they do not own.

## Server page data

- Page-data loaders should live close to the owning domain when they primarily represent one domain:
  - billing pages in `billing/server`
  - notifications pages in `notifications/server`
  - support pages in `support/server`
  - entitlements pages in `entitlements/server`
  - permissions pages in `permissions/server`
  - customer pages in `customer/server`
- A surface module can still assemble a small cross-domain overview page when the page is truly a shell-level summary.

## App structure

- `db.ts`
  - declares the owned Prisma models for that module
  - is the only place that should define CRUD/query factories for those models
- `services`
  - call `db.ts`
  - contain model/domain logic
  - can call other services when orchestrating across modules
- `workflows`
  - coordinate multi-step use cases
  - call services and other workflows
  - should not access Prisma directly
- `actions`
  - validate input, enforce access, and call workflows/services
  - should not access Prisma directly

## Practical checks before adding code

- If the file needs direct CRUD/query access, ask: which module owns this table?
- If the code is platform-only UI for a billing or entitlement resource, keep the UI in `platform` but move the action/workflow/page-data into the owning module.
- If a surface file starts importing many unrelated domain services, it is a sign that the page-data or orchestration should be split by domain.
