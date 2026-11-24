// Zoomable floor plan ([data-plan-zoom], used in the unit modal).
// Wheel / trackpad pinch, two-finger pinch, double click or double tap,
// and the + / − / reset buttons zoom; drag (mouse or one finger) moves the
// plan once it is zoomed in. The plan never leaves its frame. Keyboard on
// the focused frame: + / − zoom, 0 resets, arrow keys move.
// Returns a controller; reset() is called when the modal shows another
// unit. Idempotent.

const MAX = 4;          // upper limit; the real limit follows the image's resolution
const STEP = 1.6;
const ANIM_MS = 220;

export function initPlanZoom(frame) {
  if (!frame || frame.planZoom) return frame?.planZoom;
  const img = frame.querySelector('img');
  const btnIn = frame.querySelector('[data-zoom="in"]');
  const btnOut = frame.querySelector('[data-zoom="out"]');
  const btnReset = frame.querySelector('[data-zoom="reset"]');
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let s = 1; let x = 0; let y = 0;          // scale and offset of the image
  const pointers = new Map();
  let pinch = null;                          // {dist, s, cx, cy}
  let drag = null;                           // {px, py, x, y}
  let lastTap = 0;

  // as far as the source stays sharp (a little past 1:1), at least 2x
  const maxScale = () => {
    const r = img.naturalWidth && img.offsetWidth ? (img.naturalWidth / img.offsetWidth) * 1.25 : MAX;
    return Math.min(MAX, Math.max(2, r));
  };

  // Image box at scale 1, relative to the frame
  const base = () => ({ ox: img.offsetLeft, oy: img.offsetTop, w: img.offsetWidth, h: img.offsetHeight });

  function clamp() {
    const { ox, oy, w, h } = base();
    const fw = frame.clientWidth; const fh = frame.clientHeight;
    const sw = w * s; const sh = h * s;
    // left edge of the scaled image in frame coordinates is ox + x
    if (sw <= fw) x = (fw - sw) / 2 - ox;
    else x = Math.min(-ox, Math.max(fw - sw - ox, x));
    if (sh <= fh) y = (fh - sh) / 2 - oy;
    else y = Math.min(-oy, Math.max(fh - sh - oy, y));
  }

  function apply(animate) {
    clamp();
    img.style.transition = animate && !reduced() ? `transform ${ANIM_MS}ms var(--motion-ease-out)` : 'none';
    // at scale 1 the image sits where the layout put it
    img.style.transform = s === 1 ? '' : `translate(${x}px, ${y}px) scale(${s})`;
    frame.classList.toggle('is-zoomed', s > 1);
    if (btnIn) btnIn.disabled = s >= maxScale() - 0.001;
    if (btnOut) btnOut.disabled = s <= 1;
    if (btnReset) btnReset.disabled = s <= 1;
  }

  // Zoom to scale `next`, keeping frame point (px, py) still
  function zoomAt(next, px, py, animate) {
    next = Math.min(maxScale(), Math.max(1, next));
    if (next === s) return;
    const { ox, oy } = base();
    if (s === 1) { x = 0; y = 0; }
    // point under the cursor, in unscaled image coordinates
    const ix = (px - ox - x) / s;
    const iy = (py - oy - y) / s;
    s = next;
    x = px - ox - ix * s;
    y = py - oy - iy * s;
    if (s === 1) { x = 0; y = 0; }
    apply(animate);
  }

  const center = () => [frame.clientWidth / 2, frame.clientHeight / 2];
  const local = (e) => {
    const r = frame.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  function reset() {
    s = 1; x = 0; y = 0;
    pointers.clear(); pinch = null; drag = null;
    apply(false);
  }

  // Buttons
  const stop = (e) => e.stopPropagation();
  [btnIn, btnOut, btnReset].forEach((b) => b?.addEventListener('pointerdown', stop));
  btnIn?.addEventListener('click', () => zoomAt(s * STEP, ...center(), true));
  btnOut?.addEventListener('click', () => zoomAt(s / STEP, ...center(), true));
  btnReset?.addEventListener('click', () => { s = 1; x = 0; y = 0; apply(true); });

  // Wheel and trackpad pinch (ctrlKey)
  frame.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = e.ctrlKey ? 0.01 : 0.0025;
    zoomAt(s * Math.exp(-e.deltaY * k), ...local(e), false);
  }, { passive: false });

  // Pointers: drag and pinch
  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.plan-zoom__controls')) return;
    pointers.set(e.pointerId, local(e));
    frame.setPointerCapture?.(e.pointerId);

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), s };
      drag = null;
    } else if (pointers.size === 1 && s > 1) {
      drag = { px: e.clientX, py: e.clientY, x, y };
      frame.classList.add('is-dragging');
    }
  });

  frame.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, local(e));
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(pinch.s * (dist / pinch.dist), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, false);
    } else if (drag) {
      x = drag.x + (e.clientX - drag.px);
      y = drag.y + (e.clientY - drag.py);
      apply(false);
    }
  });

  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) { drag = null; frame.classList.remove('is-dragging'); }
    // double tap on touch
    if (e.type === 'pointerup' && e.pointerType !== 'mouse' && !pinch) {
      const now = e.timeStamp;
      if (now - lastTap < 300) { toggleAt(...local(e)); lastTap = 0; } else lastTap = now;
    }
  };
  frame.addEventListener('pointerup', up);
  frame.addEventListener('pointercancel', up);

  const toggleAt = (px, py) => (s > 1 ? (s = 1, x = 0, y = 0, apply(true)) : zoomAt(2.5, px, py, true));
  frame.addEventListener('dblclick', (e) => {
    if (e.target.closest('.plan-zoom__controls')) return;
    toggleAt(...local(e));
  });

  // Keyboard
  frame.addEventListener('keydown', (e) => {
    if (e.target !== frame) return;
    const move = 60;
    if (e.key === '+' || e.key === '=') zoomAt(s * STEP, ...center(), true);
    else if (e.key === '-') zoomAt(s / STEP, ...center(), true);
    else if (e.key === '0') { s = 1; x = 0; y = 0; apply(true); }
    else if (s > 1 && e.key.startsWith('Arrow')) {
      if (e.key === 'ArrowLeft') x += move;
      if (e.key === 'ArrowRight') x -= move;
      if (e.key === 'ArrowUp') y += move;
      if (e.key === 'ArrowDown') y -= move;
      apply(true);
    } else return;
    e.preventDefault();
  });

  window.addEventListener('resize', () => { if (s > 1) apply(false); });

  const api = { reset };
  frame.planZoom = api;
  apply(false);
  return api;
}
