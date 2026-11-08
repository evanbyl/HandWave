# ADR-008: Claude builds the game; no AI inside the game

Status: Accepted
Date: 2026-11-08

## Context
Claude could play a role inside the game (generating cards, acting as a player, judging clues), or only help build it.

## Decision
Claude writes the specs and code. The game itself makes no AI calls at runtime. Built-in cards are written ahead of time and shipped with the app (FR-701).

## Consequences
- Fully offline, free to run, and private (NFR-202, NFR-401).
- AI features could be revisited later through a new ADR.
