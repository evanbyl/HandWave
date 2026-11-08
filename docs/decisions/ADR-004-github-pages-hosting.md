# ADR-004: Host on GitHub Pages

Status: Accepted
Date: 2026-11-08

## Context
The app is entirely static (ADR-005 rules out a backend), and the code already lives on GitHub.

## Decision
Deploy the built site to GitHub Pages through a GitHub Actions workflow on every push to `main` (NFR-603).

## Consequences
- Free hosting, HTTPS included (required for PWAs).
- Players just open a link.
- The repo is **public**, since GitHub Pages doesn't serve private repos on a free plan (resolved open question Q6, 2026-11-08).
- The site lives at `https://evanbyl.github.io/HandWave/`.
