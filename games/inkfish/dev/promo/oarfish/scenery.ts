import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import type { Pt } from './body';
import { toScreen, type View } from './ribbon';
import { LOOP_S, sandAt, seabedAt } from './story';

/**
 * The world behind the oarfish, in pen and ink: paper sky, the sea in
 * cross-section getting darker with depth, a beach and the ground under it,
 * Fuji and a red sun, the great wave, the wash that strands the fish and
 * the crack the quake opens.
 */
const SKY = PAPER;
/** The water's colour by depth (m), the deep compressed: the camera only travels tens of metres. */
const WATER: readonly (readonly [number, string])[] = [
  [0, '#a8bcc1'],
  [1.2, '#6e8e9c'],
  [3.2, '#2f4b6b'],
  [6, '#13223f'],
  [9.5, '#0b142e'],
  [15, '#060b1d'],
  [24, '#03060f'],
];
const GROUND: readonly (readonly [number, string])[] = [
  [-1.2, '#e6d7b2'],
  [0.4, '#d2bf93'],
  [1.4, '#7c705c'],
  [5, '#3a3540'],
  [14, '#17161f'],
  [30, '#08080d'],
];
const WAVE_BLUE = '#27476d';
const WAVE_MID = '#4f7aa0';
const FOAM = '#f6f1e4';
const SUN = '#d8302b';

function linePath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** A vertical gradient on screen for colour stops given in world depth. */
function depthGradient(ctx: CanvasRenderingContext2D, view: View, stops: readonly (readonly [number, string])[]): CanvasGradient {
  const y0 = toScreen(view, { x: 0, y: stops[0]![0] }).y;
  const y1 = toScreen(view, { x: 0, y: stops[stops.length - 1]![0] }).y;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  const span = stops[stops.length - 1]![0] - stops[0]![0];
  for (const [d, c] of stops) g.addColorStop((d - stops[0]![0]) / span, c);
  return g;
}

/** Sea level's ripple, m (negative is up), rolling a whole number of times per loop. */
export function surfaceAt(x: number, t: number): number {
  const roll = (2 * Math.PI * t * 6) / LOOP_S;
  return 0.045 * Math.sin(x * 2.1 - roll) + 0.025 * Math.sin(x * 4.7 + roll * 2);
}

/** Sky, and the water below sea level, darkening with depth. */
export function drawSkyAndSea(ctx: CanvasRenderingContext2D, view: View, t: number): void {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const top = surfaceLine(view, t);
  ctx.save();
  ctx.beginPath();
  top.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(VIDEO.width + 20, VIDEO.height + 20);
  ctx.lineTo(-20, VIDEO.height + 20);
  ctx.closePath();
  ctx.fillStyle = depthGradient(ctx, view, WATER);
  ctx.fill();
  ctx.restore();
}

/** The surface across the screen, as screen points. */
function surfaceLine(view: View, t: number): Pt[] {
  const pts: Pt[] = [];
  const x0 = view.x - (540 + 40) / view.zoom;
  const x1 = view.x + (540 + 40) / view.zoom;
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push(toScreen(view, { x, y: surfaceAt(x, t) }));
  }
  return pts;
}

/** The surface's ink line and a few wave strokes on the water, over the sea part. */
export function drawSurfaceInk(ctx: CanvasRenderingContext2D, view: View, t: number): void {
  const line = surfaceLine(view, t);
  if (line.every((p) => p.y < -10 || p.y > VIDEO.height + 10)) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, Math.min(3.5, view.zoom * 0.018));
  linePath(ctx, line);
  ctx.stroke();
  ctx.restore();
}

/** Fuji far off over the land (its peak, m) and a red sun beside it. */
const FUJI = { x: 2.45, y: -2.3, half: 2.4, top: 0.17, base: -0.15 } as const;
const SUN_AT = { x: 3.45, y: -2.95, r: 0.36 } as const;

export function drawFuji(ctx: CanvasRenderingContext2D, view: View): void {
  const peak = toScreen(view, FUJI);
  if (peak.y > VIDEO.height + 50 || peak.y < -900) return;
  const sun = toScreen(view, SUN_AT);
  ctx.save();
  ctx.fillStyle = SUN;
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, SUN_AT.r * view.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The mountain: long concave flanks sweeping out from a flat-topped peak.
  const flank = (side: number): Pt[] =>
    Array.from({ length: 16 }, (_, i) => {
      const u = i / 15;
      return toScreen(view, { x: FUJI.x + side * (FUJI.top + (FUJI.half - FUJI.top) * u), y: FUJI.y + (FUJI.base - FUJI.y) * (1 - (1 - u) ** 1.8) });
    });
  const right = flank(1);
  const left = flank(-1);
  ctx.fillStyle = '#c3cbd0';
  linePath(ctx, [...[...left].reverse(), ...right]);
  ctx.closePath();
  ctx.fill();
  // Snowcap with a ragged lower edge.
  const capN = 5;
  ctx.fillStyle = FOAM;
  ctx.beginPath();
  left.slice(0, capN + 1).reverse().forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  right.slice(0, capN + 1).forEach((p) => ctx.lineTo(p.x, p.y));
  const [l, r] = [left[capN]!, right[capN]!];
  for (let k = 1; k < 8; k++) {
    const u = k / 8;
    ctx.lineTo(r.x + (l.x - r.x) * u, r.y + (l.y - r.y) * u + (k % 2 === 1 ? 0.22 : 0.05) * view.zoom);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.6, view.zoom * 0.015);
  linePath(ctx, [...[...left].reverse(), ...right]);
  ctx.stroke();
  // Ridges down the flanks.
  ctx.lineWidth = Math.max(1, view.zoom * 0.008);
  ctx.globalAlpha = 0.55;
  for (const k of [-0.7, -0.3, 0.1, 0.5, 0.8]) {
    const a = toScreen(view, { x: FUJI.x + k * FUJI.top, y: FUJI.y + 0.08 });
    const b = toScreen(view, { x: FUJI.x + k * 0.9, y: FUJI.y + 1.3 });
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) / 2 + k * 6, (a.y + b.y) / 2, b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Strata lines in the ground, fixed. */
const STRATA = (() => {
  const rng = createRng(31);
  return [0.55, 1.3, 2.3, 3.6, 5.2, 7.4, 10, 13.5, 17, 22, 28].map((y) => ({ y, phase: rng() * 6, amp: 0.05 + rng() * 0.08 }));
})();
const PEBBLES = (() => {
  const rng = createRng(57);
  return Array.from({ length: 220 }, () => ({ x: -12 + rng() * 26, y: rng() * 30, r: 0.02 + rng() * 0.05 }));
})();

/** The land in cross-section: the beach and the ground under it, the seabed dropping away into the deep. */
export function drawGround(ctx: CanvasRenderingContext2D, view: View): void {
  const outline: Pt[] = [];
  for (let x = 0; x <= 30; x += 0.25) outline.push({ x, y: sandAt(x) });
  outline.push({ x: 30, y: 60 });
  for (let y = 60; y >= 0; y -= 0.25) outline.push({ x: seabedAt(y), y });
  const pts = outline.map((p) => toScreen(view, p));
  if (pts.every((p) => p.x > VIDEO.width + 10) || pts.every((p) => p.y > VIDEO.height + 10)) return;
  ctx.save();
  linePath(ctx, pts);
  ctx.closePath();
  ctx.fillStyle = depthGradient(ctx, view, GROUND);
  ctx.fill();
  ctx.clip();
  // Strata, following the sand's slope a little.
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (const s of STRATA) {
    ctx.globalAlpha = s.y < 2 ? 0.35 : 0.5;
    ctx.lineWidth = Math.max(1, Math.min(2.4, view.zoom * 0.011));
    const row: Pt[] = [];
    for (let x = seabedAt(s.y) - 0.2; x <= 30; x += 0.3) row.push(toScreen(view, { x, y: s.y + 0.5 * sandAt(x) + s.amp * Math.sin(x * 1.7 + s.phase) }));
    linePath(ctx, row);
    ctx.stroke();
  }
  // Pebbles and grit.
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.45;
  for (const p of PEBBLES) {
    const q = toScreen(view, { x: p.x, y: p.y + 0.6 });
    if (q.x < -10 || q.x > VIDEO.width + 10 || q.y < -10 || q.y > VIDEO.height + 10) continue;
    ctx.beginPath();
    ctx.arc(q.x, q.y, Math.max(0.8, p.r * view.zoom * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The sand's edge and the seabed's, in ink.
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.6, Math.min(3.5, view.zoom * 0.018));
  linePath(ctx, pts.slice(0, outline.findIndex((p) => p.x === 30 && p.y === 60)));
  ctx.stroke();
  linePath(ctx, pts.slice(outline.findIndex((p) => p.x === 30 && p.y === 60) + 1));
  ctx.stroke();
  ctx.restore();
}

/** Sand stipple on the beach, fixed. */
const SAND = (() => {
  const rng = createRng(91);
  return Array.from({ length: 160 }, () => ({ x: rng() * 7, down: rng() * 0.5, r: 0.6 + rng() * 1.2 }));
})();
export function drawSandStipple(ctx: CanvasRenderingContext2D, view: View): void {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.4;
  for (const s of SAND) {
    const p = toScreen(view, { x: s.x, y: sandAt(s.x) + 0.05 + s.down });
    if (p.y < -10 || p.y > VIDEO.height + 10) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The great wave, out at sea and curling towards the beach: `height` m
 * tall, its base's front at x = `front` m. Deep blue with the woodblock's
 * lines following its flow, a foaming lip that breaks into hooked claws
 * hanging over the hollow, and spray.
 */
const WAVE_BACK: readonly Pt[] = [
  { x: -2.6, y: 0 }, { x: -2.0, y: 0.08 }, { x: -1.5, y: 0.26 }, { x: -1.05, y: 0.55 }, { x: -0.65, y: 0.83 }, { x: -0.28, y: 0.99 },
  { x: 0.08, y: 1.03 }, { x: 0.42, y: 0.95 }, { x: 0.68, y: 0.76 }, { x: 0.76, y: 0.56 },
];
const WAVE_CURL: readonly Pt[] = [
  { x: 0.66, y: 0.5 }, { x: 0.52, y: 0.6 }, { x: 0.34, y: 0.66 }, { x: 0.16, y: 0.6 }, { x: 0.04, y: 0.46 }, { x: 0.0, y: 0.3 },
  { x: 0.06, y: 0.15 }, { x: 0.22, y: 0.05 }, { x: 0.5, y: 0 },
];
export function drawGreatWave(ctx: CanvasRenderingContext2D, view: View, height: number, front: number, t: number): void {
  if (height <= 0) return;
  const w = (2 * Math.PI * t) / LOOP_S;
  const at = (p: Pt): Pt => toScreen(view, { x: front - 0.5 * height + p.x * height, y: -p.y * height * (1 + 0.02 * Math.sin(w * 8 + p.x)) });
  const body = [...WAVE_BACK, ...WAVE_CURL].map(at);
  const px = height * view.zoom;
  if (body.every((p) => p.y > VIDEO.height + 20 || p.x > VIDEO.width + 20)) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  linePath(ctx, body);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, at({ x: 0, y: 1 }).y, 0, at({ x: 0, y: 0 }).y);
  g.addColorStop(0, WAVE_MID);
  g.addColorStop(0.55, WAVE_BLUE);
  g.addColorStop(1, '#1d3656');
  ctx.fillStyle = g;
  ctx.fill();
  // Woodblock lines: following the back up and round into the curl.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = FOAM;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1.2, px * 0.006);
  for (let k = 1; k <= 8; k++) {
    const f = k / 9;
    const row = [...WAVE_BACK.slice(0, 8), ...WAVE_CURL.slice(1, 5)].map((p) => {
      const cx = 0.25;
      const cy = 0.55;
      return at({ x: cx + (p.x - cx) * (1 - f * 0.85) - f * 0.5, y: cy + (p.y - cy) * (1 - f * 0.85) - f * 0.35 });
    });
    linePath(ctx, row);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.8, Math.min(4, px * 0.007));
  linePath(ctx, body);
  ctx.closePath();
  ctx.stroke();
  // The foaming lip along the crest.
  const lip = WAVE_BACK.slice(5).map(at);
  ctx.strokeStyle = FOAM;
  ctx.lineWidth = Math.max(5, px * 0.05);
  linePath(ctx, lip);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, px * 0.005);
  linePath(ctx, lip.map((p) => ({ x: p.x, y: p.y - px * 0.025 })));
  ctx.stroke();
  // Claws hanging off the lip and round the curl, reaching forward and down.
  const claws = 15;
  for (let k = 0; k < claws; k++) {
    const u = k / (claws - 1);
    const p = WAVE_BACK.length - 5 + u * 4.5;
    const i = Math.min(WAVE_BACK.length - 2, Math.floor(p));
    const f = p - i;
    const a = WAVE_BACK[i]!;
    const b = WAVE_BACK[i + 1]!;
    const base = at({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    const len = px * (0.085 + 0.03 * Math.sin(k * 1.7 + w * 6)) * (0.75 + 0.5 * u);
    drawClaw(ctx, base, len, -0.2 + 1.7 * u);
  }
  // Spray off the lip.
  ctx.fillStyle = FOAM;
  const rng = createRng(13);
  for (let k = 0; k < 30; k++) {
    const u = rng();
    const p = at({ x: -0.1 + 0.95 * u + 0.05 * Math.sin(w * 7 + k), y: 1.08 - 0.45 * u * u + rng() * 0.16 });
    const r = Math.max(1.5, px * (0.006 + rng() * 0.008));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** One claw of foam: a tapering finger reaching out along `dir` (radians), its tip curling round. */
function drawClaw(ctx: CanvasRenderingContext2D, at: Pt, len: number, dir: number): void {
  const n = { x: -Math.sin(dir), y: Math.cos(dir) };
  const pt = (u: number, side: number): Pt => {
    const bend = 0.9 * u * u;
    const a = dir + bend;
    const r = len * u;
    const wd = len * 0.13 * (1 - u) * side;
    return { x: at.x + Math.cos(dir + bend * 0.5) * r - Math.sin(a) * wd, y: at.y + Math.sin(dir + bend * 0.5) * r + Math.cos(a) * wd };
  };
  ctx.fillStyle = FOAM;
  ctx.beginPath();
  for (let k = 0; k <= 8; k++) {
    const p = pt(k / 8, 1);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  // The curled tip.
  const tip = pt(1, 0);
  ctx.quadraticCurveTo(tip.x + n.x * len * 0.25, tip.y + n.y * len * 0.25, tip.x + (n.x * 0.1 - Math.cos(dir) * 0.18) * len, tip.y + (n.y * 0.1 - Math.sin(dir) * 0.18) * len);
  for (let k = 8; k >= 0; k--) {
    const p = pt(k / 8, -1);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** The wash: a thin sheet of foamy water running up the sand to x = `front`. */
export function drawWash(ctx: CanvasRenderingContext2D, view: View, front: number, t: number): void {
  const pts: Pt[] = [];
  const edge: Pt[] = [];
  for (let x = -1.2; x <= front; x += 0.08) {
    const thick = 0.09 * Math.min(1, (front - x) / 0.6) + 0.02;
    pts.push(toScreen(view, { x, y: Math.min(sandAt(x), seabedAt(0)) - thick - 0.01 }));
    edge.push(toScreen(view, { x, y: sandAt(x) + 0.02 }));
  }
  if (pts.length < 2) return;
  ctx.save();
  ctx.fillStyle = 'rgba(160,186,194,0.85)';
  linePath(ctx, [...pts, ...edge.reverse()]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  linePath(ctx, pts);
  ctx.stroke();
  // Foam scallops along the front.
  ctx.fillStyle = FOAM;
  const w = (2 * Math.PI * t) / LOOP_S;
  for (let k = 0; k < 9; k++) {
    const x = front - 0.08 - k * 0.17 - 0.05 * Math.sin(k * 2.3);
    const p = toScreen(view, { x, y: sandAt(x) - 0.08 - 0.05 * ((k * 7) % 3) });
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, (7 + 3 * Math.sin(w * 11 + k)) * (view.zoom / 160), (4 + 1.5 * Math.cos(k * 1.7)) * (view.zoom / 160), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The quake's crack: a jagged split up through the ground to the sand, opened as far as `u`. */
const CRACK = (() => {
  const rng = createRng(404);
  const pts: Pt[] = [];
  let x = 1.3;
  for (let y = 3.2; y > 0; y -= 0.16 + rng() * 0.14) {
    pts.push({ x, y });
    x += (rng() - 0.5) * 0.36;
  }
  pts.push({ x, y: sandAt(x) });
  return pts;
})();
export function drawCrack(ctx: CanvasRenderingContext2D, view: View, u: number): void {
  if (u <= 0) return;
  const n = Math.max(2, Math.ceil(CRACK.length * u));
  const pts = CRACK.slice(0, n).map((p) => toScreen(view, p));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  // A dark gap with a thin pale lip.
  ctx.lineWidth = 9;
  linePath(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = '#efe4c8';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  linePath(ctx, pts.map((p) => ({ x: p.x + 5, y: p.y })));
  ctx.stroke();
  ctx.restore();
}

/** Marine snow drifting in the dark, carried by the camera's travel and smeared along its motion. */
const SNOW = (() => {
  const rng = createRng(2025);
  return Array.from({ length: 240 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2 }));
})();
/** How the snow smears: the camera's pan (px over the blur time) and zoom (log change over it). */
export interface Smear {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
export function drawSnow(ctx: CanvasRenderingContext2D, t: number, shift: Pt, smear: Smear, surfaceY: number): void {
  if (surfaceY > VIDEO.height) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, Math.max(0, surfaceY), VIDEO.width, VIDEO.height);
  ctx.clip();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.3;
  const wrap = (v: number, m: number): number => ((v % m) + m) % m;
  const cap = (v: number): number => Math.max(-240, Math.min(240, v));
  for (const m of SNOW) {
    const x = wrap(m.x + shift.x + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase), VIDEO.width);
    const y = wrap(m.y + shift.y + (2 * VIDEO.height * t) / LOOP_S, VIDEO.height);
    // Its motion on screen over the blur time: the pan, plus out from (or in to) the middle as the camera zooms.
    const sx = cap(smear.x + (x - VIDEO.width / 2) * smear.zoom);
    const sy = cap(smear.y + (y - VIDEO.height / 2) * smear.zoom);
    if (Math.hypot(sx, sy) > m.r) {
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - sx, y - sy);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
