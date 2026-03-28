# Production Release Checklist

This is the short checklist to run after the hosted Human Layer web app is working in production.

It covers two things:
- cutting a clean production browser extension build
- saving the exact working production configuration somewhere safe without committing secrets

## Goal

By the end of this checklist you will have:
- a production extension bundle built against the hosted app
- a zip or archived copy of that exact extension bundle
- one secure source of truth for the production env values and release metadata

## 1. Confirm the production web app URL

Before building the extension, confirm the hosted app URL you want the extension to use.

Example:

```
https://human-layer-web.vercel.app
```

Done when:
- you have one canonical production base URL

## 2. Build the extension against production

From the repo root:

```bash
cd "/Users/samuelzeller/conductor/human layer"
WXT_APP_URL="<APP_BASE_URL>" APP_URL="<APP_BASE_URL>" corepack pnpm --filter @human-layer/extension build
```

Use the same hosted base URL for both variables.

The production Chrome bundle will be written to:
- [chrome-mv3](/Users/samuelzeller/conductor/human%20layer/apps/extension/.output/chrome-mv3)

Done when:
- the build finishes successfully
- the generated bundle no longer points at `127.0.0.1`

## 3. Reload and sanity-check the production extension

1. Open `chrome://extensions`
2. Turn on Developer Mode
3. Reload the Human Layer extension, or re-load unpacked from [chrome-mv3](/Users/samuelzeller/conductor/human%20layer/apps/extension/.output/chrome-mv3)
4. Visit a supported page such as:
   - [https://github.com/vercel/next.js](https://github.com/vercel/next.js)
5. Confirm:
   - the overlay appears
   - the overlay reads production data
   - clicking `Human Layer` opens the hosted app
   - verification works

Done when:
- the extension works against the hosted production app end to end

## 4. Archive the exact release artifact

Treat the generated `chrome-mv3` folder as the release candidate.

At minimum:
- keep the exact git commit SHA used for the release
- keep the exact app URL used for the build
- keep a zipped copy of the built extension folder in secure storage

Suggested naming:
- `human-layer-extension-prod-<YYYY-MM-DD>-<short-sha>.zip`

Do not commit the build output zip to git.

Done when:
- you can recover the exact extension bundle that was tested

## 5. Save the production env inventory in a safe place

Do not save raw secrets in the repo.

Instead, keep a secure record in:
- Vercel env vars
- your password manager
- optionally a private internal doc that lists variable names and where each value lives

Keep a complete inventory of the variable names used in production.

### Web app secrets and config

- `APP_BASE_URL`
- `API_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `EXTENSION_TOKEN_SECRET`
- `WORLD_ID_MODE`
- `WORLD_ID_ENVIRONMENT`
- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `WORLD_ID_APP_ID`
- `NEXT_PUBLIC_WORLD_ID_ACTION`
- `WORLD_ID_ACTION`
- `NEXT_PUBLIC_WORLD_ID_SIGNAL`
- `WORLD_ID_SIGNAL`
- `WORLD_ID_RP_ID`
- `WORLD_ID_RP_PRIVATE_KEY`
- `WORLD_ID_VERIFY_URL`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

### Extension build-time config

- `WXT_APP_URL`
- `APP_URL`

### Optional release metadata to save with the env inventory

- release date
- git commit SHA
- Vercel production deployment URL
- extension artifact filename
- notes about any known limitations or temporary flags

Done when:
- one trusted system contains the production env names and release metadata
- you are no longer depending on shell history or chat logs to reconstruct production

## 6. Record any required secret rotations

If any secret was exposed during setup, rotate it immediately and update the secure record.

Common examples:
- `WORLD_ID_RP_PRIVATE_KEY`
- production database password / `DATABASE_URL`
- Redis credentials

Done when:
- the live system uses rotated secrets only

## Release-ready definition

You are done when:
- the hosted web app works
- the extension has been built against the hosted web app
- the tested extension artifact is archived
- the production env inventory is stored in a secure source of truth
- exposed secrets have been rotated
