# XMTP Messaging

## Core idea

Human Layer can support private messaging between users through XMTP.

The key nuance is:
- XMTP messages are already end-to-end encrypted by default

So the product feature Human Layer is really adding is not "turn encryption on."
It is:
- mutual DM access control
- profile-linked messaging permissions
- anti-spam rules
- optional paid introductions

## Best product framing

Human Layer becomes a verified-human encrypted messaging network.

That means:
- verified-human to verified-human private chat
- Human Graph profiles can turn into real conversations
- page-level context can carry into chat
- the server never needs message contents, only profile settings and XMTP bindings

## Recommended model

Each user binds an XMTP inboxId to their Human Layer profile.

Then each profile has a messaging setting such as:
- Encrypted DMs: Off
- Encrypted DMs: Mutual opt-in
- Encrypted DMs: Followers
- Encrypted DMs: Verified humans only

The "Start encrypted chat" button only appears if:
- both users have linked XMTP identities
- both users allow the relationship
- both users satisfy the selected access rule

## Why this fits Human Layer

This is a strong extension of Human Graph.

It lets users:
- move from discovery to conversation
- ask a person about a page, topic, or verdict
- contact a trusted human privately
- build interest circles and expert networks

That is stronger than using XMTP as only a bot interface.

## Anti-spam controls

Best anti-spam rules:
- only verified humans can DM
- mutual opt-in by default
- followers-only or circles-only options
- message requests instead of fully open DMs
- block and report controls
- rate limits for first-contact requests

## Optional x402 paid intro

One especially strong feature is:
- optional x402 paid intro for messaging someone outside your circle

This works well when:
- the target user does not accept open DMs
- the sender wants to contact a high-signal person
- the platform wants to prevent low-quality outreach

Good flow:
1. sender finds a person through Human Graph
2. sender clicks "Request intro"
3. if normal DM access is not allowed, Human Layer offers a paid intro via x402
4. the sender pays a small amount
5. the recipient receives a message request with context and payment signal
6. the recipient can accept, ignore, or refund depending on product policy

Why this is strong:
- creates economic friction against spam
- gives high-signal users control over access
- creates a monetization path without charging everyone
- fits naturally with expert outreach and reputation-based messaging

## Best first version

For an MVP, keep it simple:
- XMTP inbox binding
- mutual opt-in encrypted DMs
- verified-human-only message requests
- optional paid intro for out-of-network outreach

That is enough to make Human Layer feel like:
- a discovery network
- a trust network
- a private communication network

## Important nuance

If Human Layer uses XMTP, encryption itself is not the optional part.

Access is the optional part.

So the real product settings are things like:
- who can message me
- when can they message me
- does a message request require mutual opt-in
- does a message request require a paid intro

That is the cleanest way to present the feature.
