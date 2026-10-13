import { drawGuides, drawThumbnail, THUMBNAIL_IDS, type ThumbnailId } from './thumbnail';

/**
 * Dev-only page for the YouTube thumbnails of the level 1 video (1280x720).
 * ?v=hunter|glowup|run picks one (default hunter); ?guides outlines the duration
 * badge's corner. `pnpm thumbnail` saves them all as PNGs.
 */
const canvas = document.getElementById('thumbnail') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const params = new URLSearchParams(location.search);
const requested = params.get('v') ?? THUMBNAIL_IDS[0];
if (!THUMBNAIL_IDS.includes(requested as ThumbnailId)) throw new Error(`Unknown thumbnail "${requested}": use one of ${THUMBNAIL_IDS.join(', ')}`);

const fonts = ['700 200px Silkscreen'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Thumbnail fonts did not load');

drawThumbnail(ctx, requested as ThumbnailId);
if (params.has('guides')) drawGuides(ctx);

declare global {
  interface Window { thumbnailReady?: boolean }
}
window.thumbnailReady = true;
