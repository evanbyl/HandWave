# HandWave

A silent, phone-passing party game inspired by spectrum-guessing games.

One phone gets passed around a loose circle of people. Anyone holding it can:

- **Write a clue**: draw a spectrum card (e.g. *Cold ↔ Hot*), see a secret target on the dial, and write a phrase that guides guessers to it.
- **Guess**: pick clues written by others, drag the dial needle to where you think the target is, and see how close you got.
- **Check scores**: see each player's running average and every past clue.

There's no turn order and no talking required. It works like a ring of people casually tossing a Frisbee: whoever has the phone plays, then hands it on.

## Project status

First playable version. The project uses spec-driven development: requirements and decisions come first, and code follows them.

| Document | Contents |
|---|---|
| [docs/functional-requirements.md](docs/functional-requirements.md) | What the game does (FR-xxx) |
| [docs/non-functional-requirements.md](docs/non-functional-requirements.md) | Quality bars: usability, performance, privacy (NFR-xxx) |
| [docs/decisions/](docs/decisions/) | Architectural decision records (ADR-xxx) |
| [docs/open-questions.md](docs/open-questions.md) | Things still to decide |

## Planned stack

TypeScript + Vite, built as an installable, offline-capable web app (PWA), hosted on GitHub Pages. All game data stays on the phone. See [docs/decisions](docs/decisions/).
