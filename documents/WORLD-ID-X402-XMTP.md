# World ID, x402, XMTP, and AgentKit / IDKit

## Why this matters

The hackathon requirements create a strong product stack:

- World ID proves there is a real human in the loop
- x402 monetizes or rate-limits valuable actions
- XMTP makes the workflow conversational and social
- AgentKit can extend the system to agent traffic and paid agent access
- Human Layer can turn all of that into a trust and discovery product

## AgentKit vs IDKit

### IDKit

IDKit is the World ID proof and verification layer.

Use it when the goal is:
- prove a user is a unique human
- get a nullifier or proof
- gate actions like comment, vote, follow, endorse, or review
- prevent sybil abuse

For Human Layer, IDKit is the must-have piece.

### AgentKit

World's Agent Kit is the agent-facing layer.
The World docs position it around agent traffic and x402-style access.

Use it when the goal is:
- let agents access services safely
- meter or paywall agent actions
- handle agent traffic without spam
- expose APIs or workflows to external agents

For Human Layer, AgentKit is optional at first but strong later.

## Simple distinction

- IDKit = prove the human
- AgentKit = manage the agent

They are complementary, not interchangeable.

## How Human Layer should use IDKit

Use IDKit anywhere Human Layer needs one-human rules.

Core actions:
- create a profile
- comment
- upvote or downvote
- follow people
- endorse people
- join moderation juries
- access human-only circles
- become an arbiter or reviewer
- join Human Graph onboarding

Good product language:
- one human, one profile
- one human, one vote
- one human, one moderation seat
- one human, one arbiter identity

## How Human Layer should use AgentKit

Human Layer can expose high-value APIs for agents.

Examples:
- search pages by verified-human signal
- search people by interest overlap
- request a page verdict
- request a human summary
- request a human review or jury
- fetch trust or reputation signals

This is where AgentKit becomes useful:
- agents query Human Layer
- Human Layer meters or monetizes access
- agents can safely consume human trust signals

## How Human Layer should use x402

x402 should live at the API edge, especially for premium and agent-facing actions.

Best x402 endpoints:
- POST /api/search/human
- POST /api/graph/recommend
- POST /api/page/request-summary
- POST /api/page/request-verdict
- POST /api/jury/request-review
- POST /api/publisher/embed
- POST /api/trust/profile
- POST /api/reputation/domain

What x402 should not be used for:
- basic consumer comments
- every small social interaction
- core onboarding steps

The best pattern is:
- consumers use the product fluidly
- publishers, power users, and agents pay for high-value actions

## How Human Layer can use x402 better

Move beyond using x402 only as anti-spam task posting.

Stronger x402 uses:
- premium human-ranked search
- paid expert discovery
- paid moderation or review requests
- paid verdict generation
- paid digests and alerts
- publisher widgets
- enterprise trust APIs

That creates a real business model:
- end users get a smooth social product
- API consumers and agents fund the network

## How Human Layer should use XMTP

XMTP should be the social and coordination layer, not just a bot shell.

Best XMTP uses:
- follow notifications
- page discussion threads shared into chat
- "ask humans about this page"
- expert outreach
- interest circles
- jury or moderation coordination
- "share this page with trusted humans"

Good XMTP product surfaces:
- send a page to a group of trusted humans
- receive a verdict or summary in chat
- DM an expert discovered through Human Graph
- get notified when a followed human comments on a page or topic

## How ThresholdGatedDrain is already using these

Current stack in the hackathon repo:

### XMTP today
The bot is already a real product surface.
It supports:
- post task
- register arbiter
- verify signature
- score
- status
- balance
- withdraw

### World ID today
World ID is already used to verify arbiters.
The repo has:
- server-side World ID verification
- RP signature generation
- verified arbiter registration
- IDKit-friendly config endpoints

### x402 today
x402 is already wired on task creation.
POST /task can require:
- a payment header
- $0.01 USDC
- facilitator-backed x402 flow with graceful fallback

That means the current project already demonstrates all three technologies in a meaningful way.

## How Human Layer should combine them

Strongest layered architecture:

- IDKit verifies the human identity
- XMTP carries the human conversation and notifications
- x402 charges for premium API actions
- AgentKit exposes Human Layer to external agents

That gives Human Layer:
- human trust
- social coordination
- monetized APIs
- agent-native access

## Strong Human Layer demo architecture

### User side
- user verifies with World ID through IDKit
- user creates a pseudonymous profile
- user comments, follows, and saves pages
- user joins Human Graph and interest discovery

### Chat side
- Human Layer sends XMTP notifications
- user can ask trusted humans about a page in chat
- user can share pages into topic groups or circles

### API side
- Human Layer exposes premium endpoints behind x402
- agents or power users pay for search, graph, summaries, or jury requests

### Agent side
- external agents use AgentKit-style flows to query Human Layer
- they pay through x402 for valuable trust and discovery data

## Best bounty-aligned demo flow

1. A user opens Human Layer and verifies with World ID using IDKit.
2. The user gets a verified-human profile and joins Human Graph.
3. The user opens a page and sees verified-human comments and verdicts.
4. The user asks in XMTP: "What do verified humans think about this?"
5. Human Layer sends a summary or routes the request to a trusted circle.
6. An external agent hits a premium Human Layer endpoint through x402.
7. Human Layer returns human-ranked search or trust data.
8. The demo shows that:
   - humans are verified
   - communication happens in XMTP
   - premium access is paid with x402
   - agents can consume the network through AgentKit-style access

## Strong framing for judges

The cleanest story is:

- World ID verifies the human
- x402 monetizes and rate-limits valuable actions
- XMTP is the communication and social layer
- Human Layer turns those primitives into a trust and discovery product
- AgentKit lets agents plug into the same system

That is stronger than using each technology as a checkbox integration.
