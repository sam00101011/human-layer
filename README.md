# Human Layer

Human Layer is a verified-human context layer for the web.

It sits on top of the websites people already use and adds portable trust:
- verified-human profiles
- page-level takes and verdicts
- topic and people follows
- wallet-signed paid actions
- secure messaging between verified humans

## The problem

The web has a trust problem.

Most websites still treat every account roughly the same, so high-signal pages get buried under spam, bots, fake engagement, and low-context comments. Proof of human will eventually matter everywhere, but websites will implement it too slowly and too unevenly.

Human Layer’s thesis is that the winning move is to build the verified-human layer above the web first, so the product can:
- work across sites right now
- collect the cross-site human graph ahead of the platforms
- become the trust, identity, and reputation layer before native site adoption catches up

## What Human Layer does

Human Layer adds verified-human context directly on supported pages across the web.

In the current build, people can:
- verify once and create a pseudonymous one-human profile
- read and publish page-level takes and verdicts
- follow people and topics
- bookmark pages and build a human-graph feed
- run wallet-signed paid research actions
- message other verified humans in secure chat

Supported surfaces already include pages like GitHub, YouTube, Spotify, docs, marketplaces, and other high-signal web destinations.

## Hackathon integrations

### World ID

World ID is the human-verification layer.

Human Layer uses World ID to gate write access so one real human can create one pseudonymous Human Layer profile. That lets the product reduce spam and sybil behavior without forcing people to post under a public real-name identity.

In the app, World ID powers:
- verified profile creation
- one-human write access
- human-graph identity bootstrapping

### x402

x402 is the paid action layer.

Human Layer links a user-owned passkey wallet on Base and uses wallet-signed x402 flows for paid actions. Instead of subscriptions or custodial credits, users can approve and pay for valuable actions one request at a time.

In the app, x402 powers:
- wallet-signed research actions
- provider commands like StableEnrich / Answer, StableEnrich / Search, and twit.sh search
- a per-user payment history and spend controls

### XMTP

XMTP is the secure messaging layer.

Once verified humans connect, they can move from public page-level context into secure wallet-based chat. Human Layer stores request and inbox state, while the messaging layer itself stays off the main app database.

In the app, XMTP powers:
- verified-human message requests
- wallet-linked inbox binding
- secure live chat sessions

## Demo video

The hackathon demo video is in:

- [demo-video/human-layer-demo-video.mp4](demo-video/human-layer-demo-video.mp4)

## Repo structure

- apps/web — Next.js web app
- apps/extension — WXT browser extension
- packages/core — shared types, URL normalization, demo data, and page-context logic
- packages/db — Drizzle schema, queries, migrations, and seeding
- demo-video — hackathon demo video assets
- documents — product, roadmap, launch, and research notes

## Quick start

1. corepack pnpm install
2. corepack pnpm db:up
3. corepack pnpm db:migrate
4. corepack pnpm db:seed
5. corepack pnpm dev:web
6. corepack pnpm dev:extension

Then open http://127.0.0.1:3000/verify.

## Why this matters

Human Layer is not waiting for every site to add proof of human.

It builds the verified-human graph across the web first, where:
- identity is portable
- trust compounds across sites
- reputation is earned in public
- messaging and paid actions are attached to verified humans instead of throwaway accounts

That gives Human Layer a path to become the trust layer for the open web before websites implement it natively.

## Future direction

Next steps include:
- importing and mapping trusted people from X, YouTube, Discord, Steam, and other networks
- expanding the cross-site human graph
- turning verified-human trust into better discovery, messaging, and paid coordination everywhere online
- making Human Layer work as a protocol, not just a single app surface
- decentralizing storage, indexing, and message-routing over time
- letting anyone run a Human Layer node and participate in the network
- exposing open APIs and protocol-level primitives for publishers, apps, and agents
- making reputation, follows, and page-level trust portable across clients
- supporting a broader ecosystem of wallets, clients, and third-party interfaces
