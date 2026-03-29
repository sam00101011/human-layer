# Roadmap

## North star

Build the verified-human layer for the web:
- Human comments on top of websites
- Human-first search
- Pseudonymous but scarce user profiles
- Human Graph for people discovery
- Human Mode as a browser behavior, not just a feature

## Sequencing principle

Ship the smallest surface that proves people want:
- verified-human context on real pages
- verified-human ranking over bot-driven ranking
- persistent pseudonymous identity with one-human rules
- verified-human discovery that feels useful, not creepy

## Phase 0: Foundation

Goal:
- make the core identity and page-thread model real

Deliver:
- World ID verification flow
- nullifier-backed pseudonymous account model
- optional wallet binding
- normalized URL model
- page-level threads
- comments, votes, saves, reports
- basic profile pages
- moderation queue
- search ingestion pipeline for annotated pages only

Exit criteria:
- one verified human can verify, comment, vote, and see their profile
- same human cannot create duplicate active accounts in the app
- page threads work reliably on at least 5 supported sites

## Phase 1: Browser Extension MVP

Goal:
- prove the overlay wedge on desktop web

Deliver:
- Chrome-compatible extension
- page-level overlay panel
- human count badge
- verified-human comments
- one-human voting
- top summary and verdict chip
- support for GitHub, docs, Hacker News links, YouTube, arXiv, major blogs
- basic web app for profiles and authentication

Success metrics:
- weekly active verified humans
- comments per verified human
- pages with annotations
- return rate to annotated pages

## Phase 2: Human Search MVP

Goal:
- make the overlay data discoverable and useful

Deliver:
- search UI in the web app
- result cards with human summaries
- ranking by verified-human signal
- domain filters and topic tags
- saved searches and saved pages
- profile reputation visible in search results

Success metrics:
- search clickthrough rate
- percentage of searches with useful results
- median search latency
- repeat search sessions per user

## Phase 3: Human Graph MVP

Goal:
- help users discover verified humans with overlapping interests and platform affinity

Deliver:
- follow graph
- public pseudonymous profiles
- interest tags
- opt-in platform badges
- suggested humans feed
- people search by tags and platforms
- simple recommendation scoring based on overlap and signal quality

Success metrics:
- follows per verified user
- recommendation clickthrough rate
- percentage of users who complete interests onboarding
- repeat usage of suggested humans and profile pages

## Phase 4: iOS App

Goal:
- make Human Layer usable on mobile without waiting for browser-level injection

Deliver:
- iOS app with sign in and World ID verification
- search
- profiles
- saves
- suggested humans feed
- in-app browser with Human Layer overlay
- share extension: Open in Human Layer

Success metrics:
- mobile search retention
- save rate
- pages opened in the in-app browser
- profile follows and repeat sessions

## Phase 5: Electrobun Desktop App

Goal:
- test whether Human Mode should become a full browser product

Deliver:
- Electrobun shell with embedded Chromium
- integrated ad blocking
- hide native comments option
- Human Layer overlay always available
- Human search built into the address bar / launcher
- side panel for comments, profiles, saved pages
- optional site-level Human Mode toggle

Success metrics:
- browsing sessions inside the app
- Human Mode toggles used per day
- pages read with native comments hidden
- search to browse conversion

## Phase 6: Network Effects And Trust Layer

Goal:
- deepen the product from comments to a real humanhood network

Deliver:
- richer profile reputation
- expertise tags
- domain-specific trust weighting
- moderation juries
- human-only circles or communities
- per-site or per-topic human feeds
- stronger Human Graph ranking and lists
- social graph features like follow, reply, save, endorse

## Phase 7: Monetization

Candidate models:
- premium search and filters
- premium profile tools
- moderation and trust tools for communities
- enterprise APIs for human scoring and anti-sybil gating
- hosted Human Mode for publishers
- market products built on the same identity and reputation layer

## Recommended order

1. Foundation
2. Browser extension
3. Human search
4. Human Graph
5. iOS app
6. Electrobun desktop app
7. Network and monetization layers

## Why this order

- Extension is the sharpest initial wedge.
- Search makes the overlay data valuable beyond a single page.
- Human Graph turns identity into discovery and starts network effects.
- iOS becomes stronger once search, profiles, and discovery exist.
- Electrobun is powerful but expensive; ship it only after the Human Mode behavior is clearly wanted.
