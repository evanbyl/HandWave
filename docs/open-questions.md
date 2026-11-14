# Open Questions

Decisions not made yet. Each one resolves into a requirement status change or an ADR.

| # | Question | Affects | Current assumption |
|---|---|---|---|
| Q1 | Should **New game** keep the player list and custom cards? | FR-803 | Keep both |
| Q2 | Should players be able to **delete custom cards**? | FR-704 | Yes |
| ~~Q3~~ | ~~Minimum events before ranking?~~ **Resolved:** lucky-start protection instead (FR-613, ADR-010). | ADR-010 | Prior of 2.0 |
| ~~Q4~~ | ~~Can a creator delete or edit a clue?~~ **Resolved:** creators can delete their own clues; editing isn't allowed (FR-310). | FR-310 | Delete only |
| Q5 | Should there be any **clue rules** (e.g. no numbers, no "left/right")? Shown as tips, not enforced? | FR-306 | Tips only |
| ~~Q6~~ | ~~Private repo vs. GitHub Pages~~ **Resolved:** the repo is public (ADR-009). | ADR-009 | Public |
| Q7 | Should the reveal screen and home screen add any **cover screen** between players? (Not chosen initially; hold-to-peek protects the target while creating.) | NFR-201 | No cover screen |
| Q8 | Are the scoring constants right (zone width 4, 20% form weight, 2.0 prior, +1 bonuses, middle third)? Tune after playtesting. | ADR-010 | As listed in ADR-010 |
