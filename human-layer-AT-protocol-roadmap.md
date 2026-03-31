# Human Layer AT Protocol Roadmap

## Product Spec

Every verified Human Layer user automatically gets an AT Protocol identity like `@handle.humanlayer.social`.

What that identity is for:
- portable follows
- trusted-people lists
- starter packs by interest
- custom human-only feeds
- cross-app discovery and distribution

What it is not for at first:
- replacing World ID
- replacing XMTP
- replacing the existing page comments and verdict database on day one

User flow:
1. Verify with World ID.
2. Choose a Human Layer handle.
3. Human Layer auto-provisions `@handle.humanlayer.social`.
4. User lands in onboarding with starter packs like `AI`, `Devtools`, `Crypto`, `Music`, and `Creators`.
5. Follows inside Human Layer are written to AT Protocol.
6. Human Layer suggests trusted people from lists, starter packs, and graph overlap.
7. Public posting stays opt-in.

Important product rule:
- automatic account creation should be disclosed, not surprising
- default to a minimal profile and no public posting unless the user opts in

## Technical Architecture

Keep the systems split by role:
- `World ID` stays the source of truth for one-human scarcity
- `Human Layer DB` stays the source of truth for profiles, moderation, page takes, wallets, x402, and XMTP access rules
- `AT Protocol` becomes the portable public graph and distribution layer

Core components:
- Human Layer PDS on a domain like `humanlayer.social`
- account provisioning service triggered after World ID verification
- graph sync service that mirrors follows, lists, and starter packs
- feed generator for human-only feeds
- later, a labeler for signals like `verified-human`, `trusted`, and `scam-warning`

Recommended data model:
- `profiles.atprotoDid`
- `profiles.atprotoHandle`
- `profiles.atprotoStatus`
- `atprotoAccounts`
- `atprotoSyncEvents`
- cached follow and list records for fast reads

One honest constraint:
- if accounts are auto-created today, repo keys are likely managed by Human Layer initially
- so this starts as portable managed identity with later export and migration, not fully self-sovereign from day one
- long term, add export, migration, and maybe self-hosted or node-backed options

Best long-term protocol path:
- keep comments and verdicts in the Human Layer DB first
- later define custom lexicons for page takes, trust edges, endorsements, and portable reputation

## Fastest MVP Plan

1. Provision an AT Protocol account on verify.
   Store DID and handle and show them on the Human Layer profile.

2. Mirror follows to AT Protocol.
   If both users have Human Layer AT Protocol identities, write real follow records.

3. Add starter packs and trusted-people lists.
   Generate them from interests plus verified-human graph quality.

4. Launch a Human Layer feed generator.
   Examples: `Verified humans in AI`, `Trusted builders`, `Human-only music discovery`.

5. Add optional Bluesky linking and import.
   Let users import their existing graph and merge it into Human Layer suggestions.

6. Later, move toward custom Human Layer records on AT Protocol.
   That is when page takes, endorsements, and portable trust become protocol-native.

## Recommended Build Order

1. AT Protocol account provisioning after verify
2. follow sync
3. starter packs
4. feed generator
5. Bluesky import
6. custom lexicons later

## Strategic Summary

World ID gives Human Layer scarce humans.

AT Protocol gives those humans a portable public graph, portable feeds, and portable identity before the rest of the web catches up.

That makes Human Layer more than a browser overlay. It becomes a verified-human social and trust layer that can eventually work as an open protocol and not just a single app.
