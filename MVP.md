# MVP

## Recommended MVP

Build:
- a browser extension
- a web app

Do not start with a universal protocol or a full custom browser.

## Human Comment Overlay

Core loop:
1. User installs extension
2. User verifies with World ID
3. Extension recognizes the current page
4. Page gets a thread keyed by normalized URL
5. Verified humans can comment, vote, save, and report
6. Overlay shows human signal on top of the page

Keep it simple:
- page-level comments only
- no inline paragraph anchoring at first
- pseudonymous handles
- one-human voting
- URL-keyed threads

## Human Search

Do not search the whole internet first.
Search:
- pages humans have annotated
- comment text
- page titles
- domains
- tags
- human summaries

Ranking signals:
- query relevance
- number of unique verified humans
- vote quality
- recency
- domain prior
- reputation-weighted signal
- ratio of useful votes to abuse flags

## Best initial websites

Start with:
- GitHub
- developer docs
- Hacker News link pages
- YouTube
- arXiv
- major blogs and Substack
