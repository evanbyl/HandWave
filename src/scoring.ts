// Pure scoring logic (ADR-010, NFR-602). No DOM, no storage.

import type { GameState, Guess, Turn } from './model';

// ---------- tunable constants (ADR-010, open question Q8) ----------

/** Width of one scoring zone on the 0–100 dial. */
export const ZONE_WIDTH = 4;
/** Targets in this range count as middle targets (FR-610). */
export const MIDDLE_LOW = 100 / 3;
export const MIDDLE_HIGH = 200 / 3;
export const MIDDLE_BONUS = 1;
export const BEST_BONUS = 1;
/** How much each new result counts in a Today score (FR-612). */
export const FORM_WEIGHT = 0.2;
/** Where every score starts, so one lucky guess can't top the board (FR-613). */
export const PRIOR = 2;
/** How many results the prior is worth in an All-time score (FR-615). */
export const PRIOR_WEIGHT = 2;
/** Today starts at this local hour (FR-614). */
export const DAY_START_HOUR = 4;
/** A guess keeps a streak alive with at least this many zone points (FR-616). */
export const STREAK_MIN_POINTS = 3;
/** Streak length that shows the flame. */
export const STREAK_FLAME_AT = 3;

// ---------- single guesses ----------

/** Zone points for one guess: 4 / 3 / 2 / 0 by distance from the target (FR-601). */
export function pointsFor(guess: number, target: number, w: number = ZONE_WIDTH): number {
  const d = Math.abs(guess - target);
  if (d <= w / 2) return 4;
  if (d <= 1.5 * w) return 3;
  if (d <= 2.5 * w) return 2;
  return 0;
}

export function isMiddle(target: number): boolean {
  return target >= MIDDLE_LOW && target <= MIDDLE_HIGH;
}

export interface GuessResult {
  guess: Guess;
  zone: number;
  middle: number;
  best: number;
  /** zone + middle + best */
  total: number;
}

/** Every guess on a clue with its bonuses applied (FR-610, FR-611). */
export function guessResults(state: GameState, turn: Turn): GuessResult[] {
  const guesses = state.guesses.filter((g) => g.turnId === turn.id);
  const base = guesses.map((g) => {
    const zone = pointsFor(g.position, turn.target);
    return { guess: g, zone, middle: zone > 0 && isMiddle(turn.target) ? MIDDLE_BONUS : 0 };
  });
  const top = Math.max(0, ...base.map((r) => r.zone));
  const bestEligible = base.length >= 2 && top > 0;
  return base.map((r) => {
    const best = bestEligible && r.zone === top ? BEST_BONUS : 0;
    return { ...r, best, total: r.zone + r.middle + best };
  });
}

/** Clue Score for one clue: mean of zone + middle points, without the best-guess bonus (FR-603). */
export function clueScore(state: GameState, turn: Turn): number | null {
  const results = guessResults(state, turn);
  if (results.length === 0) return null;
  return results.reduce((sum, r) => sum + r.zone + r.middle, 0) / results.length;
}

// ---------- scoring events ----------

export interface ScoreEvent {
  kind: 'guess' | 'clue';
  value: number;
  /** When it counts: guess time, or a clue's most recent guess (ADR-010 §6–7). */
  at: number;
}

export function playerEvents(state: GameState, playerId: string): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  for (const turn of state.turns) {
    const results = guessResults(state, turn);
    if (results.length === 0) continue;
    if (turn.creatorId === playerId) {
      const value = results.reduce((sum, r) => sum + r.zone + r.middle, 0) / results.length;
      events.push({ kind: 'clue', value, at: Math.max(...results.map((r) => r.guess.createdAt)) });
    }
    for (const r of results) {
      if (r.guess.playerId === playerId) events.push({ kind: 'guess', value: r.total, at: r.guess.createdAt });
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

/** Today's form score: start at the prior, each result counts for 20% (FR-612, FR-613). */
export function formScore(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((score, v) => score + FORM_WEIGHT * (v - score), PRIOR);
}

/** All-time career score: an average with the prior mixed in (FR-615). */
export function careerScore(values: number[]): number | null {
  if (values.length === 0) return null;
  return (values.reduce((a, b) => a + b, 0) + PRIOR * PRIOR_WEIGHT) / (values.length + PRIOR_WEIGHT);
}

/** Start of "Today": the most recent 4:00 AM local time (FR-614). */
export function startOfToday(now: number): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START_HOUR);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}

// ---------- players ----------

export type Period = 'today' | 'all';

export interface PlayerScore {
  playerId: string;
  guessing: number | null;
  clues: number | null;
  combined: number | null;
}

export function playerScore(state: GameState, playerId: string, period: Period, now: number = Date.now()): PlayerScore {
  let events = playerEvents(state, playerId);
  if (period === 'today') {
    const since = startOfToday(now);
    events = events.filter((e) => e.at >= since);
  }
  const score = period === 'today' ? formScore : careerScore;
  const of = (kind?: ScoreEvent['kind']) => score(events.filter((e) => !kind || e.kind === kind).map((e) => e.value));
  return { playerId, guessing: of('guess'), clues: of('clue'), combined: of() };
}

/** Leaderboard rows, best combined score first; unscored players last (FR-606). */
export function leaderboard(state: GameState, period: Period, now: number = Date.now()): PlayerScore[] {
  return state.players
    .map((p) => playerScore(state, p.id, period, now))
    .sort((a, b) => {
      if (a.combined === null && b.combined === null) return 0;
      if (a.combined === null) return 1;
      if (b.combined === null) return -1;
      return b.combined - a.combined;
    });
}

/** Guesses in a row, most recent first, each with 3+ zone points (FR-616). */
export function streak(state: GameState, playerId: string): number {
  const turns = new Map(state.turns.map((t) => [t.id, t]));
  const mine = state.guesses
    .filter((g) => g.playerId === playerId && turns.has(g.turnId))
    .sort((a, b) => b.createdAt - a.createdAt);
  let n = 0;
  for (const g of mine) {
    if (pointsFor(g.position, turns.get(g.turnId)!.target) < STREAK_MIN_POINTS) break;
    n++;
  }
  return n;
}

export function hasFlame(state: GameState, playerId: string): boolean {
  return streak(state, playerId) >= STREAK_FLAME_AT;
}
