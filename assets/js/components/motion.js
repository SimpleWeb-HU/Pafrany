// Motion layer – IntersectionObserver reveal for [data-motion].
// Presentation only: never reads or writes data-crown-* (except the
// render-mode flag on <html>). Disabled in Crown Visual Edit mode.

const SELECTOR = '[data-motion]';
const STAGGER_STEP = 60;
const STAGGER_MAX = 6;
let observer = null;

const isVisualEdit = () =>
  document.documentElement.dataset.crownRenderMode === 'visual_edit';

const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function reveal(el) {
  el.classList.add('is-visible');
}

function applyDelays(root) {
  root.querySelectorAll('[data-motion="stagger"]').forEach((parent) => {
    const children = parent.querySelectorAll(':scope > [data-motion]');
    children.forEach((child, i) => {
      if (child.dataset.motionDelay) return;
      child.style.setProperty('--motion-delay', `${Math.min(i, STAGGER_MAX) * STAGGER_STEP}ms`);
    });
  });
  root.querySelectorAll('[data-motion-delay]').forEach((el) => {
    el.style.setProperty('--motion-delay', `${parseInt(el.dataset.motionDelay, 10) || 0}ms`);
  });
}

export function initMotion(root = document) {
  if (isVisualEdit()) return;

  const elements = [...root.querySelectorAll(SELECTOR)].filter(
    (el) => !el.dataset.motionInit && el.dataset.motion !== 'stagger'
  );
  root.querySelectorAll('[data-motion="stagger"]').forEach((el) => {
    el.dataset.motionInit = 'true';
  });
  if (!elements.length) return;

  if (prefersReduced() || !('IntersectionObserver' in window)) {
    elements.forEach((el) => {
      el.dataset.motionInit = 'true';
      reveal(el);
    });
    return;
  }

  applyDelays(root);

  observer ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
  );

  elements.forEach((el) => {
    el.dataset.motionInit = 'true';
    observer.observe(el);
  });
}
