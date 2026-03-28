# Human Layer

Human Layer is a verified-human layer for the web. This folder now contains both the concrete MVP decision pack and the working Phase 0 plus Phase 1 code scaffold for the browser-extension-first build.

## Current status

Phase 1 identity and onboarding are in place:
- monorepo workspace in this folder
- Next.js web app in `apps/web`
- WXT browser extension in `apps/extension`
- shared types and URL normalization in `packages/core`
- Drizzle schema, migration, and seeding in `packages/db`
- World ID verification flow with the real IDKit widget in remote mode plus mock mode for local development
- verified profile creation with explicit interest tags
- profile pages and extension handoff after verification

## Quick start

1. `corepack pnpm install`
2. `corepack pnpm db:up`
3. `corepack pnpm db:migrate`
4. `corepack pnpm db:seed`
5. `corepack pnpm dev:web`
6. `corepack pnpm dev:extension`
7. Open `http://127.0.0.1:3000/verify` to create a verified profile in local mock mode
8. Load the unpacked extension from `apps/extension/.output/chrome-mv3-dev`

Useful maintenance commands:
- `corepack pnpm dev:reset` clears the web and extension build output, restarts both dev servers, and waits for the lookup API to come back healthy
- `corepack pnpm smoke:overlay` builds the extension if needed, opens Chrome with the unpacked extension, and smoke-tests the GitHub overlay plus page/profile navigation
- `corepack pnpm guardrails:uptime` checks the production or staging verify and lookup surfaces

Deployment and production setup:
- `FIRST-LAUNCH-CHECKLIST.md`
- `PRODUCTION-DEPLOYMENT.md`
- `LAUNCH-GUARDRAILS.md`
- `PRODUCTION-RELEASE-CHECKLIST.md`
- `CHROME-WEB-STORE-BETA.md`
- `PROVIDER-SETUP.md`
- `apps/web/.env.production.example`
- `apps/web/.env.staging.example`
- `apps/extension/.env.production.example`
- `apps/extension/.env.staging.example`

Default local ports:
- web app: `http://127.0.0.1:3000`
- extension dev server: `http://127.0.0.1:3001`
- Postgres: `5433`
- Redis: `6380`

## Start here

Read these first, in order:
- 00-START-HERE.md
- 01-MVP-SCOPE.md
- 02-FIRST-BUILD.md
- 03-STACK-DECISIONS.md
- 04-IMPLEMENTATION-ROADMAP.md
- 05-ENGINEERING-BACKLOG.md
- 06-DEMO-STORY.md

## Chosen direction

The locked V1 direction is:
- browser-extension-first product paired with a lightweight web app
- first users are builders, researchers, and other high-signal internet users
- first surfaces are GitHub, Hacker News, Product Hunt, curated docs domains, and selected blogs/Substack
- first usable build and first demo are GitHub and Hacker News only
- read-only overlay works without login
- verified users can post page-level verdicts and flat comments, save pages, follow people, and use access-controlled XMTP messaging
- World ID uses IDKit first
- XMTP is a real messaging surface
- x402 is reserved for paid intro and premium API access

## Identity flow

Phase 1 currently ships:
- `/verify` for pseudonymous profile creation plus explicit interest onboarding
- the official `@worldcoin/idkit` widget path for live verification
- `/api/auth/world-id/request` for signed RP request context
- `/api/auth/world-id/verify` for nullifier-backed one-human session issuance
- `/profiles/:handle` for verified-human public profiles
- extension handoff from verification back into the current page context

Local development defaults to `WORLD_ID_MODE=mock`, which keeps the server contract stable while letting the same mock human key map back to the same nullifier and profile. To turn on the live widget flow, set `WORLD_ID_MODE=remote` and provide `WORLD_ID_RP_ID`, `WORLD_ID_RP_PRIVATE_KEY`, and `WORLD_ID_VERIFY_URL`.

## Supporting research

Product framing and strategy:
- PRODUCT-THESIS.md
- STRATEGY.md
- MVP.md
- EXTENSION-MVP.md
- HUMAN-GRAPH-MVP.md
- ROADMAP.md
- INFRA.md

World ID, XMTP, and monetization notes:
- WORLD-ID-X402-XMTP.md
- WORLD-ID-PRIMITIVES.md
- XMTP-messaging.md
- XMTP-x402-ideas.md

Platform and expansion notes:
- PLATFORMS-AND-DISTRIBUTION.md
- IOS-MVP.md
- ELECTROBUN-DESKTOP-MVP.md
- EXPANSIONS.md
- VERTICALS-AND-BUSINESS.md
- WILD-IDEAS.md
- 8004-8183-expansion.md
- NAMES.md

## One-line summary

Add a verified-human layer on top of high-signal web pages so people can see page-level judgment, discussion, and trusted humans directly where they already browse.
