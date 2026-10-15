import { drawAdImage, drawAdThumb, IMAGE_IDS, THUMB_IDS, type ImageId, type ThumbId } from './images';
import { drawOverlay, OVERLAY_IDS, type OverlayId } from './overlay';

/**
 * Dev-only page for the Reddit ad creative. ?kind=image|thumb|overlay picks
 * what to draw, ?v= which one, ?w=&h= the canvas size. `pnpm ads`
 * (dev/promo/saveAds.mjs) saves them all.
 */
const canvas = document.getElementById('ad') as HTMLCanvasElement;
const params = new URLSearchParams(location.search);
const size = (key: string, fallback: number): number => {
  const value = Number(params.get(key) ?? fallback);
  if (!Number.isInteger(value) || value < 100 || value > 4000) throw new Error(`?${key} must be a whole number of px from 100 to 4000`);
  return value;
};
canvas.width = size('w', 1200);
canvas.height = size('h', 1200);
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const fonts = ['700 200px Silkscreen', '700 100px Caveat', '500 100px Caveat'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Ad fonts did not load');

function pick<T extends string>(ids: readonly T[]): T {
  const v = params.get('v') ?? ids[0]!;
  if (!ids.includes(v as T)) throw new Error(`Unknown ?v="${v}": use one of ${ids.join(', ')}`);
  return v as T;
}

const kind = params.get('kind') ?? 'image';
if (kind === 'image') drawAdImage(ctx, pick<ImageId>(IMAGE_IDS));
else if (kind === 'thumb') drawAdThumb(ctx, pick<ThumbId>(THUMB_IDS));
else if (kind === 'overlay') drawOverlay(ctx, pick<OverlayId>(OVERLAY_IDS));
else throw new Error(`Unknown ?kind="${kind}": use image, thumb or overlay`);

declare global {
  interface Window { adReady?: boolean }
}
window.adReady = true;
