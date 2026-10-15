import { BANNER, SAFE, drawBanner } from './banner';

/**
 * The Facebook page cover: the YouTube banner, cropped and scaled to 1640x924.
 *
 * Phones show the whole 16:9 image (640x360 on screen); desktops only its
 * middle 1640x624 band (820x312 on screen), and some phones trim ~180 px off
 * each side. The YouTube banner's phone strip - the logo and the head of the
 * food chain - is mapped onto the area every device shows.
 */
export const COVER = { width: 1640, height: 924 } as const;
export const COVER_DESKTOP = { x: 0, y: 150, width: 1640, height: 624 } as const;
export const COVER_SAFE = { x: 180, y: 150, width: 1280, height: 624 } as const;

const SCALE = COVER_SAFE.width / SAFE.width;
const CROP = {
  x: SAFE.x - COVER_SAFE.x / SCALE,
  y: SAFE.y + SAFE.height / 2 - COVER.height / SCALE / 2,
  width: COVER.width / SCALE,
  height: COVER.height / SCALE,
} as const;

export function drawCover(ctx: CanvasRenderingContext2D): void {
  const banner = document.createElement('canvas');
  banner.width = BANNER.width;
  banner.height = BANNER.height;
  const bctx = banner.getContext('2d')!;
  bctx.imageSmoothingQuality = 'high';
  drawBanner(bctx);
  ctx.drawImage(banner, CROP.x, CROP.y, CROP.width, CROP.height, 0, 0, COVER.width, COVER.height);
}

/** Dashed outlines of the desktop band and the area every device shows (?guides). */
export function drawCoverGuides(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 10]);
  ctx.strokeStyle = '#d23';
  ctx.strokeRect(COVER_DESKTOP.x + 2, COVER_DESKTOP.y, COVER_DESKTOP.width - 4, COVER_DESKTOP.height);
  ctx.strokeStyle = '#2a2';
  ctx.strokeRect(COVER_SAFE.x, COVER_SAFE.y, COVER_SAFE.width, COVER_SAFE.height);
  // Where the profile picture overlaps the cover on desktop.
  ctx.strokeStyle = '#a2a';
  ctx.beginPath();
  ctx.arc(200, COVER_DESKTOP.y + COVER_DESKTOP.height + 60, 170, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
