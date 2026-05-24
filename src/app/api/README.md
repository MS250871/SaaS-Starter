# API Structure

The current API footprint is still small, so we are setting the long-term structure now.

New API work should go into one of these buckets:

- `app`: first-party product APIs for web and mobile clients
- `integrations`: API-key and enterprise integration APIs
- `public`: inbound public callbacks and provider webhooks
- `internal`: debug, maintenance, and local-only utilities
- `worker`: queue, cron, and machine-driven endpoints

Existing endpoints that already ship are now organized with route groups, which keeps their public `/api/...` URLs stable while improving the code layout.

See [docs/api-surface-map.md](C:\Users\munir\Documents\skillmaxx-org\docs\api-surface-map.md) for the full mapping and wrapper guidance.
