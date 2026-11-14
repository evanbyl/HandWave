# Architectural Decision Records

Each record captures one decision: the context, what was decided, and the consequences. A decision isn't edited after it's accepted; it's **superseded** by a new record.

| ID | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-spec-driven-development.md) | Spec-driven development with ID'd requirements | Accepted |
| [ADR-002](ADR-002-mobile-web-app.md) | Mobile web app (PWA), not a native app | Accepted |
| [ADR-003](ADR-003-typescript-vite.md) | TypeScript + Vite, no UI framework | Accepted |
| [ADR-004](ADR-004-github-pages-hosting.md) | Host on GitHub Pages | Accepted |
| [ADR-005](ADR-005-local-only-storage.md) | Store all data locally on the phone | Accepted |
| [ADR-006](ADR-006-scoring-model.md) | Scoring zones and averages | Superseded by ADR-010 |
| [ADR-007](ADR-007-identity-honor-system.md) | Name + emoji identity on the honor system | Accepted |
| [ADR-008](ADR-008-no-ai-at-runtime.md) | Claude builds the game; no AI inside the game | Accepted |
| [ADR-009](ADR-009-public-repository.md) | Public repository (amends ADR-004) | Accepted |
| [ADR-010](ADR-010-scoring-v2.md) | Recent-weighted scores, bonuses, Today and All-time (supersedes ADR-006) | Accepted |
| [ADR-011](ADR-011-pop-visual-design.md) | "Pop" visual design: tokens, type, shapes, icons, motion | Accepted (motion and button shape amended by ADR-012) |
| [ADR-012](ADR-012-screen-transitions.md) | Screen transitions (navigation map) and button press feel | Accepted (amended by ADR-013, ADR-014) |
| [ADR-013](ADR-013-nested-button-shadows.md) | No shadows on buttons nested inside controls | Accepted |
| [ADR-014](ADR-014-new-card-flies-whole-card.md) | New card flies the whole card (ends and dial) | Accepted |

Template for new records:

```
# ADR-NNN: Title
Status: Proposed | Accepted | Superseded by ADR-NNN
Date: YYYY-MM-DD
## Context
## Decision
## Consequences
```
