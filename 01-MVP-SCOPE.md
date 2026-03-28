# MVP Scope

## Exact MVP statement

Human Layer MVP is a desktop browser extension plus lightweight web app that overlays page-level, verified-human discussion on a small set of high-signal websites. Anyone can read the overlay without logging in. Verified humans can choose a fixed verdict, leave a flat comment, save pages, follow people, and use access-controlled XMTP messaging. The top human take in V1 is the single highest-rated verified-human comment on the page. x402 is used only for paid intro and premium programmatic access.

## Target user and use case

The primary user is a builder or researcher evaluating links across GitHub, Hacker News, Product Hunt, docs, and essays. They want to know:
- is this worth my time?
- do verified humans think this is useful, misleading, outdated, or a scam?
- who are the humans whose judgment I should follow?

## Supported sites and platforms in V1

Supported overlay targets in the first usable build:
- GitHub repository pages
- GitHub issue pages
- GitHub pull request pages
- Hacker News item thread pages
- external URLs linked from supported Hacker News items

Supported later in V1 after the first usable build is stable:
- Product Hunt product pages
- curated docs article pages on a manual allowlist
- selected blog posts and Substack posts on a manual allowlist

Supported profile and interest signals:
- X as an optional linked profile and interest signal only
- Coinbase as an optional interest signal only
- GitHub as an optional linked profile signal

Not supported as overlay targets in V1:
- X
- Coinbase
- GitHub user profiles, commit pages, release pages, or Discussions
- Hacker News home, newest, ask, jobs, and user pages
- arbitrary search results pages
- arbitrary websites outside the allowlist

## In-scope features

- read-only overlay on supported pages without login
- World ID verification through IDKit to unlock write actions
- one pseudonymous verified-human profile per human
- page-level threads keyed by normalized URL
- one fixed verdict per verified human per page
- flat comments only
- top human take selected from human-written comments only, with no generated summary layer
- save page
- follow verified humans
- explicit interest tags and first-party actions to power a lightweight Human Graph
- XMTP inbox binding, message requests, and mutual DMs
- x402 paid intro for cold outreach with a small fixed fee, accept-or-ignore recipient handling, and no refund logic in MVP
- x402 premium API access for exactly two endpoints:
  - page consensus for a supported URL
  - people search by topic and domain overlap

## Explicitly out of scope

- inline text anchoring
- nested comments or forum-style threading
- iOS app
- Electrobun or full browser shell
- enterprise publisher widget
- giant protocol or portable trust layer beyond the MVP schema
- AgentKit dependency
- full-web search before enough Human Layer data exists
- passive browsing-history surveillance for Human Graph
- charging x402 for basic comments, saves, follows, or reading
- real-name identity requirements

## Empty-state strategy

Low density is the main launch risk, so blank pages must still feel intentional.

On a supported page with no thread activity yet, the overlay shows:
- the page is supported
- zero verified takes so far
- a short explanation of what Human Layer is
- a clear verify-to-write CTA for becoming the first take

It does not show:
- AI-generated filler
- fake summaries
- placeholder verdicts

For the first demo and initial pilot, manually seed a small set of canonical GitHub and Hacker News pages with real verified-human comments so the product can demonstrate density without pretending the network is already broad.

## Success criteria

- users can install the extension and see overlay data on supported pages without creating an account
- a verified human can complete IDKit verification, create a profile, return to the page, and post a verdict plus comment in one continuous flow
- GitHub repository, issue, and pull request pages plus Hacker News item threads and linked URLs feel stable enough to use daily
- saved pages and follows create a visible profile history and a basic suggested-humans experience
- XMTP message requests work between two verified users with Human Layer access rules enforced
- paid intro and at least one premium x402 endpoint work end to end without affecting free social actions

## Failure risks

- too many supported surfaces too early, causing thin data and brittle normalization
- verification friction preventing enough users from reaching write mode
- trying to build search, messaging, and graph depth before page overlay density exists
- treating XMTP or x402 as hackathon checkboxes instead of tightly scoped product surfaces
- drifting into surveillance-style graph building instead of explicit interests and first-party actions

## Why other ideas are delayed

Search, iOS, desktop browser, enterprise widgets, and deeper trust infrastructure are all real opportunities, but they are delayed because they do not solve the first proof point: do verified humans actually want to leave and read page-level judgment on live, high-signal pages. V1 should prove density, habit, and trust on the overlay first. Once that exists, search, richer graphing, and broader clients become much lower-risk expansions.
