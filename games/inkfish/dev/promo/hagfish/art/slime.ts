import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { clamp } from './geom';

/**
 * Hagfish slime, kept clean: a translucent, glassy, milky-white gel. Volumes
 * are built from soft lobes (billows) and tapering ribbons, painted together
 * into one layer so they merge: the union gets a bright rim (gel is brightest
 * where you look through most of it, at its edges), a hollowed, see-through
 * middle, a cool shadow away from the light, crescent highlights and specular
 * glints on the lit side, and fine silky threads drawn through it along the
 * flow (real slime is threads in mucus). Never circles or bubbles; never green.
 */

export interface Lobe {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface Ribbon {
  readonly pts: readonly Pt[];
  /** Widest width. */
  readonly w: number;
  /** Where along it (0 .. 1) it is widest; it tapers to both ends from there. */
  readonly peak?: number;
}

/** A batch of gel, painted in one pass so its pieces merge. */
export interface Gel {
  readonly lobes: Lobe[];
  readonly ribbons: Ribbon[];
  /** Fine silky threads (paths), drawn through the gel. */
  readonly threads: Pt[][];
}

export const newGel = (): Gel => ({ lobes: [], ribbons: [], threads: [] });

const RIM = '238,250,253';
const SHADOW = '120,156,172';
const a3 = (n: number): string => clamp(n).toFixed(3);

let pads: CanvasRenderingContext2D[] = [];
/** Four scratch layers the size of the canvas: the volume, its insides (twice), its lit edge. */
function scratch(w: number, h: number): CanvasRenderingContext2D[] {
  if (pads.length === 0 || pads[0]!.canvas.width !== w || pads[0]!.canvas.height !== h) pads = [0, 1, 2, 3].map(() => makeCanvas(w, h).ctx);
  return pads;
}

/** The outline of a ribbon tapered to both ends, widest at `peak`. */
function ribbonShape(r: Ribbon, k: number): Pt[] {
  const { pts } = r;
  const n = pts.length;
  const peak = r.peak ?? 0.5;
  const side = (i: number, s: number): Pt => {
    const [a, b] = [pts[Math.max(0, i - 1)]!, pts[Math.min(n - 1, i + 1)]!];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const u = i / (n - 1);
    const f = u < peak ? u / (peak || 1) : (1 - u) / ((1 - peak) || 1);
    const half = r.w * 0.5 * k * (0.1 + 0.9 * Math.sin((Math.PI / 2) * clamp(f)) ** 0.7);
    return { x: pts[i]!.x - ((b.y - a.y) / len) * half * s, y: pts[i]!.y + ((b.x - a.x) / len) * half * s };
  };
  return [...pts.map((_, i) => side(i, 1)), ...pts.map((_, i) => side(n - 1 - i, -1))];
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function softDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, solid: number, colour: string, alpha = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${colour},${a3(alpha)})`);
  g.addColorStop(solid, `rgba(${colour},${a3(alpha)})`);
  g.addColorStop(1, `rgba(${colour},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paints `gel` onto `ctx` (in ctx's current transform), `alpha` its strength.
 * `light` is the direction towards the light, on screen.
 */
export function paintGel(ctx: CanvasRenderingContext2D, gel: Gel, alpha: number, light: Pt = { x: 0.45, y: -0.89 }): void {
  if (alpha <= 0.004 || (gel.lobes.length === 0 && gel.ribbons.length === 0 && gel.threads.length === 0)) return;
  const { width, height } = ctx.canvas;
  const [B, C, D, E] = scratch(width, height) as [CanvasRenderingContext2D, CanvasRenderingContext2D, CanvasRenderingContext2D, CanvasRenderingContext2D];
  const m = ctx.getTransform();
  const scale = Math.hypot(m.a, m.b) || 1;
  const unit = 1 / scale;
  const ll = Math.hypot(light.x, light.y) || 1;
  const L = { x: light.x / ll, y: light.y / ll };
  for (const c of [B, C, D, E]) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, width, height);
    c.setTransform(m);
  }
  // The whole volume, solid with soft edges.
  for (const l of gel.lobes) softDisc(B, l.x, l.y, l.r, Math.max(0.6, 1 - (22 * unit) / l.r), RIM);
  for (const r of gel.ribbons) {
    B.fillStyle = `rgba(${RIM},0.3)`;
    fillPoly(B, ribbonShape(r, 1.2));
    B.fillStyle = `rgba(${RIM},0.55)`;
    fillPoly(B, ribbonShape(r, 1));
  }
  // The lit edge: the volume less itself moved away from the light (a crescent along every edge that faces the lamp).
  const big = gel.lobes.reduce((s, l) => Math.max(s, l.r), 0) * scale;
  const d = Math.max(5, Math.min(24, big * 0.12));
  D.setTransform(1, 0, 0, 1, 0, 0);
  D.drawImage(B.canvas, 0, 0);
  D.globalCompositeOperation = 'destination-out';
  D.drawImage(B.canvas, -L.x * d, -L.y * d);
  D.globalCompositeOperation = 'source-in';
  D.fillStyle = '#ffffff';
  D.fillRect(0, 0, width, height);
  // The far edge, away from the light, a little darker (a lens).
  C.setTransform(1, 0, 0, 1, 0, 0);
  C.drawImage(B.canvas, 0, 0);
  C.globalCompositeOperation = 'destination-out';
  C.drawImage(B.canvas, L.x * d * 0.7, L.y * d * 0.7);
  C.globalCompositeOperation = 'source-in';
  C.fillStyle = `rgb(${SHADOW})`;
  C.fillRect(0, 0, width, height);
  B.setTransform(1, 0, 0, 1, 0, 0);
  B.globalCompositeOperation = 'source-atop';
  B.globalAlpha = 0.35;
  B.drawImage(C.canvas, 0, 0);
  B.globalAlpha = 1;
  B.globalCompositeOperation = 'source-over';
  C.globalCompositeOperation = 'source-over';
  C.clearRect(0, 0, width, height);
  C.setTransform(m);
  // Its insides: the billows' volume shrunk in from every side, cut back so the middle is see-through and
  // milky and a bright rim runs round the outside of the whole cloud (ribbons stay solid: they're thin).
  for (const l of gel.lobes) if (l.r * scale >= 40) softDisc(C, l.x, l.y, l.r, Math.max(0.82, 1 - (10 * unit) / l.r), '0,0,0');
  const e = Math.max(5, Math.min(26, big * 0.16));
  E.setTransform(1, 0, 0, 1, 0, 0);
  E.drawImage(C.canvas, 0, 0);
  E.globalCompositeOperation = 'destination-in';
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    E.drawImage(C.canvas, Math.cos(a) * e - L.x * e * 0.3, Math.sin(a) * e - L.y * e * 0.3);
  }
  E.globalCompositeOperation = 'source-over';
  B.setTransform(1, 0, 0, 1, 0, 0);
  B.globalCompositeOperation = 'destination-out';
  B.globalAlpha = 0.4;
  B.drawImage(E.canvas, 0, 0);
  B.globalAlpha = 1;
  B.setTransform(m);
  // A cool shade across the whole cloud, deepening away from the light, so it reads as a volume.
  if (gel.lobes.length > 0) {
    const xs = gel.lobes.map((l) => l.x);
    const ys = gel.lobes.map((l) => l.y);
    const c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + big / scale;
    const g = B.createLinearGradient(c.x + L.x * span, c.y + L.y * span, c.x - L.x * span, c.y - L.y * span);
    g.addColorStop(0, `rgba(${SHADOW},0)`);
    g.addColorStop(0.45, `rgba(${SHADOW},0.12)`);
    g.addColorStop(1, `rgba(${SHADOW},0.38)`);
    B.globalCompositeOperation = 'source-atop';
    B.fillStyle = g;
    B.fillRect(c.x - span * 1.5, c.y - span * 1.5, span * 3, span * 3);
  }
  // The lit edge laid on: a soft glow, then the crisp line.
  B.setTransform(1, 0, 0, 1, 0, 0);
  B.globalCompositeOperation = 'source-over';
  B.globalAlpha = 0.22;
  B.drawImage(D.canvas, L.x * d * 0.7, L.y * d * 0.7);
  B.drawImage(D.canvas, -L.x * d * 0.5, -L.y * d * 0.5);
  B.globalAlpha = 0.5;
  B.drawImage(D.canvas, 0, 0);
  B.globalAlpha = 1;
  B.setTransform(m);
  // Faint folds inside: the lit curve of each billow showing through the gel.
  const la0 = Math.atan2(L.y, L.x);
  B.lineCap = 'round';
  for (const [i, l] of gel.lobes.entries()) {
    if (l.r * scale < 22 || i % 2 === 1) continue;
    B.strokeStyle = 'rgba(255,255,255,0.14)';
    B.lineWidth = Math.max(1.2 * unit, l.r * 0.06);
    B.beginPath();
    B.arc(l.x, l.y, l.r * 0.72, la0 - 0.9, la0 + 0.6);
    B.stroke();
  }
  // A few specular glints on the biggest billows, where they face the lamp.
  const glints = [...gel.lobes].sort((a, b) => b.r - a.r).slice(0, Math.min(3, Math.round(gel.lobes.length / 8)));
  B.fillStyle = 'rgba(255,255,255,0.9)';
  const la = Math.atan2(L.y, L.x);
  for (const l of glints) {
    B.beginPath();
    B.ellipse(l.x + L.x * l.r * 0.55, l.y + L.y * l.r * 0.55, l.r * 0.16, l.r * 0.04, la + Math.PI / 2, 0, Math.PI * 2);
    B.fill();
  }
  // The silk: fine threads drawn through the gel along the flow (only where there is gel).
  B.globalCompositeOperation = 'source-atop';
  B.lineCap = 'round';
  B.lineJoin = 'round';
  for (const [i, th] of gel.threads.entries()) {
    B.strokeStyle = `rgba(255,255,255,${i % 3 === 0 ? 0.6 : 0.38})`;
    B.lineWidth = (i % 3 === 0 ? 1.6 : 1.1) * unit;
    B.beginPath();
    th.forEach((p, k) => (k ? B.lineTo(p.x, p.y) : B.moveTo(p.x, p.y)));
    B.stroke();
  }
  B.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= clamp(alpha);
  ctx.drawImage(B.canvas, 0, 0);
  ctx.restore();
}

/** A curling path leaving `from` at `dir`, `len` long, bending by `curlBy`. */
export function curl(from: Pt, dir: number, len: number, curlBy: number, n = 9): Pt[] {
  const out: Pt[] = [from];
  let { x, y } = from;
  for (let i = 1; i < n; i++) {
    const a = dir + curlBy * (i / (n - 1)) ** 1.3 + 0.12 * Math.sin(i * 0.8 + dir * 7);
    x += (Math.cos(a) * len) / (n - 1);
    y += (Math.sin(a) * len) / (n - 1);
    out.push({ x, y });
  }
  return out;
}

/** Threads running along a path, fanned across `spread` either side of it. */
export function threadsAlong(gel: Gel, pts: readonly Pt[], spread: number, count: number, seed: number, from = 0, to = 1): void {
  const rng = createRng(seed);
  const n = pts.length;
  for (let k = 0; k < count; k++) {
    const off = (rng() - 0.5) * 2 * spread;
    const wav = rng() * 6;
    const [a, b] = [Math.floor((from + rng() * 0.15) * (n - 1)), Math.ceil((to - rng() * 0.2) * (n - 1))];
    const line: Pt[] = [];
    for (let i = a; i <= b; i++) {
      const [p, q] = [pts[Math.max(0, i - 1)]!, pts[Math.min(n - 1, i + 1)]!];
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const u = (i - a) / ((b - a) || 1);
      const o = off * Math.sin(Math.PI * (0.15 + 0.85 * u)) + spread * 0.12 * Math.sin(wav + u * 3.5);
      line.push({ x: pts[i]!.x - ((q.y - p.y) / len) * o, y: pts[i]!.y + ((q.x - p.x) / len) * o });
    }
    if (line.length > 1) gel.threads.push(line);
  }
}

/**
 * A plume of slime billowing out of `at` along `dir`: lobes that swell as they
 * drift out (each `flow` 0 .. 1 a cycle, so a whole number of cycles loops),
 * threads drawn out along the plume.
 */
export function plume(gel: Gel, at: Pt, dir: number, reach: number, size: number, flow: number, seed: number, bend = 0): void {
  if (reach < 2 || size < 1) return;
  const rng = createRng(seed);
  const path = curl(at, dir, reach, bend, 10);
  const along = (u: number): Pt => {
    const f = clamp(u) * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(f));
    return { x: path[i]!.x + (path[i + 1]!.x - path[i]!.x) * (f - i), y: path[i]!.y + (path[i + 1]!.y - path[i]!.y) * (f - i) };
  };
  const LOBES = 6;
  for (let i = 0; i < LOBES; i++) {
    const u = (i / LOBES + flow) % 1;
    const p = along(u ** 0.85);
    const side = (rng() - 0.5) * size * 0.9 * u;
    const r = size * (0.35 + 0.75 * Math.sqrt(u)) * (0.8 + 0.4 * rng()) * Math.min(1, (1 - u) * 4 + 0.35);
    gel.lobes.push({ x: p.x - Math.sin(dir) * side, y: p.y + Math.cos(dir) * side, r });
  }
  gel.lobes.push({ x: at.x, y: at.y, r: size * 0.42 });
  gel.ribbons.push({ pts: path.slice(0, 7), w: size * 0.7, peak: 0.6 });
  threadsAlong(gel, path, size * 0.45, 2, seed + 1);
}

/**
 * A burst of gel around `centre`, `grow` 0 .. 1: plumes flung out all round,
 * billows swelling as they go.
 */
export function gelCloud(ctx: CanvasRenderingContext2D, centre: Pt, spread: number, grow: number, alpha: number, seed: number, sway = 0): void {
  if (alpha <= 0.004 || grow <= 0.001) return;
  const gel = newGel();
  burst(gel, centre, spread, grow, seed, sway);
  paintGel(ctx, gel, alpha);
}

export function burst(gel: Gel, centre: Pt, spread: number, grow: number, seed: number, sway = 0): void {
  const rng = createRng(seed);
  const eased = 1 - (1 - clamp(grow)) ** 3;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (rng() - 0.5) * 0.5;
    const reach = spread * (0.55 + 0.5 * rng()) * eased;
    plume(gel, { x: centre.x + Math.cos(a) * 30, y: centre.y + Math.sin(a) * 30 }, a, reach, spread * (0.18 + 0.08 * rng()) * (0.5 + 0.5 * eased), 0.9 + 0.05 * Math.sin(sway + i), seed + i * 13, (rng() - 0.5) * 2.2);
  }
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = spread * 0.3 * Math.sqrt(rng()) * eased;
    gel.lobes.push({ x: centre.x + Math.cos(a) * d + 8 * Math.sin(sway + i), y: centre.y + Math.sin(a) * d, r: spread * (0.14 + 0.1 * rng()) * (0.4 + 0.6 * eased) });
  }
}

/** A puff of slime bursting from `at`, `age` 0 .. 1, fading. */
export function slimePuff(ctx: CanvasRenderingContext2D, at: Pt, dir: number, age: number, size: number, seed: number): void {
  if (age <= 0 || age >= 1) return;
  const gel = newGel();
  plume(gel, at, dir, size * 2.2 * (1 - (1 - age) ** 2), size * 0.6, age * 0.3, seed);
  paintGel(ctx, gel, (1 - age) ** 0.7);
}

/** A small soft gel bead, drawn directly (for drips and beads on the skin): milky, brighter at its lit edge, a glint. */
export function glassBlob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number, rot = 0): void {
  if (alpha <= 0.004 || rx < 0.5) return;
  const a = clamp(alpha);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(rx * 0.25, rx * 0.3, rx * 0.05, 0, 0, rx);
  g.addColorStop(0, `rgba(${RIM},${a3(0.18 * a)})`);
  g.addColorStop(0.65, `rgba(${RIM},${a3(0.34 * a)})`);
  g.addColorStop(0.88, `rgba(${RIM},${a3(0.55 * a)})`);
  g.addColorStop(1, `rgba(${RIM},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a3(0.85 * a)})`;
  ctx.beginPath();
  ctx.ellipse(rx * 0.32, -rx * 0.45, rx * 0.22, rx * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A thin gel string along a path (drips), drawn directly: a soft milky ribbon with a bright core. */
export function glassStrand(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, alpha: number): void {
  if (alpha <= 0.004 || pts.length < 2) return;
  const a = clamp(alpha);
  ctx.save();
  ctx.fillStyle = `rgba(${RIM},${a3(0.4 * a)})`;
  fillPoly(ctx, ribbonShape({ pts, w, peak: 0.25 }, 1));
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,255,255,${a3(0.8 * a)})`;
  ctx.lineWidth = Math.max(1, w * 0.12);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}
