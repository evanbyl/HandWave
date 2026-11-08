# Functional Requirements

Each requirement has a stable ID. Code, tests, and pull requests reference these IDs.
Status values: **Proposed** → **Accepted** → **Implemented** → **Verified**.

## Glossary

| Term | Meaning |
|---|---|
| **Spectrum card** | A pair of opposite ideas shown at the two ends of the dial, e.g. *Insult ↔ Compliment*. |
| **Dial** | A half-circle from the card's left concept to its right concept. Positions run from 0 (far left) to 100 (far right). |
| **Target** | A secret position on the dial chosen at random when a turn is created. |
| **Clue** | A short phrase the creator writes to point guessers toward the target. |
| **Turn** | One card + one target + one clue, created by one player. A turn stays open for anyone else to answer, indefinitely. |
| **Guess** | One player's dial position for one turn. |
| **Active player** | The player who has identified themselves as currently holding the phone. |

---

## 1. Players and identity

| ID | Requirement | Status |
|---|---|---|
| FR-101 | A player is identified by a **name and an emoji**. No passwords or accounts. | Accepted |
| FR-102 | Anyone can **join at any time** by entering a name and choosing an emoji in a single step. | Accepted |
| FR-103 | Each player's name + emoji combination must be unique, so players can spot themselves at a glance. | Accepted |
| FR-104 | A player can **leave at any time**. Leaving hides them from the "Who are you?" picker but keeps their turns, guesses, and scores. | Accepted |
| FR-105 | A player who left can **rejoin** and pick up their existing history and scores. | Accepted |
| FR-106 | The game supports any number of players from 1 upward. No minimum player count is enforced. | Accepted |

## 2. Hand-off and first screen

| ID | Requirement | Status |
|---|---|---|
| FR-201 | When the app opens, or after **Pass the phone** is tapped, it shows a **"Who are you?"** picker listing active players by emoji and name, plus a **"I'm new"** option. | Accepted |
| FR-202 | After a player picks themselves, they land on **their home screen**, which shows: turns waiting for them to answer, a button to create a new turn, and the leaderboard. | Accepted |
| FR-203 | Every screen shows the active player's emoji and name, and a **Pass the phone** button that returns to the picker. | Accepted |
| FR-204 | Every screen shows a **one-line plain-language instruction** of what to do next (e.g. "Drag the needle to where you think the clue points"). A person handed the phone mid-game must be able to act without any explanation. | Accepted |
| FR-205 | There is no enforced turn order. Any player may create turns or answer turns in any order and in any quantity before passing the phone. | Accepted |

## 3. Creating a turn

| ID | Requirement | Status |
|---|---|---|
| FR-301 | The active player can create a new turn from their home screen. | Accepted |
| FR-302 | Creating a turn **draws a random spectrum card** from the deck (built-in plus custom cards). | Accepted |
| FR-303 | The creator may **redraw** the card before submitting. Redraws are unlimited. | Accepted |
| FR-304 | The app picks a **random target** position on the dial for the turn. | Accepted |
| FR-305 | The target is **hidden by default**. The creator sees it only while **pressing and holding** a "Peek at target" control (hold-to-peek). Releasing hides it again. | Accepted |
| FR-306 | The creator types a **clue phrase** and submits. The clue must not be empty. | Accepted |
| FR-307 | After submitting, the turn is saved and immediately available for all other players to answer. | Accepted |
| FR-308 | There is no limit on how many turns a player creates before passing the phone. | Accepted |
| FR-309 | The creator **cannot answer their own turn**. | Accepted |

## 4. Answering a turn

| ID | Requirement | Status |
|---|---|---|
| FR-401 | The home screen lists **turns waiting for the active player**: turns created by others that this player hasn't answered yet. | Accepted |
| FR-402 | Opening a turn shows the card's two ends, the clue, and who created it. The target and other players' guesses stay hidden. | Accepted |
| FR-403 | The guesser sets their answer by **dragging a dial needle** across the half-circle, then submits. | Accepted |
| FR-404 | Each player can answer each turn **once**. A submitted guess cannot be changed. | Accepted |
| FR-405 | Right after submitting, the guesser sees the **reveal**: the target, the scoring zones, their own needle, their points for the turn, and all other guesses on that turn. | Accepted |
| FR-406 | A player can answer any number of turns before passing the phone. | Accepted |
| FR-407 | Turns never close. A player who joins later can answer any earlier turn they didn't create. | Accepted |

## 5. Viewing turns and history

| ID | Requirement | Status |
|---|---|---|
| FR-501 | The active player can browse **all turns**, filtered as: *Waiting for me*, *I answered*, and *I created*. | Accepted |
| FR-502 | For a turn the active player **answered**, they can see the target, every player's guess, and every player's points for that turn. | Accepted |
| FR-503 | For a turn the active player **created**, they can see the target, every guess, every guesser's points, and the turn's clue score (FR-603), at any time. | Accepted |
| FR-504 | For a turn the active player has **not answered and did not create**, the target and others' guesses stay hidden until they answer (see FR-402). | Accepted |

## 6. Scoring

| ID | Requirement | Status |
|---|---|---|
| FR-601 | A guess earns **4, 3, 2, or 0 points** based on its distance from the target, using classic scoring zones (see ADR-006). | Accepted |
| FR-602 | Each player has a **guess average**: the mean of the points from all their guesses. | Accepted |
| FR-603 | Each turn has a **clue score**: the mean of the points earned by everyone who answered it. A turn with no answers has no clue score yet. | Accepted |
| FR-604 | Each player has a **clue average**: the mean of the clue scores of the turns they created that have at least one answer. | Accepted |
| FR-605 | Each player has a **combined average** used to rank the leaderboard (calculation in ADR-006). | Accepted |
| FR-606 | The leaderboard shows each player's **combined average**, with their **guess average** and **clue average** shown as components, plus how many guesses and scored clues each is based on. | Accepted |
| FR-607 | Because players join and leave freely, all scores are **running averages**, never running totals. A player's ranking is not penalized for joining late or leaving early. | Accepted |
| FR-608 | Scores update immediately after every guess. | Accepted |

## 7. Spectrum card deck

| ID | Requirement | Status |
|---|---|---|
| FR-701 | HandWave ships with a **built-in deck of about 100 original spectrum cards**. | Accepted |
| FR-702 | Players can **add custom cards** by entering a left concept and a right concept. | Accepted |
| FR-703 | Custom cards are mixed into the deck for future draws. | Accepted |
| FR-704 | Custom cards can be deleted. | Proposed |

## 8. Game session

| ID | Requirement | Status |
|---|---|---|
| FR-801 | There is **one ongoing game** on the phone. It continues across app closes and restarts. | Accepted |
| FR-802 | A **New game** action clears all turns, guesses, and scores. It requires a confirmation step. | Accepted |
| FR-803 | New game keeps the player list and custom cards. | Proposed |
