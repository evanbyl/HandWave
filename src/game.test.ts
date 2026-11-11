import { describe, expect, it } from 'vitest';
import {
  RuleError,
  canSeeReveal,
  createTurn,
  deleteTurn,
  joinPlayer,
  leavePlayer,
  newGame,
  submitGuess,
  waitingFor,
  addCustomCard,
} from './game';
import { emptyState } from './model';

function twoPlayers() {
  let s = emptyState();
  const a = joinPlayer(s, 'Ann', '🦊');
  const b = joinPlayer(a.state, 'Bo', '🐢');
  s = b.state;
  return { s, ann: a.playerId, bo: b.playerId };
}

describe('players (FR-101–FR-105)', () => {
  it('rejects a duplicate active name + emoji', () => {
    const { s } = twoPlayers();
    expect(() => joinPlayer(s, ' ann ', '🦊')).toThrow(RuleError);
  });

  it('allows the same name with a different emoji', () => {
    const { s } = twoPlayers();
    expect(joinPlayer(s, 'Ann', '🐝').state.players).toHaveLength(3);
  });

  it('rejoining after leaving restores the same player', () => {
    const { s, ann } = twoPlayers();
    const left = leavePlayer(s, ann);
    expect(left.players.find((p) => p.id === ann)?.active).toBe(false);
    const back = joinPlayer(left, 'Ann', '🦊');
    expect(back.playerId).toBe(ann);
    expect(back.state.players).toHaveLength(2);
  });
});

describe('turns and guesses (FR-3xx, FR-4xx)', () => {
  it('requires a clue', () => {
    const { s, ann } = twoPlayers();
    expect(() => createTurn(s, ann, { left: 'A', right: 'B' }, 50, '   ')).toThrow(RuleError);
  });

  it('shows the turn as waiting for others, not the creator', () => {
    const { s, ann, bo } = twoPlayers();
    const t = createTurn(s, ann, { left: 'A', right: 'B' }, 50, 'clue');
    expect(waitingFor(t, ann)).toHaveLength(0);
    expect(waitingFor(t, bo)).toHaveLength(1);
  });

  it("blocks answering your own turn and answering twice", () => {
    const { s, ann, bo } = twoPlayers();
    const t = createTurn(s, ann, { left: 'A', right: 'B' }, 50, 'clue');
    const id = t.turns[0].id;
    expect(() => submitGuess(t, id, ann, 50)).toThrow(RuleError);
    const g = submitGuess(t, id, bo, 40);
    expect(() => submitGuess(g, id, bo, 41)).toThrow(RuleError);
    expect(waitingFor(g, bo)).toHaveLength(0);
  });

  it('hides the reveal until the player answers (NFR-201)', () => {
    const { s, ann, bo } = twoPlayers();
    const t = createTurn(s, ann, { left: 'A', right: 'B' }, 50, 'clue');
    const turn = t.turns[0];
    expect(canSeeReveal(t, turn, ann)).toBe(true);
    expect(canSeeReveal(t, turn, bo)).toBe(false);
    expect(canSeeReveal(submitGuess(t, turn.id, bo, 10), turn, bo)).toBe(true);
  });
});

describe('deleting a clue (FR-310)', () => {
  it('removes the clue and its guesses, so scores drop them', () => {
    const { s, ann, bo } = twoPlayers();
    let t = createTurn(s, ann, { left: 'A', right: 'B' }, 50, 'one');
    t = createTurn(t, ann, { left: 'A', right: 'B' }, 50, 'two');
    const [first, second] = t.turns;
    t = submitGuess(t, first.id, bo, 50);
    t = submitGuess(t, second.id, bo, 50);
    const d = deleteTurn(t, first.id, ann);
    expect(d.turns.map((x) => x.id)).toEqual([second.id]);
    expect(d.guesses.map((g) => g.turnId)).toEqual([second.id]);
  });

  it("blocks deleting someone else's clue", () => {
    const { s, ann, bo } = twoPlayers();
    const t = createTurn(s, ann, { left: 'A', right: 'B' }, 50, 'mine');
    expect(() => deleteTurn(t, t.turns[0].id, bo)).toThrow(RuleError);
  });

  it('rejects a clue that no longer exists', () => {
    const { s, ann } = twoPlayers();
    expect(() => deleteTurn(s, 'missing', ann)).toThrow(RuleError);
  });
});

describe('new game (FR-802, FR-803)', () => {
  it('clears turns and guesses but keeps players and custom cards', () => {
    const { s, ann, bo } = twoPlayers();
    let t = addCustomCard(s, 'Tiny', 'Huge');
    t = createTurn(t, ann, { left: 'A', right: 'B' }, 50, 'clue');
    t = submitGuess(t, t.turns[0].id, bo, 50);
    const n = newGame(t);
    expect(n.turns).toHaveLength(0);
    expect(n.guesses).toHaveLength(0);
    expect(n.players).toHaveLength(2);
    expect(n.customCards).toHaveLength(1);
  });
});
