// Site footer directory ([data-project-component="site-footer"]).
// Phones (below md): each column heading opens and closes its list
// (accordion, several may be open). From md the headings are plain titles
// and every list shows. Without JS every list shows. Idempotent.

const MOBILE = '(max-width: 767.98px)';

export function initFooter(root = document) {
  root.querySelectorAll('[data-project-component="site-footer"]').forEach((footer) => {
    if (footer.dataset.footerInit) return;
    footer.dataset.footerInit = 'true';
    const mq = window.matchMedia(MOBILE);
    const cols = [...footer.querySelectorAll('[data-footer-col]')];

    const sync = () => {
      cols.forEach((col) => {
        const btn = col.querySelector('[data-footer-toggle]');
        const panel = col.querySelector('.site-footer__panel');
        if (mq.matches) {
          btn.removeAttribute('tabindex');
          btn.setAttribute('aria-expanded', String(col.classList.contains('is-open')));
          panel.inert = !col.classList.contains('is-open');
        } else {
          col.classList.remove('is-open');
          btn.tabIndex = -1;
          btn.removeAttribute('aria-expanded');
          panel.inert = false;
        }
      });
    };

    cols.forEach((col) => {
      col.querySelector('[data-footer-toggle]').addEventListener('click', () => {
        if (!mq.matches) return;
        col.classList.toggle('is-open');
        sync();
      });
    });

    mq.addEventListener('change', sync);
    sync();
  });
}
