import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { taper } from '../../seal/art/paint';

/**
 * Water in the air: drops with a dark rim and a bright glint so they read on
 * pale gravel, torn sheets flung out of a burst, and strings of water pouring
 * off a wet body. Everything is a pure function of time.
 */

const GRAVITY = 1100;
const fract = (x: number): number => x - Math.floor(x);

/** A real drop: a teardrop along its flight, see-through blue-white, rimmed, with a glint. */
function drop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, vx: number, vy: number, alpha: number): void {
  const a = Math.atan2(vy, vx);
  const stretch = 1 + Math.min(1.6, Math.hypot(vx, vy) / 500);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(r * 0.95, 0);
  ctx.bezierCurveTo(r * 0.9, r * 0.8, -r * stretch * 0.4, r * 0.5, -r * stretch * 1.3, 0);
  ctx.bezierCurveTo(-r * stretch * 0.4, -r * 0.5, r * 0.9, -r * 0.8, r * 0.95, 0);
  ctx.fillStyle = 'rgba(214,240,246,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,94,104,0.6)';
  ctx.lineWidth = Math.max(0.6, r * 0.13);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(r * 0.22, -r * 0.22, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A torn tongue of water from `a` curving to `b`: glassy, brightest along its back, breaking into drops at its tip. */
function sheet(ctx: CanvasRenderingContext2D, a: Pt, c: Pt, b: Pt, w: number, alpha: number): void {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const u = i / 15;
    const v = 1 - u;
    const ruffle = Math.sin(u * 11 + a.x * 0.13) * w * 0.16 * u;
    return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x + ruffle, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y + ruffle * 0.6 };
  });
  taper(ctx, pts, w, w * 0.12, '#a9d9e0', 0.5 * alpha);
  taper(ctx, pts.map((p) => ({ x: p.x - w * 0.1, y: p.y - w * 0.12 })), w * 0.55, w * 0.06, '#eefafa', 0.8 * alpha);
  taper(ctx, pts.map((p, i) => ({ x: p.x - w * 0.16, y: p.y - w * 0.2 + 0.4 * Math.sin(i) })), w * 0.16, w * 0.02, '#ffffff', alpha);
  const [dx, dy] = [b.x - c.x, b.y - c.y];
  for (let i = 0; i < 6; i++) {
    const t = pts[Math.min(15, 9 + i)]!;
    const off = (i % 2 ? 1 : -1) * w * (0.5 + 0.12 * i);
    drop(ctx, t.x + off * 0.7, t.y + off * 0.5, Math.max(2, w * (0.13 - i * 0.012)), dx, dy, alpha);
  }
}

/** A burst from `origin`, `age` seconds ago: a crown of torn sheets, then drops, fading out by 1.5 s. */
export function drawBurst(ctx: CanvasRenderingContext2D, origin: Pt, age: number, power: number, seed = 7): void {
  if (age < 0 || age > 1.5) return;
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 16 - 0.5) * 2.7 + (rng() - 0.5) * 0.14;
    const v = (360 + rng() * 420) * power;
    const w = (18 + rng() * 22) * power;
    const u = Math.min(1, age / 0.9);
    const reach = v * age;
    const base = { x: origin.x + Math.cos(a) * reach * 0.18, y: origin.y + Math.sin(a) * reach * 0.1 };
    const tip = { x: origin.x + Math.cos(a) * reach, y: origin.y + Math.sin(a) * reach + 0.5 * GRAVITY * age * age * 0.7 };
    const mid = { x: origin.x + Math.cos(a) * reach * 0.62, y: origin.y + Math.sin(a) * reach * 0.8 };
    if (u < 1) sheet(ctx, base, mid, tip, w * (1 - 0.5 * u), 1 - u * u);
  }
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 3.0;
    const v = (240 + rng() * 720) * power;
    const r = (2.2 + rng() ** 2 * 11) * power;
    const life = 0.7 + rng() * 0.8;
    const u = age / life;
    if (u > 1) continue;
    const vy = Math.sin(a) * v + GRAVITY * age;
    drop(ctx, origin.x + Math.cos(a) * v * age, origin.y + Math.sin(a) * v * age + 0.5 * GRAVITY * age * age, r, Math.cos(a) * v, vy, 1 - u ** 3);
  }
  ctx.restore();
}

/**
 * Drops thrown off a wet body without end while `strength` lasts: `period`
 * seconds is the life of a drop, a whole fraction of the loop, so it loops.
 */
export function drawHalo(ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, t: number, period: number, strength: number, seed = 3): void {
  if (strength <= 0.01) return;
  const rng = createRng(seed);
  for (let i = 0; i < 70; i++) {
    const a = Math.PI + rng() * Math.PI + (rng() - 0.5) * 0.5;
    const v = 140 + rng() * 340;
    const r = 2 + rng() ** 2 * 10;
    const ph = rng();
    if (rng() > strength) continue;
    const age = fract(t / period + ph) * period;
    const [x0, y0] = [c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry];
    const [vx, vy] = [Math.cos(a) * v, Math.sin(a) * v - 150];
    drop(ctx, x0 + vx * age, y0 + vy * age + 0.5 * GRAVITY * age * age, r, vx, vy + GRAVITY * age, 1 - (age / period) ** 4);
  }
}

/** A crown of torn sheets flung up and out from behind the head, whose middle is `c`, wavering. */
export function drawWings(ctx: CanvasRenderingContext2D, c: Pt, rx: number, ry: number, t: number, period: number, strength: number): void {
  if (strength <= 0.01) return;
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI - 0.3 + ((i + 0.5) / n) * (Math.PI + 0.6);
    if (Math.abs(a + Math.PI / 2) < 0.34) continue;
    const wave = Math.sin((2 * Math.PI * t) / period + i * 2.1);
    const root = { x: c.x + Math.cos(a) * rx * 0.82, y: c.y + Math.sin(a) * ry * 0.82 };
    const reach = (0.62 + 0.3 * ((i * 7) % 5) / 4) * rx * (0.94 + 0.06 * wave);
    const out = { x: Math.cos(a) * 1.15, y: Math.sin(a) };
    const mid = { x: root.x + out.x * reach * 0.6, y: root.y + (out.y - 0.5) * reach * 0.8 };
    const tip = { x: root.x + out.x * reach * 1.18, y: root.y + (out.y - 0.1) * reach * 0.9 };
    sheet(ctx, root, mid, tip, (0.14 + 0.05 * ((i * 3) % 4) / 3) * rx, strength);
  }
}

/** Thin strings of water running off `edge`, each dropping beads, `fall` px long. */
export function drawPour(ctx: CanvasRenderingContext2D, edge: readonly Pt[], fall: number, t: number, period: number, strength: number): void {
  if (strength <= 0.01) return;
  edge.forEach((p, i) => {
    const ph = fract(i * 0.618);
    const len = fall * (0.4 + 0.9 * fract(i * 0.37));
    const sway = 7 * Math.sin((2 * Math.PI * t) / period + i);
    const pts = Array.from({ length: 7 }, (_, j) => {
      const u = j / 6;
      return { x: p.x + sway * u + 1.1 * Math.sin(u * 4 + i), y: p.y + len * u };
    });
    taper(ctx, pts, 4 + (i % 3) * 1.6, 0.8, '#c6e6ea', 0.5 * strength);
    taper(ctx, pts.map((q) => ({ x: q.x - 0.8, y: q.y })), 1.4, 0.3, '#ffffff', 0.7 * strength);
    const age = fract(t / period + ph) * period;
    drop(ctx, p.x + sway, p.y + len + 200 * age + 0.5 * GRAVITY * age * age, 3 + (i % 3), 0, 240 + GRAVITY * age, strength * (1 - fract(t / period + ph)));
  });
}

/**
 * The sheet of water rushing out over the gravel from `c`: a lobed tongue of
 * see-through water with a broken foam lip, swelling and sinking.
 */
export function drawRush(ctx: CanvasRenderingContext2D, c: Pt, r: number, t: number, period: number, strength: number): void {
  if (strength <= 0.01) return;
  const phase = (2 * Math.PI * t) / period;
  const lobe = (i: number): Pt => {
    const a = -0.28 + (i / 40) * (Math.PI + 0.56);
    const d = r * (0.78 + 0.09 * Math.sin(a * 7 + 1) + 0.06 * Math.sin(a * 13 + 2) + 0.05 * Math.sin(phase + a * 3));
    return { x: c.x + Math.cos(a) * d * 1.12, y: c.y + Math.sin(a) * d * 0.5 };
  };
  const edge = Array.from({ length: 121 }, (_, i) => lobe(i / 3));
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.fillStyle = 'rgba(150,204,204,0.5)';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  edge.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  // Streaks of light running out through it.
  for (let i = 4; i < 118; i += 7) {
    const p = edge[i]!;
    const v = 0.5 + 0.1 * (i % 4);
    const q = { x: c.x + (p.x - c.x) * v, y: c.y + (p.y - c.y) * v };
    taper(ctx, [q, { x: (p.x + q.x) / 2 + 3, y: (p.y + q.y) / 2 }, p], 0.8, 5, '#f4fbfa', 0.34);
  }
  // The foam lip: lumps of white, thick in places, broken in others, with bubbles left behind it.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 120; i++) {
    const thick = Math.sin(i * 0.31 + 1) + 0.6 * Math.sin(i * 0.77);
    if (thick < -0.55) continue;
    const p = edge[i]!;
    const r = 3.5 + 4.2 * (thick + 1) * 0.5 + 1.6 * Math.sin(i * 2.9);
    ctx.globalAlpha = strength * 0.86;
    ctx.beginPath();
    ctx.arc(p.x + 3 * Math.sin(i * 1.7), p.y + 3 * Math.cos(i * 2.3), Math.max(1.5, r), 0, Math.PI * 2);
    ctx.fill();
    if (i % 3 === 0) {
      ctx.globalAlpha = strength * 0.6;
      ctx.beginPath();
      ctx.arc(p.x + 12 * Math.sin(i * 0.9), p.y - 8 - 12 * Math.abs(Math.sin(i * 1.3)), 1.2 + 1.2 * Math.abs(Math.sin(i * 4.1)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Small drops flicked up by a bird washing, around (x, y). */
export function drawBathSplash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, period: number, amount: number, seed: number): void {
  if (amount <= 0.02) return;
  const rng = createRng(seed);
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.4;
    const v = 120 + rng() * 150;
    const age = fract(t / period + rng()) * period;
    drop(ctx, x + Math.cos(a) * (r + v * age), y + Math.sin(a) * v * age + 0.5 * GRAVITY * age * age, 2.2 + rng() * 3.4, Math.cos(a) * v, Math.sin(a) * v + GRAVITY * age, amount * (1 - age / period));
  }
}

/** One grey-blue feather drifting down, swaying. */
export function drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, turn: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, -size, 0, size);
  g.addColorStop(0, '#39424f');
  g.addColorStop(0.5, '#8d9bae');
  g.addColorStop(1, '#c6d0da');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.42, -size * 0.2, 0, size);
  ctx.quadraticCurveTo(-size * 0.42, -size * 0.2, 0, -size);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.9);
  ctx.lineTo(0, size * 1.2);
  ctx.stroke();
  ctx.restore();
}
