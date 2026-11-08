import { INK } from '../../../src/art/pen';
import { caption, FULL, RED, sticker, water, YELLOW } from '../thumbnailKit';
import { drawDiver } from './art/people';
import { drawAnimal, prepareCast } from './cast';
import { closeFraction } from './layout';
import type { Animal } from './timeline';

/**
 * The thumbnails for the third long-form video, "every ocean animal that
 * could swallow you… only one actually could" (script.md, "Thumbnails"):
 * - throat: a sperm whale's open jaw fills the right two-thirds, cropped by
 *           the frame, its long lower jaw lined with teeth; a tiny yellow
 *           diver on the left; "ONLY ONE";
 * - lineup: five open mouths in a row, smallest to biggest (grouper, great
 *           white, croc, humpback, sperm whale), a red ✗ on each but the
 *           last, which gets a yellow "?";
 * - inside: from inside a humpback's closed mouth, baleen like prison bars,
 *           light through the gap, a diver's silhouette; "30 SECONDS".
 */
export const SWALLOWYOU_THUMBNAILS = ['throat', 'lineup', 'inside'] as const;
export type SwallowyouThumbnail = (typeof SWALLOWYOU_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const BLACK = '#111014';

function drawThroat(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 260, y: 90 });
  // The head is a third of the whale: 3,900 px long puts the head across the right two-thirds, snout cropped at the top.
  sticker(ctx, (c) => drawAnimal(c, 'sperm', { x: 430, y: 250 }, 3900, -1, 0.3, { gape: 1, tail: 0, redMouth: true, angle: -0.12 }), { outline: 7 });
  sticker(ctx, (c) => drawDiver(c, 210, 470, 230, 1, 0.4, { fill: YELLOW, halo: 0 }), { outline: 6 });
  caption(ctx, 'ONLY ONE', 330, 120, 104, 560, YELLOW);
}

/** A thick red ✗ with a black edge. */
function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, width] of [[BLACK, size * 0.3], [RED, size * 0.19]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y - size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.moveTo(x + size / 2, y - size / 2);
    ctx.lineTo(x - size / 2, y + size / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLineup(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 60 });
  const row: readonly Animal[] = ['grouper', 'white', 'croc', 'humpback', 'sperm'];
  const sizes = [150, 185, 220, 262, 310];
  const gap = (W - sizes.reduce((a, b) => a + b, 0)) / (row.length + 1);
  const cy = 300;
  let x = gap;
  row.forEach((a, i) => {
    const d = sizes[i]!;
    const centre = { x: x + d / 2, y: cy };
    // Each mouth in a round token: the head facing left, jaws wide, filling it.
    sticker(ctx, (c) => {
      c.save();
      c.beginPath();
      c.arc(centre.x, centre.y, d / 2, 0, Math.PI * 2);
      c.fillStyle = '#0d4f8f';
      c.fill();
      c.clip();
      const length = (d * 1.25) / closeFraction(a);
      drawAnimal(c, a, { x: centre.x - d * 0.44, y: centre.y - d * 0.05 }, length, -1, 0.25, { gape: a === 'croc' ? 0.85 : 1, tail: 0, redMouth: true, balloon: 0.3 });
      c.restore();
    }, { outline: 6 });
    if (i < row.length - 1) cross(ctx, centre.x, cy + d / 2 + 70, 80);
    else caption(ctx, '?', centre.x, cy + d / 2 + 82, 160, 200, YELLOW);
    x += d + gap;
  });
}

function drawInside(ctx: CanvasRenderingContext2D): void {
  // The inside of the mouth: dark red-black, lit from the gap between the lips.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0b10');
  g.addColorStop(0.45, '#6e1a24');
  g.addColorStop(1, '#1a0508');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // The gap: bright sea-light in a thin slit across the top.
  const gapY = 150;
  const light = ctx.createLinearGradient(0, gapY - 40, 0, gapY + 260);
  light.addColorStop(0, 'rgba(160,240,255,1)');
  light.addColorStop(0.2, 'rgba(90,200,240,0.7)');
  light.addColorStop(1, 'rgba(90,200,240,0)');
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(0, gapY - 30);
  ctx.quadraticCurveTo(W / 2, gapY - 70, W, gapY - 30);
  ctx.lineTo(W, gapY + 260);
  ctx.lineTo(0, gapY + 260);
  ctx.closePath();
  ctx.fill();
  // Baleen: dark plates hanging from the top like bars, fringed at their ends.
  for (let i = 0; i < 17; i++) {
    const x0 = 20 + i * 76 + 10 * Math.sin(i * 2.3);
    const len = 470 + 70 * Math.sin(i * 1.7);
    ctx.save();
    const plate = ctx.createLinearGradient(x0, 0, x0 + 34, 0);
    plate.addColorStop(0, '#120a08');
    plate.addColorStop(0.5, '#3a2a20');
    plate.addColorStop(1, '#120a08');
    ctx.fillStyle = plate;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + 36, 0);
    ctx.lineTo(x0 + 30, len);
    ctx.lineTo(x0 + 6, len + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#a58a66';
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.moveTo(x0 + 6 + k * 3, len - 30);
      ctx.lineTo(x0 + 2 + k * 4, len + 50 + 8 * Math.sin(k + i));
      ctx.stroke();
    }
    ctx.restore();
  }
  // The tongue, a pale pink floor.
  ctx.fillStyle = '#c2525f';
  ctx.beginPath();
  ctx.ellipse(W / 2, H + 120, W * 0.62, 240, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  sticker(ctx, (c) => drawDiver(c, 640, 470, 480, 1, 0.6, { fill: '#141418', halo: 0, spin: -0.25 }), { outline: 7 });
  caption(ctx, '30 SECONDS', 560, 620, 110, 800, YELLOW);
}

export async function drawSwallowyouThumbnail(ctx: CanvasRenderingContext2D, id: SwallowyouThumbnail): Promise<void> {
  await prepareCast();
  ctx.clearRect(0, 0, W, H);
  ({ throat: drawThroat, lineup: drawLineup, inside: drawInside })[id](ctx);
}
