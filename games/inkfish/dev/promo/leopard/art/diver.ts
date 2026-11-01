import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import { blit, type Box, type Brush, type Bucket, bucketFor, dab, frames, lazily, px, screenScale, shade, smoothLoop, softLine } from '../../seal/art/paint';

/**
 * The photographer: a diver in a dark drysuit and hood, mask on, an orange
 * stripe on the suit, a tank on his back and a big camera housing held out in
 * front with a glass dome port, two strobes on arms. He faces left; his face
 * is never shown (the housing and the hood cover it). Own units: the head at
 * 0,0, the dome's front at x = -80, the fin tips at about x = 260.
 */

const NAVY = '#1d2a38';
const NAVY_LIT = '#4d6378';
const ORANGE = '#e0782e';

/** A tapered limb as a polygon. */
function limbShape(pts: readonly Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  });
  return [...left, ...right.reverse()];
}

/** A painted part: base colour, a light-to-dark wash across it, an inked edge. */
function part(k: Brush, shape: readonly Pt[], base: string, lit: string, y0: number, y1: number, ink = 1.7): void {
  const { pen, ctx } = k;
  pen.fill(shape, base, 1);
  shade(ctx, shape, y0, y1, [[0, lit], [0.4, 'rgba(60,80,100,0.15)'], [1, 'rgba(4,8,14,0.6)']]);
  pen.stroke([...shape, shape[0]!], px(k, ink), INK, 1, true);
}

const TORSO: readonly Pt[] = smoothLoop([{ x: 26, y: -22 }, { x: 60, y: -28 }, { x: 110, y: -26 }, { x: 150, y: -20 }, { x: 156, y: 0 }, { x: 150, y: 22 }, { x: 110, y: 30 }, { x: 60, y: 32 }, { x: 28, y: 22 }], 4);
const TANK: readonly Pt[] = smoothLoop([{ x: 52, y: -50 }, { x: 140, y: -50 }, { x: 148, y: -44 }, { x: 148, y: -34 }, { x: 140, y: -28 }, { x: 52, y: -28 }, { x: 46, y: -34 }, { x: 46, y: -44 }], 3);
const HOOD: readonly Pt[] = smoothLoop([{ x: 8, y: -22 }, { x: 22, y: -34 }, { x: 40, y: -34 }, { x: 53, y: -22 }, { x: 54, y: -4 }, { x: 44, y: 12 }, { x: 26, y: 14 }, { x: 10, y: 6 }, { x: 5, y: -8 }], 4);
const HOUSING: readonly Pt[] = smoothLoop([{ x: -58, y: -2 }, { x: -12, y: -4 }, { x: -4, y: 4 }, { x: -4, y: 28 }, { x: -12, y: 36 }, { x: -58, y: 34 }, { x: -64, y: 26 }, { x: -64, y: 6 }], 3);
const DOME: readonly Pt[] = spline([{ x: -62, y: -1 }, { x: -76, y: 2 }, { x: -88, y: 12 }, { x: -92, y: 17 }, { x: -88, y: 25 }, { x: -76, y: 33 }, { x: -62, y: 35 }], 4);
const MASK: readonly Pt[] = smoothLoop([{ x: -12, y: -22 }, { x: 4, y: -30 }, { x: 28, y: -28 }, { x: 34, y: -12 }, { x: 24, y: -1 }, { x: 14, y: 1 }, { x: 4, y: -4 }, { x: -6, y: -3 }, { x: -14, y: -12 }], 3);
const GLASS: readonly Pt[] = smoothLoop([{ x: -8, y: -20 }, { x: 4, y: -26 }, { x: 25, y: -25 }, { x: 30, y: -12 }, { x: 22, y: -4 }, { x: 12, y: -3 }, { x: 3, y: -7 }, { x: -3, y: -8 }, { x: -9, y: -13 }], 3);
const BODY_BOX: Box = { x0: -98, x1: 162, y0: -92, y1: 78 };

function glove(k: Brush, at: Pt, rot: number): void {
  const shape = smoothLoop([{ x: -9, y: -6 }, { x: 4, y: -9 }, { x: 11, y: -4 }, { x: 10, y: 5 }, { x: 0, y: 9 }, { x: -9, y: 5 }], 3).map((p) => ({
    x: at.x + p.x * Math.cos(rot) - p.y * Math.sin(rot), y: at.y + p.x * Math.sin(rot) + p.y * Math.cos(rot),
  }));
  part(k, shape, '#141c26', 'rgba(130,160,190,0.5)', at.y - 9, at.y + 9, 1.5);
}

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  part(k, TANK, '#8c99a4', 'rgba(255,255,255,0.7)', -50, -28);
  pen.hair(spline([{ x: 8, y: 4 }, { x: 20, y: 24 }, { x: 70, y: 10 }, { x: 80, y: -26 }], 5), px(k, 2.2), '#10161c', 0.95);
  part(k, TORSO, NAVY, NAVY_LIT, -28, 32);
  pen.clipped(TORSO, () => {
    softLine(ctx, [{ x: 40, y: -18 }, { x: 100, y: -22 }, { x: 150, y: -14 }], 8, '#9fb7cc', 0.2);
    softLine(ctx, [{ x: 36, y: 22 }, { x: 100, y: 28 }, { x: 150, y: 18 }], 9, '#050a10', 0.3);
    pen.stroke(spline([{ x: 62, y: -26 }, { x: 70, y: 0 }, { x: 62, y: 30 }], 5), px(k, 4.6), ORANGE, 0.95, false);
    pen.hair(spline([{ x: 100, y: -24 }, { x: 108, y: 0 }, { x: 100, y: 26 }], 5), px(k, 1.4), '#0c1218', 0.6);
  });
  // The far arm over the top of the housing, then the head, then the near arm under it.
  const far = limbShape(spline([{ x: 66, y: -8 }, { x: 40, y: 2 }, { x: -2, y: 10 }], 5), 19, 14);
  part(k, far, '#16212d', NAVY_LIT, -14, 12, 1.6);
  glove(k, { x: -6, y: 10 }, 0.1);
  part(k, HOOD, '#3a4755', '#8aa6c0', -34, 14);
  pen.clipped(HOOD, () => {
    softLine(ctx, [{ x: 20, y: -30 }, { x: 40, y: -28 }, { x: 50, y: -14 }], 5, '#9fb7cc', 0.3);
    softLine(ctx, [{ x: 30, y: 8 }, { x: 46, y: 0 }], 6, '#03070b', 0.3);
    // Neoprene seams: over the crown, round the face opening, down the cheek.
    pen.hair(spline([{ x: 14, y: -28 }, { x: 34, y: -33 }, { x: 50, y: -20 }, { x: 53, y: -4 }], 5), px(k, 1.2), '#aab9c8', 0.5);
    pen.hair(spline([{ x: 36, y: -32 }, { x: 40, y: -14 }, { x: 36, y: 8 }], 4), px(k, 1.1), '#0d131a', 0.7);
    pen.hair(spline([{ x: 30, y: 12 }, { x: 44, y: 6 }, { x: 52, y: -4 }], 4), px(k, 1, ), '#aab9c8', 0.4);
  });
  // The mask: a black frame round a pane of glass with a bright reflection, a strap back round the hood.
  pen.hair(spline([{ x: 26, y: -14 }, { x: 40, y: -12 }, { x: 52, y: -10 }], 4), px(k, 2.4), '#05080b', 0.95);
  pen.fill(MASK, '#0b0f14', 1);
  pen.fill(GLASS, '#d8a483', 1);
  pen.clipped(GLASS, () => {
    // A glimpse of the face behind the glass: brow, two wide eyes looking ahead, the nose.
    dab(ctx, 10, -22, 10, '90,50,34', 0.35);
    for (const [ex, ey] of [[-1, -13], [15, -14]] as const) {
      pen.fill(smoothLoop([{ x: ex - 5, y: ey }, { x: ex, y: ey - 4.2 }, { x: ex + 5, y: ey }, { x: ex, y: ey + 4 }], 4), '#f6f1e8', 1);
      pen.dot(ex - 1.8, ey, px(k, 2.6), '#17110d', 1);
      pen.dot(ex - 2.4, ey - 1, px(k, 0.9), '#ffffff', 0.95);
      pen.hair(spline([{ x: ex - 7, y: ey - 6 }, { x: ex, y: ey - 7.5 }, { x: ex + 6, y: ey - 5.5 }], 3), px(k, 1.5), '#2a1810', 0.9);
    }
    pen.hair(spline([{ x: 7, y: -12 }, { x: 6, y: -7 }, { x: 9, y: -5 }], 3), px(k, 1.1), '#9a6448', 0.8);
    // Glass over it: a cool tint and a bright reflection.
    const g = ctx.createLinearGradient(0, -28, 0, -2);
    g.addColorStop(0, 'rgba(200,236,255,0.45)');
    g.addColorStop(1, 'rgba(60,120,170,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(-12, -30, 46, 30);
    softLine(ctx, [{ x: -4, y: -22 }, { x: 8, y: -25 }], 3, '#ffffff', 0.85);
  });
  // The nose pocket: a black bump of the mask under the glass.
  pen.fill(smoothLoop([{ x: 2, y: -3 }, { x: 8, y: -8 }, { x: 14, y: -3 }, { x: 11, y: 4 }, { x: 5, y: 4 }], 3), '#0b0f14', 1);
  pen.stroke([...smoothLoop([{ x: 2, y: -3 }, { x: 8, y: -8 }, { x: 14, y: -3 }, { x: 11, y: 4 }, { x: 5, y: 4 }], 3)], px(k, 1.2), INK, 1, true);
  pen.stroke(MASK, px(k, 1.8), INK, 1, true);
  // The regulator: a black mouthpiece at the mouth and a ribbed hose looping back over the shoulder to the tank.
  pen.stroke(spline([{ x: 14, y: 5 }, { x: 26, y: 20 }, { x: 56, y: 12 }, { x: 72, y: -14 }, { x: 80, y: -28 }], 6), px(k, 4.4), INK, 1, false);
  pen.stroke(spline([{ x: 14, y: 5 }, { x: 26, y: 20 }, { x: 56, y: 12 }, { x: 72, y: -14 }, { x: 80, y: -28 }], 6), px(k, 2.4), '#2a323b', 1, false);
  pen.hair(spline([{ x: 26, y: 18 }, { x: 56, y: 10 }, { x: 71, y: -13 }], 5), px(k, 0.9), '#8a98a6', 0.6);
  pen.fill(smoothLoop([{ x: 3, y: 1 }, { x: 14, y: 0 }, { x: 18, y: 5 }, { x: 14, y: 10 }, { x: 4, y: 9 }], 3), '#0d1115', 1);
  pen.stroke(smoothLoop([{ x: 3, y: 1 }, { x: 14, y: 0 }, { x: 18, y: 5 }, { x: 14, y: 10 }, { x: 4, y: 9 }], 3), px(k, 1.3), INK, 1, true);
  pen.hair([{ x: 6, y: 3 }, { x: 13, y: 2.5 }], px(k, 1), '#9aa8b4', 0.7);
  for (const [bx, by, br] of [[-6, -46, 5], [2, -60, 7], [-8, -74, 9], [10, -84, 4]] as const) {
    pen.circle(bx, by, px(k, br), px(k, 1.4), '#dff3ff');
    pen.dot(bx - br * 0.3, by - br * 0.3, px(k, br * 0.25), '#ffffff', 0.9);
  }
  // The near arm to the bottom grip, a glove on the handle.
  const near = limbShape(spline([{ x: 62, y: 12 }, { x: 28, y: 50 }, { x: -16, y: 49 }], 5), 21, 15);
  part(k, near, NAVY, NAVY_LIT, 8, 60, 1.6);
  pen.stroke(spline([{ x: 24, y: 42 }, { x: 26, y: 56 }], 3), px(k, 4), ORANGE, 1, false);
  // The camera housing: grey-black body, a dome port of glass, grips, buttons.
  ctx.save();
  ctx.translate(18, 8);
  part(k, HOUSING, '#2c333b', 'rgba(150,170,190,0.55)', -4, 36, 2);
  pen.clipped(HOUSING, () => {
    softLine(ctx, [{ x: -54, y: 3 }, { x: -10, y: 1 }], 5, '#c9d6e0', 0.28);
    pen.stroke(spline([{ x: -34, y: -4 }, { x: -34, y: 36 }], 3), px(k, 1.2), '#0a0d11', 0.6, false);
  });
  pen.dot(-12, 3, px(k, 3), '#c0392b', 1);
  pen.dot(-22, 3, px(k, 2.4), '#8fa0ad', 1);
  pen.fill(DOME, 'rgba(160,205,230,0.5)', 1);
  pen.clipped([...DOME, { x: -62, y: -1 }], () => {
    const g = ctx.createRadialGradient(-76, 10, 1, -72, 18, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.35, 'rgba(150,200,230,0.35)');
    g.addColorStop(1, 'rgba(20,50,80,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(-94, -4, 34, 44);
    ctx.fillStyle = '#0a0c10';
    ctx.beginPath();
    ctx.arc(-72, 18, 13, 0, Math.PI * 2);
    ctx.fill();
    dab(ctx, -72, 18, 12, '90,130,170', 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-77, 12, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  pen.stroke(DOME, px(k, 1.9), INK, 1, true);
  ctx.restore();
  glove(k, { x: -16, y: 49 }, 0);
}

const LEG_BOX: Box = { x0: -6, x1: 122, y0: -44, y1: 44 };
const FIN_L: readonly Pt[] = smoothLoop([{ x: 66, y: -4 }, { x: 90, y: -14 }, { x: 118, y: -34 }, { x: 122, y: -22 }, { x: 118, y: -8 }, { x: 114, y: 6 }, { x: 88, y: 8 }, { x: 66, y: 5 }], 3);
const FIN_R: readonly Pt[] = smoothLoop([{ x: 66, y: -3 }, { x: 90, y: -6 }, { x: 116, y: 6 }, { x: 122, y: 24 }, { x: 116, y: 36 }, { x: 108, y: 30 }, { x: 88, y: 14 }, { x: 66, y: 5 }], 3);

function paintLegs(k: Brush): void {
  const { pen, ctx } = k;
  for (const [fin, leg] of [[FIN_R, [{ x: 0, y: 6 }, { x: 36, y: 14 }, { x: 70, y: 4 }]], [FIN_L, [{ x: 0, y: -6 }, { x: 36, y: -10 }, { x: 70, y: 0 }]]] as const) {
    part(k, limbShape(spline(leg, 5), 30, 17), NAVY, NAVY_LIT, -20, 26, 1.7);
    pen.fill(fin, '#12171d', 1);
    shade(ctx, fin, -30, 36, [[0, 'rgba(120,140,160,0.4)'], [1, 'rgba(0,0,0,0.4)']]);
    pen.clipped(fin, () => pen.stroke(spline([{ x: 74, y: 0 }, { x: 100, y: 2 }, { x: 120, y: 6 }], 4), px(k, 3.6), '#f1c232', 0.9, false));
    pen.stroke([...fin, fin[0]!], px(k, 1.7), INK, 1, true);
  }
  pen.stroke(spline([{ x: 6, y: 8 }, { x: 8, y: -6 }], 2), px(k, 3.6), ORANGE, 1, false);
}

const SEED = 6151;
const HIP: Pt = { x: 152, y: 2 };
const spritesFor = lazily((b: Bucket) => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  legs: frames(LEG_BOX, b, SEED + 17, paintLegs),
}));

export interface DiverPose {
  /** The leg kick, radians (0 trailing straight back). */
  readonly kick?: number;
}

/** Local points on the diver, for pinning him to a mouth or a penguin. */
export const DIVER_HEAD: Pt = { x: 0, y: 0 };
export const DIVER_DOME: Pt = { x: -70, y: 2 };

/** The diver at (x, y) = his head, `scale` px per own unit, `rot` radians; `face` -1 mirrors him to face right. */
export function drawDiver(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rot: number, face: 1 | -1, pose: DiverPose, boil: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(face * scale, scale);
  const s = spritesFor(bucketFor(screenScale(ctx)));
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  ctx.save();
  ctx.translate(HIP.x, HIP.y);
  ctx.rotate(pose.kick ?? 0);
  blit(ctx, s.legs[f]!, LEG_BOX, s.res);
  ctx.restore();
  blit(ctx, s.body[f]!, BODY_BOX, s.res);
  ctx.restore();
}

export function prepareDiver(): void {
  spritesFor(bucketFor(2.4));
}
