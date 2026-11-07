import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { blob, flecks, inside, MOON_RIM, NIGHT_INK, seeded, soft, spline, trace } from './art/paint';
import { VIDEO } from '../short';
import { branchBottom, branchTop, branchW, branchY, TRUNK } from './story';

/**
 * The night: a deep blue sky and a big quiet moon, low over the island; the
 * old tree and its low branch, in bark washes with moonlight along the top;
 * and the low shot of the ground. All baked once.
 */
export const MOON = { x: 262, y: 700, r: 196 } as const;

/** World box of the baked tree. */
const TREE = { x: -420, y: 300, w: 2000, h: 2500, res: 1.25 } as const;

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  blob(ctx, x, y, r * 4.4, '#5d7cc8', 0.5);
  blob(ctx, x, y, r * 2.2, '#b7c9f2', 0.42);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#fffdf0');
  g.addColorStop(0.7, '#f2edd8');
  g.addColorStop(1, '#d6d8e6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const rnd = seeded(12);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * r * 0.92;
    blob(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.1 + rnd() * 0.24), '#b9bdd2', 0.34);
  }
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * r * 0.96;
    const cr = r * (0.012 + rnd() * rnd() * 0.05);
    const [cx, cy] = [x + Math.cos(a) * d, y + Math.sin(a) * d];
    ctx.strokeStyle = '#a6abc6';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function makeSky(): HTMLCanvasElement {
  const { width: W, height: H } = VIDEO;
  const { canvas, ctx } = makeCanvas(W + 200, H + 200);
  ctx.translate(100, 100);
  const g = ctx.createLinearGradient(0, -100, 0, H + 100);
  g.addColorStop(0, '#080c28');
  g.addColorStop(0.36, '#16245a');
  g.addColorStop(0.62, '#1c2f6a');
  g.addColorStop(0.72, '#101a44');
  g.addColorStop(1, '#04050e');
  ctx.fillStyle = g;
  ctx.fillRect(-100, -100, W + 200, H + 200);
  moon(ctx, MOON.x, MOON.y, MOON.r);
  const rnd = seeded(5);
  for (let i = 0; i < 240; i++) {
    const x = -100 + rnd() * (W + 200);
    const y = -100 + rnd() * 1200;
    if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r * 1.5) continue;
    ctx.globalAlpha = 0.25 + rnd() * 0.7;
    ctx.fillStyle = rnd() > 0.7 ? '#fff4d6' : '#dfe8ff';
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + rnd() * rnd() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Long thin clouds, lit from behind.
  for (const [x, y, w, h, a] of [[640, 1020, 620, 34, 0.26], [840, 640, 460, 22, 0.2], [180, 1010, 520, 26, 0.3], [560, 300, 420, 20, 0.12]] as const) {
    blob(ctx, x, y, w, '#8fa8e0', a, h);
    blob(ctx, x + w * 0.2, y + h * 0.6, w * 0.6, '#c6d3f4', a, h * 0.5);
  }
  // The sea, far below, with the moon's path on it.
  const sea = 1330;
  const s = ctx.createLinearGradient(0, sea, 0, sea + 240);
  s.addColorStop(0, '#16275c');
  s.addColorStop(1, '#070b20');
  ctx.fillStyle = s;
  ctx.fillRect(-100, sea, W + 200, 240);
  for (let i = 0; i < 90; i++) {
    const y = sea + 3 + rnd() * rnd() * 220;
    const w = 12 + rnd() * 70;
    ctx.globalAlpha = 0.5 * (1 - (y - sea) / 240);
    ctx.fillStyle = '#c9d8fb';
    ctx.fillRect(MOON.x + (rnd() - 0.5) * (130 + (y - sea) * 1.2) - w / 2, y, w, 2);
  }
  ctx.globalAlpha = 1;
  const fade = ctx.createLinearGradient(0, sea + 40, 0, H);
  fade.addColorStop(0, '#04050e00');
  fade.addColorStop(1, '#04050e');
  ctx.fillStyle = fade;
  ctx.fillRect(-100, sea + 40, W + 200, H);
  return canvas;
}

function barkShade(ctx: CanvasRenderingContext2D, pen: Pen, shape: readonly Pt[], lines: readonly (readonly Pt[])[], rim: readonly Pt[], rnd: () => number, box: { x0: number; y0: number; x1: number; y1: number }): void {
  inside(ctx, shape, () => {
    flecks(ctx, box, 5200, rnd, ['#6d6288', '#2a2240', '#171226', '#8a7fa6'], 1, 6.5, 0.4);
    pen.stipple(shape, 5000, () => 0.5, 1.5, '#0f0b1c');
    for (const line of lines) {
      soft(ctx, line, 16, '#0d0918', 0.6);
      pen.hair(line, 2.4, NIGHT_INK, 0.8);
    }
    soft(ctx, rim, 44, MOON_RIM, 0.3);
    soft(ctx, rim, 14, MOON_RIM, 0.5);
  });
  pen.stroke([...shape, shape[0]!], 4, NIGHT_INK, 0.95, false);
}

/** The old tree in world px: its trunk, the low branch out to the right, one limb away to the left. */
export function makeTree(): { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } {
  const { canvas, ctx } = makeCanvas(Math.ceil(TREE.w * TREE.res), Math.ceil(TREE.h * TREE.res));
  ctx.scale(TREE.res, TREE.res);
  ctx.translate(-TREE.x, -TREE.y);
  const pen = new Pen(ctx, 3100, 2);
  const rnd = seeded(31);

  // The trunk, leaning, and the limb that leaves the frame on the left.
  const left = spline([{ x: -6, y: 2780 }, { x: -8, y: 2000 }, { x: -16, y: 1500 }, { x: -48, y: 1200 }, { x: -70, y: 960 }, { x: -120, y: 760 }, { x: -230, y: 590 }, { x: -420, y: 420 }], 10);
  const right = spline([{ x: 250, y: 2780 }, { x: 246, y: 2000 }, { x: 236, y: 1560 }, { x: 190, y: 1260 }, { x: 110, y: 1040 }, { x: 70, y: 860 }, { x: -20, y: 660 }, { x: -130, y: 530 }, { x: -420, y: 320 }], 10);
  const trunk = [...left, ...[...right].reverse()];
  const tg = ctx.createLinearGradient(TRUNK.x - TRUNK.w / 2, 0, TRUNK.x + TRUNK.w / 2, 0);
  tg.addColorStop(0, '#6a6088');
  tg.addColorStop(0.3, '#433957');
  tg.addColorStop(0.75, '#231c30');
  tg.addColorStop(1, '#120e1c');
  ctx.fillStyle = tg;
  trace(ctx, trunk);
  ctx.fill();
  const fissures: Pt[][] = Array.from({ length: 16 }, (_, i) => {
    const x = TRUNK.x - TRUNK.w / 2 + 14 + i * 15 + rnd() * 10;
    const y0 = 1240 + rnd() * 900;
    return spline([{ x, y: y0 }, { x: x + rnd() * 20 - 10, y: y0 + 220 }, { x: x + rnd() * 24 - 12, y: y0 + 480 + rnd() * 240 }], 6);
  }).concat(Array.from({ length: 10 }, (_, i) => {
    const x = -50 + i * 11 + rnd() * 6;
    const y0 = 620 + rnd() * 420;
    return spline([{ x, y: y0 }, { x: x + rnd() * 14 - 7, y: y0 + 120 }, { x: x + 10 + rnd() * 14, y: y0 + 290 + rnd() * 120 }], 6);
  }));
  barkShade(ctx, pen, trunk, fissures, right.map((p) => ({ x: p.x - 12, y: p.y })).slice(30), rnd, { x0: -420, y0: 300, x1: 300, y1: 2780 });

  // The branch: broad at the trunk, thinning to the right, off the frame.
  const xs = Array.from({ length: 80 }, (_, i) => 40 + i * 18);
  const top = xs.map((x) => ({ x, y: branchTop(x) + 5 * Math.sin(x * 0.03) }));
  const bottom = xs.map((x) => ({ x, y: branchBottom(x) + 4 * Math.sin(x * 0.037 + 1) }));
  const branch = [...top, ...[...bottom].reverse()];
  const bg = ctx.createLinearGradient(600, branchTop(600) - 40, 640, branchBottom(600) + 60);
  bg.addColorStop(0, '#7a6f96');
  bg.addColorStop(0.28, '#4e4360');
  bg.addColorStop(0.7, '#2a2238');
  bg.addColorStop(1, '#100c18');
  ctx.fillStyle = bg;
  trace(ctx, branch);
  ctx.fill();
  const grain = Array.from({ length: 12 }, (_, i) => {
    const k = -0.4 + (i / 11) * 0.8;
    const from = 60 + rnd() * 700;
    const to = from + 360 + rnd() * 500;
    return Array.from({ length: 14 }, (_, j) => {
      const x = from + ((to - from) * j) / 13;
      return { x, y: branchY(x) + branchW(x) * k + 4 * Math.sin(x * 0.02 + i) };
    });
  });
  barkShade(ctx, pen, branch, grain, top.map((p) => ({ x: p.x, y: p.y + 8 })), rnd, { x0: 20, y0: 880, x1: 1500, y1: 1320 });
  // Under the branch, where it meets the trunk: a dark fork.
  soft(ctx, spline([{ x: 100, y: 1340 }, { x: 190, y: 1300 }, { x: 300, y: 1266 }], 8), 54, '#08060f', 0.8);
  return { canvas, x: TREE.x, y: TREE.y, w: TREE.w, h: TREE.h };
}

/** A broad dark leaf, moonlit along its midrib. */
function leaf(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, len: number, angle: number, lit: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const shape = spline([{ x: 0, y: 0 }, { x: len * 0.3, y: -len * 0.24 }, { x: len * 0.72, y: -len * 0.2 }, { x: len, y: 0 }, { x: len * 0.7, y: len * 0.22 }, { x: len * 0.28, y: len * 0.22 }], 6, true);
  const g = ctx.createLinearGradient(0, -len * 0.24, 0, len * 0.24);
  g.addColorStop(0, `rgba(84,112,126,${lit})`);
  g.addColorStop(0.5, '#132a33');
  g.addColorStop(1, '#070f14');
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  pen.hair([{ x: 0, y: 0 }, { x: len * 0.5, y: 1 }, { x: len, y: 0 }], 2.2, '#8eb0bf', 0.5 * lit);
  pen.stroke([...shape, shape[0]!], 2.2, NIGHT_INK, 0.8, false);
  ctx.restore();
}

/** Leaves on the branch's far end and the top corner, framing the bird. World px; baked with the tree's top layer. */
export function makeLeaves(): { canvas: HTMLCanvasElement; x: number; y: number } {
  const box = { x: 760, y: 260, w: 700, h: 760 };
  const { canvas, ctx } = makeCanvas(box.w, box.h);
  ctx.translate(-box.x, -box.y);
  const pen = new Pen(ctx, 3400, 1);
  const rnd = seeded(34);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 60 + rnd() * 210;
    leaf(ctx, pen, 1210 + Math.cos(a) * r * 0.8, 640 + Math.sin(a) * r * 0.8, 120 + rnd() * 90, a + Math.PI + rnd(), 0.5 + rnd() * 0.4);
  }
  return { canvas, x: box.x, y: box.y };
}

/** The low shot's moon, sinking more slowly than the ground rises so it stays clear of the words. */
export function drawLowMoon(ctx: CanvasRenderingContext2D, lift: number): void {
  const y = 610 + lift * 0.62;
  blob(ctx, 790, y, 520, '#3f5aa8', 0.46);
  blob(ctx, 790, y, 210, '#c7d6f6', 0.32);
  ctx.fillStyle = '#ebe9dd';
  ctx.beginPath();
  ctx.arc(790, y, 84, 0, Math.PI * 2);
  ctx.fill();
}

/** The low shot, screen px: dark trees far off, a small moon, the ground rising close to the lens. */
export function makeGroundShot(): { readonly sky: HTMLCanvasElement; readonly land: HTMLCanvasElement } {
  const { width: W, height: H } = VIDEO;
  const { canvas: sky, ctx: skyCtx } = makeCanvas(W, H);
  const { canvas, ctx } = makeCanvas(W, H);
  const g = skyCtx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04071a');
  g.addColorStop(0.42, '#0d1740');
  g.addColorStop(0.6, '#0b1236');
  g.addColorStop(1, '#02030a');
  skyCtx.fillStyle = g;
  skyCtx.fillRect(0, 0, W, H);
  const pen = new Pen(ctx, 3600, 2);
  const rnd = seeded(36);
  for (let i = 0; i < 90; i++) {
    skyCtx.globalAlpha = 0.2 + rnd() * 0.5;
    skyCtx.fillStyle = '#dfe8ff';
    skyCtx.beginPath();
    skyCtx.arc(rnd() * W, rnd() * 800, 0.8 + rnd() * 1.5, 0, Math.PI * 2);
    skyCtx.fill();
  }
  skyCtx.globalAlpha = 1;
  // The wood behind: a low, ragged wall of dark leaves.
  const wall: Pt[] = Array.from({ length: 74 }, (_, i) => ({ x: -20 + i * 15.4, y: 800 + 46 * Math.sin(i * 0.2) + 30 * Math.sin(i * 0.53 + 1) + 22 * Math.sin(i * 1.7) + rnd() * 34 }));
  const shape = [...spline(wall, 3), { x: W + 40, y: 1320 }, { x: -40, y: 1320 }];
  const wg = ctx.createLinearGradient(0, 780, 0, 1300);
  wg.addColorStop(0, '#0a1230');
  wg.addColorStop(1, '#03040c');
  ctx.fillStyle = wg;
  trace(ctx, shape);
  ctx.fill();
  soft(ctx, spline(wall, 3).map((p) => ({ x: p.x, y: p.y + 5 })), 7, '#7c95d4', 0.13);
  for (let i = 0; i < 60; i++) leaf(ctx, pen, -20 + rnd() * (W + 40), 820 + rnd() * 90 - 40, 44 + rnd() * 50, rnd() * Math.PI * 2, 0.07);
  // The ground, close to the lens, leaf litter along its ridge.
  const ridge: Pt[] = Array.from({ length: 26 }, (_, i) => ({ x: -20 + i * 46, y: 1220 + 16 * Math.sin(i * 0.8) + 10 * Math.sin(i * 2.1) }));
  const ground = [...spline(ridge, 5), { x: W + 40, y: H + 10 }, { x: -40, y: H + 10 }];
  const gg = ctx.createLinearGradient(0, 1200, 0, 1560);
  gg.addColorStop(0, '#28253e');
  gg.addColorStop(0.45, '#100e1c');
  gg.addColorStop(1, '#040308');
  ctx.fillStyle = gg;
  trace(ctx, ground);
  ctx.fill();
  inside(ctx, ground, () => {
    flecks(ctx, { x0: -20, y0: 1200, x1: W + 20, y1: 1560 }, 1200, rnd, ['#46425e', '#6c6786', '#0c0a14'], 1.5, 12, 0.5);
    soft(ctx, spline(ridge, 5).map((p) => ({ x: p.x, y: p.y + 8 })), 26, MOON_RIM, 0.3);
  });
  pen.stroke(spline(ridge, 5), 3.4, NIGHT_INK, 0.9, false);
  for (let i = 0; i < 18; i++) leaf(ctx, pen, rnd() * W, 1236 + rnd() * 90, 50 + rnd() * 50, -0.3 + rnd() * 0.6, 0.35);
  return { sky, land: canvas };
}
