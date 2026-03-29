# Implementation Roadmap

## Overall sequence

Plan for a small team: roughly 10 weeks from foundation to a polished MVP.

## Phase 0: Foundation

Timebox: Week 1

Goal:
- make the core page and identity model stable before UI work expands scope

Deliverables:
- Postgres schema for profiles, pages, page aliases, comments, verdicts, saves, follows, XMTP bindings, message requests, and x402 events
- page-type enum and URL normalization library with exact V1 rules for GitHub repository, issue, and pull request pages plus Hacker News item threads and HN-linked external URLs
- supported-domain manifest plus allowlist loader
- blank-page response contract for supported pages with zero activity
- session and auth basics for the web app and extension handoff
- page lookup API that normalizes a URL and returns the canonical page record

Dependencies:
- locked verdict vocabulary
- locked supported-surface list
- World ID app configuration available for Phase 1

Exit criteria:
- common URL variants on GitHub and Hacker News resolve to the same page record
- unsupported domains fail cleanly
- the extension can call the backend and receive page data using a stable API contract

## Phase 1: IDKit verification and profile creation

Timebox: Week 2

Goal:
- make one-human identity real and usable in the product

Deliverables:
- IDKit verification flow in the web app
- app-scoped nullifier verification and storage
- one-profile-per-human enforcement
- pseudonymous handle creation
- explicit interest-tag onboarding
- extension return flow so a user lands back on the same page after verification

Dependencies:
- Phase 0 schema and sessions
- World ID credentials and app settings

Exit criteria:
- a user can verify once, create a profile, and return to the page with write access unlocked
- the same human cannot create duplicate active profiles
- profile data is visible from the web app and extension session

## Phase 2: Extension overlay and page threads on GitHub and Hacker News

Timebox: Weeks 3-4

Goal:
- prove the core read and write loop on the first two surfaces

Deliverables:
- browser extension shell with Shadow DOM overlay
- read-only badge and side panel on GitHub repository, issue, and pull request pages plus Hacker News item threads and linked external URLs
- page-level verdict counts
- flat comments
- save page action
- follow profile action
- top human take block driven only by the highest-rated verified-human comment
- zero-state overlay for supported pages with no activity
- small manually seeded set of demo pages for the first pilot
- basic moderation and rate-limit guards for write actions

Dependencies:
- Phase 0 APIs
- Phase 1 verified sessions and profiles

Exit criteria:
- read-only overlay works without login on GitHub repository, issue, and pull request pages plus Hacker News item threads and linked external URLs
- a verified user can post a verdict and comment from the overlay
- save and follow actions work end to end
- the first demo works entirely on GitHub and Hacker News
- this is the first usable version

## Phase 3: Product Hunt, docs domains, and graph basics

Timebox: Weeks 5-6

Goal:
- broaden the useful surface area while starting the Human Graph loop

Deliverables:
- Product Hunt product-page support
- curated docs-domain support through the manifest
- selected blogs and Substack allowlist support
- saved pages view in the web app
- profile pages with recent comments and saved pages
- follow list and lightweight suggested-humans logic based on explicit interests plus first-party actions

Dependencies:
- Phase 2 stable overlay architecture
- enough seed data from GitHub and Hacker News to validate ranking and profile views

Exit criteria:
- new domains can be added through the manifest without rewriting the extension
- a verified user can save pages and follow people across multiple supported surfaces
- suggested humans can explain why a profile is recommended

## Phase 4: XMTP inbox binding, message requests, mutual DMs, and paid intro

Timebox: Weeks 7-8

Goal:
- turn the profile and follow graph into actual private conversation

Deliverables:
- XMTP inbox binding flow in the web app
- messaging permission settings
- Human Layer inbox for pending requests and accepted conversations
- page-context message requests
- mutual DM unlock flow
- paid intro path when free messaging is not allowed, using one small fixed fee
- request logging, abuse controls, and block/report actions

Dependencies:
- Phase 1 verified profiles
- Phase 3 follows and profile surfaces
- x402 integration available for the paid intro flow

Exit criteria:
- two verified users can bind XMTP and exchange a request plus accepted DM
- messaging permissions are enforced correctly
- paid intro can deliver a request when free access is blocked
- no refund logic is required for MVP completion

## Phase 5: x402 premium endpoints and Human Graph lite polish

Timebox: Weeks 9-10

Goal:
- add premium programmatic value and tighten the graph layer without broadening the product

Deliverables:
- x402-protected page-consensus API
- x402-protected people-search API
- pricing config and payment event logging
- profile overlap reasons and recommended-humans polish
- analytics for supported-page coverage, verification completion, posting, saves, follows, and paid actions

Dependencies:
- Phase 3 profile and graph data
- Phase 4 x402 payment flow and XMTP request flow

Exit criteria:
- both premium endpoints work end to end behind x402
- free social actions remain untouched by payment logic
- the product can demo the full stack: read overlay, verify, write, follow, message, and pay for premium access
