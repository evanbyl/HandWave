# Working in this repo

HandWave uses spec-driven development (see `docs/decisions/ADR-001-spec-driven-development.md`).

1. Read `docs/functional-requirements.md`, `docs/non-functional-requirements.md`, and `docs/decisions/` before changing code.
2. If a change alters behavior, update the spec first: add or edit the requirement, or add a new ADR. Never edit an accepted ADR; supersede it.
3. Reference requirement IDs (FR-xxx, NFR-xxx, ADR-xxx) in commit messages and pull request descriptions.
4. Move open items from `docs/open-questions.md` into the spec once they're decided.
5. Keep scoring logic pure and tested (NFR-602).
6. Built-in card content must be original (NFR-604).
