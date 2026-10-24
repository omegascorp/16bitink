import { drawGuides, drawThumbnail, THUMBNAIL_IDS, type ThumbnailId } from './thumbnail';
import { DESCENT_THUMBNAILS, drawDescentThumbnail, type DescentThumbnail } from './descent/thumbnails';
import { drawFoodchainThumbnail, FOODCHAIN_THUMBNAILS, type FoodchainThumbnail } from './foodchain/thumbnails';

/**
 * Dev-only page for the YouTube thumbnails (1280x720). ?set= picks the video:
 * level1 (the default: ?v=hunter|glowup|run) or descent, the first long-form
 * video (?v=split|line|layers), or foodchain, the second (?v=split|nest|wrong|lunch). ?guides outlines the duration badge's corner.
 * `pnpm thumbnail` saves them all as PNGs.
 */
const SETS: Readonly<Record<string, { readonly ids: readonly string[]; readonly draw: (ctx: CanvasRenderingContext2D, id: string) => void }>> = {
  level1: { ids: THUMBNAIL_IDS, draw: (c, id) => drawThumbnail(c, id as ThumbnailId) },
  descent: { ids: DESCENT_THUMBNAILS, draw: (c, id) => drawDescentThumbnail(c, id as DescentThumbnail) },
  foodchain: { ids: FOODCHAIN_THUMBNAILS, draw: (c, id) => drawFoodchainThumbnail(c, id as FoodchainThumbnail) },
};
const canvas = document.getElementById('thumbnail') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';

const params = new URLSearchParams(location.search);
const setName = params.get('set') ?? 'level1';
const set = SETS[setName];
if (!set) throw new Error(`Unknown thumbnail set "${setName}": use one of ${Object.keys(SETS).join(', ')}`);
const requested = params.get('v') ?? set.ids[0]!;
if (!set.ids.includes(requested)) throw new Error(`Unknown thumbnail "${requested}": use one of ${set.ids.join(', ')}`);

const fonts = ['700 200px Silkscreen'];
await Promise.all(fonts.map((f) => document.fonts.load(f)));
if (!fonts.every((f) => document.fonts.check(f))) throw new Error('Thumbnail fonts did not load');

set.draw(ctx, requested);
if (params.has('guides')) drawGuides(ctx);

declare global {
  interface Window { thumbnailReady?: boolean }
}
window.thumbnailReady = true;
