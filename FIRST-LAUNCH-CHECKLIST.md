# First Launch Checklist

This is the literal operator checklist for the first hosted Human Layer launch.

It assumes you are using:
- Neon
- Vercel
- Upstash
- Sentry
- PostHog

It does not require a final custom domain yet.

## Goal

By the end of this checklist you will have:
- a hosted web app
- a production Postgres database
- environment variables wired in Vercel
- database migrations applied
- a working lookup API
- a production extension build target URL

## 0. Prep

Have these ready before you start:
- GitHub repo access
- Vercel account
- Neon account
- Upstash account
- Sentry account
- PostHog account
- World ID production credentials

Keep one temporary notes file open while you do this. You'll paste values from provider dashboards into Vercel env vars.

## 1. Create Neon production database

1. Log into Neon.
2. Create a new project.
3. Name it `human-layer-prod`.
4. Pick the region closest to your first users.
5. Create a database named `human_layer` if Neon does not do that automatically.
6. Open the connection details page.
7. Copy the direct Postgres connection string.
8. Save it under the label `DATABASE_URL`.

Done when:
- you have a working Postgres connection string for production

## 2. Create Neon staging database

1. Create another Neon project.
2. Name it `human-layer-staging`.
3. Use the same database naming pattern.
4. Copy the staging connection string too.

Done when:
- you have separate production and staging database URLs

## 3. Create Upstash Redis

1. Log into Upstash.
2. Create a Redis database for production.
3. Name it `human-layer-prod`.
4. Copy the Redis connection string.
5. Save it under the label `REDIS_URL`.
6. Repeat for staging with `human-layer-staging`.

Done when:
- you have separate production and staging Redis URLs

## 4. Create Sentry project

1. Log into Sentry.
2. Create a new project for Next.js.
3. Name it `human-layer-web`.
4. Copy the DSN.
5. Save it as:
   - `SENTRY_DSN`
   - `NEXT_PUBLIC_SENTRY_DSN`

Done when:
- you have at least one DSN ready for the web app

## 5. Create PostHog project

1. Log into PostHog.
2. Create a project named `Human Layer`.
3. Copy the project API key.
4. Copy the PostHog host.
5. Save them as:
   - `NEXT_PUBLIC_POSTHOG_KEY`
   - `NEXT_PUBLIC_POSTHOG_HOST`

Done when:
- you have the PostHog browser env values ready

## 6. Collect World ID production values

Make sure you have:
- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `WORLD_ID_APP_ID`
- `WORLD_ID_RP_ID`
- `WORLD_ID_RP_PRIVATE_KEY`
- `WORLD_ID_VERIFY_URL`

Also decide these now:
- `WORLD_ID_MODE=remote`
- `WORLD_ID_ENVIRONMENT=production`
- `NEXT_PUBLIC_WORLD_ID_ACTION=human-layer-v1`
- `WORLD_ID_ACTION=human-layer-v1`
- `NEXT_PUBLIC_WORLD_ID_SIGNAL=human-layer-v1`
- `WORLD_ID_SIGNAL=human-layer-v1`

Done when:
- you can fill the World ID section of `apps/web/.env.production.example`

## 7. Generate app secrets

Generate two long random values:
- `SESSION_SECRET`
- `EXTENSION_TOKEN_SECRET`

Use a password manager or a secure generator. Do not commit them anywhere.

Done when:
- both secrets are stored in a secure place and ready for Vercel

## 8. Create the Vercel project

1. Log into Vercel.
2. Import the GitHub repository.
3. When asked for the root directory, set it to `apps/web`.
4. Confirm the framework is Next.js.
5. Set Node.js to `22` if you are prompted.
6. If Vercel does not infer the monorepo correctly, set:
   - Install Command: `corepack pnpm install --frozen-lockfile`
   - Build Command: `corepack pnpm --filter @human-layer/web build`

Do not deploy yet if the env var screen is available first. Add env vars before the first real deploy.

## 9. Add Vercel production env vars

Open [apps/web/.env.production.example](/Users/samuelzeller/conductor/human%20layer/apps/web/.env.production.example) and copy every key into Vercel Production env vars.

Set these first:
- `APP_BASE_URL`
- `API_BASE_URL`
- `DATABASE_URL`
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
- `REDIS_URL`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

For now:
- set `APP_BASE_URL` to the current Vercel deployment URL once it exists
- set `API_BASE_URL` to the same value if the API is still served by the same Next app

Done when:
- all required production env vars are saved in Vercel

## 10. Deploy the web app

1. Trigger the first production deploy in Vercel.
2. Wait for it to finish.
3. Open the deployment URL.
4. Confirm the home page renders.

Done when:
- the web app loads on its hosted Vercel URL

## 11. Run production migrations

From your local machine, in this repo:

```bash
cd "/Users/samuelzeller/conductor/human layer"
DATABASE_URL="<production-database-url>" corepack pnpm db:migrate
```

Do not run seed data in production unless you intentionally want demo content visible.

Done when:
- the production database schema matches the current app

## 12. Smoke-check the hosted API

Open this in a browser using your deployed base URL:

```
<APP_BASE_URL>/api/pages/lookup?url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js
```

You should get JSON, not a 500 page.

Then check:
- `<APP_BASE_URL>/verify`
- `<APP_BASE_URL>/profiles/demo_builder` only if demo data exists in that environment

Done when:
- lookup works
- verify page loads

## 13. Point the extension at the hosted app

Use [apps/extension/.env.production.example](/Users/samuelzeller/conductor/human%20layer/apps/extension/.env.production.example) as the source of truth.

For production extension builds set:
- `WXT_APP_URL=<APP_BASE_URL>`
- `APP_URL=<APP_BASE_URL>`

Then build locally:

```bash
cd "/Users/samuelzeller/conductor/human layer"
WXT_APP_URL="<APP_BASE_URL>" APP_URL="<APP_BASE_URL>" corepack pnpm --filter @human-layer/extension build
```

Done when:
- the extension bundle no longer points at `127.0.0.1`

## 14. Manual end-to-end check

1. Load the production extension build.
2. Open `https://github.com/vercel/next.js`.
3. Confirm the overlay appears.
4. Click `Human Layer` and confirm the hosted web app opens.
5. Trigger the verify flow and confirm handoff still works.

Done when:
- the hosted app and extension work together

## 15. Optional staging pass

Repeat the same flow with:
- staging Neon
- staging Upstash
- Vercel preview or a separate staging environment

This is strongly recommended before a public launch.

## Launch-ready definition

You are ready for the first hosted launch when:
- production web deploy is live
- production migrations are applied
- lookup API is healthy
- verify flow is healthy
- extension points at the hosted app
- CI is green
- Sentry is receiving events

## If something breaks

Check these in order:

1. Vercel deployment logs.
2. `DATABASE_URL` correctness.
3. migration status.
4. World ID env vars.
5. lookup route directly in the browser.
6. Sentry errors.

If you want a provider-by-provider fill-in session, start with Neon first, then Vercel.
