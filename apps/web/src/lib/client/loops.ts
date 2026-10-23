/** Connections too slow to spend on a decoration (Chrome's guess; other browsers don't say). */
const SLOW = ['slow-2g', '2g', '3g'];

/** Starts the gameplay loops when they're on screen, pauses them when not; adds `on` once one is playing. */
function watchLoops(videos: Iterable<HTMLVideoElement>): void {
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const video = target as HTMLVideoElement;
      if (!isIntersecting) video.pause();
      // Autoplay can still be refused (e.g. low-power mode): the cover stays.
      else video.play().catch(() => undefined);
    }
  }, { threshold: 0.5 });
  for (const video of videos) {
    video.addEventListener('playing', () => video.classList.add('on'), { once: true });
    seen.observe(video);
  }
}

/**
 * The silent gameplay loops over game covers (`video[data-loop]` inside
 * `scope`). They play only while on screen, and not at all for reduced
 * motion, Save-Data or a slow connection. They start once the page has
 * loaded: a playing video holds back the load event, and on a phone it would
 * take the bandwidth the cover, fonts and play button need first.
 */
export function startLoops(scope: string): void {
  const start = (): void => {
    const videos = document.querySelectorAll<HTMLVideoElement>(`${scope} video[data-loop]`);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (videos.length === 0 || connection?.saveData || SLOW.includes(connection?.effectiveType ?? '')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    watchLoops(videos);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
