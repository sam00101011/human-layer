# Start Here

Human Layer V1 is a browser-extension-first verified-human overlay for high-signal web pages, paired with a lightweight web app for verification, profiles, saves, follows, and messaging access control.

## Target user

The first users are builders, researchers, and other high-signal internet users who already spend time on GitHub, Hacker News, Product Hunt, docs sites, and selected blogs.

## First problem solved

When a user lands on a page that matters, they cannot quickly tell what verified humans think about it. Human Layer solves that by showing page-level verdicts, flat comments, and the top human take, defined in V1 as the highest-rated verified-human comment, directly on the page, with no login required for reading.

## First surfaces

The V1 surface set is intentionally narrow:
- first usable build and first demo:
  - GitHub repository, issue, and pull request pages
  - Hacker News item threads and the linked external URLs behind those items
- later V1 expansion:
  - Product Hunt product pages
  - a curated docs-domain allowlist
  - a manual allowlist of selected blogs and Substack publications

X and Coinbase matter in V1 only as profile and interest signals. They are not overlay targets.

## Why this wedge is right

This is the right starting wedge because it combines high pain with low platform dependency:
- these pages already have real evaluation behavior, but the signal is fragmented and noisy
- an extension can add value immediately without asking publishers for distribution
- read-only overlay without login removes the cold-start penalty
- verified write actions create a human-quality layer without forcing real names
- page-level threads are simple enough to ship quickly and dense enough to matter

## Top 3 tradeoffs

1. We are choosing page-level threads over inline anchoring because speed and clarity matter more than precision in V1.
2. We are choosing a small supported-surface allowlist over a universal overlay because density beats breadth at launch.
3. We are choosing pseudonymous verified-human profiles over real-name identity because scarce human voice matters more than legal identity for this wedge.

## Top 3 next actions

1. Build the shared backend primitives: page-type schema, URL normalization, supported-domain manifest, blank-page response shape, and session handoff between web app and extension.
2. Ship World ID via IDKit so verified users can create one pseudonymous profile and unlock verdicts, comments, saves, and follows.
3. Launch the extension on GitHub and Hacker News first, including a strong empty state and a small manually seeded set of demo threads so the first pilot is not all zero-density.
