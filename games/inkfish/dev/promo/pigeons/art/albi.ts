import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { dab, path, softLine } from '../../seal/art/paint';

/**
 * Albi from the river, painted as one view: a warm hazy sky, the old town, the
 * huge fortress of Sainte-Cécile (a long brick wall of round buttress towers,
 * with its tiered tower at the west end), and in front the long Pont Vieux on
 * its brick arches, near at the left and running away to the right. Everything
 * here ends at WATERLINE, and ./river.ts mirrors it into the water.
 */

export const WATERLINE = 735;
const W = 1080;

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

function sky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, 660);
  g.addColorStop(0, '#7dbbdf');
  g.addColorStop(0.45, '#b3d8e4');
  g.addColorStop(0.8, '#f3e3c2');
  g.addColorStop(1, '#fbe2b4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, WATERLINE + 10);
  dab(ctx, 1000, 120, 520, '255,240,196', 0.75);
  const rng = createRng(77);
  for (const [x, y, r] of [[170, 150, 150], [430, 90, 100], [90, 330, 120], [620, 240, 90], [300, 300, 80]] as const) {
    for (let i = 0; i < 9; i++) dab(ctx, x + (rng() - 0.5) * r * 2, y + (rng() - 0.5) * r * 0.5, r * (0.35 + rng() * 0.45), '255,251,240', 0.42);
    dab(ctx, x, y + r * 0.34, r * 1.1, '186,204,220', 0.16);
  }
}

/** Far hills and tree masses, cooled by the haze. */
function distance(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#a9bfc3';
  ctx.beginPath();
  ctx.moveTo(-10, 600);
  for (let x = 0; x <= W + 20; x += 30) ctx.lineTo(x, 520 + 22 * Math.sin(x * 0.009) + 9 * Math.sin(x * 0.031));
  ctx.lineTo(W + 20, 640);
  ctx.lineTo(-10, 640);
  ctx.fill();
}

/** A house: lit wall, shaded side, a tiled roof, a few dark windows. */
function house(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, wall: string, roof: string): void {
  ctx.fillStyle = wall;
  ctx.fillRect(x, base - h, w, h);
  ctx.fillStyle = 'rgba(70,30,16,0.24)';
  ctx.fillRect(x, base - h, w * 0.28, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 5, base - h);
  ctx.lineTo(x + w * 0.42, base - h - w * 0.34);
  ctx.lineTo(x + w + 5, base - h);
  ctx.fill();
  ctx.fillStyle = 'rgba(40,20,20,0.6)';
  for (let wy = base - h + 12; wy < base - 12; wy += 24) for (let wx = x + 8; wx < x + w - 6; wx += 17) ctx.fillRect(wx, wy, 6, 11);
}

function town(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(33);
  const walls = ['#d9a678', '#c97f58', '#e3bb90', '#bd6f4c'];
  const roofs = ['#b4583a', '#a24a32', '#c26a44'];
  for (const [base, top, step] of [[610, 90, 46], [660, 60, 58]] as const) {
    for (let x = -30; x < 500; x += step * (0.8 + rng() * 0.5)) {
      house(ctx, x, base, step * (0.9 + rng() * 0.4), top + rng() * 66, walls[Math.floor(rng() * 4)]!, roofs[Math.floor(rng() * 3)]!);
    }
  }
}

/** Fine brick: courses and a scatter of lighter and darker bricks over the box. */
function brick(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const rng = createRng(seed);
  ctx.save();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(60,20,12,0.14)';
  for (let v = y; v < y + h; v += 4.5) {
    ctx.beginPath();
    ctx.moveTo(x, v);
    ctx.lineTo(x + w, v);
    ctx.stroke();
  }
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(255,214,170,0.14)' : 'rgba(70,24,14,0.14)';
    ctx.fillRect(x + rng() * w, y + Math.floor(rng() * h / 4.5) * 4.5, 7, 4);
  }
  ctx.restore();
}

/** A round buttress tower: a half cylinder, lit from the right, with a domed cap. */
function buttress(ctx: CanvasRenderingContext2D, x: number, top: number, base: number, w: number): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#7c3524');
  g.addColorStop(0.4, '#ad5637');
  g.addColorStop(0.8, '#e2a071');
  g.addColorStop(1, '#c9764e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, top, w, base - top, [w / 2, w / 2, 0, 0]);
  ctx.fill();
}

/** The nave: one blank cliff of brick between its buttresses, a slit of window high up in each bay. */
function nave(ctx: CanvasRenderingContext2D): void {
  const [x0, x1, top, base] = [345, 900, 330, 640];
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, '#b2613f');
  g.addColorStop(1, '#a55335');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, base - top);
  ctx.fillStyle = '#8d4b38';
  ctx.beginPath();
  ctx.moveTo(x0 + 8, top);
  ctx.lineTo(x0 + 60, top - 26);
  ctx.lineTo(x1, top - 26);
  ctx.lineTo(x1, top);
  ctx.fill();
  const bay = 45;
  for (let x = x0 + 8; x < x1 - 20; x += bay) {
    ctx.fillStyle = '#3a211f';
    ctx.beginPath();
    ctx.roundRect(x + 27, top + 26, 8, 128, [4, 4, 0, 0]);
    ctx.fill();
    dab(ctx, x + 31, top + 90, 26, '60,20,14', 0.22);
  }
  for (let x = x0; x < x1 - 8; x += bay) buttress(ctx, x, top - 18, base, 22);
}

/** One tier of the west tower, set back from the one below, with round corner turrets. */
function tier(ctx: CanvasRenderingContext2D, cx: number, half: number, top: number, base: number): void {
  const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, '#8c4029');
  g.addColorStop(0.55, '#b9603f');
  g.addColorStop(1, '#e8a877');
  ctx.fillStyle = g;
  ctx.fillRect(cx - half, top, 2 * half, base - top);
  buttress(ctx, cx - half - 11, top - 12, base, 24);
  buttress(ctx, cx + half - 13, top - 12, base, 24);
  ctx.fillStyle = 'rgba(60,20,12,0.45)';
  ctx.fillRect(cx - half, base - 6, 2 * half, 6);
  ctx.fillStyle = '#3a211f';
  for (const x of [cx - half * 0.34, cx + half * 0.3]) {
    ctx.beginPath();
    ctx.roundRect(x - 4, top + 18, 8, Math.min(70, base - top - 30), [4, 4, 0, 0]);
    ctx.fill();
  }
}

function tower(ctx: CanvasRenderingContext2D): void {
  const cx = 860;
  tier(ctx, cx, 88, 430, 640);
  tier(ctx, cx, 76, 320, 430);
  tier(ctx, cx, 64, 225, 320);
  tier(ctx, cx, 50, 165, 225);
  ctx.fillStyle = '#7c3524';
  for (let i = 0; i < 7; i++) ctx.fillRect(cx - 50 + i * 16, 150, 9, 16);
}

/** Paints on a layer of its own, then lays brick only over what was painted, so no brick falls on the sky. */
function bricked(ctx: CanvasRenderingContext2D, scale: number, paint: (c: CanvasRenderingContext2D) => void, seed: number): void {
  const { canvas, ctx: c } = makeCanvas(W * scale, Math.ceil((WATERLINE + 4) * scale));
  c.scale(scale, scale);
  paint(c);
  c.globalCompositeOperation = 'source-atop';
  brick(c, 0, 0, W, WATERLINE + 4, seed);
  ctx.drawImage(canvas, 0, 0, W, WATERLINE + 4);
}

/** The town's river wall under the cathedral, with hedges along its terrace. */
function terrace(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#b76a48';
  ctx.fillRect(330, 610, 760, 60);
  brick(ctx, 330, 610, 760, 60, 12);
  const rng = createRng(4);
  for (let x = 330; x < 1090; x += 18) dab(ctx, x, 612 + rng() * 6, 20, rng() < 0.5 ? '98,128,64' : '124,146,76', 0.75);
}

interface Arch { readonly x0: number; readonly x1: number }

const deckAt = (x: number): number => 590 + 62 * (x / W) ** 0.9 - 14 * Math.sin((x / W) * Math.PI);

/** The arches of the Pont Vieux, biggest at the near end on the left. */
const ARCHES: readonly Arch[] = (() => {
  const out: Arch[] = [];
  let x = -150;
  for (let w = 300; x < W + 40; w *= 0.8) {
    out.push({ x0: x, x1: x + w });
    x += w;
  }
  return out;
})();

function pier(ctx: CanvasRenderingContext2D, x: number, w: number, top: number): void {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, '#d98a5c');
  g.addColorStop(0.5, '#a9492f');
  g.addColorStop(1, '#6f2e22');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, top);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w * 1.1, WATERLINE + 3);
  ctx.lineTo(x - w * 1.1, WATERLINE + 3);
  ctx.fill();
  // The pointed cutwater facing upstream.
  ctx.fillStyle = 'rgba(92,36,24,0.55)';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.15, top + 20);
  ctx.lineTo(x + w * 0.2, top + 20);
  ctx.lineTo(x + w * 0.7, WATERLINE + 3);
  ctx.lineTo(x - w * 0.5, WATERLINE + 3);
  ctx.fill();
}

function archRing(ctx: CanvasRenderingContext2D, a: Arch): void {
  const pierW = (a.x1 - a.x0) * 0.11;
  const [x0, x1] = [a.x0 + pierW, a.x1 - pierW];
  const mid = (x0 + x1) / 2;
  const spring = lerp(deckAt(mid), WATERLINE, 0.74);
  const crown = deckAt(mid) + (WATERLINE - deckAt(mid)) * 0.13;
  const hole = (): void => {
    ctx.beginPath();
    ctx.moveTo(x0, WATERLINE + 3);
    ctx.lineTo(x0, spring);
    ctx.bezierCurveTo(x0, spring - (spring - crown) * 0.72, mid - (x1 - x0) * 0.22, crown, mid, crown);
    ctx.bezierCurveTo(mid + (x1 - x0) * 0.22, crown, x1, spring - (spring - crown) * 0.72, x1, spring);
    ctx.lineTo(x1, WATERLINE + 3);
    ctx.closePath();
  };
  ctx.save();
  hole();
  ctx.clip();
  const g = ctx.createLinearGradient(0, crown, 0, WATERLINE);
  g.addColorStop(0, '#2b1a1c');
  g.addColorStop(0.7, '#51403e');
  g.addColorStop(1, '#7ea49a');
  ctx.fillStyle = g;
  ctx.fillRect(x0, crown, x1 - x0, WATERLINE - crown + 4);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#e4a678';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.7;
  hole();
  ctx.stroke();
  ctx.restore();
}

/** The Pont Vieux: the long deck, its parapet, then piers and arches. */
function bridge(ctx: CanvasRenderingContext2D): void {
  const deck = (dy: number): Pt[] => Array.from({ length: 28 }, (_, i) => ({ x: -20 + i * 42, y: deckAt(-20 + i * 42) + dy }));
  const face: Pt[] = [...deck(0), { x: W + 20, y: WATERLINE + 3 }, { x: -20, y: WATERLINE + 3 }];
  const g = ctx.createLinearGradient(0, 590, 0, WATERLINE);
  g.addColorStop(0, '#d98a5c');
  g.addColorStop(1, '#b5593b');
  ctx.fillStyle = g;
  path(ctx, face);
  ctx.fill();
  for (const a of ARCHES) pier(ctx, a.x0, (a.x1 - a.x0) * 0.11, deckAt(a.x0) + 34);
  for (const a of ARCHES) archRing(ctx, a);
  softLine(ctx, deck(2), 7, '#f3c79a', 0.9, 2);
  softLine(ctx, deck(14), 3, '#7a3524', 0.5, 2);
}

/** Air between the eye and the town: warm haze low down, the sun's bloom from the right. */
function haze(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 240, 0, 640);
  g.addColorStop(0, 'rgba(255,233,196,0)');
  g.addColorStop(1, 'rgba(255,233,196,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 240, W, 400);
  dab(ctx, 1040, 220, 560, '255,226,170', 0.3);
}

/** The view above the river. */
export function paintAlbi(ctx: CanvasRenderingContext2D, scale: number): void {
  sky(ctx);
  distance(ctx);
  town(ctx);
  bricked(ctx, scale, (c) => {
    nave(c);
    tower(c);
  }, 5);
  terrace(ctx);
  haze(ctx);
  bricked(ctx, scale, bridge, 21);
  const bank = ctx.createLinearGradient(0, WATERLINE - 14, 0, WATERLINE + 3);
  bank.addColorStop(0, 'rgba(30,40,34,0)');
  bank.addColorStop(1, 'rgba(30,40,34,0.42)');
  ctx.fillStyle = bank;
  ctx.fillRect(-20, WATERLINE - 14, W + 40, 18);
}

/** The view above the water as its own canvas (the reflection is made from it). */
export function albiCanvas(scale: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W * scale, Math.ceil((WATERLINE + 4) * scale));
  ctx.scale(scale, scale);
  paintAlbi(ctx, scale);
  return canvas;
}
