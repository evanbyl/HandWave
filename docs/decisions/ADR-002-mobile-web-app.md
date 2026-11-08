# ADR-002: Mobile web app (PWA), not a native app

Status: Accepted
Date: 2026-11-08

## Context
The game runs on whichever phone a group has handy, iPhone or Android. Native apps need app-store review or sideloading, and building for iOS requires a Mac.

## Decision
Build HandWave as a Progressive Web App: a website that can be installed to the home screen, opens full-screen, and works offline (NFR-401, NFR-404).

## Consequences
- One codebase for every phone; updates ship by deploying the site.
- No app-store listing or review.
- Data lives in the browser's storage, which the user can clear (see ADR-005, NFR-304).
- Haptics and some native features are limited, which is acceptable for a silent, visual game.
