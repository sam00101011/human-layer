# Infra

## Product architecture

Human Layer should be one backend with multiple clients:
- web app
- browser extension
- iOS app
- Electrobun desktop app

All clients should share:
- identity
- comments and threads
- profiles
- moderation
- search
- saved pages and follows

## Core services

### 1. Identity service

Responsibilities:
- World ID verification
- nullifier storage
- session management
- optional wallet binding
- optional chat or device binding later

Key model:
- nullifier_hash = durable pseudonymous identity
- wallet = optional signing and payout endpoint
- public profile = handle, avatar, stats

### 2. Content and thread service

Responsibilities:
- normalize URLs
- store page records
- create page-level threads
- comments, replies, votes, saves, reports
- tags, summaries, verdicts

Core entities:
- page
- page_thread
- comment
- vote
- save
- report
- tag
- verdict

### 3. Profile and reputation service

Responsibilities:
- pseudonymous handles
- profile stats
- expertise tags
- reputation history
- moderation flags
- public profile pages

Key stats:
- comments written
- votes received
- saved pages
- useful ratio
- abuse ratio
- domain expertise signals

### 4. Search service

Responsibilities:
- index annotated pages
- index comments
- rank by human signal
- support fast search in web and mobile clients

Suggested stack:
- Postgres for source of truth
- Typesense or Meilisearch for search index
- async workers to denormalize page and comment documents

Search document fields:
- normalized_url
- canonical_url
- page title
- domain
- extracted summary
- tags
- comment text
- unique verified-human count
- vote counts
- reputation-weighted score
- recency

### 5. Moderation and abuse service

Responsibilities:
- reports
- rate limits
- profile restrictions
- one-human vote enforcement
- ban and appeal workflows
- optional jury mechanics later

### 6. Client delivery service

Responsibilities:
- API auth
- extension config
- website support manifests
- feature flags
- runtime config for supported domains

## Storage

### Source of truth

Use Postgres.

Suggested tables:
- users
- wallet_bindings
- sessions
- pages
- comments
- votes
- reports
- saves
- follows
- tags
- page_summaries
- verdicts
- moderation_actions

### Search index

Use:
- Typesense or Meilisearch for MVP
- OpenSearch only if scale or ranking complexity demands it later

### Object storage

Use S3-compatible storage for:
- avatars
- screenshots
- optional page snapshots
- moderation evidence
- exported data

## API shape

### Public-ish client API

- POST /auth/world-id/verify
- POST /auth/wallet/bind
- GET /me
- PATCH /me/profile

- GET /pages/lookup?url=
- GET /pages/:id
- GET /pages/:id/comments
- POST /pages/:id/comments
- POST /comments/:id/vote
- POST /comments/:id/report
- POST /pages/:id/save

- GET /profiles/:handle
- GET /profiles/:handle/comments
- GET /profiles/:handle/saves

- GET /search?q=
- GET /search/suggestions?q=

### Internal / worker APIs

- POST /internal/index/page
- POST /internal/index/comment
- POST /internal/page/fetch-metadata
- POST /internal/page/recompute-summary

## Workers and queues

Use background jobs for:
- metadata extraction
- title and favicon fetching
- search indexing
- summary recomputation
- reputation recomputation
- abuse heuristics
- notification fanout

Suggested queue:
- BullMQ, Faktory, or a small managed queue
- keep it simple early

## Browser extension specifics

The extension should not own business logic.
It should:
- detect page context
- fetch page thread data
- render overlay via Shadow DOM
- submit comments and votes
- cache lightly
- hand off auth to the web app when needed

## iOS specifics

The iOS app should not try to be a universal system overlay.
It should:
- own search
- own profiles
- own saved pages
- open pages in an in-app browser
- show Human Layer inside that browser view

## Electrobun specifics

The Electrobun desktop app should use the same APIs as the extension and web app.
Additional capabilities:
- integrated ad blocking
- hide native comments
- built-in Human Mode toggle
- browser-side reading and history
- unified search entrypoint

## Privacy principles

- keep nullifier_hash private
- never expose more than needed to the public profile
- separate human verification from public identity
- allow pseudonymity by default
- treat wallet binding as optional for most users

## Recommended hosting

MVP-friendly:
- frontend on Vercel or similar
- API on Fly, Render, or Railway
- managed Postgres
- managed object storage
- Meilisearch or Typesense
- background workers on the same platform at first

## Infra order of operations

1. Postgres schema
2. World ID verification flow
3. page and comment APIs
4. search indexer
5. web app auth and profile pages
6. extension integration
7. iOS client
8. Electrobun desktop app
