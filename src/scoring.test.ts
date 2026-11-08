import { describe, expect, it } from 'vitest';
import { emptyState, type GameState } from './model';
import { clueScore, leaderboard, playerScore, pointsFor } from './scoring';

describe('pointsFor (FR-601, ADR-006)', () => {
  it('scores the zones 4/3/2/0 with zone width 4', () => {
    expect(pointsFor(50, 50)).toBe(4);
    expect(pointsFor(52, 50)).toBe(4); // edge of center zone
    expect(pointsFor(52.1, 50)).toBe(3);
    expect(pointsFor(56, 50)).toBe(3);
    expect(pointsFor(56.1, 50)).toBe(2);
    expect(pointsFor(60, 50)).toBe(2);
    expect(pointsFor(60.1, 50)).toBe(0);
    expect(pointsFor(40, 50)).toBe(2); // symmetric
  });

  it('cuts zones off at the dial edge', () => {
    expect(pointsFor(0, 1)).toBe(4);
    expect(pointsFor(0, 9)).toBe(2);
  });
});

function fixture(): GameState {
  const s = emptyState();
  s.players = [
    { id: 'a', name: 'Ann', emoji: '🦊', active: true, joinedAt: 0 },
    { id: 'b', name: 'Bo', emoji: '🐢', active: true, joinedAt: 0 },
    { id: 'c', name: 'Cy', emoji: '🐙', active: false, joinedAt: 0 },
  ];
  s.turns = [
    { id: 't1', creatorId: 'a', left: 'Cold', right: 'Hot', target: 50, clue: 'soup', createdAt: 0 },
    { id: 't2', creatorId: 'b', left: 'Bad', right: 'Good', target: 20, clue: 'mondays', createdAt: 0 },
    { id: 't3', creatorId: 'a', left: 'Soft', right: 'Loud', target: 80, clue: 'drums', createdAt: 0 },
  ];
  s.guesses = [
    { turnId: 't1', playerId: 'b', position: 50, createdAt: 0 }, // 4
    { turnId: 't1', playerId: 'c', position: 57, createdAt: 0 }, // 2
    { turnId: 't2', playerId: 'a', position: 24, createdAt: 0 }, // 3
  ];
  return s;
}

describe('clue score (FR-603)', () => {
  it('averages the guessers on the turn', () => {
    const s = fixture();
    expect(clueScore(s, s.turns[0])).toBe(3);
  });
  it('is null with no answers yet', () => {
    const s = fixture();
    expect(clueScore(s, s.turns[2])).toBeNull();
  });
});

describe('player averages (FR-602, FR-604, FR-605)', () => {
  it('combines guesses and scored clues as one running average', () => {
    const s = fixture();
    const ann = playerScore(s, 'a');
    expect(ann.guessAverage).toBe(3);
    expect(ann.guessCount).toBe(1);
    expect(ann.clueAverage).toBe(3); // t1 only; t3 unanswered
    expect(ann.clueCount).toBe(1);
    expect(ann.combined).toBe(3);

    const bo = playerScore(s, 'b');
    expect(bo.guessAverage).toBe(4);
    expect(bo.clueAverage).toBe(3);
    expect(bo.combined).toBe(3.5);
  });

  it('keeps scores for players who left (FR-104)', () => {
    const s = fixture();
    expect(playerScore(s, 'c').guessAverage).toBe(2);
  });

  it('gives no score to a player with no events', () => {
    const s = fixture();
    s.players.push({ id: 'd', name: 'Di', emoji: '🐝', active: true, joinedAt: 0 });
    expect(playerScore(s, 'd').combined).toBeNull();
  });

  it('ranks by combined average with unscored players last', () => {
    const s = fixture();
    s.players.push({ id: 'd', name: 'Di', emoji: '🐝', active: true, joinedAt: 0 });
    expect(leaderboard(s).map((r) => r.playerId)).toEqual(['b', 'a', 'c', 'd']);
  });
});
