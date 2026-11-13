# ADR-010: Recent-weighted scores, bonuses, Today and All-time

Status: Accepted
Date: 2026-11-13
Supersedes: ADR-006 (the scoring zones are carried over unchanged)

## Context
ADR-006 ranked players by a plain average of every guess and clue. Averages are still the right base: a total would reward hogging the phone to write and guess the most clues. But playtesting showed two problems:

- **Frozen scores.** Once a player has many results, one more barely moves their average.
- **Lucky starts.** A single early bullseye can put a new player at the top (open question Q3).

Evan also wanted a reward for the best guess on a clue, a reward for harder middle-of-the-dial targets, a "Today" leaderboard, and a streak flame.

## Decision

### Points for one guess
1. **Zone points** are unchanged from ADR-006: 4 / 3 / 2 / 0 by distance from the target, zone width `w = 4` on a 0–100 dial.
2. **Middle bonus (+1):** if the target is in the middle third of the dial (33.3–66.7) and the guess earns zone points, it gets +1. Nobody can choose a middle target (targets are random and survive a card redraw), so this rewards difficulty, not gaming.
3. **Best-guess bonus (+1):** on a clue with **two or more** guesses, every guess tied for the highest zone points gets +1, as long as that highest score is above 0. It's recomputed as guesses arrive, so a later, better guess takes the bonus over.
4. A guess's points = zone + middle + best-guess. Maximum 6.

### Points for a clue
5. A clue's **Clue Score** = the mean, over its guessers, of zone + middle points. The best-guess bonus is left out: it's a personal reward, and including it would inflate every clue with two or more guessers. Middle-target clues therefore earn the clue-giver more automatically, so the middle bonus is shared by guessers and clue-giver.

### Scoring events
6. Each guess is an event at the time it was made, worth its points.
7. Each clue with at least one guess is an event worth its Clue Score, timed at its **most recent guess**, so a clue counts on the day it's being guessed.

### Today: the form score
8. **Today** starts at **4:00 AM local time**, so a late night counts as one day.
9. The Today score is a **form score**: start at the **prior** `P = 2.0`, then for each of today's events in time order, `score = score + 0.2 × (event − score)`. Each new result counts for 20%, and older ones fade smoothly.
10. Starting from the prior is the **lucky-start protection**: one bullseye (6) moves a fresh player from 2.0 to 2.8, not to the top. After about 10 events the prior has almost no weight.
11. The Guessing Score and Clue Score components use the same formula over just guess events or just clue events. The combined score uses all events.
12. A player with no events today has no Today score and isn't ranked (shown as "–", listed last).

### All-time: the career score
13. **All-time** is a steady career figure: `(sum of event values + P × k) / (number of events + k)` with `k = 2`. It's a plain average with the same lucky-start protection.

### Streak flame
14. A player's **streak** is the number of their most recent guesses in a row (all-time, by time) with **zone points of 3 or 4**. A streak of **3 or more** shows 🔥 next to their name. It's display-only and never adds points.

### Presentation
15. The UI still never explains the math or mentions averaging (FR-609). The reveal names the bonuses ("+1 middle target", "+1 best guess 👑") so players learn them by seeing them.
16. Everything stays derived from turns and guesses each time it's displayed (ADR-005). No schema change.

### Tunable constants
`ZONE_WIDTH = 4`, `MIDDLE = 33.3–66.7`, `MIDDLE_BONUS = 1`, `BEST_BONUS = 1`, `FORM_WEIGHT = 0.2`, `PRIOR = 2.0`, `PRIOR_WEIGHT = 2`, `DAY_START_HOUR = 4`, `STREAK_MIN_POINTS = 3`, `STREAK_FLAME_AT = 3`. All live in `src/scoring.ts`.

## Consequences
- Scores move after every result, whatever someone's history.
- One lucky guess can't top the board; consistent play can.
- Volume still isn't rewarded: more results don't raise a score, they only make it more current.
- Bonuses push max guess points to 6, so scores are no longer "out of 4". The UI stops saying that.
- A best-guess bonus can move to a later guesser, so a past guess's points can change. The reveal always shows current points.
- Today's board is empty until someone plays that day; home hides the section until then (FR-202).
