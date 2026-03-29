# World ID Primitives

## What World ID usually gives

- proof that the user passed World ID verification
- an app-scoped nullifier or nullifier_hash
- proof metadata like proof, merkle_root, action, signal_hash, and sometimes verification level
- a wallet address only if the app separately asks the user to connect or sign

## What it does not give by default

- exact age
- name
- email
- phone number
- a global public profile

## Best mental model

Treat World ID as a way to mint anonymous, scarce, human-bound rights.

Not:
- "who are you?"

But:
- "what rights does one human get here?"

## Powerful use of the nullifier

The nullifier can act as:
- a durable pseudonymous identity key inside the app
- one-human-one-account enforcement
- one-human-one-vote enforcement
- one-human-one-claim enforcement
- reputation anchor
- ban-evasion resistance
- anti-sybil gating

## Powerful use of the wallet

The wallet address gives:
- payout destination
- contract caller identity
- signing endpoint
- onchain permissions

The best pattern is:
- nullifier_hash = durable human identity
- wallet = current signing and payout endpoint

## Encoder/decoder framing

World ID can become a global encoder/decoder layer:
- encoder: attach a human proof to an action or request
- decoder: reinterpret the system with one-human rules

That means websites or apps can enforce:
- one human, one comment
- one human, one vote
- human-only reading
- human-only posting
- human-only moderation

## Important caution

Verified human is not:
- trusted
- expert
- adult
- legally identified
- guaranteed honest
