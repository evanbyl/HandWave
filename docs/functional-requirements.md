# Functional Requirements

Each requirement has a stable ID. Code, tests, and pull requests reference these IDs.
Status values: **Proposed** → **Accepted** → **Implemented** → **Verified**.

## Glossary

| Term | Meaning |
|---|---|
| **Spectrum card** | A pair of opposite ideas shown at the two ends of the dial, e.g. *Insult ↔ Compliment*. |
| **Dial** | A half-circle from the card's left concept to its right concept. Positions run from 0 (far left) to 100 (far right). |
| **Target** | A secret position on the dial chosen at random when a clue is created. |
| **Clue** | One card + one target + one **clue text** (a short phrase that guides guessers toward the target), made by one player. A clue stays open for anyone else to guess, indefinitely. Called a *turn* in earlier decision records (ADR-001–ADR-009) and in the code (`Turn`). |
| **Guess** | One player's dial position for one clue. |
| **Active player** | The player who has identified themselves as currently holding the phone. |

---

## 1. Players and identity

| ID | Requirement | Status |
|---|---|---|
| FR-101 | A player is identified by a **name and an emoji**. No passwords or accounts. | Implemented |
| FR-102 | Anyone can **join at any time** by entering a name and choosing an emoji in a single step. An emoji not used by any active player is **pre-selected**, so typing a name and pressing Join is enough. | Implemented |
| FR-103 | Each player's name + emoji combination must be unique, so players can spot themselves at a glance. | Implemented |
| FR-104 | A player can **leave at any time**. Leaving hides them from the "Who are you?" picker but keeps their clues, guesses, and scores. | Implemented |
| FR-105 | A player who left can **rejoin** and pick up their existing history and scores. | Implemented |
| FR-106 | The game supports any number of players from 1 upward. No minimum player count is enforced. | Implemented |

## 2. Hand-off and first screen

| ID | Requirement | Status |
|---|---|---|
| FR-201 | When the app opens, or after **Pass the phone** is tapped, it shows a **"Who are you?"** picker listing active players by emoji and name, plus a **"Join Game"** button for new players. | Implemented |
| FR-202 | After a player picks themselves, they land on **their home screen**, which shows: clues waiting for them to answer, a button to create a new clue, and the **top four** players by **Today's** score. The *Clues to guess* and *Top scores* sections are **hidden when empty**, with no placeholder text, to save vertical space. | Implemented |
| FR-203 | Every screen shows the active player's emoji and name, and a **Pass the phone** button that returns to the picker. | Implemented |
| FR-204 | Every screen except the "Who are you?" picker shows a **one-line plain-language instruction** of what to do next (e.g. "Drag the needle to where you think the clue points"). A person handed the phone mid-game must be able to act without any explanation. The picker has no instruction line, since its heading and Join Game button already say what to do and vertical space is tight. | Implemented |
| FR-205 | There is no enforced turn order. Any player may create clues or answer clues in any order and in any quantity before passing the phone. | Implemented |
| FR-206 | The picker shows a short **"How to play"** that describes HandWave's own flow, not the board game's: one phone passed around, make clues and answer others' clues in any order, no talking, join or leave anytime. | Implemented |
| FR-207 | The UI calls the unit of play a **clue** and a player's response a **guess**. The two actions are **Write a clue** and **Guess**. It avoids "turn" (confused with whose turn it is to hold the phone) and invented terms like "wave". | Implemented |

## 3. Writing a clue

| ID | Requirement | Status |
|---|---|---|
| FR-301 | The active player can create a new clue from their home screen. | Implemented |
| FR-302 | Creating a clue **draws a random spectrum card** from the deck (built-in plus custom cards). | Implemented |
| FR-303 | The creator may **redraw** the card before submitting. Redraws are unlimited. | Implemented |
| FR-304 | The app picks a **random target** position on the dial for the clue. | Implemented |
| FR-305 | The target is **hidden by default**. The creator sees it only while **pressing and holding** a "Peek at target" control (hold-to-peek). Releasing hides it again. | Implemented |
| FR-306 | The creator types the **clue text** and submits. It must not be empty. | Implemented |
| FR-307 | After submitting, the clue is saved and immediately available for all other players to answer. | Implemented |
| FR-308 | There is no limit on how many clues a player creates before passing the phone. | Implemented |
| FR-309 | The creator **cannot answer their own clue**. | Implemented |
| FR-310 | The creator can **delete their own clue** from the *My clues* tab of the Clues screen. Deleting asks for confirmation, then removes the clue and every guess on it, so the points from those guesses leave everyone's scores. Players can't delete other players' clues. Clues can't be edited. | Implemented |

## 4. Guessing a clue

| ID | Requirement | Status |
|---|---|---|
| FR-401 | The home screen lists **Clues to guess**: clues written by others that the active player hasn't guessed yet. | Implemented |
| FR-402 | Opening a clue shows the card's two ends, the clue text, and who wrote it. The target and other players' guesses stay hidden. | Implemented |
| FR-403 | The guesser sets their answer by **dragging a dial needle** across the half-circle, then submits. | Implemented |
| FR-404 | Each player can answer each clue **once**. A submitted guess cannot be changed. | Implemented |
| FR-405 | Right after submitting, the guesser sees the **reveal**: the target, the scoring zones, their own needle, their points for the clue, and all other guesses on that clue. The list of players' points is headed **"Scores"** (not "Guesses", which reads as a count). | Implemented |
| FR-406 | A player can answer any number of clues before passing the phone. | Implemented |
| FR-407 | Clues never close. A player who joins later can answer any earlier clue they didn't create. | Implemented |
| FR-408 | When the reveal is shown and more clues are waiting for the active player, a **Next clue** button opens the next one directly. | Implemented |

## 5. Viewing clues and history

| ID | Requirement | Status |
|---|---|---|
| FR-501 | The active player can browse **all clues**, filtered as: *To guess*, *I guessed*, and *My clues*. | Implemented |
| FR-502 | For a clue the active player **answered**, they can see the target, every player's guess, and every player's points for that clue. | Implemented |
| FR-503 | For a clue the active player **created**, they can see the target, every guess, every guesser's points, and the clue's clue score (FR-603), at any time. | Implemented |
| FR-504 | For a clue the active player has **not answered and did not create**, the target and others' guesses stay hidden until they answer (see FR-402). | Implemented |

## 6. Scoring

Calculations are defined in ADR-010.

| ID | Requirement | Status |
|---|---|---|
| FR-601 | A guess earns **zone points of 4, 3, 2, or 0** based on its distance from the target (ADR-006 zones, carried into ADR-010). | Implemented |
| FR-610 | **Middle bonus:** a scoring guess on a clue whose target is in the middle third of the dial earns **+1**. | Implemented |
| FR-611 | **Best-guess bonus:** on a clue with two or more guesses, the highest-scoring guess earns **+1**. Ties share it, it needs a score above 0, and a later better guess takes it over. | Implemented |
| FR-602 | Each player has a **Guessing Score** built from the points of their guesses. | Implemented |
| FR-603 | Each clue has a **Clue Score**: the mean of its guessers' zone and middle points (not the best-guess bonus). A clue with no guesses has no Clue Score yet. | Implemented |
| FR-604 | Each player has a **Clue Score** component built from the Clue Scores of the clues they wrote. | Implemented |
| FR-605 | Each player has a **combined score** used to rank the leaderboard, built from all their guesses and clues. | Implemented |
| FR-612 | **Recent play counts most:** Today scores weight each new result at 20%, so a score always moves, however much someone has played. | Implemented |
| FR-613 | **No lucky starts:** every player's score starts from a typical value (2.0), so one early bullseye can't top the board. | Implemented |
| FR-606 | The Scores screen shows **Today** by default, with an **All-time** toggle. Each row shows the combined score with the **Guessing Score** and **Clue Score** as components. | Implemented |
| FR-614 | **Today** starts at 4:00 AM local time. Players with nothing today aren't ranked on Today's board. | Implemented |
| FR-615 | **All-time** is a steady career score over every result, with the same lucky-start protection. | Implemented |
| FR-616 | **Streak flame:** a player whose last 3 or more guesses in a row each earned 3 or 4 zone points shows 🔥 next to their name. Display only; no points. | Implemented |
| FR-617 | The reveal shows each guess's total points and names any bonus earned (e.g. "+1 middle target", "+1 best guess 👑"). | Implemented |
| FR-609 | The UI calls these simply **scores**. It doesn't explain, label, or mention averaging or weighting, or show how many events a score is based on; the math stays behind the scenes (FR-607). | Implemented |
| FR-607 | Because players join and leave freely, scores are **averages, never totals**. Playing more clues doesn't raise a score; joining late or leaving early doesn't hurt one. | Implemented |
| FR-608 | Scores update immediately after every guess. | Implemented |

## 7. Spectrum card deck

| ID | Requirement | Status |
|---|---|---|
| FR-701 | HandWave ships with a **built-in deck of about 100 original spectrum cards**. | Implemented |
| FR-702 | Players can **add custom cards** by entering a left concept and a right concept. | Implemented |
| FR-703 | Custom cards are mixed into the deck for future draws. | Implemented |
| FR-704 | Custom cards can be deleted. | Implemented (per assumption in Q2; still Proposed) |

## 8. Game session

| ID | Requirement | Status |
|---|---|---|
| FR-801 | There is **one ongoing game** on the phone. It continues across app closes and restarts. | Implemented |
| FR-802 | A **New game** action clears all clues, guesses, and scores. It requires a confirmation step. | Implemented |
| FR-803 | New game keeps the player list and custom cards. | Implemented (per assumption in Q1; still Proposed) |

## 9. Navigation and input

| ID | Requirement | Status |
|---|---|---|
| FR-901 | The browser's or phone's **Back** does the same thing as the on-screen Back, Cancel, Skip, or Done button: it returns to the screen the player came from (e.g. a clue opened from the Clues screen returns to that screen and tab). | Implemented |
| FR-902 | On the home screen, Back does the same as **Pass the phone**: it returns to the "Who are you?" picker. | Implemented |
| FR-903 | On the "Who are you?" picker, Back doesn't leave right away. It shows a **"Leave HandWave?"** prompt saying the game is saved. Pressing Back again leaves; **Stay** (or tapping anything else) dismisses the prompt. | Implemented |
| FR-904 | A single-line text field's **submit button sits inside the field, on the right** (e.g. *Send* in the clue field, *Join* in the name field, *Add* in the card field). | Implemented |
| FR-905 | The keyboard's **Enter / Go / Send key submits** the field. In the two-field custom card form, Enter in the first field moves to the second. | Implemented |
| FR-906 | Picking an emoji while typing a name doesn't close the keyboard or clear what's typed. | Implemented |
