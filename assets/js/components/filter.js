// Press room type filter ([data-news-filter]) – shows/hides list items
// by data-type. The unfiltered list is the canonical view.

export function initFilter(root = document) {
  root.querySelectorAll('[data-news-filter]').forEach((filters) => {
    if (filters.dataset.newsFilterInit) return;
    filters.dataset.newsFilterInit = 'true';
    const list = document.getElementById(filters.dataset.newsFilter);
    if (!list) return;

    filters.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        const type = button.dataset.type;
        list.querySelectorAll('[data-type]').forEach((item) => {
          item.hidden = type !== 'all' && item.dataset.type !== type;
        });
      });
    });
  });
}
