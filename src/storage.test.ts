import { describe, expect, it } from 'vitest';
import { emptyState } from './model';
import { load, migrate, save } from './storage';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
  keys() { return [...this.m.keys()]; }
}

describe('storage (ADR-005, NFR-301–NFR-303)', () => {
  it('round-trips a saved game', () => {
    const store = new MemoryStorage();
    const s = emptyState();
    s.players.push({ id: 'a', name: 'Ann', emoji: '🦊', active: true, joinedAt: 1 });
    expect(save(s, store)).toBe(true);
    expect(load(store)).toEqual(s);
  });

  it('starts empty when nothing is saved', () => {
    expect(load(new MemoryStorage())).toEqual(emptyState());
  });

  it('backs up unrecognized data instead of discarding it (NFR-302)', () => {
    const store = new MemoryStorage();
    store.setItem('handwave.game', JSON.stringify({ version: 99, players: [] }));
    expect(load(store)).toEqual(emptyState());
    expect(store.keys().some((k) => k.startsWith('handwave.backup.'))).toBe(true);
  });

  it('backs up corrupt data too', () => {
    const store = new MemoryStorage();
    store.setItem('handwave.game', '{not json');
    load(store);
    expect(store.keys().filter((k) => k.startsWith('handwave.backup.'))).toHaveLength(1);
  });

  it('rejects documents of other versions', () => {
    expect(migrate({ version: 2 })).toBeNull();
    expect(migrate(null)).toBeNull();
  });
});
