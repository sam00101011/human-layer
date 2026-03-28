# Human Graph MVP

## Goal

Help verified humans discover other verified humans to follow based on shared interests, overlapping platform usage, and high-signal behavior across the web.

## Core idea

Human Graph is the discovery layer for Human Layer.

Instead of asking:
- who should I follow on X?
- who else uses Hacker News and Product Hunt?
- who are the real humans into Base, Coinbase, AI, and devtools?

The product answers:
- here are verified humans with meaningful overlap to you
- here is why they are relevant
- here is where the overlap comes from

## Product promise

A user can:
- verify once as a unique human
- build a pseudonymous profile
- optionally link accounts and interests
- discover other verified humans with similar interests
- follow people, not just platforms

## Privacy rule

The MVP should be opt-in and privacy-preserving.

Do:
- let users explicitly choose what interests and platforms appear on their profile
- let users connect accounts where supported
- let users opt in to browser-derived interest signals
- compute some affinity locally before syncing compact signals

Do not:
- silently scrape or publish browsing history
- expose raw page-level history by default
- infer sensitive attributes from private behavior

## Inputs for the MVP

### 1. Explicit interests
Users pick tags such as:
- AI
- crypto
- Base
- Coinbase
- devtools
- startups
- indie hacking
- Product Hunt
- Hacker News
- X
- research

### 2. Platform affinity
Users can opt into platform badges such as:
- active on Hacker News
- active on Product Hunt
- active on X
- uses Coinbase
- active on GitHub
- active on YouTube

For the MVP, these should come from:
- self-declared selections
- lightweight browser extension signals by domain
- linked accounts where practical

### 3. Account links
Start with practical links:
- X
- GitHub
- wallet
- Farcaster later
- email or device trust optionally later

### 4. Human Layer behavior
Use first-party product signals:
- pages saved
- tags followed
- topics commented on
- domains frequently opened
- people followed
- search topics

## Best MVP wedge

Start with:
- World ID verification
- pseudonymous profiles
- explicit topic tags
- opt-in platform badges
- follow graph
- suggested humans feed

That is enough to answer:
- find me verified humans into HN, Product Hunt, X, and Coinbase
- show me builders like me
- show me high-signal humans in AI x crypto x startups

## User flows

### Onboarding
1. verify with World ID
2. choose handle and avatar
3. pick interest tags
4. optionally link X, GitHub, or wallet
5. opt into platform badges and extension signals
6. see suggested humans immediately

### Discovery
1. user visits Suggested Humans
2. app shows verified profiles with overlap reasons
3. user can follow, save, or dismiss
4. ranking improves over time based on follows, saves, and profile visits

### Profile
Each public profile shows:
- handle
- verified human badge
- selected interests
- public platform badges
- top domains or topics
- follower count
- saves, comments, and reputation summary
- optional linked accounts the user chose to expose

## Recommendation logic

Use a simple scoring model first.

Recommendation score can combine:
- interest tag overlap
- platform badge overlap
- linked-account category overlap
- domain affinity overlap
- follow-graph proximity
- reputation or signal quality
- recency of activity

Example output:
- follows HN, Product Hunt, and Coinbase
- frequently annotates GitHub and AI docs
- also interested in Base, devtools, and agents

## Core screens

- onboarding
- edit interests
- account linking
- suggested humans feed
- search people
- profile page
- lists or circles later

## Search for people

The people search should support:
- tags
- platform badges
- linked account presence
- reputation thresholds
- domains of expertise
- mutual follows later

Example searches:
- verified humans into Hacker News and Coinbase
- builders active on Product Hunt and X
- people into Base, AI agents, and devtools

## Data model

Core entities:
- profile
- profile_interest
- profile_platform_badge
- linked_account
- follow_edge
- recommendation_feature
- recommendation_impression
- recommendation_action

Private internal key:
- nullifier_hash

Public identity:
- handle
- avatar
- selected tags
- selected badges

## Success metrics

- percent of verified users who complete interests onboarding
- follows per verified user
- suggested-profile clickthrough rate
- profile save rate
- repeat visits to Suggested Humans
- percentage of follows driven by recommendations

## Non-goals for V1

- raw browsing-history social graph
- automatic posting on third-party platforms
- real-name identity
- complicated creator monetization
- deep algorithmic clustering before basic demand is proven

## Why this matters

Human Layer becomes much stronger when it is not only:
- comments on pages
- search by human signal

but also:
- a verified-human discovery network

That turns the product from a utility into a real social layer.
