# ADR-012: Screen transitions and button feel

Status: Accepted (button shadows amended by ADR-013)
Date: 2026-11-13
Amends: ADR-011 (motion section)

## Context
The Join Game transition (FR-208) worked well: one element carries over to the next screen while everything else flies away and the new screen flies in. Evan asked for the same treatment on **every** screen change, for content to stop re-animating in place after it lands, and for all buttons to share one style and a satisfying press-and-hold.

Until now each screen played its own bounce-in when rendered, so content re-animated whenever a screen re-rendered (tab switches, errors, deletes), and the Join transition was hand-written code.

## Decision

### One transition engine (`src/transition.ts`)
Every navigation goes through a single `navigate()` call with a **direction** and an optional **replace** (no Back step). The engine:

1. Copies the outgoing screen into an inert, frozen overlay.
2. Renders the real incoming screen underneath, so it's immediately usable (fields can take focus and typing).
3. Splits both screens into **units**: the header's children, the hint line, `main`'s children, and the footer's children.
4. **Keeps** a unit still (no motion) when the same unit is on both screens: identical markup, or the same `data-keep` key.
5. **Carries over** elements marked with the same `data-hero` key on both screens (the same piece shown in two lists, like a clue row on Home and on All clues, travels with its list instead). A stand-in flies from the old position to the new one, morphing its box (color, outline, corners, shadow) and its label:
   - same text: the text scales to its new size;
   - a word drops off or appears ("Join Game" ↔ "Join"): it slides out or in;
   - different text ("Write a clue" ↔ "Send"): the old label rolls up and out as the new one rolls in.
6. Flies every other outgoing unit **off to the left** and every incoming unit **in from the right**, one after another. Going **back** mirrors it (off to the right, in from the left).
7. Navigating mid-transition finishes it instantly. Reduced motion (NFR-108) switches screens with no animation.

No opacity fades are used; everything moves.

### Navigation map
Direction: **→** forward (old content leaves left), **←** back (old content leaves right).

| From | Action | To | Dir | Carried over (`data-hero`) |
|---|---|---|---|---|
| Who are you? | tap a player / Rejoin | Home | → | avatar, name → header |
| Who are you? | Join Game | Join | → | Join Game → Join (+ white field shrinks onto the name input) |
| Join | Back | Who are you? | ← | Join → Join Game (+ field grows back) |
| Join | Join | Home | → | chosen emoji, typed name → header |
| Any player screen | Pass the phone | Who are you? | ← | header avatar, name → player tile |
| Home | Write a clue | Write a clue | → | Write a clue → Send |
| Write a clue | Send / Cancel / Back | Home | ← | Send → Write a clue |
| Write a clue | New card | Write a clue (replace) | → | only the spectrum ends move |
| Home / Clues | tap a clue | Guess or Reveal | → | clue text → title |
| Guess | Skip / Back | previous | ← | title → clue text |
| Guess | Lock in guess | Reveal (replace) | → | Lock in guess → Next clue / Done; clue, spectrum and dial stay put |
| Reveal | Next clue | Guess (replace) | → | Next clue → Lock in guess |
| Reveal | Done / Back | previous | ← | title → clue text (when listed) |
| Home | All clues / Scores / Cards / More | that screen | → | button label → screen title |
| Those screens | Back | Home | ← | title → button label |
| Clues | switch tab | Clues (replace) | → or ← by tab position | only the list moves |
| Scores | Today ↔ All-time | Scores (replace) | → or ← | only the list moves |
| More | Leave / New game | Who are you? / Home | ← | — |

The Clues screen's title is now "All clues", matching the Home button that opens it, so the label carries straight over.

In-place updates (error messages, delete confirmations, adding or deleting cards) re-render **without any animation**.

### No re-animating in place
- Screens no longer play their own entrance animation on render. Entrances come only from transitions.
- The reveal celebration (zones pop, score badge, confetti, bonus stickers) starts **after** the screen lands.
- The outgoing copy never replays animations.

### Buttons (amends ADR-011 "Shape")
- **Every button** has the ink outline and an offset sticker shadow (3–5 px depending on size).
- **Pressing** pushes the button into its shadow instantly; it **stays pressed while held**; on release the shadow **springs back**. A gesture that turns into a scroll releases it.
- **Selected** tabs and the chosen emoji show the pressed-in state.

## Consequences
- New screens need only `data-hero` / `data-keep` markers to get polished transitions.
- Transition timings live in one module and are easy to tune.
- Browser tests must wait for transitions to settle before reading the screen.
