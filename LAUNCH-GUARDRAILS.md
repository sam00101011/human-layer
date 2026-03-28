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
- `.github/workflows/staging-validation.yml`

Recommended repository variable:
- `HL_UPTIME_BASE_URL`

If that variable is omitted, the script falls back to:
- `https://human-layer-web.vercel.app`

Already configured:
- GitHub Actions repository variable `HL_UPTIME_BASE_URL=https://human-layer-web.vercel.app`

## Sentry alerts to configure

Human Layer already emits structured lookup and World ID verification failures. Configure Sentry alerts for:

1. World ID verification failures
   - filter for `event: world_id_verify_failed`
   - alert when failures spike above baseline in a 10-minute window
   - recommended alert title: `Human Layer: World ID verification failures`
   - recommended condition: more than 5 events in 10 minutes

2. Page lookup failures
   - filter for `event: lookup_route_failed` or lookup 5xx responses
   - alert on repeated failures in a short window
   - recommended alert title: `Human Layer: lookup route failures`
   - recommended condition: more than 5 events in 10 minutes

3. Production regression after deploy
   - alert on new issue frequency immediately after a release
   - recommended alert title: `Human Layer: new issue after release`
   - recommended condition: new issue seen more than once in 30 minutes

Manual setup note:
- Sentry alert rules still need to be created in the Sentry UI with an authenticated owner session.
- Use the queries above against the `human-layer-web` project.

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

Recommended PostHog setup:
1. Create a funnel insight named `Activation funnel`
2. Add the steps above in order
3. Set the conversion window to 7 days
4. Break down by `source` where available
5. Save a second trend insight for `page_saved`

Manual setup note:
- PostHog funnel creation still needs an authenticated PostHog owner session.
- The event names above are now emitted by the product and ready to use.

## Staging parity

Before shipping meaningful production changes:
- keep a staging web deployment
- keep separate staging Postgres and Redis credentials
- keep separate staging World ID credentials
- test verification and lookup against staging first

Useful templates:
- `apps/web/.env.staging.example`
- `apps/extension/.env.staging.example`

Recommended staging flow:
1. Create or open a Vercel preview deployment for the branch you want to validate
2. Make sure preview envs are set to staging-safe credentials
3. Run the GitHub Actions workflow `Staging Validation`
4. Pass the preview deployment URL as `base_url`
5. Treat the run as required before production schema or auth changes

What the staging workflow validates:
- hosted `/verify` loads
- hosted lookup route returns a supported GitHub payload
- overlay appears on GitHub
- page route opens from the overlay
- profile route opens from the overlay
- client-side navigation refreshes the overlay
- retry shell still works when lookup fails

## Trust surfaces to keep live

Make sure these public pages stay deployed and linked from the app and store listing:
- `/privacy`
- `/terms`
- `/support`

Recommended support additions:
- set `NEXT_PUBLIC_SUPPORT_EMAIL` in web envs
- keep the support page updated with request ID guidance
- include the support URL in the Chrome Web Store listing
