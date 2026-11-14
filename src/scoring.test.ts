import { describe, expect, it } from 'vitest';
import { emptyState, type GameState, type Turn } from './model';
import {
  careerScore,
  clueScore,
  formScore,
  guessResults,
  hasFlame,
  leaderboard,
  playerEvents,
  playerScore,
  pointsFor,
  startOfToday,
  streak,
} from './scoring';

/** Local-time timestamp, so tests match the 4 AM rule wherever they run. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
const NOW = at(13, 20); // Friday Nov 13, 8 PM

function players(...ids: string[]): GameState {
  const s = emptyState();
  s.players = ids.map((id) => ({ id, name: id.toUpperCase(), emoji: '🦊', active: true, joinedAt: 0 }));
  return s;
}

function turn(s: GameState, id: string, creatorId: string, target: number): Turn {
  const t = { id, creatorId, left: 'L', right: 'R', target, clue: id, createdAt: at(13, 9) };
  s.turns.push(t);
  return t;
}

function guess(s: GameState, turnId: string, playerId: string, position: number, time = at(13, 10)) {
  s.guesses.push({ turnId, playerId, position, createdAt: time });
}

describe('zone points (FR-601)', () => {
  it('scores the zones 4/3/2/0 with zone width 4', () => {
    expect(pointsFor(50, 50)).toBe(4);
    expect(pointsFor(52, 50)).toBe(4);
    expect(pointsFor(52.1, 50)).toBe(3);
    expect(pointsFor(56, 50)).toBe(3);
    expect(pointsFor(56.1, 50)).toBe(2);
    expect(pointsFor(60, 50)).toBe(2);
    expect(pointsFor(60.1, 50)).toBe(0);
    expect(pointsFor(40, 50)).toBe(2);
  });
  it('cuts zones off at the dial edge', () => {
    expect(pointsFor(0, 1)).toBe(4);
    expect(pointsFor(0, 9)).toBe(2);
  });
});

describe('middle bonus (FR-610)', () => {
  it('adds +1 to a scoring guess on a middle target', () => {
    const s = players('a', 'b');
    const t = turn(s, 't', 'a', 50);
    guess(s, 't', 'b', 50);
    expect(guessResults(s, t)[0]).toMatchObject({ zone: 4, middle: 1, best: 0, total: 5 });
  });
  it('gives nothing for a miss, or for a target outside the middle third', () => {
    const s = players('a', 'b', 'c');
    const mid = turn(s, 'm', 'a', 50);
    const edge = turn(s, 'e', 'a', 20);
    guess(s, 'm', 'b', 90);
    guess(s, 'e', 'c', 20);
    expect(guessResults(s, mid)[0].middle).toBe(0);
    expect(guessResults(s, edge)[0].middle).toBe(0);
  });
});

describe('best-guess bonus (FR-611)', () => {
  it('needs two or more guesses', () => {
    const s = players('a', 'b');
    const t = turn(s, 't', 'a', 20);
    guess(s, 't', 'b', 20);
    expect(guessResults(s, t)[0].best).toBe(0);
  });
  it('goes to the top guess, and ties share it', () => {
    const s = players('a', 'b', 'c', 'd');
    const t = turn(s, 't', 'a', 20);
    guess(s, 't', 'b', 20); // 4
    guess(s, 't', 'c', 21); // 4
    guess(s, 't', 'd', 25); // 3
    expect(guessResults(s, t).map((r) => r.best)).toEqual([1, 1, 0]);
  });
  it('is not given when everyone missed', () => {
    const s = players('a', 'b', 'c');
    const t = turn(s, 't', 'a', 20);
    guess(s, 't', 'b', 90);
    guess(s, 't', 'c', 80);
    expect(guessResults(s, t).map((r) => r.best)).toEqual([0, 0]);
  });
  it('moves to a later, better guess', () => {
    const s = players('a', 'b', 'c', 'd');
    const t = turn(s, 't', 'a', 20);
    guess(s, 't', 'b', 25); // 3
    guess(s, 't', 'c', 28); // 2
    expect(guessResults(s, t).map((r) => r.best)).toEqual([1, 0]);
    guess(s, 't', 'd', 20); // 4
    expect(guessResults(s, t).map((r) => r.best)).toEqual([0, 0, 1]);
  });
});

describe('Clue Score (FR-603)', () => {
  it('averages zone + middle points and leaves out the best-guess bonus', () => {
    const s = players('a', 'b', 'c');
    const t = turn(s, 't', 'a', 50);
    guess(s, 't', 'b', 50); // 4 + 1 middle (+1 best)
    guess(s, 't', 'c', 55); // 3 + 1 middle
    expect(clueScore(s, t)).toBe(4.5);
  });
  it('is null with no guesses yet', () => {
    const s = players('a');
    expect(clueScore(s, turn(s, 't', 'a', 50))).toBeNull();
  });
});

describe('scoring events (ADR-010 §6–7)', () => {
  it("times a clue at its most recent guess", () => {
    const s = players('a', 'b', 'c');
    turn(s, 't', 'a', 20);
    guess(s, 't', 'b', 20, at(12, 22));
    guess(s, 't', 'c', 20, at(13, 11));
    const clue = playerEvents(s, 'a').find((e) => e.kind === 'clue')!;
    expect(clue.at).toBe(at(13, 11));
  });
});

describe('form score and lucky starts (FR-612, FR-613)', () => {
  it('starts at 2.0 and weights each new result 20%', () => {
    expect(formScore([6])).toBeCloseTo(2.8);
    expect(formScore([6, 0])).toBeCloseTo(2.24);
  });
  it('one bullseye cannot beat steady play', () => {
    const lucky = formScore([6])!;
    const steady = formScore([4, 4, 4, 4, 4, 4])!;
    expect(steady).toBeGreaterThan(lucky);
  });
  it('still moves after many results', () => {
    const many = Array(40).fill(4);
    expect(formScore([...many, 0])! - formScore(many)!).toBeLessThan(-0.7);
  });
  it('has no score with no results', () => {
    expect(formScore([])).toBeNull();
  });
});

describe('All-time career score (FR-615)', () => {
  it('is an average with the prior mixed in', () => {
    expect(careerScore([6])).toBeCloseTo(10 / 3);
    expect(careerScore([4, 4])).toBeCloseTo(3);
    expect(careerScore([])).toBeNull();
  });
});

describe('Today (FR-614)', () => {
  it('starts at 4 AM local time', () => {
    expect(startOfToday(at(13, 20))).toBe(at(13, 4));
    expect(startOfToday(at(13, 3))).toBe(at(12, 4)); // still "yesterday" until 4 AM
    expect(startOfToday(at(13, 4))).toBe(at(13, 4));
  });
  it("counts only today's results and leaves idle players unranked", () => {
    const s = players('a', 'b', 'c');
    turn(s, 't', 'a', 20);
    turn(s, 'u', 'a', 80);
    guess(s, 't', 'b', 20, at(12, 21)); // yesterday
    guess(s, 'u', 'b', 80, at(13, 10)); // today
    guess(s, 'u', 'c', 90, at(12, 21)); // yesterday only
    const b = playerScore(s, 'b', 'today', NOW);
    expect(b.guessing).toBeCloseTo(formScore([5])!); // 4 + best (2 guessers on u)
    expect(playerScore(s, 'c', 'today', NOW).combined).toBeNull();
    expect(playerScore(s, 'c', 'all', NOW).combined).not.toBeNull();
    const board = leaderboard(s, 'today', NOW);
    expect(board[board.length - 1].combined).toBeNull();
  });
});

describe('players and leaderboard (FR-602–FR-606)', () => {
  it('splits Guessing and Clue components and combines them', () => {
    const s = players('a', 'b');
    turn(s, 't', 'a', 20);
    turn(s, 'u', 'b', 80);
    guess(s, 't', 'b', 20, at(13, 10)); // b guess 4
    guess(s, 'u', 'a', 85, at(13, 11)); // a guess 3
    const a = playerScore(s, 'a', 'all', NOW);
    expect(a.guessing).toBeCloseTo(careerScore([3])!);
    expect(a.clues).toBeCloseTo(careerScore([4])!);
    expect(a.combined).toBeCloseTo(careerScore([4, 3])!);
  });
  it('does not reward volume: more equal results never raise a career score', () => {
    expect(careerScore(Array(20).fill(2))).toBeCloseTo(careerScore([2])!);
  });
});

describe('streak flame (FR-616)', () => {
  it('counts recent guesses in a row with 3+ zone points', () => {
    const s = players('a', 'b');
    for (const [i, pos] of [90, 20, 21, 24].entries()) {
      turn(s, `t${i}`, 'a', 20);
      guess(s, `t${i}`, 'b', pos, at(13, 10 + i));
    }
    expect(streak(s, 'b')).toBe(3);
    expect(hasFlame(s, 'b')).toBe(true);
  });
  it('breaks on a weaker guess', () => {
    const s = players('a', 'b');
    for (const [i, pos] of [20, 20, 20, 28].entries()) {
      turn(s, `t${i}`, 'a', 20);
      guess(s, `t${i}`, 'b', pos, at(13, 10 + i));
    }
    expect(streak(s, 'b')).toBe(0);
    expect(hasFlame(s, 'b')).toBe(false);
  });
});
