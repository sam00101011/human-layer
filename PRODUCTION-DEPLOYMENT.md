# Production Deployment

This document turns the current Human Layer repo into a concrete production checklist.

It assumes:
- web app on Vercel
- Postgres on a managed provider
- Redis on a managed provider
- object storage on S3-compatible storage
- optional worker process on Fly or Railway as background jobs are introduced

It does not assume a final domain name yet. Use provider placeholders first and replace them later.

## Recommended production shape

### Primary services

- Web app: Vercel
- Database: managed Postgres
- Redis: managed Redis
- Object storage: S3-compatible bucket
- Error tracking: Sentry
- Product analytics: PostHog
- CDN and DNS later: Cloudflare

### Runtime split

- `apps/web`: public UI plus current route-handler API
- `packages/core`: shared normalization and business logic
- `packages/db`: schema, queries, migrations, seeds
- worker service later: indexing, metadata refresh, reputation jobs, moderation jobs, notifications

## Environment files

Use these examples as the source of truth for required configuration:
- `FIRST-LAUNCH-CHECKLIST.md`
- `PRODUCTION-RELEASE-CHECKLIST.md`
- `apps/web/.env.production.example`
- `apps/extension/.env.production.example`
- `PROVIDER-SETUP.md`

Keep production secrets in the platform secret manager, not in committed files.

## Production environment checklist

### Web app required now

- `DATABASE_URL`
- `SESSION_SECRET`
- `EXTENSION_TOKEN_SECRET`
- `WORLD_ID_MODE=remote`
- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `WORLD_ID_APP_ID`
- `NEXT_PUBLIC_WORLD_ID_ACTION`
- `WORLD_ID_ACTION`
- `NEXT_PUBLIC_WORLD_ID_SIGNAL`
- `WORLD_ID_SIGNAL`
- `WORLD_ID_ENVIRONMENT`
- `WORLD_ID_RP_ID`
- `WORLD_ID_RP_PRIVATE_KEY`
- `WORLD_ID_VERIFY_URL`

### Web app recommended now

- `APP_BASE_URL`
- `API_BASE_URL`
- `REDIS_URL`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

### Object storage for later-but-soon

- `S3_REGION`
- `S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` only if not using AWS S3 directly

### Extension build-time config

- `WXT_APP_URL`
- `APP_URL`

These should point at the hosted web app base URL.

## Provider setup

### 1. Managed Postgres

Create one production Postgres instance and one staging instance.

Required outputs:
- connection string for `DATABASE_URL`

Operational notes:
- enable automated backups
- keep a direct connection string for migrations
- keep a pooled connection string only if you later need it for runtime

### 2. Managed Redis

Create one production Redis instance and one staging instance.

Use it first for:
- request throttling
- short-lived page lookup cache
- queue backing when worker jobs land

Required outputs:
- `REDIS_URL`

### 3. Object storage

Create one private bucket for:
- avatars
- screenshots
- moderation evidence
- exported data

Required outputs:
- `S3_REGION`
- `S3_BUCKET`
- credentials

### 4. World ID

Create production app credentials and request-signing credentials.

Required outputs:
- `NEXT_PUBLIC_WORLD_ID_APP_ID`
- `WORLD_ID_APP_ID`
- `WORLD_ID_RP_ID`
- `WORLD_ID_RP_PRIVATE_KEY`
- `WORLD_ID_VERIFY_URL`

Set:
- `WORLD_ID_MODE=remote`
- `WORLD_ID_ENVIRONMENT=production`

### 5. Sentry

Create at least:
- one project for web
- one project for the future worker

Required outputs:
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

### 6. PostHog

Create one product analytics project.

Required outputs:
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

## Vercel setup

Create a Vercel project rooted at:
- `apps/web`

Set build/runtime environment variables from `apps/web/.env.production.example`.

Recommended Vercel settings:
- Node.js 22
- automatic production deploys from the default branch
- preview deploys on pull requests
- analytics optional

## Deployment order

### Phase 1: stable hosted web app

1. Provision Postgres.
2. Provision Redis.
3. Create World ID production credentials.
4. Set web app env vars in Vercel.
5. Deploy `apps/web`.
6. Run database migrations.
7. Seed only if you still want demo data in non-production environments.

### Phase 2: extension points to hosted app

1. Set `WXT_APP_URL` for production extension builds.
2. Build the extension against the hosted app URL.
3. Validate:
   - page lookup
   - verify flow
   - extension handoff
   - comments / verdicts / saves / follows

### Phase 3: add worker plane

Introduce a separate worker service when you add:
- metadata extraction
- summary recomputation
- search indexing
- notifications
- moderation heuristics

Start with a single worker process on Fly or Railway using the same repo packages.

## CI/CD flow

Current CI already covers:
- tests
- builds
- overlay smoke test

Recommended release sequence:

1. Merge to default branch.
2. CI passes.
3. Vercel deploys the web app.
4. Smoke-check the hosted lookup API.
5. Build the extension with production `WXT_APP_URL`.
6. Archive the tested extension artifact and save the release metadata.
7. Publish extension artifact.

## Migrations and data safety

Before every production deploy that changes schema:
- run migrations against staging first
- verify the app boots against the migrated schema
- back up production before major schema changes

Do not run seed data in production unless you intentionally want demo content.

## Monitoring and alerting

Minimum bar:
- Sentry enabled for web
- structured logs for lookup failures
- uptime check against:
  - home page
  - `/api/pages/lookup?url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js`

Recommended alerts:
- lookup route 5xx spike
- deploy failed
- database unavailable
- World ID verification failures spike

## Secrets handling

- Never commit production secrets.
- Use provider secret stores only.
- Keep separate staging and production credentials.
- Rotate `SESSION_SECRET` and `EXTENSION_TOKEN_SECRET` deliberately, because rotation invalidates sessions/tokens.

## What not to do yet

- do not introduce Kubernetes
- do not self-host Postgres
- do not split into many microservices
- do not add OpenSearch before search complexity requires it

## First production milestone

Human Layer is ready for a first hosted production milestone when:
- `apps/web` is deployed on Vercel
- production Postgres is live
- World ID remote mode is enabled
- extension builds point at the hosted app
- Sentry is live
- CI green on every merge
