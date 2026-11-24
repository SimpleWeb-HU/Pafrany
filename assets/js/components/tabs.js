// Accessible tabs ([data-tabs]) used by the site plan / floor plans and
// the available residences table. Arrow keys move between tabs.
// [data-tab-target="id"] elements outside the tab list (site plan
// building buttons) activate a tab too.

function activate(container, tab, focus = false) {
  const tabs = [...container.querySelectorAll('[role="tab"]')];
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !selected;
  });
  if (focus) tab.focus();
}

export function initTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach((container) => {
    if (container.dataset.tabsInit) return;
    container.dataset.tabsInit = 'true';

    const tabs = [...container.querySelectorAll('[role="tab"]')];
    const enabled = () => tabs.filter((t) => !t.disabled);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => !tab.disabled && activate(container, tab));
      tab.addEventListener('keydown', (event) => {
        const list = enabled();
        const i = list.indexOf(tab);
        let next = null;
        if (event.key === 'ArrowRight') next = list[(i + 1) % list.length];
        if (event.key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
        if (event.key === 'Home') next = list[0];
        if (event.key === 'End') next = list[list.length - 1];
        if (next) {
          event.preventDefault();
          activate(container, next, true);
        }
      });
    });

    container.querySelectorAll('[data-tab-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = container.querySelector(`#${button.dataset.tabTarget}`);
        if (tab && !tab.disabled) activate(container, tab, true);
      });
    });
  });
}
