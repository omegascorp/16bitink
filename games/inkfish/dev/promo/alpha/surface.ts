import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine } from '../captions';
import { clamp01, ramp, VIDEO } from '../short';
import { placeLabel, sizeBar, TEXT } from './script';
import { glow, wash } from './sea';
import { cycles, TAGGED_AT, wrap } from './story';
import { drawShark, onShark, type SharkPose, TAG_ON_FIN } from './tag';

/**
 * 2003, off south-western Australia: a sunny surface seen at the waterline,
 * the research boat, a scientist leaning over the side with a tagging pole,
 * and the shark just under the surface, dorsal fin cutting it. "Australia,
 * 2003" in the sky, then a "9 ft (2.7 m)" bar under the shark.
 */

const SURFACE_Y = 560;
const SPOKEN = '#f5c84a';
const HALO = '#0b2236';
const PAPER_FILL = '#fffaf0';

/** The boat drawn in screen px, baked once a boil frame (it only bobs). */
const BOAT_BOX = { x: 0, y: 180, w: 560, h: 470 } as const;

function hullShape(): Pt[] {
  const pts: Pt[] = [];
  // Gunwale from the bow (left) to the stern (right), then down the transom, the bottom and up the bow.
  for (let i = 0; i <= 12; i++) pts.push({ x: 28 + i * 37, y: 470 + 8 * Math.sin((i / 12) * Math.PI) - (i < 3 ? (3 - i) * 9 : 0) });
  pts.push({ x: 478, y: 530 }, { x: 470, y: 600 }, { x: 300, y: 618 }, { x: 120, y: 612 }, { x: 60, y: 585 }, { x: 22, y: 470 - 27 });
  return pts;
}

function paintBoat(pen: Pen): void {
  const hull = hullShape();
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, '#dfe6ea', 0.55);
  pen.clipped(hull, () => {
    // A blue stripe along the sheer, red antifouling below the waterline, shade low on the hull.
    pen.fill([{ x: 0, y: 492 }, { x: 560, y: 498 }, { x: 560, y: 512 }, { x: 0, y: 508 }], '#2f6aa8', 0.9);
    pen.fill([{ x: 0, y: SURFACE_Y - 4 }, { x: 560, y: SURFACE_Y - 4 }, { x: 560, y: 650 }, { x: 0, y: 650 }], '#b23a2e', 0.85);
    pen.hatch([{ x: 0, y: 520 }, { x: 560, y: 520 }, { x: 560, y: 560 }, { x: 0, y: 560 }], 7, 0.5, 0.8, { alpha: 0.25 });
  });
  pen.closed(hull, 2.4);
  // The wheelhouse: white, a dark roof, three windows.
  const house = [{ x: 90, y: 470 }, { x: 98, y: 368 }, { x: 262, y: 368 }, { x: 282, y: 470 }];
  pen.fill(house, PAPER_FILL, 1);
  pen.fill(house, '#d9e1e6', 0.6);
  pen.hatch([{ x: 230, y: 370 }, { x: 282, y: 370 }, { x: 282, y: 470 }, { x: 230, y: 470 }], 6, 1.2, 0.7, { alpha: 0.25 });
  pen.closed(house, 2.2);
  pen.fill([{ x: 84, y: 372 }, { x: 92, y: 356 }, { x: 270, y: 356 }, { x: 288, y: 372 }], '#2b3440', 0.95);
  for (const x of [114, 164, 214]) {
    const win = [{ x, y: 386 }, { x: x + 36, y: 386 }, { x: x + 36, y: 420 }, { x, y: 420 }];
    pen.fill(win, '#5d8fb8', 0.8);
    pen.hair([{ x: x + 6, y: 412 }, { x: x + 26, y: 392 }], 2, '#e6f2fb', 0.8);
    pen.closed(win, 1.6);
  }
  // A mast with a radar bar and a whip antenna.
  pen.stroke([{ x: 180, y: 356 }, { x: 184, y: 236 }], 4);
  pen.stroke([{ x: 150, y: 270 }, { x: 222, y: 266 }], 6, '#2b3440');
  pen.stroke([{ x: 200, y: 356 }, { x: 214, y: 200 }], 1.6);
  // Rails along the deck aft of the wheelhouse.
  pen.stroke([{ x: 290, y: 438 }, { x: 476, y: 446 }], 2);
  for (const x of [300, 350, 400, 450]) pen.stroke([{ x, y: 440 + (x - 290) * 0.04 }, { x, y: 474 + (x - 290) * 0.04 }], 1.6);
  // A life ring on the wheelhouse.
  pen.fill([...Array(20)].map((_, i) => ({ x: 128 + 14 * Math.cos((i / 20) * Math.PI * 2), y: 446 + 14 * Math.sin((i / 20) * Math.PI * 2) })), '#e2572f', 0.95);
  pen.circle(128, 446, 14, 1.6);
  pen.circle(128, 446, 6, 1.2);
}

export function makeBoatFrames(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BOAT_BOX.w, BOAT_BOX.h);
    ctx.translate(-BOAT_BOX.x, -BOAT_BOX.y);
    paintBoat(new Pen(ctx, 2003 + f * 977, 1.1));
    return canvas;
  });
}

// ---------------------------------------------------------------- sky and sea

function drawSky(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  ctx.drawImage(sheet, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  sky.addColorStop(0, 'rgba(70,150,215,0.85)');
  sky.addColorStop(1, 'rgba(190,225,240,0.75)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, SURFACE_Y);
  glow(ctx, 880, 250, 360, '255,236,170', 0.55);
  ctx.save();
  ctx.fillStyle = '#fff6d6';
  ctx.strokeStyle = 'rgba(214,150,60,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(880, 250, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Soft clouds drifting.
  for (const [x, y, r] of [[300, 210, 90], [520, 300, 60], [-40, 330, 110]] as const) {
    const cx = x + 20 * Math.sin(cycles(1, t));
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(cx, y, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.5, y - r * 0.25, r * 0.8, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** The sea below the surface: bright turquoise to blue, sun shafts. Drawn over the boat's hull and the shark at `alpha`. */
function drawSea(ctx: CanvasRenderingContext2D, alpha: number, t: number): void {
  const g = ctx.createLinearGradient(0, SURFACE_Y, 0, VIDEO.height);
  g.addColorStop(0, `rgba(40,150,170,${0.55 * alpha})`);
  g.addColorStop(0.35, `rgba(22,96,140,${0.8 * alpha})`);
  g.addColorStop(1, `rgba(8,34,70,${0.95 * alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, SURFACE_Y, VIDEO.width, VIDEO.height - SURFACE_Y);
  if (alpha < 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = 80 + i * 190 + 25 * Math.sin(cycles(2, t) + i);
    const ray = ctx.createLinearGradient(0, SURFACE_Y, 0, SURFACE_Y + 900);
    ray.addColorStop(0, 'rgba(220,250,240,0.13)');
    ray.addColorStop(1, 'rgba(220,250,240,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x, SURFACE_Y);
    ctx.lineTo(x + 60, SURFACE_Y);
    ctx.lineTo(x - 80, SURFACE_Y + 900);
    ctx.lineTo(x - 200, SURFACE_Y + 900);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const waveAt = (x: number, t: number): number => SURFACE_Y + 5 * Math.sin(x / 50 + cycles(9, t)) + 3 * Math.sin(x / 19 - cycles(13, t));

function drawSurfaceLine(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, width, dy] of [['rgba(235,250,255,0.75)', 9, 5], [INK, 3.4, 0]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = -10; x <= VIDEO.width + 10; x += 12) {
      const y = waveAt(x, t) + dy;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the scientist

const SKIN = '#f0c9a0';
const SHIRT = '#7fb2d8';
const SHORTS = '#c8b07a';

function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 4;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** The scientist on the stern deck, leaning out over the rail with the tagging pole down to `tip`. */
function drawScientist(ctx: CanvasRenderingContext2D, tip: Pt, bob: number, lean: number): void {
  const deck = 478 + bob;
  const hip = { x: 418 + 6 * lean, y: deck - 88 };
  const neck = { x: 452 + 18 * lean, y: deck - 158 + 6 * lean };
  const head = { x: neck.x + 12, y: neck.y - 30 };
  const butt = { x: 430 + 10 * lean, y: deck - 190 };
  const h1 = lerpPt(butt, tip, 0.14);
  const h2 = lerpPt(butt, tip, 0.3);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The pole: a long aluminium shaft.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(butt.x, butt.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = '#d9dee3';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  // Legs, the far arm, the body, the near arm.
  limb(ctx, [hip, { x: hip.x - 8, y: deck - 44 }, { x: hip.x - 14, y: deck }], 15, SHORTS);
  limb(ctx, [hip, { x: hip.x + 14, y: deck - 44 }, { x: hip.x + 22, y: deck }], 15, SKIN);
  limb(ctx, [{ x: neck.x - 4, y: neck.y + 10 }, { x: neck.x + 26, y: neck.y + 40 }, h2], 10, '#6a9cc4');
  limb(ctx, [hip, neck], 34, SHIRT);
  ctx.fillStyle = SHORTS;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(hip.x, hip.y + 6, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  limb(ctx, [{ x: neck.x, y: neck.y + 8 }, { x: neck.x + 8, y: neck.y + 48 }, h1], 11, SHIRT);
  // Head, a navy cap and its peak, and sunglasses.
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1f3552';
  ctx.beginPath();
  ctx.arc(head.x, head.y - 4, 21, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(head.x + 8, head.y - 10);
  ctx.lineTo(head.x + 34, head.y - 6);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#1f3552';
  ctx.stroke();
  ctx.fillStyle = '#15181d';
  ctx.fillRect(head.x + 6, head.y - 2, 14, 6);
  for (const h of [h1, h2]) {
    ctx.fillStyle = SKIN;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- gulls

function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flap: number): void {
  const up = 0.5 + 0.5 * Math.sin(flap);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size * 0.3 * up + size * 0.1);
  ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.55 * up, x, y);
  ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.55 * up, x + size, y - size * 0.3 * up + size * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y + 2, size * 0.22, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the scene

/** The shark at the surface, just under it, gliding right. */
export function surfaceSharkAt(t: number): SharkPose {
  return { x: 650 + 14 * (t - 4.5), y: 735 + 5 * Math.sin(cycles(4, t)), length: 620, angle: 0.02 * Math.sin(cycles(5, t)), flip: false };
}

/** The size bar's height under the shark. */
export const sizeBarY = (p: SharkPose): number => p.y + 0.15 * p.length;

/** The "9 ft (2.7 m)" bar under the shark, nose to tail tip. */
function drawSizeBar(ctx: CanvasRenderingContext2D, p: SharkPose, alpha: number): void {
  if (alpha <= 0) return;
  const y = sizeBarY(p);
  const x0 = p.x - p.length / 2;
  const x1 = p.x + p.length / 2;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * Math.min(1, alpha * 1.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(mid - half, y);
  ctx.lineTo(mid + half, y);
  for (const x of [mid - half, mid + half]) {
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y + 18);
  }
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, '9 ft (2.7 m)', mid, y + TEXT.sizeBar.dy, TEXT.sizeBar.size, 700, alpha, { fill: SPOKEN, halo: HALO });
}

export function drawSurface(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, boat: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const u = wrap(t);
  drawSky(ctx, sheet, t);
  drawSea(ctx, 1, t);
  for (const [x0, y, s, k] of [[-120, 300, 34, 0], [-260, 250, 26, 1.4]] as const) drawGull(ctx, x0 + ((u * 150 + k * 90) % 1400), y + 10 * Math.sin(u * 2 + k), s, u * 9 + k);
  const bob = 5 * Math.sin(cycles(11, t));
  const tilt = 0.012 * Math.sin(cycles(11, t) + 1);
  ctx.save();
  ctx.translate(250, SURFACE_Y);
  ctx.rotate(tilt);
  ctx.translate(-250, -SURFACE_Y + bob);
  ctx.drawImage(boat[boil % boat.length]!, BOAT_BOX.x, BOAT_BOX.y);
  ctx.restore();
  const shark = surfaceSharkAt(u);
  // The tag goes on as the pole jabs, on "tagged".
  const jab = Math.max(0, Math.sin(Math.PI * clamp01((u - TAGGED_AT + 0.1) / 0.35)));
  const tagged = ramp(u, TAGGED_AT + 0.08, TAGGED_AT + 0.2);
  const fin = onShark(shark, TAG_ON_FIN);
  const tip = { x: fin.x - 26 + 26 * jab, y: fin.y - 70 + 70 * jab - (1 - tagged) * 10 };
  // Under the surface: the shark, behind a veil of water.
  drawShark(ctx, shark, t, { tail: cycles(21, t) }, tagged > 0 ? { alpha: tagged, swing: 0.1 * Math.sin(cycles(17, t)) } : null);
  ctx.save();
  ctx.beginPath();
  for (let x = -10; x <= VIDEO.width + 10; x += 12) ctx.lineTo(x, waveAt(x, t));
  ctx.lineTo(VIDEO.width + 10, VIDEO.height);
  ctx.lineTo(-10, VIDEO.height);
  ctx.closePath();
  ctx.clip();
  drawSea(ctx, 0.45, t);
  ctx.restore();
  drawSurfaceLine(ctx, t);
  drawScientist(ctx, tip, bob, 0.6 + 0.4 * jab);
  // A splash ring where the pole meets the water.
  if (jab > 0.05) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,252,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(fin.x - 20, SURFACE_Y + 2, 30 + 40 * jab, 7 + 6 * jab, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawSizeBar(ctx, shark, sizeBar(t));
  drawTextLine(ctx, 'Australia, 2003', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, placeLabel(t), { fill: '#fffaf0', halo: HALO });
  wash(ctx, 'soft-light', '#ffd27a', 0.25);
}
