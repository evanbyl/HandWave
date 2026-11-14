// Press-and-hold buttons (FR-210, ADR-012).
// Pressing a button pushes it into its shadow at once and keeps it there for
// as long as the finger (or mouse, or key) is down. Sliding off the button
// lifts it; sliding back presses it again. Releasing springs the shadow back
// (a CSS transition). A gesture the browser turns into a scroll cancels it.
// CSS :active isn't used because mobile browsers drop it unpredictably.

const RELEASE_MS = 360; // matches the spring-back transition in style.css

let held: HTMLButtonElement | null = null;
const timers = new WeakMap<HTMLElement, number>();

function press(b: HTMLButtonElement): void {
  window.clearTimeout(timers.get(b));
  b.classList.remove('releasing');
  b.classList.add('pressed');
}

function lift(b: HTMLButtonElement): void {
  if (!b.classList.contains('pressed')) return;
  b.classList.remove('pressed');
  // Marks a button that's springing back, so a screen transition that starts
  // on this tap can let its copy finish springing as it flies (transition.ts).
  b.classList.add('releasing');
  timers.set(b, window.setTimeout(() => b.classList.remove('releasing'), RELEASE_MS));
}

function release(): void {
  if (held) lift(held);
  held = null;
}

function buttonAt(target: EventTarget | null): HTMLButtonElement | null {
  const b = target instanceof Element ? target.closest('button') : null;
  return b && !b.disabled ? b : null;
}

export function setUpPress(): void {
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    release();
    const b = buttonAt(e.target);
    if (!b) return;
    held = b;
    press(b);
  });
  document.addEventListener('pointermove', (e) => {
    if (!held) return;
    const over = held.contains(document.elementFromPoint(e.clientX, e.clientY));
    if (over) press(held);
    else lift(held);
  });
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);

  // Keyboard: Space and Enter press and release too.
  document.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      const b = buttonAt(document.activeElement);
      if (b) {
        release();
        held = b;
        press(b);
      }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') release();
  });
}
