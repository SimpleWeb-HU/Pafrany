// Páfrány Boutique Residences – app entry (ES modules, no bundler needed).
// Every init is idempotent: safe to call more than once.

import { initNavigation } from './components/navigation.js';
import { initMotion } from './components/motion.js';
import { initTabs } from './components/tabs.js';
import { initCarousel } from './components/carousel.js';
import { initGallery } from './components/gallery.js';
import { initFilter } from './components/filter.js';
import { initForm } from './components/form.js';
import { initHoverVideo } from './components/hover-video.js';
import { initFaq } from './components/faq.js';
import { initGalleryRail } from './components/gallery-rail.js';
import { initUnitSelector } from './components/unit-selector.js';
import { initLocationMap } from './components/location-map.js';
import { initTechShowcase } from './components/tech-showcase.js';
import { initFooter } from './components/footer.js';

function init(root = document) {
  initNavigation(root);
  initTabs(root);
  initCarousel(root);
  initGallery(root);
  initFilter(root);
  initForm(root);
  initHoverVideo(root);
  initFaq(root);
  initGalleryRail(root);
  initUnitSelector(root);
  initLocationMap(root);
  initTechShowcase(root);
  initFooter(root);
  initMotion(root);
  document.documentElement.dataset.appReady = 'true';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
