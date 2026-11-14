# ADR-014: New card flies the whole card

Status: Accepted
Date: 2026-11-13
Amends: ADR-012 (navigation map, "New card" row)

## Context
ADR-012 had **New card** fly only the spectrum ends while the dial stayed put. The ends are pills that wrap to one or two lines depending on the words, so the dial slid up or down every time a new card was drawn. Evan didn't like that.

## Decision
- On the Write a clue screen, the spectrum ends and the dial form **one card**. New card flies the whole card off and a new one in, already at its own height.
- The controls below it (Hold to peek, New card, the clue field) stay on screen and glide to their new position if the card's height changed.
- The Guess and reveal screens are unchanged: their ends and dial belong to one clue and never change in place.

## Consequences
- In markup, the ends and dial share a `.card-face` wrapper, which the transition engine treats as one unit.
