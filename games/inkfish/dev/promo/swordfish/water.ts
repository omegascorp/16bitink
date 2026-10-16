import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';

/**
 * The water and the heat: a sunlit wash and the dark of the deep (crossfaded
 * by depth), current marks and marine snow drifting past the swimming fish,
 * the frost that creeps in at "freezing", and the warm glow and shimmer of
 * a heated eye.
 */

export const EMBER = '#e2672a';
export const ICE = '#e3f2ff';
export const COLD = '#5a8fcc';
const GLOW_RGB = '255, 150, 60';

/** Paper washed with the sea: `shallow` blue in the light, `deep` near-black, the last daylight faint at the top. */
export function makeWater(): { readonly shallow: HTMLCanvasElement; readonly deep: HTMLCanvasElement } {
  const wash = (stops: readonly [number, string][], light: number): HTMLCanvasElement => {
    const canvas = makePaper();
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
    for (const [at, colour] of stops) g.addColorStop(at, colour);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    const sun = ctx.createRadialGradient(VIDEO.width * 0.6, -250, 60, VIDEO.width * 0.6, -250, 1300);
    sun.addColorStop(0, `rgba(230, 245, 255, ${light})`);
    sun.addColorStop(1, 'rgba(230, 245, 255, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    return canvas;
  };
  return {
    shallow: wash([[0, 'rgba(60, 145, 210, 0.3)'], [1, 'rgba(20, 70, 145, 0.62)']], 0.35),
    deep: wash([[0, 'rgba(18, 38, 74, 0.93)'], [0.5, 'rgba(9, 20, 46, 0.96)'], [1, 'rgba(3, 7, 18, 0.98)']], 0.12),
  };
}

// ---------------------------------------------------------------- drifting marks

const TILE = { w: VIDEO.width * 1.3, h: VIDEO.height * 1.2 } as const;

interface Mark {
  readonly x: number;
  readonly y: number;
  /** Nearness, 0.35 (far, faint, slow) .. 1 (near). */
  readonly d: number;
  /** Tiles it drifts past in a loop: a whole number, so it comes round. */
  readonly laps: number;
  readonly size: number;
  readonly wave: boolean;
  readonly phase: number;
}

const MARKS: readonly Mark[] = (() => {
  const rng = createRng(7717);
  return Array.from({ length: 110 }, () => {
    const d = 0.35 + rng() * 0.65;
    return { x: rng() * TILE.w, y: rng() * TILE.h, d, laps: d > 0.7 ? 2 : 1, size: 0.6 + rng() * 0.8, wave: rng() < 0.45, phase: rng() * Math.PI * 2 };
  });
})();

const mod = (v: number, m: number): number => ((v % m) + m) % m;

/** Two colours mixed, `u` of the way from `a` to `b` (both #rrggbb). */
export function mix(a: string, b: string, u: number): string {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const c = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * u));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * The "~" current marks and specks of marine snow streaming back past the
 * fish as it swims (`loop` 0 → 1 over the video), rising as the camera
 * sinks (`sunk`, in tiles), spread out as the camera goes in (`zoom`).
 * Dark ink in the light, pale in the deep.
 */
export function drawMarks(ctx: CanvasRenderingContext2D, loop: number, sunk: number, zoom: number, deep: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  const colour = mix('#1b1a1f', '#cfe0f5', deep);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  for (const m of MARKS) {
    const spread = zoom ** m.d;
    const u = mod(m.x - loop * m.laps * TILE.w, TILE.w) - TILE.w / 2;
    const v = mod(m.y - sunk * TILE.h * m.d, TILE.h) - TILE.h / 2;
    const x = VIDEO.width / 2 + u * spread;
    const y = VIDEO.height / 2 + v * spread;
    const len = 56 * m.size * m.d * Math.sqrt(spread);
    ctx.globalAlpha = (0.1 + 0.18 * m.d) * (m.wave ? 1 - 0.4 * deep : 0.6 + 0.8 * deep);
    if (!m.wave) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, len * 0.04), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(1, len * 0.035);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = y + Math.sin(k * 1.4 + m.phase) * len * 0.07;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- frost

/**
 * An ice crystal: a straight spine from `from` heading `angle`, with pairs
 * of side arms at 60° (as ice grows), shorter towards the tip, each arm
 * branching again (`depth` levels).
 */
function crystal(pen: Pen, rng: () => number, from: Pt, angle: number, len: number, depth: number, width: number): void {
  const a = angle + (rng() - 0.5) * 0.08;
  const tip = { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
  pen.stroke([from, { x: (from.x + tip.x) / 2, y: (from.y + tip.y) / 2 }, tip], width, ICE, 0.95, false);
  if (depth <= 0) return;
  const arms = depth > 1 ? 5 : 3;
  for (let i = 1; i <= arms; i++) {
    const s = i / (arms + 1);
    const at = { x: from.x + (tip.x - from.x) * s, y: from.y + (tip.y - from.y) * s };
    const arm = len * (0.38 * (1 - s) + 0.06) * (0.8 + 0.4 * rng());
    for (const side of [-1, 1]) crystal(pen, rng, at, a + (side * Math.PI) / 3, arm, depth - 1, width * 0.6);
  }
}

/** Where the crystals grow from: the corners, and along the top and sides, clear of the captions. */
const FROST_ROOTS: readonly { readonly at: Pt; readonly angle: number; readonly len: number }[] = [
  { at: { x: -10, y: -10 }, angle: 0.8, len: 330 },
  { at: { x: VIDEO.width + 10, y: -10 }, angle: Math.PI - 0.8, len: 330 },
  { at: { x: VIDEO.width * 0.3, y: -10 }, angle: 1.4, len: 190 },
  { at: { x: VIDEO.width * 0.7, y: -10 }, angle: 1.75, len: 170 },
  { at: { x: -10, y: VIDEO.height * 0.3 }, angle: 0.2, len: 190 },
  { at: { x: VIDEO.width + 10, y: VIDEO.height * 0.33 }, angle: Math.PI - 0.15, len: 180 },
  { at: { x: -10, y: VIDEO.height * 0.52 }, angle: -0.3, len: 160 },
  { at: { x: VIDEO.width + 10, y: VIDEO.height * 0.5 }, angle: Math.PI + 0.3, len: 170 },
];

/** Frost over the frame's edges and corners, a pale haze where it is thickest, one canvas per boil frame. */
export function makeFrost(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
    for (const corner of [{ x: 0, y: 0 }, { x: VIDEO.width, y: 0 }]) {
      const haze = ctx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, 480);
      haze.addColorStop(0, 'rgba(225, 242, 255, 0.4)');
      haze.addColorStop(1, 'rgba(225, 242, 255, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    }
    // The same crystals every frame (rng), each drawn with its own wobble (pen).
    FROST_ROOTS.forEach((r, i) => crystal(new Pen(ctx, 401 + i * 53 + f * 977, 1.1), createRng(71 + i), r.at, r.angle, r.len, 2, 6));
    return canvas;
  });
}

// ---------------------------------------------------------------- heat

/** A soft orange glow of radius `r` about a point. */
export function drawGlow(ctx: CanvasRenderingContext2D, at: Pt, r: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, `rgba(${GLOW_RGB}, ${0.75 * alpha})`);
  g.addColorStop(0.4, `rgba(${GLOW_RGB}, ${0.35 * alpha})`);
  g.addColorStop(1, `rgba(${GLOW_RGB}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The eye burning orange: an ember iris round the pupil, ringed in ink, glowing out into the water. */
export function drawHotEye(ctx: CanvasRenderingContext2D, at: Pt, r: number, glow: number): void {
  if (glow <= 0) return;
  drawGlow(ctx, at, r * 4.2, glow);
  ctx.save();
  ctx.globalAlpha = Math.min(1, glow);
  const iris = ctx.createRadialGradient(at.x - r * 0.2, at.y - r * 0.2, r * 0.1, at.x, at.y, r);
  iris.addColorStop(0, '#ffe08a');
  iris.addColorStop(0.55, '#f08a32');
  iris.addColorStop(1, '#b8401c');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.98, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111216';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(at.x + r * 0.27, at.y - r * 0.27, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Heat shimmering up off the eye: three wavy strokes rising from it, their
 * waves running upwards (`loop` 0 → 1 over the video, a whole number of
 * waves a loop), fading as they rise.
 */
export function drawShimmer(ctx: CanvasRenderingContext2D, at: Pt, r: number, loop: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = EMBER;
  ctx.lineCap = 'round';
  [-1, 0, 1].forEach((k) => {
    const x0 = at.x + k * r * 1.05;
    const y0 = at.y - r * (1.5 - 0.3 * Math.abs(k));
    const rise = r * (4.2 - 0.9 * Math.abs(k));
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const u0 = i / steps;
      const u1 = (i + 1) / steps;
      const wave = (u: number): number => Math.sin(u * 9 - 2 * Math.PI * 26 * loop + k * 1.7) * r * 0.22 * (0.4 + u);
      ctx.globalAlpha = alpha * 0.95 * Math.sin(Math.PI * u0) ** 0.7;
      ctx.lineWidth = Math.max(2, r * 0.17 * (1 - 0.6 * u0));
      ctx.beginPath();
      ctx.moveTo(x0 + wave(u0), y0 - rise * u0);
      ctx.lineTo(x0 + wave(u1), y0 - rise * u1);
      ctx.stroke();
    }
  });
  ctx.restore();
}
