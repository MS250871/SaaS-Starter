# Worker APIs

Use this surface for machine-driven endpoints triggered by:

- queues
- cron
- scheduled jobs
- internal async dispatch

Guidance:

- prefer `createSystemJobRouteHandler(...)` for worker endpoints
- `withSystemJobContext(...)` still works for non-HTTP job execution paths
- audit business mutations, not every background poll
