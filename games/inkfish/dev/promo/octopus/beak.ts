import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine } from '../captions';
import { lerp, smooth, window01 } from '../short';
import { drawArm, RED, RED_DARK } from './octoArt';
import { BEAK_AT, BITES_AT, cycles, PARROT_AT, SO2_AT } from './story';
import { drawBurst, drawVignette, drawWash, INK_BG } from './water';

/**
 * "…then bites with a beak like a parrot's.": the octopus from below, close
 * on its mouth: a ring of arms lined with suckers round a hooked, dark beak
 * that snaps shut on "bites" and "beak". On "like a parrot's" it slides
 * aside and a parrot's head slides in beside it, the two hooked beaks side by
 * side, each labelled.
 */

const SLIDE = { from: PARROT_AT - 0.35, to: PARROT_AT + 0.05 } as const;

/** How far open the octopus's beak is: opening before each bite, snapping shut on it. */
function beakOpen(t: number): number {
  const bite = (at: number): number => {
    const s = t - at;
    if (s < -0.32 || s > 0.02) return 0;
    return s < -0.06 ? smooth((s + 0.32) / 0.26) : 1 - (s + 0.06) / 0.08;
  };
  return Math.max(0.12 * Math.max(0, Math.sin(cycles(12, t))), bite(BITES_AT + 0.14), bite(BEAK_AT + 0.14));
}

/** The parrot's beak opens on its squawk. */
const parrotOpen = (t: number): number => window01(t, PARROT_AT + 0.05, PARROT_AT + 0.5, 0.08);

interface Disc {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export const octoDisc = (t: number): Disc => {
  const u = smooth((t - SLIDE.from) / (SLIDE.to - SLIDE.from));
  return { x: lerp(540, 285, u), y: lerp(730, 720, u), r: lerp(340, 240, u) };
};
export const parrotDisc = (t: number): Disc => {
  const u = smooth((t - SLIDE.from) / (SLIDE.to - SLIDE.from));
  return { x: lerp(1400, 800, u), y: 720, r: 240 };
};

/** A framed round close-up: a dark backing, the picture clipped inside, a paper rim. */
function medallion(ctx: CanvasRenderingContext2D, d: Disc, fill: string, boil: number, draw: () => void): void {
  const pen = new Pen(ctx, 71 + Math.round(d.x) + (boil % BOIL_FRAMES) * 977, 1);
  ctx.save();
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
  draw();
  const g = ctx.createRadialGradient(d.x, d.y, d.r * 0.55, d.x, d.y, d.r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,4,8,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
  ctx.restore();
  pen.stroke([...ellipse(d.x, d.y, d.r + 8, d.r + 8, 64), { x: d.x + d.r + 8, y: d.y }], 12, '#e9dcc0', 1, false);
  pen.stroke([...ellipse(d.x, d.y, d.r + 15, d.r + 15, 64), { x: d.x + d.r + 15, y: d.y }], 2.6, INK, 1, false);
  pen.stroke([...ellipse(d.x, d.y, d.r + 1, d.r + 1, 64), { x: d.x + d.r + 1, y: d.y }], 2, INK, 1, false);
}

/**
 * A hooked beak in profile, pointing left, size `s` (px across), opening by
 * `open`: the octopus's (dark chitin) or the parrot's (pale horn over a dark
 * lower mandible).
 */
function drawHookedBeak(ctx: CanvasRenderingContext2D, at: Pt, s: number, open: number, kind: 'octopus' | 'parrot', seed: number): void {
  const pen = new Pen(ctx, seed, 0.5);
  const hinge = { x: at.x + s * 0.32, y: at.y + s * 0.02 };
  const turn = (p: Pt, a: number): Pt => {
    const c = Math.cos(a);
    const n = Math.sin(a);
    return { x: hinge.x + (p.x - hinge.x) * c - (p.y - hinge.y) * n, y: hinge.y + (p.x - hinge.x) * n + (p.y - hinge.y) * c };
  };
  const P = (x: number, y: number): Pt => ({ x: at.x + x * s, y: at.y + y * s });
  /** Cubic Bézier runs: start, then (c1, c2, end) triples. */
  const cubic = (pts: Pt[], n = 12): Pt[] => {
    const out: Pt[] = [pts[0]!];
    for (let i = 0; i + 3 < pts.length; i += 3) {
      const [a, b, c, d] = [pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!];
      for (let k = 1; k <= n; k++) {
        const u = k / n;
        const v = 1 - u;
        out.push({ x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x, y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y });
      }
    }
    return out;
  };
  // Upper mandible: the ridge arching up and over to a hook that curls down and back to a sharp point; the cutting edge back to the base.
  const upper = cubic([
    P(0.42, -0.4), P(0.1, -0.66), P(-0.5, -0.5), P(-0.52, 0.02),
    P(-0.53, 0.22), P(-0.44, 0.36), P(-0.34, 0.42),
    P(-0.34, 0.26), P(-0.28, 0.12), P(-0.12, 0.1),
    P(0.05, 0.08), P(0.25, 0.1), P(0.42, 0.12),
  ]).map((p) => turn(p, -0.16 * open));
  // Lower mandible: a deep scoop tucked under the hook.
  const lower = cubic([
    P(0.4, 0.14), P(0.1, 0.12), P(-0.12, 0.14), P(-0.24, 0.2),
    P(-0.26, 0.34), P(-0.1, 0.44), P(0.1, 0.46),
    P(0.25, 0.47), P(0.38, 0.4), P(0.4, 0.14),
  ]).map((p) => turn(p, 0.45 * open));
  const dark = kind === 'octopus';
  const upperFill = dark ? '#3b2516' : '#d9cdb4';
  const lowerFill = dark ? '#21140f' : '#2c2a2c';
  // The mouth's inside, seen when it opens.
  if (open > 0.05) {
    const gap = [turn(P(-0.25, 0.1), -0.16 * open), turn(P(0.4, 0.1), -0.16 * open), turn(P(0.4, 0.16), 0.45 * open), turn(P(-0.22, 0.2), 0.45 * open)];
    pen.fill(gap, '#5a1420', 0.95);
  }
  for (const [shape, colour] of [[lower, lowerFill], [upper, upperFill]] as const) {
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, colour, 0.95);
    pen.clipped(shape, () => {
      // A glossy highlight along the curve of the hook, shading under it.
      const xs = shape.map((p) => p.x);
      const ys = shape.map((p) => p.y);
      const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      g.addColorStop(0, dark ? 'rgba(220,160,100,0.7)' : 'rgba(255,250,235,0.6)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      for (let i = 1; i < 6; i++) pen.hair(shape.slice(1, Math.floor(shape.length * 0.45)).map((p) => ({ x: p.x + i * s * 0.025, y: p.y + i * s * 0.03 })), 0.8, dark ? '#000' : '#7d6e55', 0.35);
    });
    pen.stroke([...shape, shape[0]!], Math.max(2, s * 0.012), INK);
  }
}

/** The octopus's mouth from below: arms radiating with their suckers, soft lips, the beak. */
function drawOralView(ctx: CanvasRenderingContext2D, d: Disc, t: number, boil: number): void {
  const k = d.r / 340;
  const b = boil % BOIL_FRAMES;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2 + 0.05 * Math.sin(cycles(6, t) + i);
    const path: Pt[] = [];
    for (let j = 0; j <= 12; j++) {
      const s = j / 12;
      const bend = a + 0.5 * s * s * (i % 2 ? 1 : -1);
      path.push({ x: d.x + Math.cos(bend) * (70 + s * 460) * k, y: d.y + Math.sin(bend) * (70 + s * 460) * k });
    }
    drawArm(ctx, path, { w0: 150 * k, wEnd: 0.25, side: 1, seed: 3301 + i * 17 + b * 977, oral: true, far: true, lineK: 1.4 * k });
  }
  // The web between them near the middle, and the soft lips round the beak.
  const pen = new Pen(ctx, 3401 + b * 977, 0.8);
  pen.fill(ellipse(d.x, d.y, 150 * k, 150 * k, 40), RED, 0.95);
  pen.fill(ellipse(d.x, d.y, 150 * k, 150 * k, 40), RED_DARK, 0.25);
  const rng = createRng(31);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    pen.hair([{ x: d.x + Math.cos(a) * 128 * k, y: d.y + Math.sin(a) * 124 * k }, { x: d.x + Math.cos(a + 0.05) * (146 + rng() * 6) * k, y: d.y + Math.sin(a + 0.05) * 146 * k }], 1.2, RED_DARK, 0.6);
  }
  pen.fill(ellipse(d.x, d.y, 132 * k, 126 * k, 36), '#d99a86', 0.95);
  pen.clipped(ellipse(d.x, d.y, 132 * k, 126 * k, 36), () => {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pen.hair([{ x: d.x + Math.cos(a) * 100 * k, y: d.y + Math.sin(a) * 96 * k }, { x: d.x + Math.cos(a) * 132 * k, y: d.y + Math.sin(a) * 126 * k }], 1, '#8a4a3a', 0.5);
    }
  });
  pen.stroke([...ellipse(d.x, d.y, 132 * k, 126 * k, 36), { x: d.x + 132 * k, y: d.y }], 2.4, INK);
  pen.stroke([...ellipse(d.x, d.y, 150 * k, 150 * k, 40), { x: d.x + 150 * k, y: d.y }], 2.2, INK, 0.8);
  drawHookedBeak(ctx, { x: d.x + 6 * k, y: d.y - 8 * k }, 240 * k, beakOpen(t), 'octopus', 3501 + b * 977);
  // Soft lips folding over the beak's base.
  const fold = [
    ...Array.from({ length: 13 }, (_, i) => { const a = -1.25 + (i / 12) * 2.5; return { x: d.x + Math.cos(a) * 134 * k, y: d.y + Math.sin(a) * 128 * k }; }),
    ...Array.from({ length: 13 }, (_, i) => { const a = 1.2 - (i / 12) * 2.4; return { x: d.x + 66 * k + Math.cos(a) * 20 * k, y: d.y + Math.sin(a) * 116 * k }; }),
  ];
  pen.fill(fold, '#d99a86', 1);
  pen.clipped(fold, () => pen.hatch(fold, 5 * k, 1.2, 1, { color: '#8a4a3a', alpha: 0.4 }));
  pen.stroke([...fold.slice(13), fold[0]!], 2, INK, 0.9, false);
}

/** A parrot's head in profile, facing left at the octopus: green feathers, a yellow brow, a pale eye ring, the big hooked beak. */
function drawParrot(ctx: CanvasRenderingContext2D, d: Disc, t: number, boil: number): void {
  const b = boil % BOIL_FRAMES;
  const pen = new Pen(ctx, 3601 + b * 977, 1.1);
  const k = d.r / 240;
  const c = { x: d.x + 40 * k, y: d.y + 10 * k };
  const head: Pt[] = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const r = 1 + 0.08 * Math.sin(a * 2 + 1);
    return { x: c.x + Math.cos(a) * 165 * k * r, y: c.y + Math.sin(a) * 175 * k * r + (Math.sin(a) > 0 ? Math.sin(a) * 120 * k : 0) };
  });
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, '#4f9a45', 0.95);
  pen.clipped(head, () => {
    const g = ctx.createRadialGradient(c.x - 60 * k, c.y - 90 * k, 20 * k, c.x, c.y, 260 * k);
    g.addColorStop(0, 'rgba(230,240,120,0.5)');
    g.addColorStop(1, 'rgba(10,40,20,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 300 * k, c.y - 300 * k, 600 * k, 700 * k);
    // A yellow forehead and blue crown, as on an Amazon parrot.
    pen.fill(ellipse(c.x - 70 * k, c.y - 120 * k, 90 * k, 60 * k, 20), '#e8d24a', 0.75);
    pen.fill(ellipse(c.x + 40 * k, c.y - 170 * k, 110 * k, 50 * k, 20), '#5a8fc4', 0.45);
    // Scalloped feathers in rows.
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const x = c.x - 160 * k + col * 42 * k + (row % 2) * 21 * k;
        const y = c.y - 150 * k + row * 40 * k;
        pen.hair(Array.from({ length: 7 }, (_, j) => ({ x: x - 18 * k + (j / 6) * 36 * k, y: y + Math.sin((j / 6) * Math.PI) * 14 * k })), 1.1, '#1f4a22', 0.55);
      }
    }
  });
  pen.stroke([...head, head[0]!], 3, INK);
  // Eye: a pale bare ring, orange iris, black pupil.
  const eye = { x: c.x - 50 * k, y: c.y - 40 * k };
  pen.fill(ellipse(eye.x, eye.y, 34 * k, 32 * k, 24), '#efe6d6', 1);
  pen.stroke([...ellipse(eye.x, eye.y, 34 * k, 32 * k, 24), { x: eye.x + 34 * k, y: eye.y }], 2, INK);
  pen.fill(ellipse(eye.x, eye.y, 17 * k, 17 * k, 18), '#e08a2a', 1);
  pen.dot(eye.x - 2 * k, eye.y, 9 * k, INK);
  pen.dot(eye.x - 6 * k, eye.y - 5 * k, 3 * k, PAPER_FILL);
  pen.stroke([...ellipse(eye.x, eye.y, 17 * k, 17 * k, 18), { x: eye.x + 17 * k, y: eye.y }], 1.4, INK);
  // The cere over the beak.
  pen.fill(ellipse(c.x - 95 * k, c.y - 62 * k, 24 * k, 16 * k, 14), '#3d3a36', 0.8);
  drawHookedBeak(ctx, { x: c.x - 150 * k, y: c.y + 10 * k }, 215 * k, parrotOpen(t), 'parrot', 3701 + b * 977);
}

export interface Label {
  readonly text: string;
  readonly x: number;
  /** Baseline, screen px. */
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
}

/** "octopus" and "parrot" under each close-up, from "parrot's" until the cut. */
export function beakLabels(t: number): Label[] {
  const alpha = window01(t, PARROT_AT - 0.05, SO2_AT, 0.15);
  const o = octoDisc(t);
  const p = parrotDisc(t);
  return [
    { text: 'octopus', x: o.x, y: o.y + o.r + 105, size: 84, alpha },
    { text: 'parrot', x: p.x, y: p.y + p.r + 105, size: 84, alpha },
  ];
}

export function drawBeakScene(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, t: number, boil: number): void {
  drawWash(ctx, paper, 'rgba(58,26,52,0.93)', 'rgba(14,6,14,0.98)');
  const glow = ctx.createRadialGradient(540, 720, 80, 540, 720, 760);
  glow.addColorStop(0, 'rgba(230,140,120,0.22)');
  glow.addColorStop(1, 'rgba(230,140,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);
  const o = octoDisc(t);
  medallion(ctx, o, '#5b1d16', boil, () => drawOralView(ctx, o, t, boil));
  // The snap of each bite.
  for (const at of [BITES_AT + 0.14, BEAK_AT + 0.14]) drawBurst(ctx, { x: o.x - 70 * (o.r / 340), y: o.y }, (t - at) / 0.3, o.r * 0.55, o.r * 0.95, '#f3e3c8', 9);
  const p = parrotDisc(t);
  if (p.x < 1080 + p.r + 20) medallion(ctx, p, '#9cc4c0', boil, () => drawParrot(ctx, p, t, boil));
  for (const l of beakLabels(t)) drawTextLine(ctx, l.text, l.x, l.y, l.size, 700, l.alpha, { fill: '#f4eddc', halo: INK_BG });
  drawVignette(ctx, 0.5, '10,4,10');
}
