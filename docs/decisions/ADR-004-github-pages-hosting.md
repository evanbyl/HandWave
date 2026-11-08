# ADR-004: Host on GitHub Pages

Status: Accepted (hosting detail amended by ADR-009)
Date: 2026-11-08

## Context
The app is entirely static (ADR-005 rules out a backend), and the code already lives on GitHub.

## Decision
Deploy the built site to GitHub Pages through a GitHub Actions workflow on every push to `main` (NFR-603).

## Consequences
- Free hosting, HTTPS included (required for PWAs).
- Players just open a link.
- Note: on a free GitHub plan, Pages for a **private** repo isn't available; the repo may need to be public, or the account upgraded. Tracked in `docs/open-questions.md`.
