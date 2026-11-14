# Non-Functional Requirements

Quality bars every feature must meet. IDs are stable; status values match the functional requirements.

## Usability

| ID | Requirement | Status |
|---|---|---|
| NFR-101 | **Zero-explanation use:** a first-time player handed the phone mid-game can answer a clue within 30 seconds without help. | Accepted |
| NFR-102 | **Mobile-first layout** that works on phone screens 360 px wide and up, in portrait orientation. | Accepted |
| NFR-103 | **One-handed play:** primary actions sit within thumb reach in the lower half of the screen. | Accepted |
| NFR-104 | **Silent play:** the game never depends on sound or speech. No audio is required to play. | Accepted |
| NFR-105 | Touch targets are at least 44 × 44 px. | Accepted |
| NFR-106 | Text and controls meet WCAG 2.1 AA color contrast (ADR-011 tokens are chosen to pass). | Accepted |
| NFR-107 | Every dial position can also be set by an accessible alternative to dragging (e.g. step buttons or a keyboard). | Implemented |
| NFR-108 | **Reduced motion:** when the phone asks for reduced motion, the app shows no animation (ADR-011). | Implemented |
| NFR-109 | **One visual language:** colors, type, shapes, icons, and motion follow ADR-011. Emoji appear only as player avatars. | Implemented |

## Privacy and secrecy

| ID | Requirement | Status |
|---|---|---|
| NFR-201 | A clue's target is never visible on screen to someone who hasn't earned the reveal, except to the creator while holding to peek (FR-305). | Accepted |
| NFR-202 | All game data stays on the phone. Nothing is sent to a server; there are no accounts, ads, or analytics. | Implemented |

## Reliability and data

| ID | Requirement | Status |
|---|---|---|
| NFR-301 | Game data survives closing the browser, closing the app, and restarting the phone. | Accepted |
| NFR-302 | No action loses data except an explicit, confirmed New game (FR-802). | Accepted |
| NFR-303 | Stored data carries a **schema version** so future releases can migrate existing games instead of wiping them. | Implemented |
| NFR-304 | The app shows a short warning that clearing browser data deletes the game. | Proposed |

## Performance and availability

| ID | Requirement | Status |
|---|---|---|
| NFR-401 | **Works offline** after the first visit. | Implemented |
| NFR-402 | Opens to the "Who are you?" picker in under 2 seconds on a mid-range phone. | Accepted |
| NFR-403 | Dragging the dial needle follows the finger with no visible lag (target 60 frames per second). | Accepted |
| NFR-404 | Installable to the phone's home screen and opens full-screen like an app. | Implemented |
| NFR-405 | **Updates never interrupt play.** A new version downloads in the background and is applied only when the phone is on the "Who are you?" picker, where nothing is in progress, without a leave confirmation. | Implemented |

## Compatibility

| ID | Requirement | Status |
|---|---|---|
| NFR-501 | Supports the latest two versions of Safari on iOS and Chrome on Android. | Accepted |

## Maintainability and process

| ID | Requirement | Status |
|---|---|---|
| NFR-601 | **Spec-driven development:** every code change references the FR/NFR/ADR IDs it implements. A behavior change updates the spec first. | Accepted |
| NFR-602 | Scoring logic is pure, separate from the UI, and covered by automated tests. | Implemented |
| NFR-603 | Every push to `main` builds and deploys automatically. | Implemented |
| NFR-604 | Built-in card content is original, not copied from any published game. | Implemented |
| NFR-605 | **Code review before deploy:** every change reaches `main` (and therefore deployment) only through a pull request that has a written code review. The review checks the change against the spec (FR/NFR/ADR), correctness, security, data safety, and tests. It is posted on the pull request, and every must-fix finding is resolved before merging. Direct pushes to `main` are not allowed. | Accepted |
