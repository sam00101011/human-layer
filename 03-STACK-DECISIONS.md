# Stack Decisions

## IDKit vs AgentKit

V1 uses IDKit and does not depend on AgentKit.

Why:
- IDKit is the exact tool needed for one-human rules
- AgentKit solves agent identity and agent access, which are not required to prove the first user loop
- x402 can already cover premium programmatic access in V1 without adding another product surface

AgentKit is deferred until there is proven demand for external agent consumers of Human Layer data.

## Exact role of World ID in V1

World ID is the write-gating and identity-scarcity primitive.

Use it for:
- creating one pseudonymous profile per human
- enforcing one human, one verdict per page
- gating comments, saves, follows, and messaging requests
- preventing sybil duplication in basic reputation and moderation logic

Do not use it for:
- real-name identity
- trust scoring by itself
- reading the overlay

Implementation choice:
- run verification in the web app with IDKit
- store the app-scoped nullifier hash server-side
- bind session to that verified profile
- let the extension consume the verified session after handoff

## Exact role of XMTP in V1

XMTP is a real user-facing messaging surface, not a checkbox integration.

V1 XMTP responsibilities:
- bind an XMTP inbox to a Human Layer profile
- power message requests between verified users
- power mutual DMs after both users satisfy the access rule
- carry page context into the initial message request

Human Layer responsibilities around XMTP:
- store inbox binding
- store messaging permission settings
- enforce request eligibility and anti-spam rules
- show a minimal in-app inbox for pending requests and accepted conversations

Human Layer does not own message encryption. XMTP already provides that.

## Exact role of x402 in V1

x402 is for premium access, not basic social interaction.

Use x402 for:
- paid intro when a sender is outside the recipient's free messaging rules
- premium page-consensus API for a supported URL
- premium people-search API for topic and domain overlap

Paid intro policy in V1:
- one small fixed fee
- recipient can accept or ignore
- no refund logic in MVP

Do not use x402 for:
- reading overlays
- World ID verification
- comments
- verdicts
- saves
- follows
- standard message requests that fit the recipient's free access rules

## What is free

- installing the extension
- reading overlay data on supported pages
- verifying with World ID
- creating a pseudonymous profile
- posting a verdict and comment
- saving pages
- following people
- using free XMTP requests when relationship rules allow them

## What is paid

- paid intro outside a user's free DM policy
- premium page-consensus API
- premium people-search API

## What is social

- page verdicts
- flat comments
- saved pages
- follow graph
- XMTP message requests
- mutual DMs

## What is agent-facing

The only agent-facing layer in V1 is the x402-protected premium API surface:
- page consensus
- people search

These endpoints are allowed for agents and power users, but they do not shape the main product loop.

## What is deferred until later

- AgentKit
- inline text anchoring
- nested comments
- iOS app
- Electrobun or a full browser product
- publisher widget or enterprise moderation product
- full-web search
- passive browsing-history graphing
- giant protocol or portable reputation layer

## Recommended stack choices

### Extension

- WXT
- React
- TypeScript
- Manifest V3
- Shadow DOM injection with a shared design-token layer

Reason: WXT keeps extension packaging practical for a small team and makes it easy to share code with the web app.

### Frontend web app

- Next.js App Router
- React
- TypeScript
- lightweight Tailwind-based UI plus shared design tokens

Reason: the web app needs profile pages, verification flows, settings, and a minimal XMTP inbox, not a separate SPA plus API stack.

### Backend

- TypeScript backend inside the same monorepo
- Next.js route handlers for client-facing APIs
- a small worker process for indexing, ranking, and notification fanout
- Redis-backed queue for async jobs and rate limits

Reason: one codebase is faster for MVP, but background jobs should still be separated from request handling.

### Database

- Postgres
- Drizzle ORM

Reason: the relational model is straightforward, the URL and profile constraints matter, and V1 does not need novel infrastructure.

### Search

- Postgres full-text search plus trigram search for V1

Reason: V1 search only covers annotated pages and people. A separate search service is unnecessary until density and ranking complexity justify it.

### Messaging integration

- XMTP Browser SDK in the web app
- server-side tables for bindings, request metadata, settings, and abuse controls

Reason: the product needs real encrypted messaging while keeping Human Layer focused on permissions and graph logic.
