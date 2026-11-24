// Site header – two states: closed / open.
// ≥ 768px: opens on the Menu button or on scroll; Close shuts it and it
//          stays shut until the page is scrolled back to the top.
// < 768px: Menu button only (full-height list).
// .is-scrolled shows the light band behind the bar once the page moved.
// Esc closes and returns focus to the toggle. Nav links are always in
// the HTML. Idempotent.

const SCROLL_OFFSET = 40;
const DESKTOP = '(min-width: 768px)';

export function initNavigation(root = document) {
  const header = root.querySelector('[data-site-header]');
  if (!header || header.dataset.navInit) return;
  header.dataset.navInit = 'true';

  const toggle = header.querySelector('[data-nav-toggle]');
  const panel = header.querySelector('[data-nav-panel]');
  const label = toggle?.querySelector('[data-nav-label]');
  const desktop = window.matchMedia(DESKTOP);

  let open = false;
  let dismissed = false; // closed by the visitor while scrolled

  const render = () => {
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? label.dataset.close : label.dataset.open;
  };

  const setOpen = (value) => {
    if (open === value) return;
    open = value;
    render();
  };

  const onScroll = () => {
    const scrolled = window.scrollY > SCROLL_OFFSET;
    header.classList.toggle('is-scrolled', scrolled);

    if (!desktop.matches) return;
    if (scrolled && !dismissed) setOpen(true);
    if (!scrolled) {
      dismissed = false;
      setOpen(false);
    }
  };

  toggle?.addEventListener('click', () => {
    if (open) {
      setOpen(false);
      if (window.scrollY > SCROLL_OFFSET) dismissed = true;
    } else {
      dismissed = false;
      setOpen(true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      if (window.scrollY > SCROLL_OFFSET) dismissed = true;
      toggle?.focus();
    }
  });

  // On mobile a link tap closes the full-height list
  panel?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (!desktop.matches) setOpen(false);
    });
  });

  // Crossing the breakpoint: start from a clean state
  desktop.addEventListener('change', () => {
    dismissed = false;
    setOpen(false);
    onScroll();
  });

  render();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
