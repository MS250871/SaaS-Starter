# Internal APIs

Use this surface for non-public internal-only endpoints such as:

- debug helpers
- local testing hooks
- maintenance endpoints

Guidance:

- use `createRouteHandler(...)`
- protect with explicit environment guards or internal secrets
- do not expose these routes as normal product APIs
