// Screen transitions (ADR-012, FR-209, NFR-110).
//
// Every screen change runs through transition():
//   1. measure the outgoing screen and copy it into a frozen overlay;
//   2. render the real incoming screen underneath (usable at once);
//   3. pair "units" (header children, hint, main children, footer children):
//      identical units, or units sharing a data-keep key, stay put (gliding if
//      their position shifted);
//   4. pair data-hero elements: a stand-in flies from the old element to the
//      new one, morphing its box and label;
//   5. every other old unit flies off, every new unit flies in.
// Nothing fades: everything moves.

export type Dir = 'forward' | 'back';

/** Hooks for screen-specific extras, such as the Join field (FR-208). */
export interface Ctx {
  oldRoot: HTMLElement;
  newRoot: HTMLElement;
  dir: Dir;
  animate(el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions): Animation;
  /** Add an overlay element; it's removed when the transition ends. */
  layer(el: HTMLElement): HTMLElement;
  /** Hide an element until the transition ends. */
  hide(el: Element): void;
}

export interface TransitionOptions {
  dir: Dir;
  /** Old hero key → new hero key, when an element changes identity (join: avatar-new → avatar-<id>). */
  aliases?: Record<string, string>;
  extras?: (ctx: Ctx) => void;
  /** When the incoming screen starts flying in (ms). */
  inDelay?: number;
  /** Runs once everything has landed (not when interrupted). */
  onLanded?: () => void;
}

export const GLIDE = 'cubic-bezier(.2, .85, .25, 1)'; // fast start, soft landing
export const ACCEL = 'cubic-bezier(.35, 0, .85, .45)'; // leaves right away, speeding up

const OUT_MS = 280;
const OUT_STAGGER = 18;
const IN_MS = 440;
const IN_STAGGER = 30;
const IN_DELAY = 170;
const HERO_MS = 560;
const KEEP_MS = 460;

let running: (() => void) | null = null;

/** Finish a running transition at once (navigating mid-animation). */
export function endTransition(): void {
  running?.();
}

export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Rect = { left: number; top: number; width: number; height: number };

const STYLE_PROPS = [
  'backgroundColor', 'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'boxShadow', 'color',
  'fontFamily', 'fontWeight', 'fontSize', 'letterSpacing', 'lineHeight', 'textAlign', 'whiteSpace',
  'display', 'gap', 'alignItems', 'justifyContent', 'flexDirection', 'flexWrap',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
] as const;
type Look = Record<(typeof STYLE_PROPS)[number], string>;

type Hero = {
  key: string;
  index: number; // position among the root's [data-hero] elements (to find its copy)
  el: HTMLElement;
  box: Rect;
  label: Rect;
  text: string;
  html: string;
  input: boolean;
  hasBox: boolean;
  look: Look;
};

type Unit = { el: HTMLElement; sig: string; rect: Rect };

const rectOf = (r: DOMRect | Rect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height });

function units(root: HTMLElement): HTMLElement[] {
  const q = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  return [...q(':scope > header > *'), ...q(':scope > .hint'), ...q(':scope > main > *'), ...q(':scope > footer > *')];
}

function measureUnits(root: HTMLElement): Unit[] {
  return units(root).map((el) => ({
    el,
    sig: el.dataset.keep ? `keep:${el.dataset.keep}` : el.outerHTML.replace(/ style=""/g, ''),
    rect: rectOf(el.getBoundingClientRect()),
  }));
}

function alpha(color: string): number {
  if (color === 'transparent') return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean);
  return parts.length > 3 ? parseFloat(parts[3]) : 1;
}

/** Where an input's typed text sits on screen. */
function inputTextRect(el: HTMLInputElement, cs: CSSStyleDeclaration): Rect {
  const span = document.createElement('span');
  span.textContent = el.value;
  span.style.cssText = `position:fixed;left:0;top:0;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing}`;
  document.body.appendChild(span);
  const s = span.getBoundingClientRect();
  span.remove();
  const r = el.getBoundingClientRect();
  return {
    left: r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
    top: r.top + (r.height - s.height) / 2,
    width: s.width,
    height: s.height,
  };
}

function measureHeroes(root: HTMLElement, aliases: Record<string, string> = {}): Map<string, Hero> {
  const found = new Map<string, Hero>();
  root.querySelectorAll<HTMLElement>('[data-hero]').forEach((el, index) => {
    const raw = el.dataset.hero!;
    const key = aliases[raw] ?? raw;
    if (found.has(key)) return;
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) return; // not shown
    if (el.checkVisibility && !el.checkVisibility()) return; // e.g. inside a closed <details>
    const cs = getComputedStyle(el);
    const look = {} as Look;
    for (const p of STYLE_PROPS) look[p] = cs[p];
    const input = el instanceof HTMLInputElement;
    let label: Rect;
    let text: string;
    let html: string;
    if (input) {
      text = el.value.trim();
      if (!text) return; // nothing typed: nothing to carry over
      label = inputTextRect(el, cs);
      html = text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    } else {
      const range = document.createRange();
      range.selectNodeContents(el);
      const lr = range.getBoundingClientRect();
      label = lr.width > 0 ? rectOf(lr) : rectOf(b);
      text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      html = el.innerHTML;
    }
    const hasBox =
      !input && (parseFloat(look.borderTopWidth) > 0 || alpha(look.backgroundColor) > 0 || look.boxShadow !== 'none');
    found.set(key, { key, index, el, box: rectOf(b), label, text, html, input, hasBox, look });
  });
  return found;
}

const px = (r: Rect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

/** A shadow with no offset in the same color, so shadows grow and shrink instead of snapping. */
function flatShadow(shadow: string): string {
  const color = shadow.match(/rgba?\([^)]*\)/)?.[0] ?? 'rgb(28, 24, 56)';
  return `${color} 0px 0px 0px 0px`;
}

/** Copy markup for a stand-in, without ids or hero markers. */
function inert(html: string): string {
  const t = document.createElement('template');
  t.innerHTML = html;
  t.content.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  t.content.querySelectorAll('[data-hero]').forEach((n) => n.removeAttribute('data-hero'));
  return t.innerHTML;
}

const escText = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function fontCss(l: Look): string {
  return `font-family:${l.fontFamily};font-weight:${l.fontWeight};letter-spacing:${l.letterSpacing};`;
}

/** Fly one stand-in from the old hero to the new one. */
function heroGhost(a: Hero, b: Hero, c: Ctx): void {
  let mode: 'same' | 'drop' | 'grow' | 'roll' = 'roll';
  if (a.text === b.text) mode = 'same';
  else if (b.text && a.text.startsWith(b.text)) mode = 'drop';
  else if (a.text && b.text.startsWith(a.text)) mode = 'grow';

  // Text to text with the same words: a copy of the new element, laid out
  // exactly like it (so lines never re-wrap), scaled so its text starts where
  // the old text was.
  if (mode === 'same' && !a.hasBox && !b.hasBox) {
    const g = document.createElement('div');
    g.className = 'hero-ghost';
    const l = b.look;
    const display = l.display.includes('flex') ? l.display : 'block';
    g.style.cssText =
      `left:${b.box.left}px;top:${b.box.top}px;width:${b.box.width}px;` +
      `padding:${l.paddingTop} ${l.paddingRight} ${l.paddingBottom} ${l.paddingLeft};` +
      `${fontCss(l)}font-size:${l.fontSize};line-height:${l.lineHeight};color:${l.color};text-align:${l.textAlign};` +
      `white-space:${l.whiteSpace};display:${display};gap:${l.gap};align-items:${l.alignItems};` +
      `justify-content:${l.justifyContent};flex-direction:${l.flexDirection};flex-wrap:${l.flexWrap};transform-origin:0 0;`;
    g.innerHTML = inert(b.html);
    c.layer(g);
    const s = parseFloat(a.look.fontSize) / parseFloat(b.look.fontSize) || 1;
    // With the origin at the ghost's corner, map the new text's corner onto the old one's.
    const tx = a.label.left - b.box.left - s * (b.label.left - b.box.left);
    const ty = a.label.top - b.box.top - s * (b.label.top - b.box.top);
    c.animate(g, [
      { transform: `translate(${tx}px, ${ty}px) scale(${s})`, color: a.look.color },
      { transform: 'none', color: b.look.color },
    ], { duration: HERO_MS, easing: GLIDE, fill: 'forwards' });
    return;
  }

  // Otherwise a box (a button's outline, fill and shadow, or an invisible
  // clip) that morphs from one to the other, with the label inside.
  const side = (h: Hero, other: Hero) => {
    const o = h.hasBox ? h : other;
    return {
      ...px(h.hasBox ? h.box : h.label),
      backgroundColor: h.hasBox ? h.look.backgroundColor : 'rgba(0, 0, 0, 0)',
      borderTopWidth: h.hasBox ? h.look.borderTopWidth : '0px',
      borderRightWidth: h.hasBox ? h.look.borderTopWidth : '0px',
      borderBottomWidth: h.hasBox ? h.look.borderTopWidth : '0px',
      borderLeftWidth: h.hasBox ? h.look.borderTopWidth : '0px',
      borderColor: o.look.borderTopColor,
      borderRadius: o.look.borderTopLeftRadius,
      boxShadow: h.hasBox && h.look.boxShadow !== 'none' ? h.look.boxShadow : flatShadow(other.look.boxShadow !== 'none' ? other.look.boxShadow : 'none'),
    };
  };
  const box = document.createElement('div');
  box.className = 'hero-ghost hero-box';
  const from = side(a, b);
  const to = side(b, a);
  Object.assign(box.style, from);
  c.layer(box);
  // Browsers draw a border or shadow thinner than a pixel as a faint line, so
  // when the box goes away (a button becoming a title) it finishes a little early.
  const vanish = b.hasBox ? [] : [{
    offset: 0.8, boxShadow: to.boxShadow,
    borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px',
  }];
  c.animate(box, [from, ...vanish, to], { duration: HERO_MS, easing: GLIDE, fill: 'forwards' });

  const span = (h: Hero, html: string, gap = true) => {
    const s = document.createElement('span');
    s.className = 'hero-label';
    s.style.cssText = `${fontCss(h.look)}font-size:${h.look.fontSize};color:${h.look.color};gap:${gap && h.look.gap !== 'normal' ? h.look.gap : '0'};`;
    s.innerHTML = html;
    box.appendChild(s);
    return s;
  };

  if (mode === 'roll') {
    // Different words: the old label rolls up and out as the new one rolls in.
    const out = span(a, inert(a.html));
    const inn = span(b, inert(b.html));
    c.animate(out, [{ transform: 'none' }, { transform: `translateY(${-a.box.height}px)` }], {
      duration: HERO_MS * 0.55, easing: ACCEL, fill: 'forwards',
    });
    c.animate(inn, [{ transform: `translateY(${Math.max(a.box.height, b.box.height)}px)` }, { transform: 'none' }], {
      duration: HERO_MS * 0.7, delay: HERO_MS * 0.3, easing: GLIDE, fill: 'backwards',
    });
    return;
  }

  // Same words (box involved), or a word dropping off / appearing at the end.
  const shared = mode === 'grow' ? a.text : b.text;
  const tail = mode === 'drop' ? a.text.slice(b.text.length) : mode === 'grow' ? b.text.slice(a.text.length) : '';
  const label = mode === 'same'
    ? span(b, inert(b.html))
    : span(b, `${escText(shared)}<span class="tail">${escText(tail)}</span>`, false); // plain words: no icon gap
  label.style.fontSize = a.look.fontSize;
  c.animate(label, [
    { fontSize: a.look.fontSize, color: a.look.color },
    { fontSize: b.look.fontSize, color: b.look.color },
  ], { duration: HERO_MS, easing: GLIDE, fill: 'forwards' });
  if (mode === 'same') return;
  const t = label.querySelector<HTMLElement>('.tail')!;
  // Measure the tail in em so it scales with the label's changing size.
  const sizeAt = (font: string) => {
    label.style.fontSize = font;
    return t.getBoundingClientRect().width / parseFloat(font);
  };
  const em = mode === 'drop' ? sizeAt(a.look.fontSize) : sizeAt(b.look.fontSize);
  label.style.fontSize = a.look.fontSize;
  const away = `translateX(${Math.max(a.box.width, b.box.width)}px)`;
  if (mode === 'drop') {
    c.animate(t, [{ width: `${em}em`, transform: 'none' }, { width: '0em', transform: away }], {
      duration: HERO_MS * 0.55, easing: ACCEL, fill: 'forwards',
    });
  } else {
    c.animate(t, [{ width: '0em', transform: away }, { width: `${em}em`, transform: 'none' }], {
      duration: HERO_MS * 0.55, delay: HERO_MS * 0.45, easing: GLIDE, fill: 'both',
    });
  }
}

/**
 * Switch screens. `apply` renders the new screen; the engine measures the old
 * one first and animates between them.
 */
export function transition(app: HTMLElement, apply: () => void, opts: TransitionOptions): void {
  endTransition();
  if (reducedMotion() || typeof app.animate !== 'function') {
    apply();
    opts.onLanded?.();
    return;
  }

  // 1. The outgoing screen: measurements and a frozen copy.
  const oldUnits = measureUnits(app);
  const oldHeroes = measureHeroes(app, opts.aliases);
  const clone = app.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.className = 'app-clone';
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  clone.style.top = `${-window.scrollY}px`;
  // Typed text lives in the input's value, which cloning doesn't copy.
  const liveInputs = app.querySelectorAll('input');
  clone.querySelectorAll('input').forEach((el, i) => (el.value = liveInputs[i]?.value ?? ''));
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  // A button released just now springs back while it flies away.
  const springing = Array.from(clone.querySelectorAll<HTMLElement>('.releasing'));
  springing.forEach((el) => el.classList.add('pressed'));
  document.body.appendChild(clone);
  const cloneUnits = units(clone);
  const cloneHeroes = Array.from(clone.querySelectorAll<HTMLElement>('[data-hero]'));
  requestAnimationFrame(() => requestAnimationFrame(() => springing.forEach((el) => el.classList.remove('pressed'))));

  // 2. The incoming screen, for real.
  try {
    apply();
  } catch (err) {
    clone.remove(); // never leave the frozen copy on screen
    throw err;
  }
  const newUnits = measureUnits(app);
  const newHeroes = measureHeroes(app);

  const anims: Animation[] = [];
  const layers: HTMLElement[] = [];
  const hidden: [HTMLElement, string][] = [];
  const ctx: Ctx = {
    oldRoot: clone,
    newRoot: app,
    dir: opts.dir,
    animate(el, keyframes, o) {
      const a = el.animate(keyframes, o);
      anims.push(a);
      return a;
    },
    layer(el) {
      el.setAttribute('aria-hidden', 'true'); // screen readers read the real screen, not stand-ins
      document.body.appendChild(el);
      layers.push(el);
      return el;
    },
    hide(el) {
      const h = el as HTMLElement;
      hidden.push([h, h.style.opacity]);
      h.style.opacity = '0';
    },
  };

  // 3. Units that are on both screens stay put.
  const keptOld = new Set<number>();
  const keptNew = new Set<number>();
  const bySig = new Map<string, number[]>();
  newUnits.forEach((u, j) => bySig.set(u.sig, [...(bySig.get(u.sig) ?? []), j]));
  oldUnits.forEach((u, i) => {
    const j = bySig.get(u.sig)?.shift();
    if (j === undefined) return;
    keptOld.add(i);
    keptNew.add(j);
    cloneUnits[i].style.visibility = 'hidden';
    const from = u.rect;
    const to = newUnits[j].rect;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      ctx.animate(newUnits[j].el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: KEEP_MS, easing: GLIDE,
      });
    }
  });
  const inKept = (el: HTMLElement, list: Unit[], kept: Set<number>) => [...kept].some((i) => list[i].el.contains(el));

  // 4. Elements on both screens fly into their new place.
  const heroOld = new Set<HTMLElement>();
  const heroNew = new Set<HTMLElement>();
  oldHeroes.forEach((a, key) => {
    const b = newHeroes.get(key);
    if (!b || inKept(a.el, oldUnits, keptOld) || inKept(b.el, newUnits, keptNew)) return;
    // The same piece in two lists (a clue row on Home and on the Clues screen) travels with its list.
    if (a.el.tagName === b.el.tagName && a.el.className === b.el.className && a.text === b.text) return;
    const copy = cloneHeroes[a.index];
    if (copy instanceof HTMLInputElement) {
      copy.value = ''; // the typed text lifts out of the field
      copy.placeholder = '';
    } else if (copy) {
      copy.style.visibility = 'hidden';
    }
    heroOld.add(a.el);
    heroNew.add(b.el);
    ctx.hide(b.el);
  });

  opts.extras?.(ctx); // measures before anything below starts moving

  oldHeroes.forEach((a, key) => {
    const b = newHeroes.get(key);
    if (b && heroOld.has(a.el)) heroGhost(a, b, ctx);
  });

  // 5. Everything else flies: off one side, in from the other.
  const sign = opts.dir === 'forward' ? 1 : -1;
  let n = 0;
  oldUnits.forEach((u, i) => {
    if (keptOld.has(i) || heroOld.has(u.el)) return;
    ctx.animate(cloneUnits[i], [
      { transform: 'none' },
      { transform: `translateX(${-120 * sign}vw) rotate(${-8 * sign}deg)` },
    ], {
      duration: OUT_MS, delay: n++ * OUT_STAGGER, easing: ACCEL, fill: 'forwards',
      composite: 'add', // on top of a just-released button springing back
    });
  });
  const inDelay = opts.inDelay ?? IN_DELAY;
  n = 0;
  newUnits.forEach((u, j) => {
    if (keptNew.has(j) || heroNew.has(u.el)) return;
    ctx.animate(u.el, [
      { transform: `translateX(${110 * sign}vw) rotate(${6 * sign}deg)` },
      { transform: 'none' },
    ], { duration: IN_MS, delay: inDelay + n++ * IN_STAGGER, easing: GLIDE, fill: 'backwards' });
  });

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    running = null;
    anims.forEach((a) => a.cancel());
    clone.remove();
    layers.forEach((l) => l.remove());
    hidden.forEach(([el, prev]) => {
      el.style.opacity = prev;
      if (!el.getAttribute('style')) el.removeAttribute('style'); // leave the markup as rendered
    });
  };
  running = cleanup;
  Promise.all(anims.map((a) => a.finished)).then(
    () => {
      if (done) return;
      cleanup();
      opts.onLanded?.();
    },
    () => {},
  );
}
