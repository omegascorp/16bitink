import { drawBanner, drawGuides } from './banner';

/**
 * Dev-only page for the YouTube channel banner (2560x1440). ?guides outlines
 * what desktops and phones crop to. `pnpm banner` saves it as a PNG.
 */
const canvas = document.getElementById('banner') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const fonts = ['400 150px Silkscreen', '700 240px Caveat', '500 78px Caveat'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Banner fonts did not load');

drawBanner(ctx);
if (new URLSearchParams(location.search).has('guides')) drawGuides(ctx);

declare global {
  interface Window { bannerReady?: boolean }
}
window.bannerReady = true;
