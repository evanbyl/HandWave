// HandWave app shell: screens, navigation, and input handling.

// Bundled fonts (ADR-011): no requests to outside servers, cached for offline play.
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { BUILT_IN_CARDS } from './cards';
import { attachDrag, dialSvg, setNeedle } from './dial';
import {
  RuleError,
  addCustomCard,
  canSeeReveal,
  createTurn,
  deleteCustomCard,
  deleteTurn,
  drawCard,
  hasGuessed,
  joinPlayer,
  leavePlayer,
  newGame,
  randomTarget,
  rejoinPlayer,
  submitGuess,
  waitingFor,
} from './game';
import type { Card, GameState, Turn } from './model';
import { type Period, clueScore, guessResults, hasFlame, leaderboard } from './scoring';
import { load, save } from './storage';
import { crown, flame, icons, logo } from './icons';

// NFR-405: a new version waits until the picker, where nothing is in progress.
let updateReady = false;
let leavingForUpdate = false;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    applyUpdateIfSafe();
  },
});
function applyUpdateIfSafe(): void {
  if (!updateReady || leavingForUpdate || view.name !== 'picker') return;
  leavingForUpdate = true; // skip the leave confirmation for our own reload
  void updateSW(true);
}

// FR-907: ask the browser for its native "Leave this page?" confirmation.
window.addEventListener('beforeunload', (e) => {
  if (leavingForUpdate) return;
  e.preventDefault();
  e.returnValue = ''; // older browsers need this to show the dialog
});

type Tab = 'waiting' | 'answered' | 'created';

type View =
  | { name: 'picker' }
  | { name: 'join'; emoji: string; nameText: string; error?: string }
  | { name: 'home' }
  | { name: 'create'; card: Card; target: number; clue: string; error?: string }
  | { name: 'answer'; turnId: string; pos: number }
  | { name: 'reveal'; turnId: string; justAnswered: boolean }
  | { name: 'turns'; tab: Tab; confirmDelete?: string }
  | { name: 'board'; period: Period }
  | { name: 'cards'; left: string; right: string; error?: string }
  | { name: 'menu'; confirmReset: boolean };

const EMOJIS = [
  '🦊', '🐢', '🐙', '🐝', '🦉', '🐸', '🦄', '🐳', '🦖', '🐧', '🐼', '🦁',
  '🐯', '🐨', '🦩', '🦔', '🐌', '🦀', '🌵', '🍄', '🌻', '🍉', '🍩', '🌮',
  '🚀', '🎸', '⚡', '🔥', '🌈', '⭐', '🎲', '🧩',
];

const ORDINALS = ['1st', '2nd', '3rd', '4th'];

const app = document.getElementById('app')!;
let game: GameState = load();
let me: string | null = null;
let view: View = { name: 'picker' };
/** Screens to return to on Back (FR-901). Cleared on home and picker. */
let stack: View[] = [];

// ---------- helpers ----------

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function fmt(n: number | null): string {
  return n === null ? '–' : n.toFixed(1);
}

function player(id: string) {
  return game.players.find((p) => p.id === id);
}

function who(id: string): string {
  const p = player(id);
  if (!p) return '❔ Unknown';
  return `${esc(p.emoji)} ${esc(p.name)}${hasFlame(game, id) ? ` ${flame()}` : ''}`;
}

function deck(): Card[] {
  return [...BUILT_IN_CARDS, ...game.customCards];
}

function findTurn(id: string): Turn | undefined {
  return game.turns.find((t) => t.id === id);
}

function commit(next: GameState): void {
  game = next;
  if (!save(game)) toast("Couldn't save. Is storage full?");
}

function toast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function clearToasts(): void {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
}

/** An emoji no active player is using, so Join works right away (FR-102). */
function freeEmoji(): string {
  const used = new Set(game.players.filter((p) => p.active).map((p) => p.emoji));
  const free = EMOJIS.filter((e) => !used.has(e));
  const pool = free.length ? free : EMOJIS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- navigation (FR-901–FR-903) ----------

/**
 * Show a screen. `replace` swaps the current screen without adding a Back step
 * (tab switches, redraws, error messages, guess → reveal).
 */
function go(next: View, replace = false): void {
  if (next.name === 'home' || next.name === 'picker') stack = [];
  else if (!replace) stack.push(view);
  view = next;
  render();
  window.scrollTo(0, 0);
}

function passPhone(): void {
  clearToasts();
  me = null;
  go({ name: 'picker' });
}

/** The on-screen Back/Cancel/Skip/Done buttons and the browser's Back all land here. */
function back(): void {
  if (howto) return closeHowto(); // FR-901, FR-206
  if (view.name === 'picker') return; // FR-903: stay in the app
  if (view.name === 'home') return passPhone(); // FR-902
  let prev = stack.pop();
  if (prev && prev.name === 'turns') prev = { ...prev, confirmDelete: undefined };
  if (prev && (prev.name === 'answer' || prev.name === 'reveal') && !findTurn(prev.turnId)) prev = undefined;
  view = prev ?? (me ? { name: 'home' } : { name: 'picker' });
  if (view.name === 'home' || view.name === 'picker') stack = [];
  render();
  window.scrollTo(0, 0);
}

// Keep one spare history entry so the browser's Back stays inside the app.
// The spare entry is added only from a tap (run() below), never at page load:
// browsers such as Firefox skip history entries the player never interacted
// with, so Back would jump straight past an untouched landing entry to the
// previous site. Tapping while the landing entry is current marks it as used.
const GUARD = 'handwave-guard';
function ensureGuard(): void {
  if (history.state?.hw !== GUARD) history.pushState({ hw: GUARD }, '');
}
history.replaceState({ hw: 'base' }, '');
window.addEventListener('popstate', () => {
  if (howto) {
    closeHowto(); // FR-206: Back reverses How to play
    ensureGuard();
    return;
  }
  // FR-903: on the picker, Back leaves the app. Keep going back (past any older
  // HandWave entries left by reloads); the browser's native leave
  // confirmation (FR-907) gives the player a chance to stay.
  if (view.name === 'picker') return history.back();
  back();
  ensureGuard();
});

// ---------- layout pieces ----------

function cardEnds(left: string, right: string): string {
  return `<div class="ends"><span class="end left">${icons.prev}${esc(left)}</span><span class="end right">${esc(right)}${icons.next}</span></div>`;
}

/** Staggered entrance order for list items (ADR-011 motion). */
const enter = (i: number) => `style="--i:${i}"`;

function turnRow(t: Turn, status: string | null, i = 0): string {
  const side = status === null ? `<span class="go" aria-label="Guess">${icons.next}</span>` : `<span class="row-side">${status}</span>`;
  return `<button class="row enter" ${enter(i)} data-act="open-turn" data-id="${t.id}">
    <span class="row-main"><strong>“${esc(t.clue)}”</strong>
    <small>${esc(t.left)} ↔ ${esc(t.right)}${t.creatorId === me ? '' : ` · ${who(t.creatorId)}`}</small></span>
    ${side}
  </button>`;
}

/** A text field with its submit button inside, on the right (FR-904). */
function inlineField(o: {
  form: string;
  id: string;
  label: string;
  value: string;
  button: string;
  enter: string;
  max: number;
  placeholder?: string;
}): string {
  return `<form class="inline-form" data-form="${o.form}" novalidate>
    <label class="field" for="${o.id}">${o.label}</label>
    <div class="field-row">
      <input id="${o.id}" class="text" maxlength="${o.max}" autocomplete="off" autocapitalize="sentences"
        enterkeyhint="${o.enter}" placeholder="${o.placeholder ?? ''}" value="${esc(o.value)}">
      <button type="submit" class="primary inset">${o.button}</button>
    </div>
  </form>`;
}

function layout(hint: string, main: string, footer = ''): string {
  const header = me
    ? `<header><span class="who">${who(me)}</span>
       <button class="pass" data-act="pass">${icons.pass}Pass the phone</button></header>`
    : `<header><span class="brand">${logo}HandWave</span></header>`;
  return `${header}${hint ? `<p class="hint">${hint}</p>` : ''}<main>${main}</main>${footer ? `<footer>${footer}</footer>` : ''}`;
}

// ---------- How to play panel (FR-206) ----------
// The white button grows into a full-screen panel: its outline expands, the
// label glides up into the header, and the steps slide up from below.
// Closing plays it backwards into the button.
// The text is laid out at full-screen size from the first frame and revealed
// through a window (clip-path) that grows with the outline, so lines never
// re-wrap mid-animation.

const HOWTO_MS = 480;
let howto: HTMLElement | null = null;
let howtoClosing = false;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Box = { top: number; left: number; width: number; height: number };

const fullScreen = (): Box => ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });

/** Move the outline and the reveal window to a box (the button's, or the whole screen). */
function setBox(panel: HTMLElement, r: Box): void {
  const frame = panel.querySelector<HTMLElement>('.howto-frame')!;
  frame.style.top = `${r.top}px`;
  frame.style.left = `${r.left}px`;
  frame.style.width = `${r.width}px`;
  frame.style.height = `${r.height}px`;
  const set = (k: string, v: number) => panel.style.setProperty(k, `${v}px`);
  set('--t', r.top);
  set('--l', r.left);
  set('--w', r.width);
  set('--h', r.height);
  set('--r', window.innerWidth - r.left - r.width);
  set('--b', window.innerHeight - r.top - r.height);
}

function howtoButton(): HTMLElement | null {
  return app.querySelector<HTMLElement>('[data-act="howto"]');
}

function openHowto(): void {
  const btn = howtoButton();
  if (howto || !btn) return;
  const panel = document.createElement('div');
  panel.className = 'howto-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'howto-title');
  panel.innerHTML = `
    <div class="howto-frame" aria-hidden="true"></div>
    <div class="howto-content">
    <h2 class="howto-title" id="howto-title">How to play</h2>
    <button class="howto-close" aria-label="Close How to play">${icons.close}</button>
    <div class="howto-body">
      <p class="howto-lead">One phone gets passed around. Whoever’s holding it can:</p>
      <div class="step"><span class="num sun">1</span><p><strong>Write a clue.</strong> You get a spectrum, like <em>Cold ↔ Hot</em>,
        and a secret target on it. Write a clue that guides the guessers to the target.</p></div>
      <div class="step"><span class="num mint">2</span><p><strong>Guess.</strong> Drag the needle to where you think someone
        else’s clue belongs, then see the target and how everyone scored.</p></div>
      <div class="step"><span class="num peach">3</span><p><strong>Pass the phone.</strong> Play as much as you like, and join or leave anytime.
        No talking needed, and no fixed turn order.</p></div>
    </div>
    </div>`;
  setBox(panel, btn.getBoundingClientRect());
  document.body.appendChild(panel);
  btn.style.visibility = 'hidden';
  document.body.classList.add('howto-open');
  howto = panel;
  panel.querySelector('.howto-close')!.addEventListener('click', () => {
    closeHowto();
    ensureGuard();
  });
  void panel.offsetWidth; // start from the button's box
  panel.classList.add('open');
  setBox(panel, fullScreen());
  window.setTimeout(() => panel.querySelector<HTMLElement>('.howto-close')?.focus(), reducedMotion() ? 0 : HOWTO_MS);
}

function closeHowto(): void {
  const panel = howto;
  if (!panel || howtoClosing) return;
  howtoClosing = true;
  const btn = howtoButton();
  panel.classList.remove('open');
  if (btn) setBox(panel, btn.getBoundingClientRect());
  window.setTimeout(() => {
    panel.remove();
    howto = null;
    howtoClosing = false;
    document.body.classList.remove('howto-open');
    const b = howtoButton();
    if (b) {
      b.style.visibility = '';
      b.focus();
    }
  }, reducedMotion() ? 0 : HOWTO_MS);
}

window.addEventListener('resize', () => {
  if (howto && !howtoClosing) setBox(howto, fullScreen());
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && howto) {
    closeHowto();
    ensureGuard();
  }
});

// ---------- screens ----------

function renderPicker(): string {
  const active = game.players.filter((p) => p.active);
  const away = game.players.filter((p) => !p.active);
  const grid = active
    .map(
      (p, i) =>
        `<button class="person enter${hasFlame(game, p.id) ? ' hot' : ''}" ${enter(i)} data-act="pick" data-id="${p.id}"><span class="big">${esc(p.emoji)}</span><span class="pname">${esc(p.name)}${hasFlame(game, p.id) ? flame() : ''}</span></button>`,
    )
    .join('');
  const returning = away.length
    ? `<details class="returning"><summary>Played before? Rejoin</summary>
       ${away.map((p) => `<button class="row" data-act="rejoin" data-id="${p.id}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}
       </details>`
    : '';
  return layout(
    '',
    `<span class="deco sun" aria-hidden="true"></span><span class="deco mint" aria-hidden="true"></span>
     <h1 class="hero">Who are you?</h1>${active.length ? `<div class="people">${grid}</div>` : ''}${returning}`,
    `<button class="howto-btn" data-act="howto" aria-haspopup="dialog">How to play</button>
     <button class="primary" data-act="new-player">Join Game</button>`,
  );
}

function renderJoin(v: Extract<View, { name: 'join' }>): string {
  const emojis = EMOJIS.map(
    (e) => `<button type="button" class="emoji ${e === v.emoji ? 'on' : ''}" data-act="emoji" data-id="${e}" aria-label="${e}" aria-pressed="${e === v.emoji}">${e}</button>`,
  ).join('');
  return layout(
    'Type your name, pick an emoji if you like, then tap Join.',
    `<h1>Join the game</h1>
     ${inlineField({ form: 'join', id: 'name', label: 'Your name', value: v.nameText, button: 'Join', enter: 'go', max: 20 })}
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
     <p class="label">Your emoji</p><div class="emojis">${emojis}</div>`,
    `<button data-act="back">Back</button>`,
  );
}

function renderHome(): string {
  const waiting = waitingFor(game, me!);
  // FR-202: today's top four active players; players who left are skipped.
  const top = leaderboard(game, 'today')
    .filter((r) => r.combined !== null && player(r.playerId)?.active)
    .slice(0, 4);
  // FR-202: empty sections are hidden, not explained.
  const toGuess = waiting.length
    ? `<h2>Clues to guess <span class="count">${waiting.length}</span></h2><div class="list">${waiting.map((t, i) => turnRow(t, null, i)).join('')}</div>`
    : '';
  const board = top.length
    ? `<h2>Top scores today</h2><div class="tops">${top
        .map(
          (r, i) =>
            `<div class="top-card enter${i === 0 ? ' first' : ''}" ${enter(i + waiting.length)}><span>${ORDINALS[i]} · ${who(r.playerId)}</span><strong>${fmt(r.combined)}</strong></div>`,
        )
        .join('')}</div>`
    : '';
  return layout(
    waiting.length ? 'Tap a clue to guess it, or write your own.' : 'Write a clue: you’ll get a secret target to guide the guessers to.',
    `${toGuess}${board}
     <nav class="links">
       <button data-act="turns">All clues</button>
       <button data-act="board">Scores</button>
       <button data-act="cards">Cards</button>
       <button data-act="menu">More</button>
     </nav>`,
    `<button class="primary" data-act="create">${icons.plus}Write a clue</button>`,
  );
}

function renderCreate(v: Extract<View, { name: 'create' }>): string {
  return layout(
    'Press and hold “Peek” to see the target. Write a clue that guides the guessers to it, then send.',
    `${cardEnds(v.card.left, v.card.right)}
     <div class="dial-host secret" id="dial">${dialSvg({ target: v.target })}</div>
     <div class="row-buttons">
       <button class="peek" data-hold="peek">${icons.peek}Hold to peek</button>
       <button data-act="redraw">${icons.redraw}New card</button>
     </div>
     ${inlineField({ form: 'send', id: 'clue', label: 'Your clue', value: v.clue, button: 'Send', enter: 'send', max: 60, placeholder: 'A word or phrase' })}
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
     <p class="tip">Tip: don’t use numbers or directions. Name a thing, person, or idea.</p>`,
    `<button data-act="back">Cancel</button>`,
  );
}

function renderAnswer(v: Extract<View, { name: 'answer' }>, t: Turn): string {
  return layout(
    'Drag the needle to where you think the clue belongs, then lock it in.',
    `<p class="by">Clue from ${who(t.creatorId)}</p>
     <h1 class="clue">“${esc(t.clue)}”</h1>
     ${cardEnds(t.left, t.right)}
     <div class="dial-host" id="dial">${dialSvg({ needle: v.pos })}</div>
     <div class="row-buttons">
       <button data-act="nudge" data-id="-1" aria-label="Move left">${icons.prev}Nudge</button>
       <button data-act="nudge" data-id="1" aria-label="Move right">Nudge${icons.next}</button>
     </div>`,
    `<button data-act="back">Skip</button><button class="primary" data-act="lock">Lock in guess</button>`,
  );
}

function renderReveal(v: Extract<View, { name: 'reveal' }>, t: Turn): string {
  const results = guessResults(game, t).sort((a, b) => b.total - a.total);
  const mine = results.find((r) => r.guess.playerId === me);
  const others = results
    .filter((r) => r.guess.playerId !== me)
    .map((r) => ({ position: r.guess.position, label: esc(player(r.guess.playerId)?.emoji ?? '❔') }));
  const isCreator = t.creatorId === me;
  // FR-617: name the bonuses so players learn them by seeing them.
  const bonuses = mine
    ? [
        mine.middle ? `<span class="chip sun enter" style="--i:0">+${mine.middle} middle target</span>` : '',
        mine.best ? `<span class="chip mint enter" style="--i:1">${crown('')}+${mine.best} best guess</span>` : '',
      ].filter(Boolean)
    : [];
  const confetti = v.justAnswered && mine && mine.zone > 0
    ? '<span class="bit b1"></span><span class="bit b2"></span><span class="bit b3"></span><span class="bit b4"></span><span class="bit b5"></span>'
    : '';
  const banner = mine
    ? `<div class="score"><span>You scored</span><span class="badge-box"><span class="burst" aria-hidden="true">${confetti}</span><strong class="badge s${mine.zone}">${mine.total}</strong></span></div>
       ${bonuses.length ? `<p class="bonuses">${bonuses.join('')}</p>` : ''}`
    : isCreator
      ? `<div class="score"><span>Your Clue Score</span><strong class="badge clue">${fmt(clueScore(game, t))}</strong></div>`
      : '';
  const rows = results.length
    ? results
        .map((r, i) => `<div class="mini enter" ${enter(i + 2)}><span>${who(r.guess.playerId)}${r.best ? crown() : ''}</span><strong>${r.total}</strong></div>`)
        .join('')
    : `<p class="empty">No guesses yet. Check back later.</p>`;
  const next = waitingFor(game, me!).length > 0; // FR-408
  return layout(
    v.justAnswered ? 'Here’s the target. Tap Done when you’re ready.' : 'The highlighted zone shows where the target was.',
    `<p class="by">Clue from ${who(t.creatorId)}</p>
     <h1 class="clue">“${esc(t.clue)}”</h1>
     ${cardEnds(t.left, t.right)}
     <div class="dial-host${v.justAnswered ? ' celebrate' : ''}" id="dial">${dialSvg({ target: t.target, needle: mine?.guess.position, markers: others })}</div>
     <div class="${v.justAnswered ? 'celebrate' : ''}">${banner}</div>
     <h2>Scores</h2><div class="list">${rows}</div>`,
    `<button ${next ? '' : 'class="primary"'} data-act="back">Done</button>${next ? `<button class="primary" data-act="next-clue">Next clue${icons.next}</button>` : ''}`,
  );
}

function renderTurns(v: Extract<View, { name: 'turns' }>): string {
  const all = [...game.turns].reverse();
  let list: Turn[];
  if (v.tab === 'waiting') list = all.filter((t) => t.creatorId !== me && !hasGuessed(game, t.id, me!));
  else if (v.tab === 'answered') list = all.filter((t) => hasGuessed(game, t.id, me!));
  else list = all.filter((t) => t.creatorId === me);
  const status = (t: Turn) => {
    if (v.tab === 'waiting') return null;
    if (v.tab === 'created') {
      const c = clueScore(game, t);
      return c === null ? 'No guesses yet' : `${fmt(c)} pts`;
    }
    const mine = guessResults(game, t).find((r) => r.guess.playerId === me)!;
    return `${mine.total} pts`;
  };
  const row = (t: Turn, i: number) => {
    if (v.tab !== 'created') return turnRow(t, status(t), i);
    // FR-310: creators can delete their own clues, after confirming.
    const count = game.guesses.filter((g) => g.turnId === t.id).length;
    const confirm =
      v.confirmDelete === t.id
        ? `<div class="confirm" role="alert">
             <p>Delete this clue${count ? ` and its ${count} guess${count === 1 ? '' : 'es'}? Those points come off everyone’s scores.` : '?'}</p>
             <div class="row-buttons"><button data-act="cancel-delete">Keep it</button><button class="danger" data-act="delete-turn" data-id="${t.id}">Delete</button></div>
           </div>`
        : '';
    return `<div class="row-wrap">${turnRow(t, status(t), i)}
      <button class="icon-btn" data-act="ask-delete" data-id="${t.id}" aria-label="Delete clue “${esc(t.clue)}”">${icons.trash}</button></div>${confirm}`;
  };
  const tab = (id: Tab, label: string) =>
    `<button class="tab ${v.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}" aria-pressed="${v.tab === id}">${label}</button>`;
  return layout(
    v.tab === 'created' ? 'Tap a clue to see how everyone did, or the trash can to delete it.' : 'Tap a clue to guess it or see how everyone did.',
    `<h1>Clues</h1><div class="tabs">${tab('waiting', 'To guess')}${tab('answered', 'I guessed')}${tab('created', 'My clues')}</div>
     <div class="list">${list.length ? list.map(row).join('') : '<p class="empty">Nothing here yet.</p>'}</div>`,
    `<button class="primary" data-act="back">Back</button>`,
  );
}

function periodTab(id: Period, label: string): string {
  const on = view.name === 'board' && view.period === id;
  return `<button class="tab ${on ? 'on' : ''}" data-act="period" data-id="${id}" aria-pressed="${on}">${label}</button>`;
}

function renderBoard(v: Extract<View, { name: 'board' }>): string {
  const ranked = leaderboard(game, v.period);
  const rows = ranked
    .map((r, i) => {
      const rank = r.combined === null ? '–' : ranked.findIndex((x) => x.combined === r.combined) + 1;
      const p = player(r.playerId)!;
      return `<div class="score-row enter ${p.active ? '' : 'away'}${rank === 1 ? ' first' : ''}" ${enter(i)}>
        <span class="rank">${rank}</span>
        <span class="name"><span>${who(r.playerId)}${p.active ? '' : ' <small>(left)</small>'}</span>
          <small>Guessing Score ${fmt(r.guessing)} · Clue Score ${fmt(r.clues)}</small></span>
        <strong>${fmt(r.combined)}</strong>
      </div>`;
    })
    .join('');
  return layout(
    v.period === 'today' ? 'Today’s scores. Tap All-time for the long run.' : 'Everyone’s scores across every game.',
    `<h1>Scores</h1>
     <div class="tabs two">${periodTab('today', 'Today')}${periodTab('all', 'All-time')}</div>
     <div class="list">${rows || '<p class="empty">No players yet.</p>'}</div>`,
    `<button class="primary" data-act="back">Back</button>`,
  );
}

function renderCards(v: Extract<View, { name: 'cards' }>): string {
  const custom = game.customCards
    .map((c, i) => `<div class="mini enter" ${enter(i)}><span>${esc(c.left)} ↔ ${esc(c.right)}</span><button class="icon-btn small" data-act="del-card" data-id="${c.id}" aria-label="Delete card ${esc(c.left)} to ${esc(c.right)}">${icons.trash}</button></div>`)
    .join('');
  return layout(
    'Add your own spectrum: two opposite ends. It joins the deck right away.',
    `<h1>Cards</h1>
     <form class="inline-form" data-form="add-card" novalidate>
       <label class="field" for="left">Left end</label>
       <div class="field-row"><input id="left" class="text" maxlength="30" autocomplete="off" enterkeyhint="next" value="${esc(v.left)}" placeholder="e.g. Tiny"></div>
       <label class="field" for="right">Right end</label>
       <div class="field-row"><input id="right" class="text" maxlength="30" autocomplete="off" enterkeyhint="done" value="${esc(v.right)}" placeholder="e.g. Huge">
         <button type="submit" class="primary inset">Add</button></div>
     </form>
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
     ${custom ? `<h2>Your custom cards (${game.customCards.length})</h2><div class="list">${custom}</div>` : ''}
     <p class="tip">${BUILT_IN_CARDS.length} built-in cards are always in the deck.</p>`,
    `<button class="primary" data-act="back">Back</button>`,
  );
}

function renderMenu(v: Extract<View, { name: 'menu' }>): string {
  const reset = v.confirmReset
    ? `<p class="error">This erases every clue and score. Players and custom cards stay. Sure?</p>
       <div class="row-buttons"><button data-act="cancel-reset">Keep playing</button><button class="danger" data-act="reset">Yes, start over</button></div>`
    : `<button class="wide" data-act="confirm-reset">Start a new game…</button>`;
  return layout(
    'Leaving keeps your scores. You can rejoin any time.',
    `<h1>More</h1>
     <button class="wide" data-act="leave">Leave the game</button>
     ${reset}
     <p class="tip">Everything is saved on this phone only. Clearing your browser data erases the game.</p>`,
    `<button class="primary" data-act="back">Back</button>`,
  );
}

function render(): void {
  if (!me && !['picker', 'join'].includes(view.name)) {
    view = { name: 'picker' };
    stack = [];
  }
  const v = view;
  if ((v.name === 'answer' || v.name === 'reveal') && !findTurn(v.turnId)) {
    view = { name: 'home' };
    stack = [];
    return render();
  }
  switch (v.name) {
    case 'picker': app.innerHTML = renderPicker(); break;
    case 'join': app.innerHTML = renderJoin(v); break;
    case 'home': app.innerHTML = renderHome(); break;
    case 'create': app.innerHTML = renderCreate(v); break;
    case 'answer': app.innerHTML = renderAnswer(v, findTurn(v.turnId)!); break;
    case 'reveal': app.innerHTML = renderReveal(v, findTurn(v.turnId)!); break;
    case 'turns': app.innerHTML = renderTurns(v); break;
    case 'board': app.innerHTML = renderBoard(v); break;
    case 'cards': app.innerHTML = renderCards(v); break;
    case 'menu': app.innerHTML = renderMenu(v); break;
  }
  wire();
  applyUpdateIfSafe();
}

// ---------- input ----------

function bindInput(id: string, set: (value: string) => void): void {
  document.getElementById(id)?.addEventListener('input', (e) => {
    set((e.target as HTMLInputElement).value);
    // Typing clears a stale error message.
    const v = view;
    if ((v.name === 'join' || v.name === 'create' || v.name === 'cards') && v.error) {
      v.error = undefined;
      app.querySelector('.error')?.remove();
    }
  });
}

function wire(): void {
  const v = view;
  if (v.name === 'answer') {
    const host = document.getElementById('dial')!;
    attachDrag(host, (p) => {
      v.pos = p;
      setNeedle(host, p);
    });
  }
  if (v.name === 'create') {
    const host = document.getElementById('dial')!;
    const peek = app.querySelector<HTMLElement>('[data-hold="peek"]')!;
    const show = (e: Event) => {
      e.preventDefault();
      host.classList.remove('secret');
    };
    const hide = () => host.classList.add('secret');
    peek.addEventListener('pointerdown', show);
    peek.addEventListener('pointerup', hide);
    peek.addEventListener('pointerleave', hide);
    peek.addEventListener('pointercancel', hide);
    peek.addEventListener('contextmenu', (e) => e.preventDefault());
    bindInput('clue', (x) => (v.clue = x));
  }
  if (v.name === 'join') {
    bindInput('name', (x) => (v.nameText = x));
    // Emoji buttons don't take focus, so the name field keeps the keyboard open (FR-906).
    app.querySelectorAll('.emoji').forEach((b) => {
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('mousedown', (e) => e.preventDefault());
    });
  }
  if (v.name === 'cards') {
    bindInput('left', (x) => (v.left = x));
    bindInput('right', (x) => (v.right = x));
  }
}

function focusField(id: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  el?.focus();
}

function startCreate(): View {
  return { name: 'create', card: drawCard(deck()), target: randomTarget(), clue: '' };
}

function openTurn(id: string, replace = false): void {
  const t = findTurn(id);
  if (!t) return;
  if (canSeeReveal(game, t, me!)) go({ name: 'reveal', turnId: id, justAnswered: false }, replace);
  else go({ name: 'answer', turnId: id, pos: 50 }, replace);
}

/** Handle one action from a button tap or a form submit. */
function act(action: string, id: string): void {
  const v = view;
  switch (action) {
    case 'back': back(); break;
    case 'howto': openHowto(); break;
    case 'pass': passPhone(); break;
    case 'pick': me = id; go({ name: 'home' }); break;
    case 'rejoin': commit(rejoinPlayer(game, id)); me = id; go({ name: 'home' }); break;
    case 'new-player':
      go({ name: 'join', emoji: freeEmoji(), nameText: '' });
      focusField('name');
      break;
    case 'emoji':
      // FR-906: update in place so the keyboard and typed name survive.
      if (v.name === 'join') {
        v.emoji = id;
        v.error = undefined;
        app.querySelectorAll<HTMLElement>('.emoji').forEach((b) => {
          const on = b.dataset.id === id;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', String(on));
        });
        app.querySelector('.error')?.remove();
      }
      break;
    case 'join':
      if (v.name === 'join') {
        const r = joinPlayer(game, v.nameText, v.emoji);
        commit(r.state);
        me = r.playerId;
        go({ name: 'home' });
      }
      break;
    case 'create': go(startCreate()); break;
    case 'redraw': if (v.name === 'create') go({ ...v, card: drawCard(deck(), v.card.id), error: undefined }, true); break;
    case 'send':
      if (v.name === 'create') {
        commit(createTurn(game, me!, v.card, v.target, v.clue));
        toast('Clue sent! Others can guess it now.');
        go({ name: 'home' });
      }
      break;
    case 'open-turn': openTurn(id); break;
    case 'next-clue': {
      const next = waitingFor(game, me!)[0];
      if (next) openTurn(next.id, true);
      break;
    }
    case 'nudge':
      if (v.name === 'answer') {
        v.pos = Math.min(100, Math.max(0, v.pos + Number(id)));
        setNeedle(document.getElementById('dial')!, v.pos);
      }
      break;
    case 'lock':
      if (v.name === 'answer') {
        commit(submitGuess(game, v.turnId, me!, v.pos));
        go({ name: 'reveal', turnId: v.turnId, justAnswered: true }, true);
      }
      break;
    case 'turns': go({ name: 'turns', tab: 'waiting' }); break;
    case 'tab': go({ name: 'turns', tab: id as Tab }, true); break;
    case 'ask-delete': if (v.name === 'turns') go({ ...v, confirmDelete: v.confirmDelete === id ? undefined : id }, true); break;
    case 'cancel-delete': if (v.name === 'turns') go({ ...v, confirmDelete: undefined }, true); break;
    case 'delete-turn':
      if (v.name === 'turns') {
        commit(deleteTurn(game, id, me!));
        toast('Clue deleted.');
        go({ ...v, confirmDelete: undefined }, true);
      }
      break;
    case 'board': go({ name: 'board', period: 'today' }); break;
    case 'period': go({ name: 'board', period: id as Period }, true); break;
    case 'cards': go({ name: 'cards', left: '', right: '' }); break;
    case 'add-card':
      if (v.name === 'cards') {
        // FR-905: Enter in the first field moves on to the second.
        if (v.left.trim() && !v.right.trim()) {
          focusField('right');
          break;
        }
        commit(addCustomCard(game, v.left, v.right));
        toast('Card added to the deck.');
        go({ name: 'cards', left: '', right: '' }, true);
        focusField('left');
      }
      break;
    case 'del-card': commit(deleteCustomCard(game, id)); render(); break;
    case 'menu': go({ name: 'menu', confirmReset: false }); break;
    case 'confirm-reset': go({ name: 'menu', confirmReset: true }, true); break;
    case 'cancel-reset': go({ name: 'menu', confirmReset: false }, true); break;
    case 'reset': commit(newGame(game)); toast('New game started.'); go({ name: 'home' }); break;
    case 'leave': commit(leavePlayer(game, me!)); me = null; toast('You left. Your scores are saved.'); go({ name: 'picker' }); break;
  }
}

function run(action: string, id: string): void {
  ensureGuard();
  const v = view;
  try {
    act(action, id);
  } catch (err) {
    if (err instanceof RuleError && (v.name === 'join' || v.name === 'create' || v.name === 'cards')) {
      go({ ...v, error: err.message } as View, true);
    } else if (err instanceof RuleError) {
      toast(err.message);
    } else {
      throw err;
    }
  }
}

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (el) run(el.dataset.act!, el.dataset.id ?? '');
});

// Enter/Go/Send on the keyboard submits (FR-905).
app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  if (form.dataset.form) run(form.dataset.form, '');
});

render();
