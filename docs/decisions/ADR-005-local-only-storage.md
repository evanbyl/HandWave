# ADR-005: Store all data locally on the phone

Status: Accepted
Date: 2026-11-08

## Context
HandWave is played on a single, shared phone. There's no need for multiple devices to sync, and a server would add hosting, accounts, and privacy concerns.

## Decision
- All data (players, turns, guesses, custom cards) is stored in the browser on the phone (NFR-202).
- Data is stored as one versioned document (NFR-303), saved after every change.
- Storage starts with `localStorage`; switch to IndexedDB through a new ADR if size limits become a problem.
- Scores are **derived** from turns and guesses each time they're displayed, not stored separately, so they can never drift out of sync.

## Consequences
- Works offline with no backend.
- A game can't move to another phone. Export/import could be added later.
- Clearing browser data deletes the game (NFR-304).
