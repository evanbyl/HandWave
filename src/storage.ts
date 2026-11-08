// Local-only persistence (ADR-005, NFR-202, NFR-301, NFR-303).

import { type GameState, SCHEMA_VERSION, emptyState } from './model';

const KEY = 'handwave.game';

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return emptyState();
  const data = raw as Partial<GameState>;
  if (data.version !== SCHEMA_VERSION) {
    // Only version 1 exists so far. Future versions add migration steps here.
    return emptyState();
  }
  return {
    version: SCHEMA_VERSION,
    players: data.players ?? [],
    customCards: data.customCards ?? [],
    turns: data.turns ?? [],
    guesses: data.guesses ?? [],
  };
}

export function load(): GameState {
  try {
    const text = localStorage.getItem(KEY);
    return text ? migrate(JSON.parse(text)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
