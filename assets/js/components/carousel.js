// Horizontal card rail ([data-rail]) with prev/next buttons.
// Native scroll + scroll-snap; buttons appear only when content overflows.

export function initCarousel(root = document) {
  root.querySelectorAll('[data-rail]').forEach((rail) => {
    if (rail.dataset.railInit) return;
    rail.dataset.railInit = 'true';

    const track = rail.querySelector('[data-rail-track]');
    const prev = rail.querySelector('[data-rail-prev]');
    const next = rail.querySelector('[data-rail-next]');
    if (!track) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      rail.classList.toggle('has-overflow', max > 4);
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
    };

    const step = (dir) => {
      const item = track.firstElementChild;
      const width = item ? item.getBoundingClientRect().width + 24 : track.clientWidth;
      track.scrollBy({ left: dir * width, behavior: 'smooth' });
    };

    prev?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
}
