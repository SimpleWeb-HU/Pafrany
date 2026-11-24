// Technology showcase ([data-project-component="tech-showcase"]).
// Desktop (lg+): click an item to make it active; its line drawing fades
// into the filled image and the shared text box below changes.
// Phones and tablets (below lg): the site's one carousel, dragged in real
// time. The drawings follow the finger; the one nearest the middle grows
// to the active size while it travels. On release the row glides to the
// nearest item; as it arrives the filled image fades in together with its
// text. The row loops; a tap on a side item or the arrow keys glide
// to it the same way. Idempotent.

const TEXT_FADE = 220;
const STEP = 0.88;       // distance between items, in slide widths (as in CSS)
const SIDE = 0.74;       // scale of the side items
const GLIDE = 480;       // ms, glide to the nearest item after release
const FLICK = 0.35;      // px/ms, a faster release moves on one item
const REVEAL_AT = 0.35;  // share of the glide after which fill and text fade in

function init(root) {
  const list = root.querySelector('[data-showcase-list]');
  const items = [...root.querySelectorAll('[data-showcase-item]')];
  const panel = root.querySelector('[data-showcase-panel]');
  const title = root.querySelector('[data-showcase-title]');
  const text = root.querySelector('[data-showcase-text]');
  const marker = root.querySelector('[data-showcase-marker]');
  if (!list || !items.length || !panel) return;
  const n = items.length;
  const mq = window.matchMedia('(max-width: 991.98px)');
  const isRow = () => mq.matches;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mod = (a) => ((a % n) + n) % n;
  let active = Math.max(0, items.findIndex((i) => i.classList.contains('is-active')));
  let pos = active;      // carousel position, in items (float while moving)
  let timer = 0;
  let anim = 0;

  function writeText(i) {
    const data = items[i].querySelector('[data-showcase-data]');
    title.textContent = data.querySelector('h3').textContent;
    text.textContent = data.querySelector('p').textContent;
  }

  function setText(i) {
    clearTimeout(timer);
    if (reduced()) { writeText(i); panel.classList.remove('is-changing'); return; }
    panel.classList.add('is-changing');
    timer = setTimeout(() => { writeText(i); panel.classList.remove('is-changing'); }, TEXT_FADE);
  }

  function mark(i) {
    items.forEach((item, k) => {
      const on = k === i;
      item.classList.toggle('is-active', on);
      const t = item.querySelector('[role="tab"]');
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', items[i].querySelector('[role="tab"]').id);
  }

  // marker on the rail: under the active item on desktop, one segment of the
  // rail per item in the carousel (follows the drag)
  function place(p = active) {
    if (!marker) return;
    const rail = marker.parentElement;
    if (isRow()) {
      const w = rail.clientWidth / n;
      rail.style.setProperty('--ts-x', `${mod(Math.round(p)) * w}px`);
      rail.style.setProperty('--ts-w', `${w}px`);
      return;
    }
    const r = rail.getBoundingClientRect();
    const b = items[active].getBoundingClientRect();
    rail.style.setProperty('--ts-x', `${b.left - r.left}px`);
    rail.style.setProperty('--ts-w', `${b.width}px`);
  }

  // ---- carousel (below lg) ------------------------------------------------
  // each item's offset from the current position, looping; scale grows to 1
  // in the middle; items fade out past the side places, so the one that wraps
  // round to the other side is never seen jumping
  function layout() {
    items.forEach((item, k) => {
      let d = mod(k - pos);
      if (d >= n / 2) d -= n;
      const a = Math.abs(d);
      item.style.setProperty('--d', d.toFixed(4));
      item.style.setProperty('--s', (1 - (1 - SIDE) * Math.min(a, 1)).toFixed(4));
      item.style.setProperty('--o', Math.max(0, Math.min(1, (1.5 - a) * 2)).toFixed(3));
    });
    place(pos);
  }

  function stepPx() { return items[0].offsetWidth * STEP || 1; }

  // the row is arriving on an item: fill and text fade in together
  function reveal(target) {
    const i = mod(target);
    mark(i);
    if (i !== active || panel.classList.contains('is-changing')) {
      active = i;
      clearTimeout(timer);
      writeText(i);
      panel.classList.remove('is-changing');
    }
  }

  // the row has stopped on an item
  function settle() {
    pos = mod(Math.round(pos));
    layout();
    reveal(pos);
  }

  // glide from the current position to target (an integer position); the
  // fill and the text start fading in during the last part of the glide, so
  // the colour arrives as the drawing comes to rest
  function glide(target) {
    cancelAnimationFrame(anim);
    const from = pos;
    if (reduced() || from === target) { pos = target; settle(); return; }
    const t0 = performance.now();
    const dur = GLIDE * Math.min(1.4, Math.max(0.6, Math.abs(target - from)));
    const ease = (t) => 1 - (1 - t) ** 3;
    let shown = false;
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      pos = from + (target - from) * ease(t);
      layout();
      if (!shown && t >= REVEAL_AT) { shown = true; reveal(target); }
      if (t < 1) anim = requestAnimationFrame(frame);
      else settle();
    };
    anim = requestAnimationFrame(frame);
  }

  // leaving the middle: the filled image and the text fade out
  function unsettle() {
    items[active].classList.remove('is-active');
    clearTimeout(timer);
    panel.classList.add('is-changing');
  }

  function goTo(i) {
    // shortest way round the loop
    let d = mod(i - pos);
    if (d > n / 2) d -= n;
    if (Math.abs(d) < 0.001) return;
    unsettle();
    glide(Math.round(pos + d));
  }

  // real-time drag (touch, pen and mouse); vertical page scrolling stays native
  let drag = null;
  let dragged = false;
  list.addEventListener('pointerdown', (e) => {
    if (!isRow() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    cancelAnimationFrame(anim);
    drag = { x: e.clientX, y: e.clientY, pos, id: e.pointerId, axis: null, samples: [[e.timeStamp, e.clientX]] };
  });
  list.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'y') { drag = null; return; }
      list.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
      unsettle();
    }
    pos = drag.pos - dx / stepPx();
    drag.samples.push([e.timeStamp, e.clientX]);
    if (drag.samples.length > 6) drag.samples.shift();
    layout();
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.axis) return;          // a tap: the click handler takes it
    dragged = true;
    setTimeout(() => { dragged = false; }, 0);
    root.classList.remove('is-dragging');
    const [t0, x0] = d.samples[0];
    const v = (e.clientX - x0) / Math.max(1, e.timeStamp - t0);   // px/ms
    let target = Math.round(pos);
    if (Math.abs(v) > FLICK && target === Math.round(d.pos)) target += v < 0 ? 1 : -1;
    glide(target);
  };
  list.addEventListener('pointerup', release);
  list.addEventListener('pointercancel', release);

  // ---- shared -------------------------------------------------------------
  function activate(i, { focus = false } = {}) {
    if (isRow()) {
      i = mod(i);
      if (focus) items[i].querySelector('[role="tab"]').focus({ preventScroll: true });
      goTo(i);
      return;
    }
    if (i < 0 || i >= n) return;
    if (focus) items[i].querySelector('[role="tab"]').focus({ preventScroll: true });
    if (i === active) return;
    mark(i);
    active = i;
    pos = i;
    place();
    setText(i);
  }

  items.forEach((item, i) => {
    item.querySelector('[role="tab"]').addEventListener('click', (e) => {
      if (dragged) { e.preventDefault(); return; }
      activate(i);
    });
  });

  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    activate(active + (e.key === 'ArrowRight' ? 1 : -1), { focus: true });
  });

  const reset = () => {
    cancelAnimationFrame(anim);
    pos = active;
    if (isRow()) layout(); else place();
  };
  reset();
  window.addEventListener('resize', () => (isRow() ? layout() : place()));
  mq.addEventListener('change', reset);
}

export function initTechShowcase(root = document) {
  root.querySelectorAll('[data-project-component="tech-showcase"]').forEach((el) => {
    if (el.dataset.showcaseInit) return;
    el.dataset.showcaseInit = 'true';
    init(el);
  });
}
