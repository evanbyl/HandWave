// Local-only persistence (ADR-005, NFR-202, NFR-301, NFR-302, NFR-303).

import { type GameState, SCHEMA_VERSION, emptyState } from './model';

const KEY = 'handwave.game';
const BACKUP_PREFIX = 'handwave.backup.';

/** Recognize a saved document, or return null if it isn't one this version can read. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GameState>;
  if (data.version !== SCHEMA_VERSION) {
    // Only version 1 exists so far. Future versions add migration steps here.
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    players: data.players ?? [],
    customCards: data.customCards ?? [],
    turns: data.turns ?? [],
    guesses: data.guesses ?? [],
  };
}

export function load(store: Storage = localStorage): GameState {
  let text: string | null = null;
  try {
    text = store.getItem(KEY);
    if (!text) return emptyState();
    const state = migrate(JSON.parse(text));
    if (state) return state;
  } catch {
    // Fall through to backup.
  }
  // Unreadable or unrecognized data: keep a copy instead of overwriting it (NFR-302).
  if (text) {
    try {
      store.setItem(BACKUP_PREFIX + Date.now(), text);
    } catch {
      // Storage full; nothing more we can do safely.
    }
  }
  return emptyState();
}

export function save(state: GameState, store: Storage = localStorage): boolean {
  try {
    store.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
