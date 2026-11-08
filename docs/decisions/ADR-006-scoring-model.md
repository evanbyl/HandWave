# ADR-006: Scoring zones and averages

Status: Accepted
Date: 2026-11-08

## Context
Scoring follows the classic 4/3/2/0 zone style (FR-601). Because players come and go, every score must be an average, not a total (FR-607). Clue-givers also earn points (FR-603), and the leaderboard ranks by one combined number (FR-605).

## Decision

### Dial and target
- Dial positions run from 0 to 100 (continuous).
- The target is a random position from 0 to 100.

### Points for a guess
Let `d` = the absolute distance between the guess and the target, and `w` = zone width (starting value **4**, a tunable constant).

| Distance | Points |
|---|---|
| `d ≤ w/2` (center zone) | 4 |
| `d ≤ 1.5w` (next zone out) | 3 |
| `d ≤ 2.5w` (outer zone) | 2 |
| otherwise | 0 |

With `w = 4`, the full scoring area is 20 units wide (a fifth of the dial). Zones near the ends are simply cut off by the dial's edge.

### Averages
- **Guess average** = mean points over all of the player's guesses.
- **Clue score** for a turn = mean points of everyone who answered it.
- **Clue average** = mean of the player's clue scores, over turns with at least one answer.
- **Combined average** = the mean of *all* the player's scoring events together: each guess counts once and each scored clue counts once.

  `combined = (sum of guess points + sum of clue scores) / (number of guesses + number of scored clues)`

- The leaderboard shows all three, plus the counts behind each (FR-606).

## Consequences
- Joining late or leaving early doesn't help or hurt a ranking.
- Players with very few events can rank high on a lucky start. A minimum-events rule could be added later; tracked in `docs/open-questions.md`.
- Zone width is easy to tune after playtesting.
