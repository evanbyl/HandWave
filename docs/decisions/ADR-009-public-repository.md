# ADR-009: Public repository

Status: Accepted
Date: 2026-11-08
Amends: ADR-004

## Context
ADR-004 noted that GitHub Pages doesn't serve private repositories on a free plan (open question Q6).

## Decision
The `evanbyl/HandWave` repository is public. The game is served at `https://evanbyl.github.io/HandWave/`.

## Consequences
- Free hosting through GitHub Pages works.
- Anyone can read the code and specs. Nothing secret belongs in the repo; the game has no secrets or keys (ADR-005, ADR-008).
