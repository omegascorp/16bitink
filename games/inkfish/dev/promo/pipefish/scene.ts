import { INK } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { type Pt, type PouchShape } from './fish';
import { LOOP_S } from './story';

/**
 * The seagrass meadow round the pipefish (blades swaying a whole number of
 * times a loop), the dad's brood pouch and what shows through its skin, the
 * eggs flying into it, and the pop of a burst of babies.
 */

export const EGG = '#f0a03c';
const SKIN = '#e2c595';
const PAPER_FILL = '#fffaf0';
const GRASS = ['#7da35a', '#93b469', '#6c9551'] as const;
const SWAYS = 3;

interface Blade {
  readonly x: number;
  readonly h: number;
  readonly w: number;
  readonly lean: number;
  readonly phase: number;
  readonly tone: number;
}

/** Tall blades along both edges, short ones along the bottom (under the captions, out of the way). */
const BLADES: readonly Blade[] = (() => {
  const rng = createRng(919);
  const blade = (x: number, h: number): Blade => ({ x, h, w: 15 + rng() * 9, lean: (rng() - 0.5) * 0.25, phase: rng() * Math.PI * 2, tone: Math.floor(rng() * 3) });
  return [
    ...Array.from({ length: 7 }, (_, i) => blade(-10 + i * 34 + rng() * 14, 820 + rng() * 420)),
    ...Array.from({ length: 7 }, (_, i) => blade(860 + i * 34 + rng() * 14, 820 + rng() * 420)),
    ...Array.from({ length: 12 }, (_, i) => blade(230 + i * 52 + rng() * 20, 380 + rng() * 260)),
  ];
})();

function drawBlade(ctx: CanvasRenderingContext2D, b: Blade, t: number): void {
  const n = 14;
  const base = VIDEO.height + 20;
  const sway = Math.sin((2 * Math.PI * SWAYS * t) / LOOP_S + b.phase);
  const spine = Array.from({ length: n + 1 }, (_, k) => {
    const u = k / n;
    return { x: b.x + (b.lean * u + 0.09 * sway * u * u) * b.h, y: base - b.h * u, w: b.w * (1 - 0.75 * u ** 2) };
  });
  ctx.beginPath();
  spine.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x - p.w / 2, p.y) : ctx.lineTo(p.x - p.w / 2, p.y)));
  const tip = spine[n]!;
  ctx.quadraticCurveTo(tip.x, tip.y - b.w * 0.8, tip.x + tip.w / 2, tip.y);
  [...spine].reverse().forEach((p) => ctx.lineTo(p.x + p.w / 2, p.y));
  ctx.closePath();
  ctx.fillStyle = GRASS[b.tone]!;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  // The blade's midrib.
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  spine.slice(0, n - 1).forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

export function drawSeagrass(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  for (const b of BLADES) drawBlade(ctx, b, t);
  ctx.restore();
}

// ---------------------------------------------------------------- the pouch

const tracePouch = (ctx: CanvasRenderingContext2D, p: PouchShape): void => {
  ctx.beginPath();
  [...p.rim, ...p.bulge].forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
};

/** Spots inside the pouch, front to back: where eggs (later babies) sit. */
const SLOTS = (() => {
  const rng = createRng(4711);
  return Array.from({ length: 20 }, (_, i) => ({ u: 0.14 + 0.72 * ((i * 0.618) % 1), v: 0.25 + 0.55 * rng(), turn: rng() * Math.PI * 2 }));
})();

const between = (p: PouchShape, u: number, v: number): Pt => {
  const n = p.rim.length - 1;
  const k = Math.round(u * n);
  const r = p.rim[k]!;
  const b = p.bulge[n - k]!;
  return { x: r.x + (b.x - r.x) * v, y: r.y + (b.y - r.y) * v };
};

/**
 * The pouch: a sac of pale skin under his belly, the eggs showing through it
 * (`fill` of them), each with a curled embryo and an eye once `embryo` grows.
 */
export function drawPouch(ctx: CanvasRenderingContext2D, p: PouchShape, fill: number, embryo: number, glow: number): void {
  ctx.save();
  tracePouch(ctx, p);
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.fillStyle = SKIN;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.save();
  tracePouch(ctx, p);
  ctx.clip();
  const shown = Math.round(SLOTS.length * Math.min(1, fill * 1.15));
  const r = 6 + 4 * fill;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  for (const s of SLOTS.slice(0, shown)) {
    const c = between(p, s.u, s.v);
    // Orange eggs, turning into babies (the yolk used up) as they grow.
    ctx.globalAlpha = 0.85 * (1 - 0.7 * embryo);
    ctx.fillStyle = EGG;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (embryo > 0) {
      // A curled baby inside, its eye a dot.
      ctx.globalAlpha = 0.9 * embryo;
      ctx.lineWidth = 1.6 + 1.6 * embryo;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.6, s.turn, s.turn + Math.PI * (0.8 + 0.8 * embryo));
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(s.turn) * r * 0.55, c.y + Math.sin(s.turn) * r * 0.55, 1.2 + 1.3 * embryo, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // The seam where the two folds of skin meet.
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let u = 0.12; u <= 0.88; u += 0.04) {
    const q = between(p, u, 0.62);
    if (u === 0.12) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  tracePouch(ctx, p);
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (glow > 0) {
    // A marker ring round it as the narrator names it.
    ctx.strokeStyle = '#e2632a';
    ctx.lineWidth = 6;
    ctx.globalAlpha = glow;
    const c = between(p, 0.5, 0.7);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 170 + 12 * glow, 48 + 6 * glow, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** One egg in flight, `u` 0 .. 1 from her to his pouch, arcing a little. */
export function drawFlyingEgg(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, u: number, k: number): void {
  const e = u * u * (3 - 2 * u);
  const side = (k % 2 ? 1 : -1) * 40 * Math.sin(Math.PI * u);
  const x = from.x + (to.x - from.x) * e + side;
  const y = from.y + (to.y - from.y) * e;
  ctx.save();
  ctx.fillStyle = EGG;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10 - 2 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A burst of babies out of the pouch: comic pop lines fanning out below it, `u` 0 .. 1, `big` for the cloud. */
export function drawBurst(ctx: CanvasRenderingContext2D, at: Pt, u: number, big: boolean): void {
  if (u < 0 || u > 1) return;
  const reach = big ? 170 : 60;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1 - u;
  ctx.lineWidth = big ? 5 : 3;
  const spokes = big ? 9 : 5;
  for (let k = 0; k < spokes; k++) {
    // Only downwards and out, away from his body.
    const a = Math.PI * (0.06 + (0.88 * k) / (spokes - 1));
    const r0 = 20 + reach * 0.6 * grow;
    const r1 = r0 + reach * 0.35 * (1 - u);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** A copepod: a teardrop body, two long feelers and a red eye-spot, `size` 1 whole .. 0 gone. */
export function drawCopepod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, kick: number): void {
  if (size <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.5 * size, 1.5 * size);
  ctx.rotate(-0.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.fillStyle = '#f3e3b4';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, 20);
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 4, -8);
    ctx.quadraticCurveTo(s * 16, -12 - 3 * kick, s * 24, -4 + 4 * kick);
  }
  ctx.stroke();
  ctx.fillStyle = '#d0402a';
  ctx.beginPath();
  ctx.arc(0, -6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
