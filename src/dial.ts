// The half-circle dial: an SVG that shows zones, a draggable needle, and guess markers (FR-403, FR-405).

import { ZONE_WIDTH } from './scoring';

const CX = 150;
const CY = 155;
const R = 135;

function angleFor(p: number): number {
  return Math.PI * (1 - p / 100);
}

function point(p: number, r: number = R): [number, number] {
  const a = angleFor(p);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function wedge(from: number, to: number, cls: string): string {
  const a = Math.max(0, Math.min(100, from));
  const b = Math.max(0, Math.min(100, to));
  if (b <= a) return '';
  const [x1, y1] = point(a);
  const [x2, y2] = point(b);
  // Moving from a to b sweeps clockwise on screen (left to right).
  return `<path class="${cls}" d="M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z"/>`;
}

function zones(target: number): string {
  const w = ZONE_WIDTH;
  return [
    wedge(target - 2.5 * w, target + 2.5 * w, 'zone z2'),
    wedge(target - 1.5 * w, target + 1.5 * w, 'zone z3'),
    wedge(target - w / 2, target + w / 2, 'zone z4'),
  ].join('');
}

function needle(p: number, cls: string): string {
  const [x, y] = point(p, R - 8);
  return `<line class="${cls}" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
}

export interface Marker {
  position: number;
  label: string;
}

export interface DialOptions {
  /** Show scoring zones around this target. */
  target?: number;
  /** The main needle (the active player's guess). */
  needle?: number;
  /** Other players' guesses, drawn as labeled dots. */
  markers?: Marker[];
}

export function dialSvg(opts: DialOptions): string {
  const [lx, ly] = point(0);
  const [rx, ry] = point(100);
  const markers = (opts.markers ?? [])
    .map((m) => {
      const [x, y] = point(m.position, R + 4);
      return `<text class="marker" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${m.label}</text>`;
    })
    .join('');
  return `<svg class="dial" viewBox="0 -10 300 175" role="img" aria-label="Dial">
    <path class="face" d="M${lx},${ly} A${R},${R} 0 0 1 ${rx},${ry} Z"/>
    <g class="zones">${opts.target !== undefined ? zones(opts.target) : ''}</g>
    ${markers}
    ${opts.needle !== undefined ? needle(opts.needle, 'needle') : ''}
    <circle class="hub" cx="${CX}" cy="${CY}" r="9"/>
  </svg>`;
}

/** Move the existing needle without redrawing, so dragging stays smooth (NFR-403). */
export function setNeedle(host: HTMLElement, p: number): void {
  const line = host.querySelector<SVGLineElement>('line.needle');
  if (!line) return;
  const [x, y] = point(p, R - 8);
  line.setAttribute('x2', x.toFixed(1));
  line.setAttribute('y2', y.toFixed(1));
}

/** Make the dial inside `host` draggable. Calls onChange with a 0–100 position. */
export function attachDrag(host: HTMLElement, onChange: (p: number) => void): void {
  const svg = host.querySelector('svg');
  if (!svg) return;
  const toPosition = (e: PointerEvent): number => {
    const rect = svg.getBoundingClientRect();
    const scale = 300 / rect.width;
    const x = (e.clientX - rect.left) * scale - CX;
    const y = CY - ((e.clientY - rect.top) * scale - 10);
    let a = Math.atan2(Math.max(y, 0), x);
    if (y < 0) a = x < 0 ? Math.PI : 0;
    return Math.round((1 - a / Math.PI) * 1000) / 10;
  };
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    onChange(toPosition(e));
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging) onChange(toPosition(e));
  });
  const stop = () => {
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
}
