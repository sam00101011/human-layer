# Electrobun Desktop MVP

## Goal

Test whether Human Layer should become a full Human Mode browser product, not just an extension.

## Product promise

A desktop browser-like app where the user can:
- browse the web
- hide ads
- hide native comments
- view verified-human comments and summaries by default
- search the web through human signal

## Why do this after the extension

The extension proves the wedge.
The desktop app tests whether the wedge is strong enough to own the whole browsing session.

## Core features

- embedded Chromium in an Electrobun app shell
- top-level navigation bar
- Human Layer side panel
- human-first address bar / launcher
- ad blocking
- hide native comments toggle
- page verdict and summary visible by default
- profile, saves, and search built into the app

## Modes

### Standard mode
- browse page normally
- Human Layer panel available

### Human Mode
- native comments hidden where possible
- ads blocked
- Human Layer badges and thread visible by default
- human search prioritized

## Benefits versus extension

- more consistent overlay behavior
- stronger control over page rendering
- first-class Human Mode UX
- easier to hide noisy site-native layers
- built-in search instead of bolt-on search

## Risks

- browser maintenance burden
- cookies and login complexity
- performance and memory pressure
- much larger product scope

## MVP scope

- a small supported-site list
- one profile system
- one search experience
- one save system
- no sync-heavy browser features like bookmarks import or tabs sync at first

## Exit criteria

Ship only after the extension proves:
- people want Human Mode
- people repeatedly browse with the overlay active
- search and comments are sticky enough to justify a dedicated desktop surface
