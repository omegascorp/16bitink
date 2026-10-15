import { drawBanner, drawGuides } from './banner';
import { drawCover, drawCoverGuides } from './facebook';

/**
 * Dev-only page for the YouTube channel banner (banner.html, 2560x1440) and
 * the Facebook page cover (facebook.html, 1640x924). ?guides outlines what
 * desktops and phones crop to. `pnpm banner` saves both as PNGs.
 */
const canvas = document.getElementById('banner') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const fonts = ['400 150px Silkscreen', '700 240px Caveat', '500 78px Caveat'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Banner fonts did not load');

const facebook = canvas.dataset.art === 'facebook';
if (facebook) drawCover(ctx);
else drawBanner(ctx);
if (new URLSearchParams(location.search).has('guides')) (facebook ? drawCoverGuides : drawGuides)(ctx);

declare global {
  interface Window { bannerReady?: boolean }
}
window.bannerReady = true;
