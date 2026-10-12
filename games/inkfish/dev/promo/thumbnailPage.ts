import { drawGuides, drawThumbnail } from './thumbnail';

/**
 * Dev-only page for the YouTube thumbnail of the level 1 video (1280x720).
 * ?guides outlines the duration badge's corner. `pnpm thumbnail` saves it as a PNG.
 */
const canvas = document.getElementById('thumbnail') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const fonts = ['400 200px Silkscreen', '400 58px Silkscreen', '700 140px Caveat'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Thumbnail fonts did not load');

drawThumbnail(ctx);
if (new URLSearchParams(location.search).has('guides')) drawGuides(ctx);

declare global {
  interface Window { thumbnailReady?: boolean }
}
window.thumbnailReady = true;
