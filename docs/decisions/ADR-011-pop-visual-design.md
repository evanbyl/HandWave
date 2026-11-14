# ADR-011: "Pop" visual design

Status: Accepted
Date: 2026-11-13

## Context
The first look was a quick default dark theme; Evan felt it "looks vibe coded". Three directions were mocked up on a design canvas (Arcade, Pop, Studio). Evan chose **Pop**: bright, candy colors, bouncy.

## Decision

### Color tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F3F1FF` | page background (lavender white) |
| `--surface` | `#FFFFFF` | cards, tiles, inputs |
| `--ink` | `#1C1838` | text, outlines, offset shadows |
| `--muted` | `#4A4570` | secondary text (8:1 on `--bg`) |
| `--violet` | `#5B3FFF` | primary buttons (white text, 6:1), bullseye zone |
| `--tangerine` | `#FF6B35` | "go" arrows, middle zone, flame |
| `--sun` | `#FFC531` | highlights, outer zone, rank 1 |
| `--mint` | `#2BD9A0` | success toasts, best-guess sticker |
| `--peach` / `--sky` | `#FFE3D6` / `#CFE4FF` | soft tints (Hot / Cold ends, streak tile) |
| `--danger` | `#CC2F36` | delete / reset confirmations (white text, 5:1) |

### Type
- **Bricolage Grotesque** (800) for headings, scores, and primary buttons; **DM Sans** (400/500/700) for everything else.
- Both are **bundled with the app** (Fontsource packages) rather than loaded from Google, so the game stays offline-capable (NFR-401) and sends nothing to outside servers (NFR-202).

### Shape
- Interactive surfaces: white fill, **2px ink outline**, rounded corners (14–20px), and a hard **offset "sticker" shadow** (`3–5px 3–5px 0 ink`). Pressing a button pushes it into its shadow.
- Secondary controls: outline only, no shadow.

### Icons
- Interface icons are **inline SVG** drawn in one consistent stroke style (pass, peek, redraw, delete, arrows, crown, flame, plus).
- **Emoji are used only for player identity** (the avatar each player picks).

### Motion
- Springy, short (≤ 0.6 s), and tied to events: tiles and rows bounce in when a screen opens; the reveal plays once — zones pop in, the score pops with a confetti burst, bonus stickers land one after another; the streak flame flickers.
- Nothing loops except the small flame.
- **`prefers-reduced-motion: reduce` turns all animation off** (NFR-108).

## Consequences
- One stylesheet with CSS custom properties (`src/style.css`) is the source of truth; markup uses classes, not inline colors.
- Bundling fonts adds roughly 60–100 KB to the first download; the service worker caches them for offline use.
- The light theme replaces the old dark one; there's no dark mode for now.
