# Launch Guardrails

This document is the minimum operational checklist for running the Human Layer beta on production.

## Automated uptime

Use the built-in uptime check to make sure the two most important public surfaces stay alive:
- `/verify`
- `/api/pages/lookup?url=https://github.com/vercel/next.js`

Run it locally:

```bash
corepack pnpm guardrails:uptime
```

Override the base URL when needed:

```bash
HL_UPTIME_BASE_URL=https://<staging-or-preview-url> corepack pnpm guardrails:uptime
```

The scheduled GitHub Actions workflow lives at:
- `.github/workflows/production-guardrails.yml`

Recommended repository variable:
- `HL_UPTIME_BASE_URL`

If that variable is omitted, the script falls back to:
- `https://human-layer-web.vercel.app`

## Sentry alerts to configure

Human Layer already emits structured lookup and World ID verification failures. Configure Sentry alerts for:

1. World ID verification failures
   - filter for `event: world_id_verify_failed`
   - alert when failures spike above baseline in a 10-minute window

2. Page lookup failures
   - filter for `event: lookup_route_failed` or lookup 5xx responses
   - alert on repeated failures in a short window

3. Production regression after deploy
   - alert on new issue frequency immediately after a release

## Funnel events to watch

The current product analytics funnel is:
- `overlay_opened`
- `verify_started`
- `verify_succeeded`
- `comment_posted`
- `page_saved`

Recommended PostHog funnel:
1. `overlay_opened`
2. `verify_started`
3. `verify_succeeded`
4. `comment_posted`

This gives you a fast read on:
- whether users see the overlay
- whether verification starts
- whether verification succeeds
- whether verified users actually contribute

## Staging parity

Before shipping meaningful production changes:
- keep a staging web deployment
- keep separate staging Postgres and Redis credentials
- keep separate staging World ID credentials
- test verification and lookup against staging first

Useful templates:
- `apps/web/.env.staging.example`
- `apps/extension/.env.staging.example`

## Trust surfaces to keep live

Make sure these public pages stay deployed and linked from the app and store listing:
- `/privacy`
- `/terms`
- `/support`

Recommended support additions:
- set `NEXT_PUBLIC_SUPPORT_EMAIL` in web envs
- keep the support page updated with request ID guidance
- include the support URL in the Chrome Web Store listing
