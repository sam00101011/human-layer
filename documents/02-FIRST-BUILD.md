# First Build

## What gets built first, in order

1. Shared backend foundation: schema, URL normalization, supported-domain manifest, page lookup, and session basics.
2. World ID verification and pseudonymous profile creation in the web app.
3. Extension read-only overlay on GitHub and Hacker News.
4. Verified write actions: verdict, flat comment, save page, and follow profile.
5. XMTP inbox binding, message requests, and mutual DMs in the web app.
6. x402 paid intro and two premium API endpoints.
7. Product Hunt, curated docs domains, and selected blogs/Substack added through the manifest.

## First demo cut

The first usable build and first demo stop after step 4.

That means the first thing shown publicly is:
- GitHub repository, issue, and pull request pages
- Hacker News item thread pages
- external URLs linked from supported Hacker News items
- read-only overlay without login
- verify-to-write for verdicts, flat comments, saves, and follows

Product Hunt, docs domains, blogs, XMTP, and x402 still belong in V1, but they are not required for the first demoable product.

## Read-only overlay flow

1. User installs the extension.
2. User opens a supported page.
3. Extension normalizes the URL and checks the supported-domain manifest.
4. Extension requests the page record, verdict counts, top human take, recent comments, and empty-state metadata from the backend.
5. Extension injects a badge plus side panel through Shadow DOM.
6. User can read the verdict distribution, top human take, and recent comments without logging in.
7. If there is no data yet, the overlay still renders a clean zero-state that says the page is supported but has no verified-human take yet.

## Verify-to-write flow

1. User clicks any gated action such as Leave a take, Save, or Follow.
2. Extension opens the web app verification flow in a popup or tab with the current page URL attached as return context.
3. User completes World ID verification through IDKit.
4. Backend stores the app-scoped nullifier hash and creates or reuses the single allowed profile for that human.
5. User chooses a pseudonymous handle and a small set of interest tags.
6. Web app sets the session cookie and returns the user to the originating page.
7. Extension refreshes capabilities and unlocks write actions immediately.

## Verdict, comment, and save flow

1. Verified user opens the panel on a supported page.
2. User selects exactly one verdict from the fixed vocabulary.
3. User can optionally add a short page-level comment.
4. User can save the page to their profile in the same action or afterward.
5. Backend enforces one active verdict per verified human per page and stores the comment separately.
6. The overlay updates the verdict counts and comment list in place.
7. The top human take is always a real verified-human comment, never generated text.
8. V1 ranking rule is exact: choose the verified-human comment with the highest helpful-vote count from verified users; if there is a tie, choose the most recent tied comment; if there are no comments, show no top human take card.

## Follow and profile flow

1. User clicks a handle in the overlay or web app.
2. The profile page shows pseudonymous handle, verified-human badge, selected interests, supported linked accounts, recent comments, and saved pages.
3. Verified user can follow that profile.
4. Followed profiles appear in the user profile and power lightweight people recommendations later.
5. X and Coinbase are shown only as optional profile or interest signals, not destinations for overlay rendering.

## XMTP message-request flow

1. Verified user connects and binds an XMTP inbox in the web app settings.
2. User chooses a messaging rule: mutual only, followers, or verified-human requests.
3. On another profile, Human Layer checks both users' messaging settings and relationship state.
4. If allowed, the sender opens a message request seeded with page context.
5. Recipient sees the request in the Human Layer web inbox backed by XMTP.
6. If the recipient accepts and the relationship rule is satisfied, the conversation becomes a mutual DM.
7. Human Layer stores binding, settings, request metadata, and abuse controls, but not message contents.

## x402 paid-intro flow

1. Sender tries to message a profile that does not accept free requests from that relationship.
2. Human Layer offers a paid intro instead of a normal request.
3. Sender sees one small fixed fee, the page context, and the delivery promise before payment.
4. x402 payment is completed.
5. Human Layer records the paid intro event and delivers the request into the recipient's XMTP inbox with the payment signal attached.
6. Recipient can accept or ignore according to product policy.
7. V1 does not implement refund logic. That complexity is deferred.

## Fixed verdict vocabulary

The V1 verdict set is fixed and small. The canonical stored values are:
- useful
- misleading
- outdated
- scam

Every page-level judgment in V1 uses one of those four values. Nuance lives in the comment body, not in a growing verdict taxonomy.

## Empty-state strategy

Supported pages with no activity still render a real overlay.

The zero-state should show:
- supported by Human Layer
- no verified takes yet
- short explanation of why verification matters
- one clear verify-to-write CTA

The zero-state should not show:
- generated summaries
- fake activity
- open text boxes for unverified users

For demo and pilot readiness, manually seed a small founder-controlled set of GitHub and Hacker News pages with real verified-human comments so at least a few pages show non-empty state on day one.

## First surfaces in rollout order

1. GitHub repository pages
2. GitHub issue pages
3. GitHub pull request pages
4. Hacker News item thread pages
5. external URLs linked from supported Hacker News items
6. Product Hunt product pages
7. curated docs article pages
8. selected blog and Substack post pages

## Acceptance criteria for the first usable version

The first usable version is complete when:
- the extension renders a stable read-only overlay on GitHub repository, issue, and pull request pages plus Hacker News item threads and linked external URLs without login
- a user can verify with World ID, create a pseudonymous profile, and return to the same page with write access unlocked
- a verified user can leave one verdict, one comment, save the page, and follow another verified profile
- top human take is always the highest-rated verified-human comment and never AI-generated
- supported pages with no activity render a strong zero-state instead of a broken or empty panel
- unsupported sites fail cleanly with no broken injection
- the first demo can be run entirely on GitHub and Hacker News without depending on Product Hunt, docs, blogs, XMTP, or x402
- the supported-domain manifest can add later allowlisted surfaces without changing the core extension architecture
