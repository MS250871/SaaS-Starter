# Public Callback APIs

Use this surface for inbound callbacks from external providers.

Typical examples:

- payment webhooks
- email delivery callbacks
- verification callbacks

Guidance:

- validate signatures or shared secrets explicitly
- prefer `createWebhookRouteHandler(...)` for inbound webhook routes
- `withPublicContext(...)` still works for non-HTTP public flows or special cases
- audit only security-relevant or mutation-relevant events
