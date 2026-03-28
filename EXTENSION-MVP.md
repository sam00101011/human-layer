# Extension MVP

## Goal

Build the fastest proof that people want a verified-human comment and verdict layer on top of real websites.

## User promise

When I open a supported page, I can immediately see:
- whether verified humans have discussed it
- a short human summary or verdict
- the thread for that page
- whether the page is considered useful, misleading, scammy, or outdated

## Supported websites

Start with:
- GitHub
- docs sites
- Hacker News links
- YouTube
- arXiv
- major blogs and Substack

## Core features

- World ID sign-in handoff to web app
- extension side panel
- page-level thread keyed by normalized URL
- verified-human comments
- one-human voting
- save page
- report comment
- human count badge
- verdict chip
- top summary block

## UI

Inject via Shadow DOM.

Primary UI pieces:
- right-side drawer
- compact badge pinned near the top-right
- optional small verdict chip near the page title area
- profile links on comments
- one clear call to verify if the user is not verified yet

## Permissions

Minimum practical permissions:
- read current tab URL
- inject UI on supported pages
- communicate with Human Layer backend
- optional local storage for lightweight cache and session hints

## Flows

### Read
1. user opens supported page
2. extension normalizes URL
3. extension fetches page thread and summary
4. extension shows badge and panel

### Write
1. user opens panel
2. if unverified, extension sends them to verify in the web app
3. verified user posts comment
4. thread updates
5. search index updates asynchronously

## Non-goals

- inline text anchoring
- deep site-specific integrations
- universal support for every website
- encryption
- communities
- jury moderation
