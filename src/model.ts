// Data model for HandWave. One versioned document holds the whole game (ADR-005, NFR-303).

export const SCHEMA_VERSION = 1;

export interface Player {
  id: string;
  name: string;
  emoji: string;
  /** False after the player leaves (FR-104). Their history is kept. */
  active: boolean;
  joinedAt: number;
}

export interface Card {
  id: string;
  left: string;
  right: string;
  /** True for player-made cards (FR-702). */
  custom: boolean;
}

export interface Turn {
  id: string;
  creatorId: string;
  /** Copied from the card so the turn survives a card being deleted. */
  left: string;
  right: string;
  /** Secret position, 0–100 (FR-304). */
  target: number;
  clue: string;
  createdAt: number;
}

export interface Guess {
  turnId: string;
  playerId: string;
  /** Dial position, 0–100 (FR-403). */
  position: number;
  createdAt: number;
}

export interface GameState {
  version: number;
  players: Player[];
  customCards: Card[];
  turns: Turn[];
  guesses: Guess[];
}

export function emptyState(): GameState {
  return { version: SCHEMA_VERSION, players: [], customCards: [], turns: [], guesses: [] };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
