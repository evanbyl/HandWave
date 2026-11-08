// Game rules and state changes. Pure functions over GameState; the caller saves the result.

import { type Card, type GameState, type Turn, newId } from './model';

export class RuleError extends Error {}

function sameIdentity(a: { name: string; emoji: string }, b: { name: string; emoji: string }) {
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.emoji === b.emoji;
}

/** Join, or rejoin if this name + emoji already exists (FR-102, FR-103, FR-105). */
export function joinPlayer(state: GameState, name: string, emoji: string): { state: GameState; playerId: string } {
  const clean = name.trim();
  if (!clean) throw new RuleError('Enter a name.');
  if (!emoji) throw new RuleError('Pick an emoji.');
  const existing = state.players.find((p) => sameIdentity(p, { name: clean, emoji }));
  if (existing) {
    if (existing.active) throw new RuleError('Someone is already using that name and emoji.');
    return {
      state: { ...state, players: state.players.map((p) => (p.id === existing.id ? { ...p, active: true } : p)) },
      playerId: existing.id,
    };
  }
  const player = { id: newId(), name: clean, emoji, active: true, joinedAt: Date.now() };
  return { state: { ...state, players: [...state.players, player] }, playerId: player.id };
}

/** Leave: hidden from the picker, history kept (FR-104). */
export function leavePlayer(state: GameState, playerId: string): GameState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, active: false } : p)) };
}

export function rejoinPlayer(state: GameState, playerId: string): GameState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, active: true } : p)) };
}

/** Random target 0–100 (FR-304). */
export function randomTarget(rand: () => number = Math.random): number {
  return Math.round(rand() * 1000) / 10;
}

export function drawCard(deck: Card[], excludeId?: string, rand: () => number = Math.random): Card {
  const pool = deck.length > 1 && excludeId ? deck.filter((c) => c.id !== excludeId) : deck;
  return pool[Math.floor(rand() * pool.length)];
}

export function createTurn(
  state: GameState,
  creatorId: string,
  card: Pick<Card, 'left' | 'right'>,
  target: number,
  clue: string,
): GameState {
  const clean = clue.trim();
  if (!clean) throw new RuleError('Write a clue first.'); // FR-306
  const turn: Turn = {
    id: newId(),
    creatorId,
    left: card.left,
    right: card.right,
    target,
    clue: clean,
    createdAt: Date.now(),
  };
  return { ...state, turns: [...state.turns, turn] };
}

export function hasGuessed(state: GameState, turnId: string, playerId: string): boolean {
  return state.guesses.some((g) => g.turnId === turnId && g.playerId === playerId);
}

export function submitGuess(state: GameState, turnId: string, playerId: string, position: number): GameState {
  const turn = state.turns.find((t) => t.id === turnId);
  if (!turn) throw new RuleError('That turn no longer exists.');
  if (turn.creatorId === playerId) throw new RuleError("You can't answer your own turn."); // FR-309
  if (hasGuessed(state, turnId, playerId)) throw new RuleError('You already answered this turn.'); // FR-404
  const pos = Math.min(100, Math.max(0, position));
  return { ...state, guesses: [...state.guesses, { turnId, playerId, position: pos, createdAt: Date.now() }] };
}

/** Turns created by others that this player hasn't answered (FR-401). Oldest first. */
export function waitingFor(state: GameState, playerId: string): Turn[] {
  return state.turns.filter((t) => t.creatorId !== playerId && !hasGuessed(state, t.id, playerId));
}

/** Whether a player may see a turn's target and others' guesses (FR-502–FR-504, NFR-201). */
export function canSeeReveal(state: GameState, turn: Turn, playerId: string): boolean {
  return turn.creatorId === playerId || hasGuessed(state, turn.id, playerId);
}

export function addCustomCard(state: GameState, left: string, right: string): GameState {
  const l = left.trim();
  const r = right.trim();
  if (!l || !r) throw new RuleError('Fill in both ends of the card.');
  return { ...state, customCards: [...state.customCards, { id: newId(), left: l, right: r, custom: true }] };
}

export function deleteCustomCard(state: GameState, cardId: string): GameState {
  return { ...state, customCards: state.customCards.filter((c) => c.id !== cardId) };
}

/** New game: clears turns and guesses; keeps players and custom cards (FR-802, FR-803). */
export function newGame(state: GameState): GameState {
  return { ...state, turns: [], guesses: [] };
}
