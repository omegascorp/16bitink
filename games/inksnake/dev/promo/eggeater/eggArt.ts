import { type Draw, oval, shade } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { mix, rgba } from '../../../src/art/wash';
import { LINE } from './bodyArt';
import { type ShellPose } from './story';

/**
 * The eggs and shells, painted as the game paints its savanna eggs (src/art/
 * chapters/savannaCrittersEggs.ts: a cream ground, a warm glaze, round shade
 * and a window of light, brown speckles denser at the blunt end): a guineafowl-
 * sized egg, whole and cracked; the crushed shell as a crumpled lump; the
 * shell folded flat; the yolk's golden glow.
 */

const SHELL = { base: '#f0e4c8', warm: '#dcc296', deep: '#a58a5c', speck: '#7a5a3c', cool: '#9a8a8e' } as const;

/** An egg's outline: the blunt end on the right. */
export function eggShape(x: number, y: number, rx: number, ry: number, n = 40): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: x + rx * Math.cos(a) * (1 + 0.07 * Math.cos(a)), y: y + ry * Math.sin(a) * (1 - 0.04 * Math.cos(a)) };
  });
}

interface Speck {
  readonly u: number;
  readonly v: number;
  readonly r: number;
  readonly cool: boolean;
}

/** The speckles, as places on the egg (-1..1 each way), the same every frame. */
const SPECKS: readonly Speck[] = (() => {
  const rng = createRng(9021);
  const out: Speck[] = [];
  while (out.length < 120) {
    const u = rng() * 2 - 1;
    const v = rng() * 2 - 1;
    if (u * u + v * v > 0.86) continue;
    if (rng() > 0.35 + 0.5 * (u + 1) * 0.5) continue;
    out.push({ u, v, r: 0.22 + rng() * 0.55, cool: rng() < 0.3 });
  }
  return out;
})();

/** The crack: a zigzag across the top and down the side, as places (-1..1). */
const CRACK: readonly Pt[] = [
  { x: -0.55, y: -0.78 }, { x: -0.4, y: -0.6 }, { x: -0.5, y: -0.42 }, { x: -0.25, y: -0.3 }, { x: -0.3, y: -0.08 }, { x: -0.05, y: 0.04 },
  { x: -0.12, y: 0.28 }, { x: 0.12, y: 0.4 }, { x: 0.06, y: 0.66 },
];
const CRACK2: readonly Pt[] = [{ x: -0.25, y: -0.3 }, { x: 0.02, y: -0.36 }, { x: 0.18, y: -0.62 }, { x: 0.4, y: -0.66 }];

/** A whole egg (or, with `crack` above 0, a cracking one), centred at (x, y). `lift` shows its shadow on the ground below it. */
export function drawEgg(d: Draw, x: number, y: number, rx: number, ry: number, crack = 0, lift = 0): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const shape = eggShape(x, y, rx, ry);
  // Contact shadow on the ground.
  if (y + ry > -4) {
    const shrink = 1 / (1 + lift / 40);
    pen.fill(oval(x, 0.6, rx * 0.95 * shrink, 2.4 * shrink, 28), '#1c120a', 0.4 * shrink);
  }
  pen.fill(shape, PAPER_FILL, 1);
  ctx.save();
  const g = ctx.createLinearGradient(x - rx * 0.5, y - ry, x + rx * 0.5, y + ry);
  g.addColorStop(0, SHELL.base);
  g.addColorStop(0.55, mix(SHELL.base, SHELL.warm, 0.5));
  g.addColorStop(1, SHELL.warm);
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  // Round shade: the lower right and the far rim, a warm glaze low down.
  const sh = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, ry * 0.2, x, y, ry * 1.25);
  sh.addColorStop(0, 'rgba(255,250,235,0)');
  sh.addColorStop(0.7, rgba(SHELL.deep, 0.18));
  sh.addColorStop(1, rgba(SHELL.deep, 0.5));
  ctx.fillStyle = sh;
  ctx.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 2 + 4);
  // Speckles.
  for (const s of SPECKS) {
    ctx.fillStyle = s.cool ? SHELL.cool : SHELL.speck;
    ctx.globalAlpha = s.cool ? 0.45 : 0.75;
    ctx.beginPath();
    ctx.ellipse(x + s.u * rx * 0.94, y + s.v * ry * 0.94, s.r * (rx / 20) + 0.2, s.r * 0.8 * (rx / 20) + 0.15, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  shade(d, shape, 0.14);
  // The window of light, and a pale rim.
  pen.fill(oval(x - rx * 0.34, y - ry * 0.4, rx * 0.3, ry * 0.15, 20).map((p) => rotate(p, { x: x - rx * 0.34, y: y - ry * 0.4 }, -0.5)), PAPER_FILL, 0.55);
  pen.dot(x - rx * 0.42, y - ry * 0.46, Math.max(0.5, rx * 0.04), PAPER_FILL, 0.95);
  pen.hair(shape.slice(24, 34).map((p) => ({ x: p.x * 0.94 + x * 0.06, y: p.y * 0.94 + y * 0.06 })), 0.4, PAPER_FILL, 0.45);
  if (crack > 0) drawCrack(d, x, y, rx, ry, crack);
  pen.stroke([...shape, shape[0]!], 0.62, LINE, 0.95);
}

const rotate = (p: Pt, c: Pt, a: number): Pt => ({
  x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a),
  y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a),
});

function drawCrack(d: Draw, x: number, y: number, rx: number, ry: number, amount: number): void {
  const show = (line: readonly Pt[]): Pt[] => {
    const n = Math.max(2, Math.ceil(line.length * amount));
    return line.slice(0, n).map((p) => ({ x: x + p.x * rx, y: y + p.y * ry }));
  };
  for (const line of [CRACK, CRACK2]) {
    const pts = show(line);
    if (pts.length < 2) continue;
    d.pen.stroke(pts.map((p) => ({ x: p.x + 0.5, y: p.y + 0.4 })), 1.4, '#fff6dc', 0.9, false);
    d.pen.stroke(pts, 0.9, '#3a2616', 1, false);
  }
}

/** The crushed shell: a small crumpled lump, pale facets and dark creases. */
export function drawLump(d: Draw, x: number, y: number, rx: number, ry: number): void {
  const { pen } = d;
  const rng = createRng(5513);
  const shape: Pt[] = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2;
    const j = 0.78 + rng() * 0.4;
    return { x: x + Math.cos(a) * rx * j, y: y + Math.sin(a) * ry * j };
  });
  pen.fill(shape, SHELL.base, 1);
  pen.fill(shape.slice(0, 5).concat([{ x, y }]), SHELL.warm, 0.6);
  pen.fill(shape.slice(5, 9).concat([{ x, y }]), SHELL.deep, 0.35);
  for (let i = 0; i < 4; i++) pen.hair([{ x, y }, shape[(i * 3 + 1) % shape.length]!], 0.45, LINE, 0.7);
  for (let i = 0; i < 14; i++) pen.dot(x + (rng() - 0.5) * rx * 1.3, y + (rng() - 0.5) * ry * 1.3, 0.35 + rng() * 0.3, SHELL.speck, 0.7);
  pen.stroke([...shape, shape[0]!], 0.55, LINE, 0.95);
}

/**
 * The shell after the pop: a crumpled boat of shell, the two halves pressed
 * together, flattening (by `pose.fold`) into a low, creased hull lying flat
 * on its keel: pointed ends tipped up, a sliver of the pale inside along its
 * rim, cracks across it, speckles. `pose.y` is where its keel is.
 */
export function drawShell(d: Draw, pose: ShellPose): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const f = pose.fold;
  const L = 11 + 1.5 * f;
  const H = 6.2 - 3.4 * f;
  const n = 28;
  const us = Array.from({ length: n + 1 }, (_, i) => -1 + (2 * i) / n);
  const jag = (i: number): number => (1 - f) * 0.7 * Math.sin(i * 2.3) * Math.sin(i * 0.9 + 1);
  const keel = (u: number): number => -H * 0.3 * u * u;
  const rim = (u: number, i: number): number => {
    const e = Math.abs(u) ** 5;
    return (-H * (0.8 + 0.22 * u * u) + jag(i)) * (1 - e) + keel(u) * e;
  };
  // The pale inside, seen over the near rim: a narrow lens, widest amidships.
  const lip = (u: number): number => H * (0.16 + 0.14 * (1 - f)) * (1 - u * u);
  const P = (x: number, y: number): Pt => ({ x, y });
  const top = us.map((u, i) => P(u * L, rim(u, i)));
  const bottom = us.map((u) => P(u * L, keel(u)));
  const inner = us.map((u, i) => P(u * L, rim(u, i) - lip(u)));
  ctx.save();
  ctx.globalAlpha = pose.alpha;
  // Its shadow on the ground, tight under it once it lies there.
  const air = Math.max(0, -pose.y - 1);
  const k = 1 / (1 + air / 25);
  pen.fill(oval(pose.x + 0.6, 0.35, L * 1.05 * k, (1.1 + 0.4 * (1 - f)) * k, 26), '#1c120a', 0.38 * k);
  ctx.translate(pose.x, pose.y + 1);
  ctx.rotate(pose.rot);
  const hull = [...inner, ...bottom.slice().reverse()];
  // The inside: pale membrane, in shadow under the far rim.
  pen.fill([...inner, ...top.slice().reverse()], '#fffaf0', 1);
  pen.fill([...inner, ...inner.map((p, i) => P(p.x, p.y + lip(us[i]!) * 0.45)).reverse()], SHELL.cool, 0.4);
  // The near side of the hull: cream, warm and darker towards the keel, a highlight along the rim.
  pen.fill(hull, SHELL.base, 1);
  pen.fill([...us.map((u, i) => P(u * L, (rim(u, i) + keel(u)) / 2 + 0.2)), ...bottom.slice().reverse()], SHELL.warm, 0.75);
  pen.fill([...us.map((u, i) => P(u * L, keel(u) - H * 0.16 * (1 - u * u))), ...bottom.slice().reverse()], SHELL.deep, 0.5);
  pen.hair(us.slice(3, -3).map((u, i) => P(u * L, rim(u, i + 3) + 0.55)), 0.4, PAPER_FILL, 0.7);
  // Cracks pressed across it, zigzag, and speckles.
  const rng = createRng(7711);
  pen.clipped(hull, () => {
    for (let i = 0; i < 6; i++) {
      const u = -0.78 + i * 0.31 + (rng() - 0.5) * 0.08;
      const x = u * L;
      const y0 = rim(u, Math.round(((u + 1) / 2) * n)) - 0.3;
      const y1 = keel(u) + 0.3;
      pen.hair([P(x, y0), P(x + 0.7, y0 + (y1 - y0) * 0.35), P(x - 0.3, y0 + (y1 - y0) * 0.65), P(x + 0.4, y1)], 0.32, LINE, 0.7);
      pen.hair([P(x + 0.25, y0), P(x + 0.95, y0 + (y1 - y0) * 0.35)], 0.22, PAPER_FILL, 0.6);
    }
    for (let i = 0; i < 22; i++) {
      const u = (rng() - 0.5) * 1.8;
      const y = rim(u, 0) * (0.15 + rng() * 0.7);
      pen.dot(u * L, y, 0.3 + rng() * 0.32, SHELL.speck, 0.8);
    }
  });
  pen.stroke([...top, ...bottom.slice().reverse(), top[0]!], 0.58, LINE, 0.95);
  pen.hair(inner.slice(2, -2), 0.38, LINE, 0.8);
  ctx.restore();
}

/** The yolk's golden glow, shining through the skin. */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, glow: number, r = 13): void {
  if (glow <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,236,150,${0.95 * glow})`);
  g.addColorStop(0.4, `rgba(255,190,70,${0.6 * glow})`);
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
