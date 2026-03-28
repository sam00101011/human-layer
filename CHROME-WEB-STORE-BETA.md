# Chrome Web Store Beta Pack

Use this file to prepare the first private or unlisted Chrome Web Store submission for Human Layer.

## Current production URLs

- App URL: [https://human-layer-web.vercel.app](https://human-layer-web.vercel.app)
- Privacy policy: [https://human-layer-web.vercel.app/privacy](https://human-layer-web.vercel.app/privacy)
- Terms: [https://human-layer-web.vercel.app/terms](https://human-layer-web.vercel.app/terms)
- Support: [https://human-layer-web.vercel.app/support](https://human-layer-web.vercel.app/support)

## Extension package

Create the submission artifact with:

```bash
cd "/Users/samuelzeller/conductor/human layer"
corepack pnpm release:extension -- --app-url https://human-layer-web.vercel.app
```

The packaged artifact will be written to:
- [release-artifacts](/Users/samuelzeller/conductor/human%20layer/release-artifacts)

## Suggested listing copy

### Name

Human Layer

### Summary

Verified-human context for GitHub and Hacker News.

### Description

Human Layer adds a verified-human context layer to supported pages on the web.

In the current beta, Human Layer works on GitHub repositories, issues, pull requests, and on Hacker News item pages. It lets people see page-level verdicts, recent comments, top human takes, and verified-human profiles directly where they already browse.

Human Layer uses World ID to unlock one-human write access while keeping profiles pseudonymous.

Current beta features:
- page-level verdicts and comments
- verified-human profiles
- page saves and follows
- web app handoff from the extension

Current supported surfaces:
- GitHub
- Hacker News

## Suggested category

Productivity

## Suggested screenshots to capture

Capture these before submission:
- GitHub repo page with the overlay visible
- GitHub issue or pull request page with the overlay visible
- Full Human Layer page route after clicking the overlay header
- Verified-human profile page
- Verification flow screen

## Reviewer notes

Use this in the Chrome Web Store reviewer notes field:

Human Layer is currently a private beta extension that overlays verified-human context on supported GitHub and Hacker News pages. The extension injects an overlay only on supported domains and uses the hosted web app for verification, profiles, and page routes. Verification uses World ID to gate one-human write actions.

## Submission checklist

- production app URL is live
- privacy policy URL works
- support URL works
- terms URL works
- extension version is intentional
- release zip was generated from the production app URL
- screenshots were captured from the current production build
- support email is configured in the store listing
- reviewer notes mention GitHub and Hacker News only
