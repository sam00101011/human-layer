# Engineering Backlog

## Backend

- P0 Define the core schema for profiles, world_id_verifications, pages, page_aliases, comments, comment_helpful_votes, verdicts, saves, follows, supported_domains, xmtp_bindings, message_requests, and x402_events. Acceptance: migrations apply cleanly and enforce one profile per nullifier plus one verdict per profile per page.
- P0 Add a page_kind enum covering github_repo, github_issue, github_pr, hn_item, hn_linked_url, product_hunt_product, docs_page, and blog_post. Acceptance: the first usable build only enables the first five kinds.
- P0 Implement URL normalization for GitHub repository, issue, and pull request pages plus Hacker News item threads and linked external URLs. Acceptance: known URL variants collapse to one canonical page key.
- P0 Build GET /api/pages/lookup?url= to normalize a raw URL, upsert the canonical page record, and return page metadata plus thread summary.
- P0 Build verified-session middleware for extension and web app requests using an HTTP-only cookie and extension-safe auth handoff.
- P0 Build POST /api/pages/:id/verdict, POST /api/pages/:id/comments, POST /api/pages/:id/save, and POST /api/profiles/:id/follow. Acceptance: all four reject unverified sessions and succeed for a verified profile.
- P0 Build the top-human-take selector so it always returns a human-written verified-user comment and never generated text. Acceptance: it chooses the comment with the highest helpful-vote count; ties resolve to the most recent tied comment; no comments means no top-human-take value.
- P0 Return explicit zero-state metadata from page lookup so the extension can render a supported-but-empty page cleanly.
- P0 Add a small internal seeding script or admin path for founder-controlled demo threads on canonical GitHub and Hacker News pages.
- P1 Build POST /api/comments/:id/helpful with one helpful vote per verified user. Acceptance: duplicate votes from the same profile are rejected.
- P1 Build GET /api/profiles/:handle and GET /api/me with interest tags, linked accounts, recent comments, saves, and follow counts.
- P1 Implement basic rate limits and abuse heuristics on comment posting, follow spam, and repeated messaging attempts.
- P2 Add analytics endpoints for page coverage, verification funnel, post rate, save rate, follow rate, and paid-intro conversion.

## Web app

- P0 Build the verification entry flow with IDKit and a return-to-page parameter so the extension can send users into the app and back.
- P0 Build profile creation with handle selection, avatar placeholder, and explicit interest-tag onboarding. Acceptance: a newly verified user cannot skip handle creation.
- P0 Build the authenticated profile page showing verified-human badge, selected interests, recent comments, and saved pages.
- P1 Build the saved-pages screen with filters for surface and recency.
- P1 Build follow and unfollow controls on profile pages and profile cards.
- P1 Build the messaging settings screen with Mutual only, Followers, and Verified-human requests rules.
- P1 Build the Human Layer inbox UI for pending XMTP requests and accepted conversations.
- P2 Build a lightweight suggested-humans page using explicit interests, shared domains, saved pages, and follows.

## Extension

- P0 Create the Manifest V3 extension shell with supported-domain matching driven by the backend manifest.
- P0 Implement content-script URL detection and page bootstrap for GitHub repository, issue, and pull request pages plus Hacker News item threads and linked external URLs.
- P0 Inject a compact badge and right-side panel using Shadow DOM. Acceptance: host page styles do not break the overlay.
- P0 Render read-only states for verdict counts, top human take, and recent comments without requiring a session.
- P0 Render a strong supported-but-empty zero-state with a verify-to-write CTA when a page has no activity yet.
- P0 Add a clear verify-to-write CTA that opens the web app with return context.
- P0 Add verdict selection, comment compose, save-page action, and follow-profile action in the overlay for verified sessions.
- P1 Add Product Hunt surface support.
- P1 Add generic docs-domain and blog-domain support using the manifest rather than hardcoded site logic.
- P2 Add local caching for last-viewed page data and graceful stale-state fallback when the backend is slow.

## XMTP

- P0 Decide the exact XMTP client package and implement client-side inbox creation or binding in the web app. Acceptance: one verified profile can bind one XMTP inbox.
- P0 Store XMTP binding metadata and messaging permissions on the backend without storing message contents.
- P1 Implement page-context message request creation from a profile or page thread.
- P1 Implement the pending-request inbox and accept-decline actions.
- P1 Implement mutual-DM gating so accepted conversations require the configured access rule to be satisfied.
- P1 Add block and report controls for unwanted requests.
- P2 Add delivery and acceptance telemetry so message-request reliability can be measured during pilot usage.

## x402

- P0 Implement a priced paid-intro endpoint that wraps the message-request creation path when free messaging is blocked. Acceptance: one small fixed fee is configured globally for MVP.
- P0 Record payment state, sender, recipient, requested page context, and final delivery state for every paid intro.
- P1 Implement POST /api/premium/page-consensus behind x402. Acceptance: response includes canonical page, verdict distribution, top human take, and recent verified-human activity.
- P1 Implement POST /api/premium/people-search behind x402. Acceptance: response returns matching profiles plus overlap reasons.
- P1 Add a paid-intro UI in the web app that shows price, context, and result state before and after payment.
- P1 Keep recipient actions to accept or ignore only. Acceptance: no refund workflow exists in MVP.

## Data model and moderation

- P0 Lock the verdict enum to useful, misleading, outdated, and scam. Acceptance: no user-defined verdict strings are accepted anywhere.
- P0 Enforce one active verdict per profile per page and flat comments only.
- P0 Define the supported-domain manifest schema with fields for match patterns, normalization strategy, page-title extraction hints, and rollout state.
- P0 Add moderation fields for flagged, hidden, blocked_profile, and reason_code on comments and message requests.
- P1 Build a lightweight report flow for comments and message requests with an internal review queue.
- P1 Define the Human Graph feature inputs for V1 as explicit interests, saved pages, follows, comment domains, and linked-account badges only.
- P2 Add domain-level reputation rollups for profiles so later recommendations can explain expertise without changing the V1 schema.
