import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import {
  BACK, BELLY, BLOWHOLE, BODY, EYE, FLIPPER_ROOT, FLUKES, FRONT, HEAD_BACK_X, JAW_PIVOT, JAW_SHAPE, jawAt, openJaw, type Pt, spline, TEETH,
} from './whale';

/**
 * The sperm whale in the game's pen and ink, painted rather than doodled:
 * paper under a slate wash laid on slightly off its outline, the belly
 * shaded with lines that follow its curve, prune-wrinkled skin behind the
 * head, pale old scratches on the case, the light from above catching the
 * top of the head. The body (with its flukes and flipper) and the lower jaw
 * are separate sprites, so the jaw can open and the tail can beat; one
 * canvas per line-boil frame, like the game's fish.
 */

/** Sprite px per local px, and the box it covers (local px). */
export const WHALE_RES = 1.3;
const BOX = { x0: -3000, x1: 60, y0: -370, y1: 370 } as const;
const JAW_BOX = { x0: -700, x1: -60, y0: 130, y1: 280 } as const;

export const SLATE = '#3c434d';
const SHADOW = '#10141c';
const SCRATCH = '#e4e2da';
const LIGHT = '#eef2f5';
const IVORY = '#f3ead2';
const W = 1.6;

export interface WhaleSprite {
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
}

const seedOf = (f: number): number => 7001 + f * 977;

function sheet(box: { x0: number; x1: number; y0: number; y1: number }, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * WHALE_RES), Math.ceil((box.y1 - box.y0) * WHALE_RES));
  ctx.scale(WHALE_RES, WHALE_RES);
  ctx.translate(-box.x0, -box.y0);
  draw(ctx);
  return canvas;
}

export function makeWhaleSprite(): WhaleSprite {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => f);
  return {
    body: frames.map((f) => sheet(BOX, (ctx) => paintBody(ctx, seedOf(f)))),
    jaw: frames.map((f) => sheet(JAW_BOX, (ctx) => paintJaw(ctx, seedOf(f) + 31))),
  };
}

/** The top edge of the back and the bottom of the belly at x (local px), for shading that follows them. */
function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return line[line.length - 1]!.y;
}
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);

function shade(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly [number, string][]): void {
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(BOX.x0, y0 - 400, BOX.x1 - BOX.x0, y1 - y0 + 800);
  ctx.restore();
}

function drawFlukes(pen: Pen): void {
  pen.fill(FLUKES, PAPER_FILL, 1);
  pen.fill(FLUKES, SLATE, 0.78);
  shade(pen.ctx, FLUKES, -320, 270, [[0, 'rgba(238,242,245,0.12)'], [0.5, 'rgba(16,20,28,0.1)'], [1, 'rgba(16,20,28,0.5)']]);
  // Lines along each lobe, from the stock to the trailing edge.
  pen.clipped(FLUKES, () => {
    for (let k = 0; k < 16; k++) {
      const u = k / 15;
      for (const lobe of [-1, 1]) {
        const tip = lobe < 0 ? { x: -2955, y: -318 } : { x: -2905, y: 262 };
        const from = { x: -2560, y: lobe * 20 };
        const to = { x: -2760 + (tip.x + 2760) * u, y: lobe * 6 + (tip.y - lobe * 6) * u };
        pen.hair([from, { x: (from.x + to.x) / 2 - 20, y: (from.y + to.y) / 2 }, to], 1.1, INK, 0.32);
      }
    }
  });
  pen.stroke(FLUKES, 5, INK, 1, true);
}

/** Wavy ridges, the prune-wrinkled skin of a sperm whale's flank: a dark crease with the light catching the fold above it. */
function wrinkles(pen: Pen, x0: number, x1: number, count: number, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const x = x0 + pen.rng() * (x1 - x0);
    const top = topAt(x);
    const bottom = bottomAt(x);
    const v = 0.1 + pen.rng() * 0.8;
    const y = top + (bottom - top) * v;
    const len = 50 + pen.rng() * 110;
    const tilt = (v - 0.5) * 0.3 + (pen.rng() - 0.5) * 0.2;
    const pts = Array.from({ length: 8 }, (_, k) => {
      const u = k / 7 - 0.5;
      return { x: x + u * len, y: y + u * len * tilt + Math.sin(k * 1.7 + x * 0.05) * 4 };
    });
    pen.hair(pts, 1.6 + pen.rng() * 0.9, INK, alpha * (0.35 + 0.55 * v));
    pen.hair(pts.map((p) => ({ x: p.x + 2, y: p.y - 5 })), 1.4, LIGHT, alpha * 0.28 * (1 - v));
  }
}

/** Lines that follow the belly's curve, shading the underside. */
function bellyLines(pen: Pen, x0: number, x1: number, rows: number, gap: number, alpha: number): void {
  for (let r = 1; r <= rows; r++) {
    const a = x0 + pen.rng() * 40;
    const b = x1 - pen.rng() * 60 - r * 14;
    const pts: Pt[] = [];
    for (let x = a; x >= b; x -= 24) {
      const depth = bottomAt(x) - topAt(x);
      pts.push({ x, y: bottomAt(x) - r * gap * (depth / 520) });
    }
    pen.hair(pts, 1.2, INK, alpha * (1 - (r / (rows + 2)) * 0.7));
  }
}

function drawFlipper(pen: Pen): void {
  const r = FLIPPER_ROOT;
  const shape = [
    ...spline([{ x: r.x + 30, y: r.y - 10 }, { x: r.x - 60, y: r.y + 40 }, { x: r.x - 150, y: r.y + 120 }, { x: r.x - 205, y: r.y + 150 }], 6),
    ...spline([{ x: r.x - 205, y: r.y + 150 }, { x: r.x - 170, y: r.y + 100 }, { x: r.x - 110, y: r.y + 40 }, { x: r.x - 70, y: r.y - 6 }], 6).slice(1),
  ];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SLATE, 0.82);
  shade(pen.ctx, shape, r.y - 20, r.y + 150, [[0, 'rgba(16,20,28,0.05)'], [1, 'rgba(16,20,28,0.55)']]);
  pen.clipped(shape, () => {
    for (let k = 1; k < 6; k++) pen.hair([{ x: r.x - 10 - k * 14, y: r.y + 4 }, { x: r.x - 140 - k * 10, y: r.y + 100 + k * 6 }], 1, INK, 0.4);
  });
  pen.stroke([...shape, shape[0]!], 4, INK, 1, false);
}

function drawEye(pen: Pen): void {
  const { x, y, r } = EYE;
  // Folds of skin round a small, deep-set eye.
  for (let k = 0; k < 3; k++) {
    const s = 1.6 + k * 0.55;
    pen.hair(spline([{ x: x - r * s, y: y + r * 0.2 }, { x: x - r * 0.2, y: y - r * s * 0.85 }, { x: x + r * s * 0.9, y: y - r * 0.1 }], 5), 1.3, INK, 0.55 - k * 0.12);
    pen.hair(spline([{ x: x - r * s * 0.9, y: y + r * 0.5 }, { x: x, y: y + r * s * 0.75 }, { x: x + r * s * 0.8, y: y + r * 0.3 }], 5), 1.1, INK, 0.4 - k * 0.1);
  }
  pen.fill(ellipse(x, y, r * 1.15, r * 0.85, 18), PAPER_FILL, 1);
  pen.fill(ellipse(x, y, r * 1.15, r * 0.85, 18), '#b7ad96', 0.35);
  pen.dot(x + r * 0.2, y + r * 0.05, r * 0.55, INK);
  pen.dot(x + r * 0.38, y - r * 0.2, r * 0.17, PAPER_FILL);
  pen.stroke([...ellipse(x, y, r * 1.15, r * 0.85, 18), { x: x + r * 1.15, y }], 2.6, INK, 1, false);
  pen.stroke(spline([{ x: x - r * 1.5, y: y - r * 0.3 }, { x: x, y: y - r * 1.35 }, { x: x + r * 1.4, y: y - r * 0.4 }], 6), 3, INK, 1, false);
}

function drawBlowhole(pen: Pen): void {
  const b = BLOWHOLE;
  // An S-shaped slit on the top of the head, near the front, set to its left.
  const slit = spline([{ x: b.x - 34, y: b.y + 8 }, { x: b.x - 14, y: b.y + 1 }, { x: b.x + 6, y: b.y + 7 }, { x: b.x + 22, y: b.y + 2 }], 6);
  pen.fill([...slit, ...slit.map((p) => ({ x: p.x, y: p.y + 5 })).reverse()], SHADOW, 0.85);
  pen.stroke(slit, 2.6, INK, 1, false);
  pen.hair(slit.map((p) => ({ x: p.x, y: p.y - 4 })), 1, LIGHT, 0.4);
}

/** Pale old scratches across the case and the front of the head (the sea's wear, not the fresh sucker scars). */
function scratches(pen: Pen): void {
  for (let i = 0; i < 26; i++) {
    const x = -40 - pen.rng() * 760;
    const y = topAt(x) + 30 + pen.rng() * (180 - topAt(x) - 70);
    const len = 40 + pen.rng() * 120;
    const a = -0.5 + pen.rng() * 1.0;
    pen.hair([{ x, y }, { x: x - Math.cos(a) * len * 0.5, y: y + Math.sin(a) * len * 0.5 + 3 }, { x: x - Math.cos(a) * len, y: y + Math.sin(a) * len }], 1.2, SCRATCH, 0.3);
  }
}

function paintBody(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, W);
  drawFlukes(pen);

  // Paper, then the slate wash laid on a little off the outline.
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    ctx.translate(5, 4);
    pen.fill(BODY, SLATE, 0.8);
    ctx.translate(-5, -4);
  });
  // The light from above: lit across the top, the core shadow low on the flank, a little light bounced back under the belly.
  shade(ctx, BODY, -270, 300, [[0, 'rgba(238,242,245,0.26)'], [0.22, 'rgba(238,242,245,0.05)'], [0.5, 'rgba(16,20,28,0.12)'], [0.8, 'rgba(16,20,28,0.55)'], [1, 'rgba(16,20,28,0.42)']]);
  pen.clipped(BODY, () => {
    // The blunt front of the case turns away from the light.
    const g = ctx.createLinearGradient(-160, 0, 20, 0);
    g.addColorStop(0, 'rgba(16,20,28,0)');
    g.addColorStop(1, 'rgba(16,20,28,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(-160, -300, 200, 480);
    for (let k = 0; k < 7; k++) pen.hair(FRONT.map((p) => ({ x: p.x - 10 - k * 9, y: p.y })).slice(1, -1), 1.1, INK, 0.32 - k * 0.035);
    bellyLines(pen, -560, -2500, 15, 14, 0.7);
    bellyLines(pen, -40, -560, 5, 12, 0.45);
    wrinkles(pen, HEAD_BACK_X + 80, -2450, 330, 0.8);
    wrinkles(pen, -260, HEAD_BACK_X + 80, 26, 0.4);
    // Long creases along the side of the case.
    for (let k = 0; k < 5; k++) {
      const y = -170 + k * 52 + pen.rng() * 12;
      pen.hair(spline([{ x: -70, y: y + 6 }, { x: -380, y }, { x: -760, y: y + 14 + k * 4 }], 8), 1.2, INK, 0.25);
    }
    scratches(pen);
    // Throat grooves behind the jaw.
    for (let k = 0; k < 8; k++) {
      const x = -720 - k * 34;
      pen.hair([{ x, y: bottomAt(x) - 56 }, { x: x - 44, y: bottomAt(x - 44) - 8 }], 1.3, INK, 0.5);
    }
    pen.stipple(BODY, 5000, (_x, y) => 0.08 + 0.5 * Math.max(0, Math.min(1, (y + 60) / 320)), 1.3, INK);
    // The light catching the top of the case and the back.
    for (let k = 1; k <= 4; k++) pen.hair(BACK.filter((p) => p.x > -1700).map((p) => ({ x: p.x, y: p.y + 10 + k * 9 })), 2.4 - k * 0.35, LIGHT, 0.26 - k * 0.05);
  });
  // The corner of the mouth, curling up under the eye.
  pen.stroke(spline([{ x: -640, y: 199 }, { x: -690, y: 195 }, { x: -722, y: 180 }], 4), 3, INK, 1, false);
  pen.hair(spline([{ x: -600, y: 192 }, { x: -110, y: 182 }], 10), 1.4, SHADOW, 0.6);
  pen.stroke(FRONT, 6, INK, 1, true);
  pen.stroke(BELLY, 5.5, INK, 1, true);
  pen.stroke(BACK, 6, INK, 1, true);
  drawFlipper(pen);
  drawEye(pen);
  drawBlowhole(pen);
}

/** The long narrow lower jaw, shut: pale lips, ivory cones along its top. */
function paintJaw(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, W * 0.8);
  // Teeth first: their roots sit inside the gum.
  for (const t of TEETH) {
    const { upper } = jawAt(t.s);
    const lean = -0.18;
    const base = { x: upper.x, y: upper.y + 4 };
    const tip = { x: base.x + t.h * Math.sin(lean), y: base.y - t.h };
    const w = 7 + t.h * 0.2;
    const tooth = [
      { x: base.x - w, y: base.y + 3 },
      ...spline([{ x: base.x - w, y: base.y }, { x: base.x - w * 0.6 + (tip.x - base.x) * 0.5, y: base.y - t.h * 0.55 }, tip], 4),
      ...spline([tip, { x: base.x + w * 0.65 + (tip.x - base.x) * 0.5, y: base.y - t.h * 0.5 }, { x: base.x + w, y: base.y }], 4).slice(1),
      { x: base.x + w, y: base.y + 3 },
    ];
    pen.fill(tooth, IVORY, 1);
    pen.hair([{ x: base.x + w * 0.35, y: base.y - 2 }, { x: tip.x + 2, y: tip.y + 6 }], 1, '#b9a87f', 0.7);
    pen.stroke(tooth.slice(1, -1), 1.6, INK, 1, false);
  }
  const shape = [...JAW_SHAPE];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SLATE, 0.8);
  shade(ctx, shape, 190, 262, [[0, 'rgba(238,242,245,0.18)'], [0.4, 'rgba(238,242,245,0)'], [1, 'rgba(16,20,28,0.6)']]);
  pen.clipped(shape, () => {
    for (let k = 1; k < 4; k++) pen.hair(Array.from({ length: 12 }, (_, i) => ({ x: jawAt(i / 11).lower.x, y: jawAt(i / 11).lower.y - k * 7 })), 1, INK, 0.5 - k * 0.1);
    pen.stipple(shape, 260, (_x, y) => Math.max(0.1, Math.min(1, (y - 205) / 40)), 1.1, INK);
  });
  // The white lip along the top edge, under the teeth.
  pen.hair(Array.from({ length: 16 }, (_, i) => jawAt(0.05 + (i / 15) * 0.93).upper).map((p) => ({ x: p.x, y: p.y + 5 })), 3.2, LIGHT, 0.55);
  pen.stroke([...shape, shape[0]!], 4.4, INK, 1, true);
}

/** Where the body sprite's own px start, in local px (its top left corner), and how many local px a sprite px is. */
export const WHALE_SPRITE_ORIGIN: Pt = { x: BOX.x0, y: BOX.y0 };
export const JAW_SPRITE_ORIGIN: Pt = { x: JAW_BOX.x0, y: JAW_BOX.y0 };

// ---------------------------------------------------------------- on screen, frame by frame (local px: the caller sets up the transform)

/** Where the tail starts to bend, and the fluke tips. */
const BEND_FROM = -1100;
const BEND_TO = -2950;

/** The body and flukes, the tail beating up and down (`beat` its phase, `wag` how far the flukes swing, local px). */
export function drawWhaleBody(ctx: CanvasRenderingContext2D, sprite: WhaleSprite, boil: number, beat: number, wag: number): void {
  const c = sprite.body[boil % sprite.body.length]!;
  const k = 1 / WHALE_RES;
  const split = Math.round((BEND_FROM - BOX.x0) * WHALE_RES);
  // The front half in one piece; the back half column by column.
  ctx.drawImage(c, split, 0, c.width - split, c.height, BOX.x0 + split * k, BOX.y0, (c.width - split) * k, c.height * k);
  const step = 6;
  for (let sx = 0; sx < split; sx += step) {
    const x = BOX.x0 + (sx + step / 2) * k;
    const b = Math.max(0, Math.min(1, (x - BEND_FROM) / (BEND_TO - BEND_FROM)));
    const dy = wag * b * b * Math.sin(beat - 2.4 * b);
    const w = Math.min(step, split - sx);
    ctx.drawImage(c, sx, 0, w, c.height, BOX.x0 + sx * k, BOX.y0 + dy, w * k + 0.6, c.height * k);
  }
}

/** The lower jaw, opened `open` radians about its hinge. */
export function drawWhaleJawAt(ctx: CanvasRenderingContext2D, sprite: WhaleSprite, boil: number, open: number): void {
  const c = sprite.jaw[boil % sprite.jaw.length]!;
  ctx.save();
  ctx.translate(JAW_PIVOT.x, JAW_PIVOT.y);
  ctx.rotate(open);
  ctx.translate(-JAW_PIVOT.x, -JAW_PIVOT.y);
  ctx.drawImage(c, JAW_BOX.x0, JAW_BOX.y0, c.width / WHALE_RES, c.height / WHALE_RES);
  ctx.restore();
}

/** The inside of the mouth, between the underside of the case and the opened jaw. */
export function drawMouthInside(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.004) return;
  const palate = BELLY.filter((p) => p.x <= -100 && p.x >= -650);
  const jaw = Array.from({ length: 16 }, (_, i) => openJaw(jawAt(i / 15).upper, open));
  const shape = [...palate, ...jaw];
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(-650, 0, -100, 0);
  g.addColorStop(0, '#0d0709');
  g.addColorStop(1, '#3b2228');
  ctx.fillStyle = g;
  ctx.fill();
  // The pale lining of the mouth along the palate.
  ctx.strokeStyle = 'rgba(232,222,214,0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  palate.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 6) : ctx.moveTo(p.x, p.y + 6)));
  ctx.stroke();
  ctx.restore();
}

/** Sucker scars on the side of the head: `looks` per scar (0 none, 1 settled, more while popping in). */
export function drawScars(ctx: CanvasRenderingContext2D, scars: readonly { readonly x: number; readonly y: number; readonly r: number }[], looks: readonly number[], boil: number, flash: string): void {
  const pen = new Pen(ctx, 9101 + boil * 977, 0.8);
  ctx.save();
  ctx.beginPath();
  BODY.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  scars.forEach((s, i) => {
    const a = looks[i]!;
    if (a <= 0) return;
    const r = s.r * Math.min(a, 1.25);
    const alpha = Math.min(1, a);
    // A pale ring of healed skin round a darker dimple, slightly squashed by the curve of the head.
    const ring = ellipse(s.x, s.y, r, r * 0.86, 20);
    pen.fill(ring, '#c9c4b8', 0.16 * alpha);
    pen.stroke([...ring, ring[0]!], r * 0.26, '#d9d3c4', 0.36 * alpha, false);
    pen.fill(ellipse(s.x + 1, s.y + 1, r * 0.45, r * 0.38, 14), '#1a1d24', 0.22 * alpha);
    if (a > 1) pen.stroke([...ring, ring[0]!], r * 0.22, flash, Math.min(1, (a - 1) * 3), false);
  });
  ctx.restore();
}
