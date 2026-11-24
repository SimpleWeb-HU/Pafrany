// Unit selector, unit table and unit modal.
// Behaviour ported from the current apafrany.hu (update 2026-09-11):
// site plan / villa tabs, plot zones, villa filter for the table and the
// mobile cards, unit modal with room schedule. Changes for the new site:
// - unit data comes from <script type="application/json" data-unit-data>
//   (one per language) instead of a JS object,
// - labels come from data-i18n-* attributes on #aptModal,
// - the enquiry CTA links to the contact page with ?unit= (the form there
//   preselects it) instead of an on-page form,
// - the sticky offset uses the real header height,
// - the floor plan can be zoomed and moved (plan-zoom.js),
// - init is idempotent.

import { initPlanZoom } from './plan-zoom.js';

const FADE_MS = 260;
const SCROLL_FADE_MS = 380;

function headerOffset() {
  const header = document.querySelector('[data-site-header]');
  return header ? header.offsetHeight : 0;
}

function unitId(building, apt) {
  return building + '_' + (apt === 'A-Penthouse' ? 'L05' : apt.replace(/^A-/, ''));
}

/* ── Site plan + villa panels ── */
function initPlans(root) {
  const grid = root.querySelector('#buildingPlanGrid');
  const site = root.querySelector('#panelTelekrajz');
  if (!grid || !site) return;
  const buttons = root.querySelectorAll('#buildingTabSelector .floor-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', function () {
      buttons.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      const building = this.dataset.building;
      const current = site.style.display !== 'none' ? site : grid;
      current.classList.add('is-fading');

      setTimeout(() => {
        if (building === 'telekrajz') {
          site.style.display = '';
          grid.style.display = 'none';
          site.classList.remove('is-fading');
        } else {
          site.style.display = 'none';
          grid.style.display = '';
          grid.querySelectorAll('.building-half').forEach((panel) => {
            panel.classList.toggle('hidden', panel.dataset.buildingPanel !== building);
          });
          const visible = grid.querySelectorAll('.building-half:not(.hidden)').length;
          grid.style.gridTemplateColumns = visible === 1 ? '1fr' : 'repeat(6, 1fr)';
          grid.classList.remove('is-fading');
        }
      }, FADE_MS);
    });
  });

  // Plot zones on the site plan jump to the villa
  site.querySelectorAll('.plot-zone').forEach((zone) => {
    const go = () => {
      const target = root.querySelector(`#buildingTabSelector .floor-btn[data-building="${zone.dataset.building}"]`);
      if (target && !target.classList.contains('is-disabled')) target.click();
    };
    zone.addEventListener('click', go);
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
}

/* ── Villa filter for the table and the mobile cards ── */
function initFilter(root) {
  const buttons = root.querySelectorAll('.apt-filter-btn');
  if (!buttons.length) return;
  const table = root.querySelector('#aptTable');
  const tbody = table?.querySelector('tbody');
  const cards = root.querySelector('#mobileCards');
  const sticky = root.querySelector('#aptFilterSticky');

  const show = (filter) => {
    root.querySelectorAll('#aptTable tbody tr').forEach((row) => {
      row.style.display = (filter === 'all' || row.dataset.building === filter) ? '' : 'none';
    });
    root.querySelectorAll('#mobileCards .apt-card-mobile').forEach((card) => {
      card.style.display = (filter === 'all' || card.dataset.building === filter) ? '' : 'none';
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', function () {
      buttons.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      const filter = this.dataset.filter;

      const wrap = table?.closest('.apt-table-wrap') ?? cards;
      const stickyBottom = sticky.getBoundingClientRect().bottom;
      const wrapTop = wrap?.getBoundingClientRect().top;

      const apply = () => {
        show(filter);
        if (wrap) {
          wrap.style.height = 'auto';
          const next = wrap.scrollHeight;
          wrap.style.height = wrap.dataset.lockedHeight + 'px';
          requestAnimationFrame(() => requestAnimationFrame(() => { wrap.style.height = next + 'px'; }));
          wrap.addEventListener('transitionend', () => { wrap.style.height = 'auto'; }, { once: true });
        }
        requestAnimationFrame(() => {
          tbody?.classList.remove('is-fading');
          cards?.classList.remove('is-fading');
        });
      };

      if (wrap) {
        wrap.dataset.lockedHeight = wrap.offsetHeight;
        wrap.style.height = wrap.offsetHeight + 'px';
      }
      tbody?.classList.add('is-fading');
      cards?.classList.add('is-fading');

      if (wrapTop !== undefined && wrapTop < stickyBottom) {
        const top = window.scrollY + wrap.getBoundingClientRect().top - headerOffset() - sticky.offsetHeight;
        window.scrollTo({ top, behavior: 'smooth' });
        setTimeout(apply, SCROLL_FADE_MS);
      } else {
        setTimeout(apply, FADE_MS);
      }
    });
  });

  // Initial state: the active filter (A1)
  show(root.querySelector('.apt-filter-btn.active')?.dataset.filter || 'A1');
}

/* ── Unit modal ── */
function initModal(root) {
  const modal = document.getElementById('aptModal');
  const dataEl = root.querySelector('[data-unit-data]');
  if (!modal || !dataEl) return;
  let APT;
  try { APT = JSON.parse(dataEl.textContent); } catch (e) { return; }

  const t = modal.dataset;
  const fmt = (tpl, map) => tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');
  const roomPattern = new RegExp(t.roomPattern || '^szoba', 'i');
  const $ = (id) => document.getElementById(id);
  const closeBtn = $('aptModalClose');
  const cta = $('aptModalCta');
  let lastFocus = null;
  const zoom = initPlanZoom(modal.querySelector('[data-plan-zoom]'));
  $('aptModalImg')?.addEventListener('load', () => zoom?.reset());

  // Floor plan / basement switch: the basement is one indicative drawing
  // for every residence (storage room + two garage spaces)
  const planTabs = [...modal.querySelectorAll('[data-plan-view]')];
  const planNote = modal.querySelector('[data-plan-note]');
  let unitPlan = { src: '', alt: '' };
  function showPlan(view) {
    const img = $('aptModalImg');
    const basement = view === 'basement' && t.basement;
    planTabs.forEach((b) => {
      const on = b.dataset.planView === (basement ? 'basement' : 'unit');
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (planNote) planNote.hidden = !basement;
    modal.querySelector('[data-plan-zoom]')?.classList.toggle('is-basement', !!basement);
    zoom?.reset();
    img.src = basement ? t.basement : unitPlan.src;
    img.alt = basement ? (t.i18nBasement || '') : unitPlan.alt;
  }
  planTabs.forEach((b) => b.addEventListener('click', () => showPlan(b.dataset.planView)));

  function openModal(apt, building) {
    const d = APT[apt];
    if (!d) return;
    const buildingLabel = building ? fmt(t.i18nBuilding, { b: building }) : d.building;
    const label = building ? d.label.replace(/^A\d/, building) : d.label;
    $('aptModalEyebrow').textContent = 'Páfrány Boutique Residences · ' + buildingLabel;
    $('aptModalTitle').textContent = label;
    unitPlan = { src: d.img, alt: fmt(t.i18nPlan, { label }) };
    showPlan('unit');
    $('aptRoomTbody').innerHTML = d.rooms.map(([name, area]) => `<tr><td>${name}</td><td>${area}</td></tr>`).join('');
    $('aptSpecId').textContent = label;
    $('aptSpecBuilding').textContent = buildingLabel;
    $('aptSpecFloor').textContent = d.floor;
    $('aptSpecType').textContent = d.type;
    $('aptSpecNetto').textContent = d.netto + ' m²';
    $('aptSpecBrutto').textContent = d.brutto + ' m²';
    const rooms = d.rooms.filter(([name]) => roomPattern.test(name.trim())).length;
    $('aptSpecRooms').textContent = rooms > 0 ? fmt(t.i18nRooms, { n: rooms }) : '—';
    $('aptSpecTerasz').textContent = d.terasz;
    $('aptSpecKert').textContent = d.kert || '—';
    $('aptSpecTajoias').textContent = d.tajoias;
    cta.href = `${t.contact}?unit=${encodeURIComponent(label)}#register`;

    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    lastFocus?.focus();
  }

  // Zones on the villa drawings (sold units have no data sheet)
  document.querySelectorAll('.fp-stage .apt-zone').forEach((zone) => {
    if (zone.classList.contains('is-sold')) return;
    const panel = zone.closest('[data-building-panel]');
    const building = panel && /^[AB]\d$/.test(panel.dataset.buildingPanel) ? panel.dataset.buildingPanel : undefined;
    const open = () => openModal(zone.dataset.apt, building);
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  // Table rows and mobile cards (the row's own Enquire link keeps working)
  root.querySelectorAll('.apt-table-row, .apt-card-row').forEach((row) => {
    if (row.classList.contains('is-sold')) return;
    const open = () => row.dataset.apt && openModal(row.dataset.apt, row.dataset.building);
    row.addEventListener('click', (e) => { if (!e.target.closest('a')) open(); });
    row.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a')) { e.preventDefault(); open(); }
    });
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  // Scroll fade on the info column
  const info = modal.querySelector('.apt-modal-info');
  const mask = () => {
    if (!info) return;
    info.classList.toggle('is-scrolled-bottom', info.scrollHeight - info.scrollTop - info.clientHeight < 8);
  };
  info?.addEventListener('scroll', mask, { passive: true });
  modal.addEventListener('transitionend', mask);
}

export function initUnitSelector(root = document) {
  root.querySelectorAll('[data-project-component="unit-selector"]').forEach((el) => {
    if (el.dataset.unitInit) return;
    el.dataset.unitInit = 'true';
    initPlans(el);
  });
  root.querySelectorAll('[data-project-component="unit-table"]').forEach((el) => {
    if (el.dataset.unitInit) return;
    el.dataset.unitInit = 'true';
    initFilter(el);
    initModal(el);
  });
}

export { unitId };
