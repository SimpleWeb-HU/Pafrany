// Optional hover video on media link cards ([data-hover-video]).
// Plays on pointer hover or keyboard focus of the card link; the poster
// image stays as the default. No video is required for any card.

export function initHoverVideo(root = document) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  root.querySelectorAll('[data-hover-video]').forEach((video) => {
    if (video.dataset.hoverVideoInit) return;
    video.dataset.hoverVideoInit = 'true';
    const link = video.closest('a');
    if (!link) return;

    const play = () => {
      video.style.opacity = '1';
      video.play().catch(() => {});
    };
    const stop = () => {
      video.style.opacity = '0';
      video.pause();
    };

    link.addEventListener('mouseenter', play);
    link.addEventListener('focus', play);
    link.addEventListener('mouseleave', stop);
    link.addEventListener('blur', stop);
  });
}
