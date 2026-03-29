# Integration Proposals

Human Layer grows fastest when contributors can propose new surfaces without needing to land a full production implementation on day one.

## Easiest path

1. Fork the repo.
2. Open a branch for your proposal.
3. Use .github/PULL_REQUEST_TEMPLATE/integration-proposal.md.
4. Submit a pull request, even if it is docs-only.

## Good proposals include

- the site, plugin, or integration to support
- the exact page types or URL patterns
- why Human Layer improves decisions on that surface
- the trust or utility signals that matter there
- a few real example URLs

## Docs-only proposals are welcome

You do not need to ship code to propose a worthwhile integration.

A strong docs-only PR can still be valuable if it includes:

- page examples
- expected normalization behavior
- product framing for the surface
- any safety or moderation concerns
- edge cases like login walls, locales, or dynamic URLs

## Common implementation files

If you do want to add code, these are usually the main touchpoints:

- packages/core/src/normalize.ts
- packages/core/src/supported-domains.ts
- packages/core/src/page-context.ts
- apps/extension/entrypoints/content.tsx
- apps/web/app/api/pages/lookup/route.ts

## Good fit

Human Layer works best on pages where a single URL represents one thing people need to judge, such as:

- a repo, release, package, plugin, or marketplace item
- a docs page or technical answer
- a research paper or model page
- a video, podcast episode, or playlist

The best proposals explain what the human-only layer adds there.
