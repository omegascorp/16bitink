import { ellipse, INK, makeCanvas, Pen } from '../../../src/art/pen';
import { drawSquidLimbAlong, EYE as SQUID_EYE } from '../../../src/art/squidArt';
import { LIMBS } from '../../../src/art/squidPose';
import { makeSquidSprite, type SquidSprite } from '../kraken/squidDraw';
import { WRAPS } from '../kraken/rig';
import { BELLY, BODY, EYE as WHALE_EYE, jawAt, type Pt, resample, spline, TEETH } from '../kraken/whale';

/**
 * What this short paints on top of the kraken short's whale and squid
 * (../kraken/): the squid's body washed with light from above and shade
 * below, realistic eyes for both animals (dark, wet, a catchlight, no
 * cartoon whites), arms laid along paths this short chooses, the sockets in
 * the toothless upper jaw, small round sucker scars, and a painted school bus.
 */

// ---------------------------------------------------------------- the squid

/** The kraken short's squid sprite, washed: pale light across its top, deep red shade along its underside. */
export function makeShadedSquid(): SquidSprite {
  const base = makeSquidSprite();
  const body = base.body.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, src.height * 0.3, 0, src.height * 0.7);
    g.addColorStop(0, 'rgba(255,232,222,0.22)');
    g.addColorStop(0.45, 'rgba(255,232,222,0)');
    g.addColorStop(0.62, 'rgba(70,14,18,0.12)');
    g.addColorStop(1, 'rgba(48,8,14,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, src.width, src.height);
    // The mantle's tip turns away into shadow.
    const tip = ctx.createLinearGradient(0, 0, src.width * 0.35, 0);
    tip.addColorStop(0, 'rgba(40,8,12,0.4)');
    tip.addColorStop(1, 'rgba(40,8,12,0)');
    ctx.fillStyle = tip;
    ctx.fillRect(0, 0, src.width, src.height);
    return canvas;
  });
  return { body };
}

export interface Writhe {
  /** Clock, seconds. */
  readonly t: number;
  /** 0 still .. 1 thrashing. */
  readonly amount: number;
  /** How far the limbs bend towards `down` along their length (0 .. 1). */
  readonly droop: number;
  /** Screen-down, as an angle in the squid's body frame. */
  readonly down: number;
  /** Arms' length factor. */
  readonly stretch: number;
  /** The tentacles' length, body px (default 1.7 times the game's). */
  readonly tentacle?: number;
  /** How wide the limbs fan (1 the game's spread). */
  readonly fan: number;
}

const turn = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Limb i (squidPose LIMBS) as a path in squid body px, from its root out. */
export function limbPath(i: number, w: Writhe): Pt[] {
  const limb = LIMBS[i]!;
  const tentacle = limb.kind === 'tentacle';
  const n = tentacle ? 26 : 16;
  const length = tentacle ? (w.tentacle ?? limb.length * 1.7) : limb.length * w.stretch;
  const step = length / (n - 1);
  const base = limb.spread * w.fan;
  const pts: Pt[] = [limb.root];
  let p = limb.root;
  for (let k = 1; k < n; k++) {
    const s = k / (n - 1);
    const wave = w.amount * (tentacle ? 0.32 : 0.5) * s * Math.sin(limb.phase + w.t * (tentacle ? 2.3 : 3.1) - 5.5 * s);
    const heading = base + turn(w.down - base) * w.droop * s + limb.curl * 0.3 * s * w.amount + wave;
    p = { x: p.x + Math.cos(heading) * step, y: p.y + Math.sin(heading) * step };
    pts.push(p);
  }
  return pts;
}

/** The squid's eye (body px), realistic: a dark wet ball, a silvery iris round a huge pupil, a catchlight. No white. */
export function drawSquidEye(ctx: CanvasRenderingContext2D, boil: number, glint = 0.6): void {
  const pen = new Pen(ctx, 611 + boil * 977, 0.2);
  const { x, y, r } = SQUID_EYE;
  pen.fill(ellipse(x, y, r * 1.55, r * 1.4, 28), '#4c1a17', 0.6);
  const ball = ellipse(x, y, r * 1.14, r * 1.08, 28);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r * 1.2);
    g.addColorStop(0, '#9a988e');
    g.addColorStop(0.45, '#57554f');
    g.addColorStop(1, '#151517');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      pen.hair([{ x: x + Math.cos(a) * r * 0.62, y: y + Math.sin(a) * r * 0.6 }, { x: x + Math.cos(a) * r * 1.02, y: y + Math.sin(a) * r * 0.98 }], 0.35, '#2a2926', 0.5);
    }
  });
  pen.dot(x + r * 0.05, y + r * 0.04, r * 0.6, '#060608');
  pen.stroke([...ball, ball[0]!], 1.1, INK, 1, false);
  // The wet catchlight, and a fainter second one.
  pen.dot(x - r * 0.28, y - r * 0.34, r * 0.17, '#fffaf0', 0.55 + 0.45 * glint);
  pen.dot(x + r * 0.3, y + r * 0.28, r * 0.07, '#e8eef2', 0.5);
  pen.stroke(spline([{ x: x - r * 1.3, y: y - r * 0.4 }, { x, y: y - r * 1.5 }, { x: x + r * 1.3, y: y - r * 0.3 }], 6), 1.3, INK, 1, false);
}

export const FAR_LIMBS: readonly number[] = LIMBS.map((l, i) => (l.far ? i : -1)).filter((i) => i >= 0);
export const NEAR_LIMBS: readonly number[] = LIMBS.map((l, i) => (l.far ? -1 : i)).filter((i) => i >= 0);

let layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** The unit vector pointing down the screen, in the current drawing space. */
function screenDown(ctx: CanvasRenderingContext2D): Pt {
  const inv = ctx.getTransform().inverse();
  const a = inv.transformPoint({ x: 0, y: 0 });
  const b = inv.transformPoint({ x: 0, y: 1 });
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

/**
 * Limbs `which` along `paths` (squid body px, in ctx's current space), painted
 * like the mantle: the game's drawing (suckers along the inner side), then,
 * on those pixels only, a deep maroon shade along each limb's underside and
 * a soft highlight along its top, the light coming from above the screen.
 */
export function drawShadedLimbs(ctx: CanvasRenderingContext2D, paths: readonly (readonly Pt[])[], which: readonly number[], boil: number): void {
  if (!layer) layer = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  const lc = layer.ctx;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  lc.setTransform(ctx.getTransform());
  for (const i of which) drawSquidLimbAlong(lc, paths[i]!, LIMBS[i]!.kind, 'heavy', 301 + i * 37 + boil * 977, LIMBS[i]!.far);
  const down = screenDown(lc);
  lc.globalCompositeOperation = 'source-atop';
  lc.lineCap = 'round';
  for (const i of which) {
    const path = paths[i]!;
    const n = path.length;
    for (let k = 1; k < n; k++) {
      const s = k / (n - 1);
      const a = path[k - 1]!;
      const b = path[k]!;
      const w = 9 - 6 * s;
      for (const [off, width, colour] of [[w * 0.45, w, 'rgba(66,10,22,0.5)'], [-w * 0.42, w * 0.35, 'rgba(255,236,226,0.32)']] as const) {
        lc.strokeStyle = colour;
        lc.lineWidth = width;
        lc.beginPath();
        lc.moveTo(a.x + down.x * off, a.y + down.y * off);
        lc.lineTo(b.x + down.x * off, b.y + down.y * off);
        lc.stroke();
      }
    }
  }
  lc.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** A whole squid in its body px: far limbs, body, near limbs, eye. */
export function drawWholeSquid(ctx: CanvasRenderingContext2D, w: Writhe, boil: number, drawBody: () => void, glint = 0.6): void {
  const paths = LIMBS.map((_, i) => limbPath(i, w));
  drawShadedLimbs(ctx, paths, FAR_LIMBS, boil);
  drawBody();
  drawShadedLimbs(ctx, paths, NEAR_LIMBS, boil);
  drawSquidEye(ctx, boil, glint);
}

// ---------------------------------------------------------------- the whale

/**
 * The whale's eye (local px), over the sprite's: small and deep-set in
 * folds of skin, a dark wet ball with a catchlight. `lid` 0 shut .. 1 open.
 */
export function drawWhaleEye(ctx: CanvasRenderingContext2D, boil: number, lid = 1, glint = 0.5): void {
  const pen = new Pen(ctx, 7301 + boil * 977, 0.25);
  const { x, y, r } = WHALE_EYE;
  // Skin over the sprite's drawing of the eye.
  const skin = ellipse(x, y, r * 1.5, r * 1.15, 22);
  pen.clipped(skin, () => {
    const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.5);
    g.addColorStop(0, '#2b3038');
    g.addColorStop(1, 'rgba(52,58,67,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  });
  const h = r * 0.72 * Math.max(0.06, lid);
  const ball = ellipse(x, y + r * 0.72 - h, r * 1.08, h, 22);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.2, r * 0.05, x, y, r * 1.1);
    g.addColorStop(0, '#3a2a22');
    g.addColorStop(0.55, '#1a1210');
    g.addColorStop(1, '#050405');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  });
  if (lid > 0.3) {
    pen.dot(x + r * 0.34, y - r * 0.18, r * (0.16 + 0.08 * glint), '#f7f3ea', 0.7 + 0.3 * glint);
    pen.dot(x - r * 0.35, y + r * 0.3, r * 0.06, '#c9d4dc', 0.5);
    pen.hair(spline([{ x: x - r * 0.9, y: y + r * 0.45 }, { x, y: y + r * 0.72 }, { x: x + r * 0.9, y: y + r * 0.42 }], 5), 0.9, '#a9b6c0', 0.55);
  }
  pen.stroke([...ball, ball[0]!], 1.6, INK, 1, false);
  // Folds of skin round it.
  for (let k = 0; k < 3; k++) {
    const s = 1.5 + k * 0.5;
    pen.hair(spline([{ x: x - r * s, y: y + r * 0.1 }, { x: x - r * 0.1, y: y - r * s * 0.75 }, { x: x + r * s * 0.95, y: y - r * 0.05 }], 6), 1.2, INK, 0.6 - k * 0.15);
    pen.hair(spline([{ x: x - r * s * 0.9, y: y + r * 0.6 }, { x, y: y + r * s * 0.7 }, { x: x + r * s * 0.85, y: y + r * 0.45 }], 6), 1, INK, 0.45 - k * 0.1);
  }
}

/** The underside of the case at x (local px): the palate, when the mouth is open. */
export function palateAt(x: number): number {
  for (let i = 1; i < BELLY.length; i++) {
    const a = BELLY[i - 1]!;
    const b = BELLY[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return BELLY[BELLY.length - 1]!.y;
}

/** The mouth's depth: the inside darkening towards the throat over whatever's in it (local px, `open` radians). */
export function drawMouthDepth(ctx: CanvasRenderingContext2D, wedge: readonly Pt[]): void {
  ctx.save();
  ctx.beginPath();
  wedge.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(-660, 0, -120, 0);
  g.addColorStop(0, 'rgba(8,3,5,0.96)');
  g.addColorStop(0.5, 'rgba(8,3,5,0.55)');
  g.addColorStop(1, 'rgba(8,3,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-900, 0, 900, 700);
  ctx.restore();
}

export interface Scar {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Its place in the order they appear, 0 .. 1. */
  readonly order: number;
}

/**
 * Sucker scars on the side of the head (local px): small round rings about
 * an inch across (the head is ~930 px for ~5.5 m, so an inch is ~4 px), in
 * paired rows where the near arms gripped, plus older scattered ones.
 */
export const SCARS: readonly Scar[] = (() => {
  const out: Scar[] = [];
  const tracks = [5, 6, 7, 8].map((i) => spline([{ x: -95, y: 200 }, ...WRAPS[i]!], 8));
  tracks.forEach((track, k) => {
    const pts = resample(track, 34);
    pts.forEach((p, i) => {
      if (i < 3 || p.x > -60 || p.y < -235 || p.y > 175) return;
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      for (const side of [-1, 1]) {
        const off = side * 9;
        out.push({
          x: p.x - ((b.y - a.y) / d) * off + 1.5 * Math.sin(i * 2.3 + k),
          y: p.y + ((b.x - a.x) / d) * off + 1.5 * Math.cos(i * 1.9 + k),
          r: 2.6 + 0.9 * Math.abs(Math.sin(i * 1.3 + k * 0.7 + side)),
          order: (k + i / pts.length) / tracks.length,
        });
      }
    });
  });
  return out;
})();

/** The scars, `looks[i]` 0 none .. 1 settled (more while popping in, rimmed in `flash`). */
export function drawScars(ctx: CanvasRenderingContext2D, looks: readonly number[], boil: number, flash: string): void {
  const pen = new Pen(ctx, 9101 + boil * 977, 0.3);
  ctx.save();
  ctx.beginPath();
  BODY.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  SCARS.forEach((s, i) => {
    const a = looks[i]!;
    if (a <= 0) return;
    const r = s.r * Math.min(a, 1.3);
    const alpha = Math.min(1, a);
    const ring = ellipse(s.x, s.y, r, r * 0.88, 14);
    pen.stroke([...ring, ring[0]!], r * 0.5, '#d8d2c4', 0.62 * alpha, false);
    pen.fill(ellipse(s.x + 0.4, s.y + 0.4, r * 0.42, r * 0.36, 10), '#171a20', 0.45 * alpha);
    if (a > 1) pen.stroke([...ring, ring[0]!], r * 0.4, flash, Math.min(1, (a - 1) * 3.3), false);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the bus

const YELLOW_TOP = '#f6cf4e';
const YELLOW = '#e5ab1f';
const YELLOW_LOW = '#a8730f';

/** A painted school bus facing right (screen px): `x0` .. `x1` long, its roof at `top`, `h` tall to the road. */
export function drawBus(ctx: CanvasRenderingContext2D, x0: number, x1: number, top: number, h: number, boil: number): void {
  const pen = new Pen(ctx, 4401 + boil * 977, 1.1);
  const len = x1 - x0;
  const hoodX = x1 - len * 0.1;
  const floor = top + h * 0.82;
  const r = h * 0.08;
  const body: Pt[] = [
    { x: x0 + r, y: top }, { x: hoodX - len * 0.03, y: top }, { x: hoodX, y: top + r * 0.6 }, { x: hoodX + len * 0.012, y: top + h * 0.42 },
    { x: x1 - r * 0.6, y: top + h * 0.46 }, { x: x1, y: top + h * 0.52 }, { x: x1, y: floor - r * 0.5 }, { x: x1 - r * 0.5, y: floor },
    { x: x0 + r * 0.5, y: floor }, { x: x0, y: floor - r * 0.5 }, { x: x0, y: top + r }, { x: x0 + r * 0.3, y: top + r * 0.3 },
  ];
  // Shadow on the road.
  pen.fill(ellipse((x0 + x1) / 2, floor + h * 0.2, len * 0.52, h * 0.06, 30), '#000000', 0.4);
  pen.fill(body, YELLOW, 1);
  pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, top, 0, floor);
    g.addColorStop(0, YELLOW_TOP);
    g.addColorStop(0.35, YELLOW);
    g.addColorStop(1, YELLOW_LOW);
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 10, top - 10, len + 20, h + 20);
    // Black rub rails along the side.
    ctx.fillStyle = '#1b1a1f';
    for (const v of [0.56, 0.68]) ctx.fillRect(x0, top + h * v, x1 - x0, h * 0.022);
    ctx.fillStyle = 'rgba(255,248,220,0.18)';
    ctx.fillRect(x0, top + h * 0.04, len, h * 0.03);
    pen.hatch(body, 7, -0.9, 0.6, { alpha: 0.12 });
  });
  // The side windows, and the windshield over the hood.
  const winTop = top + h * 0.11;
  const winBot = top + h * 0.38;
  const count = 9;
  const span = hoodX - len * 0.06 - (x0 + len * 0.05);
  const gap = span * 0.025;
  const w = (span - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    const a = x0 + len * 0.05 + i * (w + gap);
    const pane: Pt[] = [{ x: a, y: winTop }, { x: a + w, y: winTop }, { x: a + w, y: winBot }, { x: a, y: winBot }];
    pen.fill(pane, '#22303d', 1);
    pen.clipped(pane, () => {
      ctx.fillStyle = 'rgba(190,215,235,0.28)';
      ctx.beginPath();
      ctx.moveTo(a + w * 0.15, winBot);
      ctx.lineTo(a + w * 0.55, winTop);
      ctx.lineTo(a + w * 0.8, winTop);
      ctx.lineTo(a + w * 0.4, winBot);
      ctx.fill();
    });
    pen.stroke([...pane, pane[0]!], 2.2, INK, 1, false);
  }
  const shield: Pt[] = [{ x: hoodX - len * 0.045, y: winTop }, { x: hoodX - len * 0.008, y: winTop + 4 }, { x: hoodX + len * 0.004, y: winBot + 8 }, { x: hoodX - len * 0.045, y: winBot + 8 }];
  pen.fill(shield, '#22303d', 1);
  pen.stroke([...shield, shield[0]!], 2.2, INK, 1, false);
  // The door, a headlight, the bumper.
  const door: Pt[] = [{ x: hoodX - len * 0.1, y: winTop }, { x: hoodX - len * 0.062, y: winTop }, { x: hoodX - len * 0.062, y: floor - 6 }, { x: hoodX - len * 0.1, y: floor - 6 }];
  pen.stroke([...door, door[0]!], 2, INK, 0.9, false);
  pen.dot(x1 - len * 0.012, top + h * 0.58, h * 0.03, '#fff3c4');
  pen.fill([{ x: x1 - 6, y: floor - h * 0.1 }, { x: x1 + 8, y: floor - h * 0.1 }, { x: x1 + 8, y: floor - h * 0.02 }, { x: x1 - 6, y: floor - h * 0.02 }], INK, 1);
  pen.stroke([...body, body[0]!], 4, INK, 1, false);
  // Wheels.
  for (const cx of [x0 + len * 0.17, x1 - len * 0.2]) {
    const cy = floor + h * 0.02;
    const wr = h * 0.15;
    pen.fill(ellipse(cx, cy - 2, wr * 1.18, wr * 1.1, 22), '#100f12', 1);
    pen.fill(ellipse(cx, cy, wr, wr, 22), '#25262b', 1);
    pen.fill(ellipse(cx, cy, wr * 0.45, wr * 0.45, 16), '#9aa0a8', 1);
    pen.dot(cx, cy, wr * 0.14, INK);
    pen.stroke([...ellipse(cx, cy, wr, wr, 22), { x: cx + wr, y: cy }], 2.6, INK, 1, false);
  }
}
