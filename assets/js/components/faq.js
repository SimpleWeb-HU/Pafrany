// FAQ accordion: animated open / close for native <details>.
// Without JS (or with reduced motion) the native toggle works as is.
// Height animates on user action only (motion skill: allowed, ≤ 400 ms);
// the content below moves with it. Idempotent.

const DURATION = 360;
const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setup(item) {
  const summary = item.querySelector('summary');
  const answer = item.querySelector('.faq__answer');
  if (!summary || !answer) return;
  let anim = null;

  // The padding moves to an inner wrapper: an element with padding cannot
  // shrink below it, which made the animation jump at the start and end.
  if (!answer.querySelector(':scope > .faq__answer-inner')) {
    const inner = document.createElement('div');
    inner.className = 'faq__answer-inner';
    while (answer.firstChild) inner.appendChild(answer.firstChild);
    answer.appendChild(inner);
  }
  answer.classList.add('has-inner');

  const finish = (open) => {
    item.open = open;
    item.classList.remove('is-closing');
    answer.style.height = answer.style.overflow = answer.style.willChange = '';
    anim = null;
  };

  summary.addEventListener('click', (e) => {
    if (reduced() || !answer.animate) return;
    e.preventDefault();
    // Start from the height currently on screen (also mid-animation)
    const current = answer.getBoundingClientRect().height;
    anim?.cancel();
    answer.style.overflow = 'hidden';
    answer.style.willChange = 'height';

    if (!item.open || item.classList.contains('is-closing')) {
      // Open
      item.classList.remove('is-closing');
      const from = item.open ? current : 0;
      item.open = true;
      const to = answer.scrollHeight;
      anim = answer.animate(
        [{ height: `${from}px`, opacity: from ? 1 : 0 }, { height: `${to}px`, opacity: 1 }],
        { duration: DURATION, easing: EASING }
      );
      anim.onfinish = () => finish(true);
    } else {
      // Close
      item.classList.add('is-closing');
      anim = answer.animate(
        [{ height: `${current}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: DURATION * 0.85, easing: EASING }
      );
      anim.onfinish = () => finish(false);
    }
  });
}

export function initFaq(root = document) {
  root.querySelectorAll('.faq__item').forEach((item) => {
    if (item.dataset.faqInit) return;
    item.dataset.faqInit = 'true';
    setup(item);
  });
}
