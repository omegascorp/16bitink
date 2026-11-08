import { drawEggRaw, drawSwallowThumb, EGG_SHOT, SWALLOW_THUMBS, type SwallowThumb } from './swallow/thumbs';
import { drawGuides, TH, TW } from './swallow/thumbKit';

/**
 * Dev-only page for InkSnake's YouTube thumbnails (thumbnail.html, 1280 × 720,
 * drawn at 1920 × 1080 and scaled down). ?v=lump|split|champion picks one of
 * the swallow video's; ?guides outlines the duration badge's corner;
 * ?egg=u,x,y,w overrides the champion's egg-eater shot, and ?raw=u shows the
 * egg-eater short's whole portrait world at u (for picking that shot).
 * `node dev/promo/saveThumbnail.mjs` saves them all as PNGs.
 */
const canvas = document.getElementById('thumbnail') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';
const params = new URLSearchParams(location.search);

const fonts = ['700 200px Silkscreen'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Thumbnail fonts did not load');

const raw = params.get('raw');
if (raw !== null) {
  canvas.width = 1080;
  canvas.height = 1920;
  drawEggRaw(ctx, Number(raw));
} else {
  const id = (params.get('v') ?? SWALLOW_THUMBS[0]) as SwallowThumb;
  if (!SWALLOW_THUMBS.includes(id)) throw new Error(`Unknown thumbnail "${id}": use one of ${SWALLOW_THUMBS.join(', ')}`);
  const egg = params.get('egg')?.split(',').map(Number);
  const big = document.createElement('canvas');
  big.width = TW;
  big.height = TH;
  const bctx = big.getContext('2d')!;
  bctx.imageSmoothingQuality = 'high';
  drawSwallowThumb(bctx, id, egg && egg.length === 4 ? { u: egg[0]!, x: egg[1]!, y: egg[2]!, w: egg[3]! } : EGG_SHOT);
  if (params.has('guides')) drawGuides(bctx);
  ctx.drawImage(big, 0, 0, canvas.width, canvas.height);
}

declare global {
  interface Window { thumbnailReady?: boolean }
}
window.thumbnailReady = true;
