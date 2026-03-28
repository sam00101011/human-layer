# Demo Story

## Judge-friendly framing

"Human Layer adds verified-human context to the pages people already use. You can read it without logging in, but only verified humans can shape it."

## 60-90 second script

1. Start on a live GitHub repo page with the extension installed.
2. Point out that the overlay is already visible without login: verdict counts, the highest-rated verified-human comment as the top human take, and recent comments.
3. Say, "Anyone can read this. Writing is gated to one verified human per profile."
4. Click Verify to write and complete the World ID flow in the web app.
5. Show the pseudonymous profile creation step, then return to the same page automatically.
6. Post a Useful verdict and a short comment.
7. Save the page and follow one commenter to show this is not just anonymous drive-by commenting.
8. Open that profile and click Message or Request intro.
9. Show the XMTP-backed request landing in the Human Layer inbox with the page attached as context.
10. If the recipient blocks free requests, show the x402 paid-intro prompt and complete the payment.
11. End with the line: "The page is public to read, identity is scarce for writing, conversation is real through XMTP, and premium access is handled by x402 only when it should be."

Do not use Product Hunt, docs, or blogs in the first demo. They are later V1 rollout surfaces, not part of the first proof.

## What proves World ID is real

- show the actual IDKit verification step
- show that write actions are locked before verification and unlocked after it
- show the verified-human badge on the resulting pseudonymous profile

## What proves XMTP is real

- show a bound XMTP inbox on the recipient profile
- send a real message request with page context
- show the request appear in the Human Layer inbox backed by XMTP

## What proves x402 is real

- use x402 on the paid-intro flow when normal messaging is blocked
- show the price before the action, the successful payment, and the resulting delivered request
- if time allows, keep a terminal tab ready with the premium page-consensus endpoint as a second proof point

## Fallback if one integration is flaky

- if World ID is flaky, start from a pre-verified session and show the stored verified-human profile plus the gated write action now unlocked
- if XMTP is flaky, use two pre-bound demo accounts and show the pending request already delivered in the inbox
- if x402 is flaky, show the premium endpoint or a previously completed paid-intro receipt and then continue the rest of the demo live
- if density is flaky, start on a manually seeded GitHub or Hacker News page rather than risking a blank first impression

## Demo discipline

- use GitHub first because the value is obvious fast
- keep the verdict and comment short so the flow does not stall
- do not branch into extra surfaces unless the core loop is already clear
- keep the emphasis on the product wedge: verified-human context on real pages, not generic identity plumbing
