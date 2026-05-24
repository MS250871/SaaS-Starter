# Integration APIs

Use this surface for server-to-server and enterprise integrations.

Typical consumers:

- partner backends
- middleware
- external sync jobs
- enterprise systems

Guidance:

- use `createApiKeyRouteHandler(...)`
- authenticate with API keys
- audit as `API_KEY`
- keep routes thin and call shared workflows or services underneath
