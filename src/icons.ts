// Interface icons as inline SVG, one consistent style (ADR-011). Emoji are only player avatars.

const stroke = (d: string, w = 2.2) =>
  `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const icons = {
  pass: stroke('<path d="M4 12a8 8 0 0 1 13.7-5.6M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6M4 20v-5h5"/>'),
  peek: stroke('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  redraw: stroke('<rect x="3" y="6" width="11" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>'),
  trash: stroke('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  next: stroke('<path d="M9 6l6 6-6 6"/>', 3),
  prev: stroke('<path d="M15 6l-6 6 6 6"/>', 3),
  plus: stroke('<path d="M12 5v14M5 12h14"/>', 3),
  close: stroke('<path d="M6 6l12 12M18 6L6 18"/>', 2.8),
};

/** Filled sticker-style icons with an ink outline. */
export const flame = (label = 'On a streak') =>
  `<svg class="icon flame" viewBox="0 0 24 24" width="16" height="16" fill="#FF6B35" stroke="#1C1838" stroke-width="1.8" stroke-linejoin="round" role="img" aria-label="${label}"><path d="M12 3c.8 3.4 5 5.3 5 10a5 5 0 0 1-10 0c0-2 .9-3.4 2.1-4.4.2 1.6 1 2.6 2 2.9C10.4 9 10.6 5.6 12 3z"/></svg>`;

export const crown = (label = 'Best guess') =>
  `<svg class="icon crown" viewBox="0 0 24 24" width="17" height="17" fill="#FFC531" stroke="#1C1838" stroke-width="2" stroke-linejoin="round" role="img" aria-label="${label}"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>`;

export const logo = `<span class="logo" aria-hidden="true"><svg viewBox="0 0 30 20" width="24" height="16"><path d="M2 18A13 13 0 0 1 28 18Z" fill="#FFFFFF"/><path d="M15 18L19 6.5A13 13 0 0 1 23.6 8.6Z" fill="#FF6B35"/><line x1="15" y1="18" x2="20" y2="7" stroke="#1C1838" stroke-width="2.6" stroke-linecap="round"/></svg></span>`;
