import { createRng } from '../logic/rng';
import { ART_RES, EMBER, EMBER_LIGHT, GOLD, GOLD_DARK, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Volcano Shrine's guard: a stout, cute fire salamander, glossy black
 * with orange-yellow blotches and a warm glow along its back. Lava is a
 * bath to it. Same frame as the boar: faces right, centred on its
 * collision circle, feet at y = 22. The Old Salamander, the chapter's boss,
 * is the same beast painted bigger (`size`), greyed at the snout, with
 * long drooping whiskers and bushy brows.
 */
export const SALAMANDER_FRAME = { w: 76, h: 72, ox: 38, oy: 38 } as const;
export type SalamanderMood = 'grump' | 'scared';

const SKIN = '#2a2430';
const SKIN_LIGHT = '#5d5468';
const SKIN_DARK = '#141018';
const SPOT = '#f2a52a';
const SPOT_LIGHT = '#ffd65e';
const BELLY = '#3d3440';
const WHISKER = '#f1ece0';

export function paintSalamander(mood: SalamanderMood, boil: number, size = 1, old = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.round(SALAMANDER_FRAME.w * ART_RES * size), Math.round(SALAMANDER_FRAME.h * ART_RES * size));
  ctx.scale(ART_RES * size, ART_RES * size);
  ctx.translate(SALAMANDER_FRAME.ox, SALAMANDER_FRAME.oy);
  const pen = new Pen(ctx, 1300 + boil * 19 + (old ? 7 : 0), 0.5);
  const scared = mood === 'scared';
  paintGlow(ctx, scared);
  paintShadow(ctx);
  // A waddle: the legs swap each boil frame, the tail sways the other way.
  const step = boil === 1 ? 2 : boil === 2 ? -2 : 0;
  const farLeg = mix(SKIN, '#000000', 0.35);
  paintLeg(pen, -13 - step, farLeg, -1);
  paintLeg(pen, 9 + step, farLeg, 1);
  paintTail(pen, ctx, boil);
  const body = paintBody(pen, ctx, boil);
  paintLeg(pen, -9 + step, SKIN, -1);
  paintLeg(pen, 13 - step, SKIN, 1);
  paintHead(pen, ctx, body, scared, old);
  return canvas;
}

/** The warm glow along its back: an ember inside, shining out through the skin. */
function paintGlow(ctx: CanvasRenderingContext2D, scared: boolean): void {
  const g = ctx.createRadialGradient(0, -2, 2, 0, 0, 34);
  g.addColorStop(0, rgba(EMBER_LIGHT, scared ? 0.18 : 0.42));
  g.addColorStop(0.5, rgba(EMBER, scared ? 0.08 : 0.18));
  g.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-38, -36, 76, 64);
}

function paintShadow(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(0, 22, 0, 0, 22, 28);
  g.addColorStop(0, 'rgba(30,20,20,0.34)');
  g.addColorStop(1, 'rgba(30,20,20,0)');
  ctx.save();
  ctx.translate(0, 22);
  ctx.scale(1, 0.2);
  ctx.fillStyle = g;
  ctx.fillRect(-30, -30, 60, 60);
  ctx.restore();
}

/** A short, splayed leg with four little round toes. */
function paintLeg(pen: Pen, x: number, color: string, side: number): void {
  const leg = [{ x: x - 3.6, y: 10 }, { x: x + 3.6, y: 10 }, { x: x + 3.4 + side * 1.5, y: 20 }, { x: x - 3 + side * 1.5, y: 20 }];
  pen.fill(leg, color, 1);
  pen.stroke([leg[1]!, leg[2]!], 0.8, INK, 0.7, false);
  for (let k = 0; k < 4; k++) pen.dot(x - 3.8 + side * 1.5 + k * 2.6, 21, 1.35, color, 1);
  pen.dot(x + side * 0.5, 12.5, 1.6, SPOT, 0.9);
}

/** A thick tail, tapering to a curl behind, spotted like the back. */
function paintTail(pen: Pen, ctx: CanvasRenderingContext2D, boil: number): void {
  const sway = (boil - 1) * 1.6;
  const spine: Pt[] = [];
  for (let t = 0; t <= 1.0001; t += 0.1) spine.push({ x: -16 - t * 20, y: 8 + t * 9 + Math.sin(t * 3) * (2 + sway) - t * t * 8 });
  const left: Pt[] = [];
  const right: Pt[] = [];
  spine.forEach((p, i) => {
    const q = spine[Math.min(spine.length - 1, i + 1)]!;
    const o = spine[Math.max(0, i - 1)]!;
    const d = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    const nx = -(q.y - o.y) / d;
    const ny = (q.x - o.x) / d;
    const w = 7 * (1 - (i / (spine.length - 1)) * 0.85);
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  });
  const tail = [...left, ...right.reverse()];
  const g = ctx.createLinearGradient(0, 0, 0, 22);
  g.addColorStop(0, SKIN_LIGHT);
  g.addColorStop(0.4, SKIN);
  g.addColorStop(1, SKIN_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  tail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (const t of [0.25, 0.55, 0.8]) {
    const p = spine[Math.round(t * (spine.length - 1))]!;
    pen.fill(ellipse(p.x, p.y - 2, 3.4 * (1.1 - t * 0.6), 2.2, 10), SPOT, 0.95);
  }
  pen.stroke([...tail, tail[0]!], 1.1, INK, 0.9, false);
}

/** The stout body: glossy black, lit from the top left, with the blotches of a fire salamander. */
function paintBody(pen: Pen, ctx: CanvasRenderingContext2D, boil: number): Pt[] {
  const body = ellipse(-2, 7, 21, 12.5, 40);
  const g = ctx.createRadialGradient(-8, -1, 1, -2, 7, 24);
  g.addColorStop(0, SKIN_LIGHT);
  g.addColorStop(0.5, SKIN);
  g.addColorStop(1, SKIN_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  const rng = createRng(31);
  pen.clipped(body, () => {
    // A slightly paler belly, then the spots: big, irregular, in two rows along the back.
    const belly = ctx.createRadialGradient(2, 19, 0, 2, 19, 15);
    belly.addColorStop(0, rgba(BELLY, 0.9));
    belly.addColorStop(1, rgba(BELLY, 0));
    ctx.fillStyle = belly;
    ctx.fillRect(-20, 8, 40, 14);
    const spots: [number, number, number][] = [[-15, 0, 4.4], [-6, -3.5, 5], [4, -3, 4.2], [-11, 7, 3.2], [0, 4, 3.6], [11, 3, 3]];
    for (const [sx, sy, r] of spots) {
      const blob: Pt[] = ellipse(sx, sy, r, r * 0.72, 12).map((p) => ({ x: p.x + (rng() - 0.5) * 1.2, y: p.y + (rng() - 0.5) * 1.2 }));
      const sg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.4, 0, sx, sy, r * 1.2);
      sg.addColorStop(0, SPOT_LIGHT);
      sg.addColorStop(1, SPOT);
      ctx.fillStyle = sg;
      ctx.beginPath();
      blob.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      pen.stroke([...blob, blob[0]!], 0.5, mix(SPOT, INK, 0.5), 0.6, false);
    }
    // The glossy highlight along the back, wavering with the line boil.
    pen.hair([{ x: -17, y: -1 + boil * 0.2 }, { x: -8, y: -4.8 }, { x: 4, y: -4.6 }], 1.3, '#ffffff', 0.45);
  });
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95);
  return body;
}

function paintHead(pen: Pen, ctx: CanvasRenderingContext2D, body: readonly Pt[], scared: boolean, old: boolean): void {
  // A big, round, frog-like head with the eyes bulging on top.
  const head = ellipse(17, 3, 12, 10, 26);
  const g = ctx.createRadialGradient(13, -2, 1, 17, 3, 14);
  g.addColorStop(0, SKIN_LIGHT);
  g.addColorStop(0.6, SKIN);
  g.addColorStop(1, SKIN_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  head.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // The glands behind the eye, orange like the spots.
  pen.fill(ellipse(10, -2.5, 4.2, 2.6, 12).map((p) => ({ x: p.x, y: p.y })), SPOT, 0.95);
  if (old) {
    // Grey round the snout with age.
    pen.clipped(head, () => {
      const grey = ctx.createRadialGradient(27, 6, 0, 27, 6, 9);
      grey.addColorStop(0, rgba('#bdb6ad', 0.7));
      grey.addColorStop(1, rgba('#bdb6ad', 0));
      ctx.fillStyle = grey;
      ctx.fillRect(16, -4, 16, 18);
    });
  }
  pen.stroke(head.filter((p) => !inside(body, p.x - 1.5, p.y)), 1.2, INK, 0.92, false);
  // Bulging eyes on top, the near one bigger: big glossy black eyes in a pale rim, so they read on the dark skin.
  for (const [ex, ey, r] of [[15, -5, 3.6], [21.5, -5.5, 4]] as const) {
    const bump = ellipse(ex, ey + 0.6, r + 1.5, r + 1.1, 14);
    pen.fill(bump, SKIN_LIGHT, 1);
    pen.stroke([...bump, bump[0]!], 0.7, INK, 0.8, false);
    const eye = ellipse(ex, ey, r, scared ? r * 1.15 : r, 14);
    pen.fill(eye, '#f3e9d2', 1);
    pen.fill(ellipse(ex + (scared ? 0 : 0.5), ey + (scared ? 0 : 0.3), r * (scared ? 0.45 : 0.78), r * (scared ? 0.5 : 0.78), 12), '#120c10', 1);
    pen.stroke([...eye, eye[0]!], 0.8, INK, 0.9, false);
    pen.dot(ex - r * 0.25 + 0.5, ey - r * 0.35, 1.05, '#ffffff', 0.95);
    pen.dot(ex + r * 0.35, ey + r * 0.3, 0.5, '#ffffff', 0.8);
    // A heavy half-lid: grumpy.
    if (!scared) {
      const lid = [{ x: ex - r - 0.8, y: ey - 0.4 }, { x: ex - r * 0.4, y: ey - r - 1.2 }, { x: ex + r * 0.6, y: ey - r - 1.2 }, { x: ex + r + 0.8, y: ey - r * 0.25 }];
      pen.fill(lid, SKIN_LIGHT, 1);
      pen.hair([lid[0]!, lid[3]!], 0.9, INK, 0.95);
    }
  }
  const brow = old ? WHISKER : SKIN_DARK;
  if (scared) {
    pen.stroke([{ x: 11.5, y: -10.5 }, { x: 17, y: -12 }], old ? 2.2 : 1.4, brow, 1, false);
    pen.stroke([{ x: 19, y: -12.5 }, { x: 25, y: -11 }], old ? 2.2 : 1.4, brow, 1, false);
  } else {
    pen.stroke([{ x: 11, y: -10 }, { x: 17.5, y: -6.6 }], old ? 2.6 : 1.8, brow, 1, false);
    pen.stroke([{ x: 18.5, y: -7 }, { x: 26, y: -10 }], old ? 2.6 : 1.8, brow, 1, false);
  }
  // Nostrils, and the wide salamander mouth: a grumpy line, or a wobble.
  pen.dot(27.5, 0, 0.7, '#0c0a0e');
  pen.dot(28.6, 1.2, 0.6, '#0c0a0e');
  if (scared) {
    pen.hair([{ x: 14, y: 8.5 }, { x: 17, y: 7 }, { x: 20, y: 8.5 }, { x: 23, y: 7 }, { x: 26.5, y: 8 }], 1, INK, 0.95);
    pen.dot(8, -9, 1.3, '#9cc6ea', 0.9);
    pen.dot(6.5, -5, 1, '#9cc6ea', 0.9);
  } else {
    pen.hair([{ x: 13, y: 9 }, { x: 18, y: 7.6 }, { x: 23, y: 7.8 }, { x: 27, y: 6 }], 1.2, INK, 0.95);
    // A pink cheek, for cute.
    pen.dot(21, 4.5, 2.2, rgba('#e0705a', 0.45));
  }
  if (old) {
    // Long drooping whiskers, like an old river dragon's, and a tiny gold ring on the brow.
    for (const [dy, len] of [[0, 1], [2.5, 0.8]] as const) {
      pen.stroke([{ x: 27, y: 4 + dy }, { x: 31, y: 8 + dy }, { x: 32, y: 15 + dy * 2 }, { x: 29.5, y: 20 + dy * 2 * len }], 0.9, WHISKER, 0.95, false);
      pen.stroke([{ x: 24, y: 6 + dy }, { x: 25, y: 12 + dy }, { x: 23, y: 17 + dy * len }], 0.8, WHISKER, 0.9, false);
    }
    const band = [{ x: 15.5, y: -9.5 }, { x: 16.5, y: -14.5 }, { x: 18.2, y: -11.5 }, { x: 20, y: -15.5 }, { x: 21, y: -10 }];
    pen.fill(band, GOLD, 1);
    pen.stroke([...band, band[0]!], 0.7, GOLD_DARK, 1, false);
    pen.dot(18.3, -11, 0.9, '#d8402a', 1);
  }
}

/** Point-in-polygon, to outline only the head's edge that stands clear of the body. */
function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
