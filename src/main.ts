// HandWave app shell: screens, navigation, and input handling.

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
import { clueScore, leaderboard, pointsFor } from './scoring';
import { load, save } from './storage';

registerSW({ immediate: true });

type View =
  | { name: 'picker' }
  | { name: 'join'; emoji: string; nameText: string; error?: string }
  | { name: 'home' }
  | { name: 'create'; card: Card; target: number; clue: string; error?: string }
  | { name: 'answer'; turnId: string; pos: number }
  | { name: 'reveal'; turnId: string; justAnswered: boolean }
  | { name: 'turns'; tab: 'waiting' | 'answered' | 'created' }
  | { name: 'board' }
  | { name: 'cards'; left: string; right: string; error?: string }
  | { name: 'menu'; confirmReset: boolean };

const EMOJIS = [
  '🦊', '🐢', '🐙', '🐝', '🦉', '🐸', '🦄', '🐳', '🦖', '🐧', '🐼', '🦁',
  '🐯', '🐨', '🦩', '🦔', '🐌', '🦀', '🌵', '🍄', '🌻', '🍉', '🍩', '🌮',
  '🚀', '🎸', '⚡', '🔥', '🌈', '⭐', '🎲', '🧩',
];

const app = document.getElementById('app')!;
let game: GameState = load();
let me: string | null = null;
let view: View = { name: 'picker' };

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
  return p ? `${esc(p.emoji)} ${esc(p.name)}` : '❔ Unknown';
}

function deck(): Card[] {
  return [...BUILT_IN_CARDS, ...game.customCards];
}

function commit(next: GameState): void {
  game = next;
  if (!save(game)) toast("Couldn't save. Is storage full?");
}

function go(next: View): void {
  view = next;
  render();
  window.scrollTo(0, 0);
}

function toast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function cardEnds(left: string, right: string): string {
  return `<div class="ends"><span>◀ ${esc(left)}</span><span>${esc(right)} ▶</span></div>`;
}

function turnRow(t: Turn, status: string): string {
  return `<button class="row" data-act="open-turn" data-id="${t.id}">
    <span class="row-main"><strong>“${esc(t.clue)}”</strong>
    <small>${esc(t.left)} ↔ ${esc(t.right)} · by ${who(t.creatorId)}</small></span>
    <span class="row-side">${status}</span>
  </button>`;
}

function layout(hint: string, main: string, footer = ''): string {
  const header = me
    ? `<header><span class="who">${who(me)}</span>
       <button class="pass" data-act="pass">Pass the phone ↻</button></header>`
    : `<header><span class="brand">✋ HandWave</span></header>`;
  return `${header}${hint ? `<p class="hint">${hint}</p>` : ''}<main>${main}</main>${footer ? `<footer>${footer}</footer>` : ''}`;
}

// ---------- screens ----------

function renderPicker(): string {
  const active = game.players.filter((p) => p.active);
  const away = game.players.filter((p) => !p.active);
  const grid = active
    .map((p) => `<button class="person" data-act="pick" data-id="${p.id}"><span class="big">${esc(p.emoji)}</span>${esc(p.name)}</button>`)
    .join('');
  const returning = away.length
    ? `<details class="returning"><summary>Played before? Rejoin</summary>
       ${away.map((p) => `<button class="row" data-act="rejoin" data-id="${p.id}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}
       </details>`
    : '';
  return layout(
    '',
    `<h1>Who are you?</h1><div class="people">${grid}</div>${returning}
     <section class="howto"><h2>How to play</h2>
     <p>One phone gets passed around. Whoever’s holding it can:</p>
     <ul>
       <li><strong>Make a wave.</strong> You get a spectrum, like <em>Cold ↔ Hot</em>, and a secret target on it.
       Write a clue that guides the guessers to the target.</li>
       <li><strong>Guess a wave.</strong> Drag the needle to where you think someone else’s clue belongs,
       then see the target and how everyone scored.</li>
     </ul>
     <p>Do as many as you like, in any order, then pass the phone. No talking, no taking turns.
     Join or leave anytime.</p></section>`,
    `<button class="primary" data-act="new-player">Join Game</button>`,
  );
}

function renderJoin(v: Extract<View, { name: 'join' }>): string {
  const emojis = EMOJIS.map(
    (e) => `<button class="emoji ${e === v.emoji ? 'on' : ''}" data-act="emoji" data-id="${e}" aria-label="${e}">${e}</button>`,
  ).join('');
  return layout(
    'Type your name, pick an emoji, then tap Join.',
    `<h1>Join the game</h1>
     <label class="field">Your name<input id="name" maxlength="20" autocomplete="off" value="${esc(v.nameText)}"></label>
     <p class="label">Your emoji</p><div class="emojis">${emojis}</div>
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}`,
    `<button data-act="to-picker">Back</button><button class="primary" data-act="join">Join</button>`,
  );
}

function renderHome(): string {
  const waiting = waitingFor(game, me!);
  const list = waiting.length
    ? waiting.map((t) => turnRow(t, 'Guess ›')).join('')
    : `<p class="empty">No waves to guess right now. Make one for the others!</p>`;
  const top = leaderboard(game).filter((r) => r.combined !== null).slice(0, 3);
  const board = top.length
    ? top.map((r, i) => `<div class="mini"><span>${i + 1}. ${who(r.playerId)}</span><strong>${fmt(r.combined)}</strong></div>`).join('')
    : `<p class="empty">No scores yet.</p>`;
  return layout(
    waiting.length ? 'Tap a clue to guess it, or make your own wave.' : 'Make a wave: you’ll get a secret target to write a clue for.',
    `<h2>Waiting for you (${waiting.length})</h2><div class="list">${list}</div>
     <h2>Top scores</h2><div class="list">${board}</div>
     <nav class="links">
       <button data-act="turns">All waves</button>
       <button data-act="board">Scores</button>
       <button data-act="cards">Cards</button>
       <button data-act="menu">More</button>
     </nav>`,
    `<button class="primary" data-act="create">＋ Make a wave</button>`,
  );
}

function renderCreate(v: Extract<View, { name: 'create' }>): string {
  return layout(
    'Press and hold “Peek” to see the target. Write a clue that guides the guessers to it, then send.',
    `<h1>Make a wave</h1>
     ${cardEnds(v.card.left, v.card.right)}
     <div class="dial-host secret" id="dial">${dialSvg({ target: v.target })}</div>
     <div class="row-buttons">
       <button class="peek" data-hold="peek">👁 Hold to peek</button>
       <button data-act="redraw">🔄 New card</button>
     </div>
     <label class="field">Your clue<input id="clue" maxlength="60" autocomplete="off" placeholder="A word or phrase" value="${esc(v.clue)}"></label>
     <p class="tip">Tip: don’t use numbers or directions. Name a thing, person, or idea.</p>
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}`,
    `<button data-act="home">Cancel</button><button class="primary" data-act="send">Send wave</button>`,
  );
}

function renderAnswer(v: Extract<View, { name: 'answer' }>): string {
  const t = game.turns.find((x) => x.id === v.turnId)!;
  return layout(
    'Drag the needle to where you think the clue belongs, then lock it in.',
    `<p class="by">Clue from ${who(t.creatorId)}</p>
     <h1 class="clue">“${esc(t.clue)}”</h1>
     ${cardEnds(t.left, t.right)}
     <div class="dial-host" id="dial">${dialSvg({ needle: v.pos })}</div>
     <div class="row-buttons">
       <button data-act="nudge" data-id="-1" aria-label="Move left">◀ Nudge</button>
       <button data-act="nudge" data-id="1" aria-label="Move right">Nudge ▶</button>
     </div>`,
    `<button data-act="home">Skip</button><button class="primary" data-act="lock">Lock in guess</button>`,
  );
}

function renderReveal(v: Extract<View, { name: 'reveal' }>): string {
  const t = game.turns.find((x) => x.id === v.turnId)!;
  const guesses = game.guesses
    .filter((g) => g.turnId === t.id)
    .map((g) => ({ ...g, pts: pointsFor(g.position, t.target) }))
    .sort((a, b) => b.pts - a.pts);
  const mine = guesses.find((g) => g.playerId === me);
  const others = guesses.filter((g) => g.playerId !== me).map((g) => ({ position: g.position, label: esc(player(g.playerId)?.emoji ?? '❔') }));
  const isCreator = t.creatorId === me;
  const banner = mine
    ? `<p class="score s${mine.pts}">You scored <strong>${mine.pts}</strong> / 4</p>`
    : isCreator
      ? `<p class="score">Your Clue Score <strong>${fmt(clueScore(game, t))}</strong> / 4</p>`
      : '';
  const rows = guesses.length
    ? guesses.map((g) => `<div class="mini"><span>${who(g.playerId)}</span><strong>${g.pts}</strong></div>`).join('')
    : `<p class="empty">No guesses yet. Check back later.</p>`;
  return layout(
    v.justAnswered ? 'Here’s the target. Tap Done when you’re ready.' : 'The highlighted zone shows where the target was.',
    `<p class="by">Clue from ${who(t.creatorId)}</p>
     <h1 class="clue">“${esc(t.clue)}”</h1>
     ${cardEnds(t.left, t.right)}
     <div class="dial-host" id="dial">${dialSvg({ target: t.target, needle: mine?.position, markers: others })}</div>
     ${banner}
     <h2>Scores</h2><div class="list">${rows}</div>`,
    `<button class="primary" data-act="home">Done</button>`,
  );
}

function renderTurns(v: Extract<View, { name: 'turns' }>): string {
  const all = [...game.turns].reverse();
  let list: Turn[];
  if (v.tab === 'waiting') list = all.filter((t) => t.creatorId !== me && !hasGuessed(game, t.id, me!));
  else if (v.tab === 'answered') list = all.filter((t) => hasGuessed(game, t.id, me!));
  else list = all.filter((t) => t.creatorId === me);
  const status = (t: Turn) => {
    if (v.tab === 'waiting') return 'Guess ›';
    if (v.tab === 'created') { const c = clueScore(game, t); return c === null ? 'No answers yet' : `${fmt(c)} pts`; }
    const g = game.guesses.find((x) => x.turnId === t.id && x.playerId === me)!;
    return `${pointsFor(g.position, t.target)} pts`;
  };
  const tab = (id: string, label: string) =>
    `<button class="tab ${v.tab === id ? 'on' : ''}" data-act="tab" data-id="${id}">${label}</button>`;
  return layout(
    'Tap a wave to guess it or see how everyone did.',
    `<h1>Waves</h1><div class="tabs">${tab('waiting', 'Waiting')}${tab('answered', 'I guessed')}${tab('created', 'I made')}</div>
     <div class="list">${list.length ? list.map((t) => turnRow(t, status(t))).join('') : '<p class="empty">Nothing here yet.</p>'}</div>`,
    `<button class="primary" data-act="home">Back</button>`,
  );
}

function renderBoard(): string {
  const ranked = leaderboard(game);
  const rows = ranked
    .map((r) => {
      const rank = r.combined === null ? '–' : ranked.findIndex((x) => x.combined === r.combined) + 1;
      const p = player(r.playerId)!;
      return `<div class="score-row ${p.active ? '' : 'away'}">
        <span class="rank">${rank}</span>
        <span class="name">${who(r.playerId)}${p.active ? '' : ' <small>(left)</small>'}
          <small>Guessing Score ${fmt(r.guessAverage)} · Clue Score ${fmt(r.clueAverage)}</small></span>
        <strong>${fmt(r.combined)}</strong>
      </div>`;
    })
    .join('');
  return layout(
    'Scores are out of 4. Join or leave anytime.',
    `<h1>Scores</h1><div class="list">${rows || '<p class="empty">No players yet.</p>'}</div>`,
    `<button class="primary" data-act="home">Back</button>`,
  );
}

function renderCards(v: Extract<View, { name: 'cards' }>): string {
  const custom = game.customCards
    .map((c) => `<div class="mini"><span>${esc(c.left)} ↔ ${esc(c.right)}</span><button class="small" data-act="del-card" data-id="${c.id}">Delete</button></div>`)
    .join('');
  return layout(
    'Add your own spectrum: two opposite ends. It joins the deck right away.',
    `<h1>Cards</h1>
     <label class="field">Left end<input id="left" maxlength="30" value="${esc(v.left)}" placeholder="e.g. Tiny"></label>
     <label class="field">Right end<input id="right" maxlength="30" value="${esc(v.right)}" placeholder="e.g. Huge"></label>
     ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
     <button class="wide" data-act="add-card">Add card</button>
     <h2>Your custom cards (${game.customCards.length})</h2><div class="list">${custom || '<p class="empty">None yet.</p>'}</div>
     <p class="tip">${BUILT_IN_CARDS.length} built-in cards are always in the deck.</p>`,
    `<button class="primary" data-act="home">Back</button>`,
  );
}

function renderMenu(v: Extract<View, { name: 'menu' }>): string {
  const reset = v.confirmReset
    ? `<p class="error">This erases every wave and score. Players and custom cards stay. Sure?</p>
       <div class="row-buttons"><button data-act="menu">Keep playing</button><button class="danger" data-act="reset">Yes, start over</button></div>`
    : `<button class="wide" data-act="confirm-reset">Start a new game…</button>`;
  return layout(
    'Leaving keeps your scores. You can rejoin any time.',
    `<h1>More</h1>
     <button class="wide" data-act="leave">Leave the game</button>
     ${reset}
     <p class="tip">Everything is saved on this phone only. Clearing your browser data erases the game.</p>`,
    `<button class="primary" data-act="home">Back</button>`,
  );
}

function render(): void {
  if (!me && !['picker', 'join'].includes(view.name)) view = { name: 'picker' };
  switch (view.name) {
    case 'picker': app.innerHTML = renderPicker(); break;
    case 'join': app.innerHTML = renderJoin(view); break;
    case 'home': app.innerHTML = renderHome(); break;
    case 'create': app.innerHTML = renderCreate(view); break;
    case 'answer': app.innerHTML = renderAnswer(view); break;
    case 'reveal': app.innerHTML = renderReveal(view); break;
    case 'turns': app.innerHTML = renderTurns(view); break;
    case 'board': app.innerHTML = renderBoard(); break;
    case 'cards': app.innerHTML = renderCards(view); break;
    case 'menu': app.innerHTML = renderMenu(view); break;
  }
  wire();
}

// ---------- input ----------

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
    document.getElementById('clue')!.addEventListener('input', (e) => {
      v.clue = (e.target as HTMLInputElement).value;
    });
  }
  if (v.name === 'join') {
    document.getElementById('name')!.addEventListener('input', (e) => {
      v.nameText = (e.target as HTMLInputElement).value;
    });
  }
  if (v.name === 'cards') {
    document.getElementById('left')!.addEventListener('input', (e) => (v.left = (e.target as HTMLInputElement).value));
    document.getElementById('right')!.addEventListener('input', (e) => (v.right = (e.target as HTMLInputElement).value));
  }
}

function startCreate(): View {
  return { name: 'create', card: drawCard(deck()), target: randomTarget(), clue: '' };
}

function openTurn(id: string): void {
  const t = game.turns.find((x) => x.id === id);
  if (!t) return;
  if (canSeeReveal(game, t, me!)) go({ name: 'reveal', turnId: id, justAnswered: false });
  else go({ name: 'answer', turnId: id, pos: 50 });
}

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el) return;
  const id = el.dataset.id ?? '';
  const v = view;
  try {
    switch (el.dataset.act) {
      case 'pass':
        document.querySelectorAll('.toast').forEach((t) => t.remove());
        me = null;
        go({ name: 'picker' });
        break;
      case 'pick': me = id; go({ name: 'home' }); break;
      case 'rejoin': commit(rejoinPlayer(game, id)); me = id; go({ name: 'home' }); break;
      case 'new-player': go({ name: 'join', emoji: '', nameText: '' }); break;
      case 'to-picker': go({ name: 'picker' }); break;
      case 'emoji': if (v.name === 'join') go({ ...v, emoji: id, error: undefined }); break;
      case 'join':
        if (v.name === 'join') {
          const r = joinPlayer(game, v.nameText, v.emoji);
          commit(r.state);
          me = r.playerId;
          go({ name: 'home' });
        }
        break;
      case 'home': go({ name: 'home' }); break;
      case 'create': go(startCreate()); break;
      case 'redraw': if (v.name === 'create') go({ ...v, card: drawCard(deck(), v.card.id), error: undefined }); break;
      case 'send':
        if (v.name === 'create') {
          commit(createTurn(game, me!, v.card, v.target, v.clue));
          toast('Wave sent! Others can guess it now.');
          go({ name: 'home' });
        }
        break;
      case 'open-turn': openTurn(id); break;
      case 'nudge':
        if (v.name === 'answer') {
          v.pos = Math.min(100, Math.max(0, v.pos + Number(id)));
          setNeedle(document.getElementById('dial')!, v.pos);
        }
        break;
      case 'lock':
        if (v.name === 'answer') {
          commit(submitGuess(game, v.turnId, me!, v.pos));
          go({ name: 'reveal', turnId: v.turnId, justAnswered: true });
        }
        break;
      case 'turns': go({ name: 'turns', tab: 'waiting' }); break;
      case 'tab': go({ name: 'turns', tab: id as 'waiting' | 'answered' | 'created' }); break;
      case 'board': go({ name: 'board' }); break;
      case 'cards': go({ name: 'cards', left: '', right: '' }); break;
      case 'add-card':
        if (v.name === 'cards') {
          commit(addCustomCard(game, v.left, v.right));
          toast('Card added to the deck.');
          go({ name: 'cards', left: '', right: '' });
        }
        break;
      case 'del-card': commit(deleteCustomCard(game, id)); render(); break;
      case 'menu': go({ name: 'menu', confirmReset: false }); break;
      case 'confirm-reset': go({ name: 'menu', confirmReset: true }); break;
      case 'reset': commit(newGame(game)); toast('New game started.'); go({ name: 'home' }); break;
      case 'leave': commit(leavePlayer(game, me!)); me = null; toast('You left. Your scores are saved.'); go({ name: 'picker' }); break;
    }
  } catch (err) {
    if (err instanceof RuleError && (v.name === 'join' || v.name === 'create' || v.name === 'cards')) {
      go({ ...v, error: err.message } as View);
    } else if (err instanceof RuleError) {
      toast(err.message);
    } else {
      throw err;
    }
  }
});

render();
