# ADR-001: Spec-driven development with ID'd requirements

Status: Accepted
Date: 2026-11-08

## Context
HandWave will be built largely by Claude, across many sessions. Each session starts without memory of the last, so the source of truth must live in the repo, not in chat history.

## Decision
- Requirements live in `docs/` as markdown catalogs with stable IDs (FR-xxx, NFR-xxx, ADR-xxx).
- Behavior changes start with a spec change; code follows.
- Commits and pull requests name the IDs they implement.
- Open decisions are tracked in `docs/open-questions.md` until resolved into a requirement or ADR.
- `CLAUDE.md` at the repo root tells any Claude session how to work in this repo.

## Consequences
- Any session can pick up work by reading `docs/`.
- Slight overhead per change, in exchange for traceability and fewer surprises.
