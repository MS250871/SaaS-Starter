# First-Party App APIs

Use this surface for APIs consumed by our own product clients:

- web app
- mobile app
- customer portal
- workspace admin
- platform admin when exposed over HTTP

Guidance:

- use `createRouteHandler(...)`
- authenticate as `IDENTITY` or `CUSTOMER`
- keep routes thin and call shared workflows or services underneath
- do not call server-action wrappers from routes
