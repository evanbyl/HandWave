# Open Questions

Decisions not made yet. Each one resolves into a requirement status change or an ADR.

| # | Question | Affects | Current assumption |
|---|---|---|---|
| Q1 | Should **New game** keep the player list and custom cards? | FR-803 | Keep both |
| Q2 | Should players be able to **delete custom cards**? | FR-704 | Yes |
| Q3 | Should the leaderboard require a **minimum number of scored events** before ranking a player, so one lucky guess doesn't top the board? | ADR-006 | No minimum; counts are shown instead |
| Q4 | Can a creator **delete or edit a turn** after submitting (e.g. a typo in the clue)? | FR-3xx | Not allowed |
| Q5 | Should there be any **clue rules** (e.g. no numbers, no "left/right")? Shown as tips, not enforced? | FR-306 | Tips only |
| ~~Q6~~ | ~~Private repo vs. GitHub Pages~~ **Resolved:** the repo is public (ADR-009). | ADR-009 | Public |
| Q7 | Should the reveal screen and home screen add any **cover screen** between players? (Not chosen initially; hold-to-peek protects the target while creating.) | NFR-201 | No cover screen |
| Q8 | Is the starting **zone width** (4 units of 100) right? Tune after playtesting. | ADR-006 | 4 |
