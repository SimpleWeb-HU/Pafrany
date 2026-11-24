// Gallery lightbox ([data-lightbox]) on a native <dialog>: large image,
// close, previous / next, counter and a thumbnail strip, swipe and arrow
// keys, 300 ms cross-fade between images. Uses the largest source from the image's srcset. Optional filter
// buttons ([data-gallery-filter]) show/hide items by data-category.
// One shared dialog is created on first use. Idempotent.

let dialog = null;
let layers = [];
let front = 0;
let token = 0;
let thumbs = null;
let counter = null;
let items = [];
let index = 0;
let lastFocus = null;

const LABELS = {
  en: { dialog: 'Image viewer', close: 'Close', prev: 'Previous image', next: 'Next image', thumbs: 'All images', image: 'Image' },
  hu: { dialog: 'Képnézegető', close: 'Bezárás', prev: 'Előző kép', next: 'Következő kép', thumbs: 'Összes kép', image: 'Kép' },
};

const ICON = (d) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function largest(img) {
  const set = img.getAttribute('srcset');
  if (!set) return img.currentSrc || img.src;
  return set.split(',')
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) || 0 }))
    .sort((a, b) => b.w - a.w)[0].url;
}

function ensureDialog() {
  if (dialog) return dialog;
  const t = LABELS[(document.documentElement.lang || 'en').slice(0, 2)] || LABELS.en;
  dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', t.dialog);
  dialog.innerHTML = `
    <div class="lightbox__top">
      <span class="lightbox__count" aria-live="polite"></span>
      <button type="button" class="lightbox__close" aria-label="${t.close}">${ICON('M6 6l12 12M18 6L6 18')}</button>
    </div>
    <div class="lightbox__stage">
      <img class="lightbox__img is-active" alt="">
      <img class="lightbox__img" alt="" aria-hidden="true">
      <button type="button" class="lightbox__arrow lightbox__arrow--prev" aria-label="${t.prev}">${ICON('M15 6l-6 6 6 6')}</button>
      <button type="button" class="lightbox__arrow lightbox__arrow--next" aria-label="${t.next}">${ICON('M9 6l6 6-6 6')}</button>
    </div>
    <div class="lightbox__thumbs" role="group" aria-label="${t.thumbs}"></div>`;
  document.body.appendChild(dialog);
  dialog.dataset.labelImage = t.image;

  layers = [...dialog.querySelectorAll('.lightbox__img')];
  thumbs = dialog.querySelector('.lightbox__thumbs');
  counter = dialog.querySelector('.lightbox__count');

  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox__arrow--prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.lightbox__arrow--next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // click on the empty dark area closes
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox__stage')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-lightbox');
    lastFocus?.focus({ preventScroll: true });
  });

  // Swipe on the image
  let sx = 0;
  let sy = 0;
  let tracking = false;
  const stage = dialog.querySelector('.lightbox__stage');
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tracking = true; sx = e.clientX; sy = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - sy)) show(index + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { tracking = false; });
  return dialog;
}

function buildThumbs() {
  const label = dialog.dataset.labelImage;
  thumbs.innerHTML = '';
  items.forEach((item, i) => {
    const src = item.querySelector('img');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lightbox__thumb';
    b.setAttribute('aria-label', `${label} ${i + 1}`);
    b.innerHTML = `<img src="${src.getAttribute('src')}" width="${src.getAttribute('width') || 4}" height="${src.getAttribute('height') || 3}" alt="" loading="lazy" decoding="async">`;
    b.addEventListener('click', () => show(i));
    thumbs.appendChild(b);
  });
}

function show(i) {
  if (!items.length) return;
  index = (i + items.length) % items.length;
  const img = items[index].querySelector('img');
  const url = largest(img);
  const current = layers[front];
  if (current.getAttribute('src') !== url) {
    // cross-fade: load into the back layer, swap once it is decoded
    const back = layers[1 - front];
    const mine = ++token;
    back.src = url;
    back.alt = img.alt;
    const swap = () => {
      if (mine !== token) return;
      back.classList.add('is-active');
      back.removeAttribute('aria-hidden');
      current.classList.remove('is-active');
      current.setAttribute('aria-hidden', 'true');
      front = 1 - front;
    };
    (back.decode ? back.decode() : Promise.resolve()).then(swap, swap);
  }
  counter.textContent = `${index + 1} / ${items.length}`;

  thumbs.querySelectorAll('.lightbox__thumb').forEach((b, n) => {
    const active = n === index;
    b.classList.toggle('is-active', active);
    if (active) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  const active = thumbs.children[index];
  if (active) {
    const left = active.offsetLeft - (thumbs.clientWidth - active.offsetWidth) / 2;
    thumbs.scrollTo({ left, behavior: reduced() || !dialog.open ? 'auto' : 'smooth' });
  }

  // preload neighbours
  [index - 1, index + 1].forEach((n) => {
    const it = items[(n + items.length) % items.length];
    if (it) new Image().src = largest(it.querySelector('img'));
  });
}

export function initGallery(root = document) {
  root.querySelectorAll('[data-lightbox]').forEach((gallery) => {
    if (gallery.dataset.lightboxInit) return;
    gallery.dataset.lightboxInit = 'true';

    gallery.querySelectorAll('[data-lightbox-open]').forEach((button) => {
      button.addEventListener('click', () => {
        ensureDialog();
        lastFocus = button;
        items = [...gallery.querySelectorAll('[data-lightbox-open]')].filter(
          (b) => !b.closest('[hidden]')
        );
        buildThumbs();
        document.documentElement.classList.add('has-lightbox');
        dialog.showModal();
        show(items.indexOf(button));
      });
    });
  });

  root.querySelectorAll('[data-gallery-filter]').forEach((filters) => {
    if (filters.dataset.filterInit) return;
    filters.dataset.filterInit = 'true';
    const target = document.getElementById(filters.dataset.galleryFilter);
    if (!target) return;
    filters.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        const cat = button.dataset.category;
        target.querySelectorAll('[data-category]').forEach((item) => {
          item.hidden = cat !== 'all' && item.dataset.category !== cat;
        });
      });
    });
  });
}
