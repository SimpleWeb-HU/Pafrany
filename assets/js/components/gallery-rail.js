// Gallery rail: villas / interiors tabs, mouse drag with momentum (touch
// and trackpad scroll natively and keep their own inertia), arrow buttons
// and arrow keys step one slide, a drag does not open the lightbox.
// Phones: the first six images of the open tab show, a button below reveals
// the rest (CSS hides .is-more slides below md).
// Idempotent.

const DRAG_THRESHOLD = 6;
const FRICTION = 0.95;      // velocity kept per 16 ms frame
const MIN_VELOCITY = 0.02;  // px/ms, below this the glide stops
const SAMPLE_MS = 100;      // velocity is measured over the last 100 ms

function init(rail) {
  const viewport = rail.querySelector('[data-rail-viewport]');
  const track = rail.querySelector('.gallery-rail__track');
  if (!viewport || !track) return;
  const tabs = rail.querySelectorAll('[data-rail-tab]');
  const prevBtn = rail.querySelector('[data-rail-prev]');
  const nextBtn = rail.querySelector('[data-rail-next]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let glide = 0;

  const stopGlide = () => { if (glide) cancelAnimationFrame(glide); glide = 0; };
  const maxScroll = () => viewport.scrollWidth - viewport.clientWidth;

  // Arrow states
  const update = () => {
    if (prevBtn) prevBtn.disabled = viewport.scrollLeft <= 2;
    if (nextBtn) nextBtn.disabled = viewport.scrollLeft >= maxScroll() - 2;
  };
  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  // Scroll positions where each visible slide lines up with the row start
  const stops = () => {
    const pad = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
    const base = viewport.getBoundingClientRect().left - viewport.scrollLeft + pad;
    return [...track.querySelectorAll('.gallery-rail__slide:not([hidden])')]
      .map((s) => Math.min(maxScroll(), Math.max(0, s.getBoundingClientRect().left - base)));
  };

  const step = (dir) => {
    stopGlide();
    const x = viewport.scrollLeft;
    const list = stops();
    const target = dir > 0
      ? list.find((p) => p > x + 2) ?? maxScroll()
      : [...list].reverse().find((p) => p < x - 2) ?? 0;
    viewport.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
  };
  prevBtn?.addEventListener('click', () => step(-1));
  nextBtn?.addEventListener('click', () => step(1));

  // Tabs
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-pressed') === 'true') return;
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
      stopGlide();
      const show = () => {
        track.querySelectorAll('[data-category]').forEach((slide) => {
          slide.hidden = slide.dataset.category !== tab.dataset.railTab;
        });
        viewport.scrollLeft = 0;
        update();
        requestAnimationFrame(() => track.classList.remove('is-switching'));
      };
      if (reduced) return show();
      track.classList.add('is-switching');
      setTimeout(show, 250);
    });
  });

  // Mouse drag with momentum
  let startX = 0;
  let startScroll = 0;
  let down = false;
  let moved = false;
  let samples = [];

  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stopGlide();
    down = true;
    moved = false;
    startX = e.clientX;
    startScroll = viewport.scrollLeft;
    samples = [{ t: e.timeStamp, x: e.clientX }];
  });

  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
      moved = true;
      rail.classList.add('is-dragging');
    }
    if (!moved) return;
    viewport.scrollLeft = startScroll - dx;
    samples.push({ t: e.timeStamp, x: e.clientX });
    while (samples.length > 2 && e.timeStamp - samples[0].t > SAMPLE_MS) samples.shift();
  });

  const end = (e) => {
    if (!down) return;
    down = false;
    // keep the class for the click that follows the drag
    requestAnimationFrame(() => rail.classList.remove('is-dragging'));
    if (!moved || reduced || samples.length < 2) return;

    const first = samples[0];
    const last = samples[samples.length - 1];
    // a pause before letting go means no throw
    if (e.timeStamp - last.t > 60) return;
    const dt = last.t - first.t;
    if (dt <= 0) return;
    let v = (last.x - first.x) / dt; // px/ms, positive = dragged right
    let prev = performance.now();

    const tick = (now) => {
      const elapsed = Math.min(now - prev, 32);
      prev = now;
      const before = viewport.scrollLeft;
      viewport.scrollLeft = before - v * elapsed;
      v *= Math.pow(FRICTION, elapsed / 16);
      if (Math.abs(v) < MIN_VELOCITY || viewport.scrollLeft === before) { glide = 0; return; }
      glide = requestAnimationFrame(tick);
    };
    glide = requestAnimationFrame(tick);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  viewport.addEventListener('wheel', stopGlide, { passive: true });

  // A drag must not open the lightbox
  viewport.addEventListener('click', (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);

  // Keyboard
  viewport.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  });

  // Phones: first six images, then "Show all photos (n)"
  const SHOW = 6;
  const hu = document.documentElement.lang === 'hu';
  const more = document.createElement('div');
  more.className = 'gallery-rail__more container';
  more.innerHTML = '<button type="button" class="btn btn-pbr-outline"></button>';
  const moreBtn = more.firstChild;
  rail.append(more);
  const markMore = () => {
    rail.classList.remove('is-expanded');
    const shown = [...track.querySelectorAll('.gallery-rail__slide')].filter((s) => !s.hidden);
    track.querySelectorAll('.gallery-rail__slide').forEach((s) => s.classList.remove('is-more'));
    shown.slice(SHOW).forEach((s) => s.classList.add('is-more'));
    more.hidden = shown.length <= SHOW;
    moreBtn.textContent = hu ? `Az összes kép (${shown.length})` : `Show all photos (${shown.length})`;
  };
  moreBtn.addEventListener('click', () => {
    rail.classList.add('is-expanded');
    more.hidden = true;
  });
  tabs.forEach((tab) => tab.addEventListener('click', () => setTimeout(markMore, reduced ? 0 : 260)));
  markMore();

  update();
}

export function initGalleryRail(root = document) {
  root.querySelectorAll('[data-project-component="gallery-rail"]').forEach((rail) => {
    if (rail.dataset.railInit) return;
    rail.dataset.railInit = 'true';
    init(rail);
  });
}
