# ADR-003: TypeScript + Vite, no UI framework

Status: Accepted
Date: 2026-11-08

## Context
The app has a handful of screens and one custom control (the dial). It needs to load fast (NFR-402) and stay easy for Claude to maintain.

## Decision
- **TypeScript** for type-checked game logic and data models.
- **Vite** for the dev server and production build, with a PWA plugin for the offline service worker and install manifest.
- **No UI framework** at the start. Screens are plain DOM rendered from state; the dial is an SVG with pointer events.
- **Vitest** for unit tests of scoring and data logic (NFR-602).

## Consequences
- Small bundle and fast startup.
- If the UI grows complex, a framework can be adopted later through a new ADR.
