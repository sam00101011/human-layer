# iOS MVP

## Goal

Make Human Layer useful on mobile without depending on impossible system-wide browser injection.

## Product promise

An iPhone app where a verified human can:
- search the web by human signal
- open pages in an in-app browser
- read Human Layer summaries and comments
- comment, vote, save, and follow profiles
- share any URL into the app

## Best shape

Do not pitch this as "Safari but with total overlay control."

Pitch it as:
- search
- profile
- reader
- in-app browser with Human Layer

## Core screens

- onboarding and verification
- search
- page detail
- in-app browser
- comment thread
- profile page
- saves
- notifications later

## Core flows

### Search flow
1. user searches in app
2. result cards show human summaries and counts
3. user opens a page
4. in-app browser loads page with Human Layer panel or bottom sheet

### Share flow
1. user shares a URL from Safari or another app
2. Human Layer opens the URL
3. app fetches existing thread and summary
4. user can save or comment

## Features

- World ID verification
- pseudonymous profile
- page-level comments
- votes
- saves
- search
- in-app browser
- share extension

## Non-goals

- universal overlay across all apps
- Safari extension parity on day one
- full browser replacement
- desktop-like moderation workflow

## Why iOS matters

- mobile reading is frequent
- search and save behavior is strong on mobile
- the app can become the cleanest "reader with human context" version of the product
