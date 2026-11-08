// Pure scoring logic (ADR-006, NFR-602). No DOM, no storage.

import type { GameState, Turn } from './model';

/** Width of one scoring zone on the 0–100 dial. Tunable (open question Q8). */
export const ZONE_WIDTH = 4;

/** Points for one guess: 4 / 3 / 2 / 0 by distance from the target (FR-601). */
export function pointsFor(guess: number, target: number, w: number = ZONE_WIDTH): number {
  const d = Math.abs(guess - target);
  if (d <= w / 2) return 4;
  if (d <= 1.5 * w) return 3;
  if (d <= 2.5 * w) return 2;
  return 0;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Clue score for a turn: mean points of everyone who answered it (FR-603). */
export function clueScore(state: GameState, turn: Turn): number | null {
  const pts = state.guesses
    .filter((g) => g.turnId === turn.id)
    .map((g) => pointsFor(g.position, turn.target));
  return mean(pts);
}

export interface PlayerScore {
  playerId: string;
  guessAverage: number | null;
  guessCount: number;
  clueAverage: number | null;
  clueCount: number;
  /** Mean of all scoring events: guesses and scored clues (FR-605). */
  combined: number | null;
}

export function playerScore(state: GameState, playerId: string): PlayerScore {
  const turnsById = new Map(state.turns.map((t) => [t.id, t]));

  const guessPts: number[] = [];
  for (const g of state.guesses) {
    if (g.playerId !== playerId) continue;
    const turn = turnsById.get(g.turnId);
    if (turn) guessPts.push(pointsFor(g.position, turn.target));
  }

  const cluePts: number[] = [];
  for (const t of state.turns) {
    if (t.creatorId !== playerId) continue;
    const s = clueScore(state, t);
    if (s !== null) cluePts.push(s);
  }

  return {
    playerId,
    guessAverage: mean(guessPts),
    guessCount: guessPts.length,
    clueAverage: mean(cluePts),
    clueCount: cluePts.length,
    combined: mean([...guessPts, ...cluePts]),
  };
}

/** Leaderboard rows, best combined average first; unscored players last (FR-606). */
export function leaderboard(state: GameState): PlayerScore[] {
  return state.players
    .map((p) => playerScore(state, p.id))
    .sort((a, b) => {
      if (a.combined === null && b.combined === null) return 0;
      if (a.combined === null) return 1;
      if (b.combined === null) return -1;
      return b.combined - a.combined;
    });
}
