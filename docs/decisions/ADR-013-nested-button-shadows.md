# ADR-013: No shadows on buttons nested inside controls

Status: Accepted
Date: 2026-11-13
Amends: ADR-012 (Buttons)

## Context
ADR-012 gave **every** button the sticker shadow. Buttons that sit inside a text field (Join, Send, Add) then had a shadow that ran into the field's own outline and shadow, which looked cramped and messy.

## Decision
- **A button nested inside another control that already has a sticker shadow gets no shadow of its own.** The outer control owns the shadow. Today this covers the buttons inside text fields; any future nested button follows the same rule.
- Pressing a nested button still gives instant, hold-able feedback (FR-210): it **shrinks slightly** while held and springs back on release, instead of sinking into a shadow.
- Everything else in ADR-012 stands: every other button keeps its shadow.

## Consequences
- The rule lives in one place in the stylesheet (buttons inside `.field-row`).
- Screen transitions are unaffected: a button carried into a field (Join Game → Join, Write a clue → Send) already morphs its shadow away as it lands.
