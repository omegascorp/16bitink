import { createRng, type Rng } from '../logic/rng';
import { oval, pt, type Draw } from './kit';
import { mix, rgba, soft } from './paint';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';
import { sphere } from './skyArt';

/**
 * Talus's sky and horizon (spec, "Talus"): thin air full of fine red dust,
 * so the day sky is butterscotch, as Mars's is, darker and browner
 * overhead where there's less air to light. The star is bigger here, nearer
 * than from any world so far, a hard white disc, and round it the sky turns
 * a pale blue, because dust that fine throws blue light forward (Mars's
 * sunsets are blue for the same reason). Brine hangs low, a blue-violet
 * point. Along the horizon, three ranges of mesas and buttes in aerial
 * perspective, flat-topped, banded, flaring into slopes of fallen rock at
 * their feet, with a dust devil walking across the flats. Both layers tile
 * side to side.
 */

const TOP = '#8a5a43';
const MID = '#c9926a';
const LOW = '#e8c09a';
const HAZE = '#f1d6b8';
const SUN = '#fffaf0';
const HALO = '#cfe0ea';

/** Draws `fn` at x, and again a canvas-width either side, so the layer tiles. */
function tiled(w: number, x: number, reach: number, fn: (ox: number) => void): void {
  for (const ox of [-w, 0, w]) if (x + ox + reach > 0 && x + ox - reach < w) fn(ox);
}

function blotch(ctx: CanvasRenderingContext2D, w: number, x: number, y: number, r: number, color: string, alpha: number): void {
  tiled(w, x, r, (ox) => {
    const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x + ox - r, y - r, r * 2, r * 2);
  });
}

export function drawTalusSky(d: Draw, w: number, h: number, horizon: number): void {
  const ctx = d.pen.ctx;
  const rng = createRng(414);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, TOP);
  g.addColorStop(0.45, MID);
  g.addColorStop(0.85, LOW);
  g.addColorStop(1, HAZE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = HAZE;
  ctx.fillRect(0, horizon - 1, w, h - horizon + 1);
  // Uneven pigment: dust lying in long bands, browner high up.
  for (let i = 0; i < 26; i++) blotch(ctx, w, rng() * w, rng() * horizon * 0.6, 90 + rng() * 200, rng() < 0.6 ? '#7b4a36' : '#e2b68f', 0.15);
  for (let i = 0; i < 8; i++) streak(ctx, rng, w, horizon);
  // The star: a wide pale-blue glow round it, then the hard white disc.
  const sun = pt(w * 0.68, horizon * 0.26);
  blotch(ctx, w, sun.x, sun.y, horizon * 0.42, HALO, 0.55);
  blotch(ctx, w, sun.x, sun.y, horizon * 0.16, '#eef6fa', 0.7);
  soft(ctx, 2, () => {
    ctx.fillStyle = SUN;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 30, 0, Math.PI * 2);
    ctx.fill();
  });
  // Brine, the next world out: a blue-violet point low in the sky, with a hint of a disc.
  const brine = pt(w * 0.18, horizon * 0.5);
  blotch(ctx, w, brine.x, brine.y, 10, '#b8b0ff', 0.6);
  const disc = oval(brine.x, brine.y, 3.2, 3.2, 16);
  sphere(d, brine, 3.2, disc, '#c8bdf2', '#5b4f9a');
  // The haze over everything, thicker towards the horizon.
  const veil = ctx.createLinearGradient(0, 0, 0, horizon);
  veil.addColorStop(0, rgba(MID, 0.1));
  veil.addColorStop(0.65, rgba(LOW, 0.3));
  veil.addColorStop(1, rgba(HAZE, 0.7));
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, horizon);
  grain(ctx, rng, w, horizon);
}

/** A long thin band of dust high up, lit on its top edge. */
function streak(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  const x = rng() * w;
  const y = horizon * (0.15 + rng() * 0.5);
  const len = 220 + rng() * 360;
  tiled(w, x, len, (ox) => {
    ctx.save();
    ctx.translate(x + ox, y);
    ctx.scale(1, 0.07);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len / 2);
    g.addColorStop(0, 'rgba(240, 200, 160, 0.28)');
    g.addColorStop(1, 'rgba(240, 200, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-len / 2, -len / 2, len, len);
    ctx.restore();
  });
}

function grain(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 7000; i++) {
    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() < 0.5 ? '#6a3b2a' : '#fbe7cf';
    ctx.fillRect(rng() * w, rng() * horizon, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
}

/** A range of mesas: where its ground lies, how tall it stands, its colour, how firmly it's inked, how soft, how lit. */
interface Range {
  readonly base: number;
  readonly height: number;
  readonly color: string;
  readonly ink: number;
  readonly blur: number;
  readonly light: number;
}

/** One mesa or butte: its middle, its top's width, its height, and how far its fallen rock flares out. */
interface Mesa {
  readonly x: number;
  readonly top: number;
  readonly h: number;
  readonly flare: number;
}

function mesas(rng: Rng, w: number, r: Range): Mesa[] {
  const out: Mesa[] = [];
  for (let x = rng() * 80; x < w; x += 160 + rng() * 260) {
    // Wide mesas and narrow buttes: a butte is what's left when a mesa wears down to its core.
    const butte = rng() < 0.3;
    const h = r.height * (butte ? 0.45 + rng() * 0.25 : 0.25 + rng() * 0.35);
    out.push({ x, top: butte ? 34 + rng() * 40 : 70 + rng() * 140, h, flare: h * (0.35 + rng() * 0.3) });
  }
  return out;
}

/** A mesa's outline standing on `base`: fallen rock flaring up to the cliff, the cliff, the flat top (a little worn at its edges), and down again. */
function shapeOf(m: Mesa, base: number, ox: number): Pt[] {
  const x = m.x + ox;
  const half = m.top / 2;
  const top = base - m.h;
  const cliff = base - m.h * 0.42;
  const pts: Pt[] = [pt(x - half - m.flare, base)];
  // The slope of fallen rock: concave, steepening as it climbs to the cliff.
  for (let k = 1; k <= 5; k++) {
    const t = k / 5;
    pts.push(pt(x - half - m.flare * (1 - t) - 4 * t, base - (base - cliff) * t * t));
  }
  pts.push(pt(x - half - 2, top + 3), pt(x - half + 3, top), pt(x + half - 3, top), pt(x + half + 2, top + 3));
  for (let k = 5; k >= 1; k--) {
    const t = k / 5;
    pts.push(pt(x + half + m.flare * (1 - t) + 4 * t, base - (base - cliff) * t * t));
  }
  pts.push(pt(x + half + m.flare, base));
  return pts;
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintRange(d: Draw, rng: Rng, w: number, h: number, r: Range): void {
  const ctx = d.pen.ctx;
  const ms = mesas(rng, w, r);
  const lit = mix(r.color, '#fff0dc', 0.3 * r.light);
  const shade = mix(r.color, '#3a1f2a', 0.4 * r.light);
  soft(ctx, r.blur, () => {
    ctx.fillStyle = r.color;
    ctx.fillRect(0, r.base, w, h - r.base);
    for (const m of ms) tiled(w, m.x, m.top / 2 + m.flare + 10, (ox) => {
      const body = shapeOf(m, r.base, ox);
      fill(ctx, body, r.color);
      ctx.save();
      ctx.beginPath();
      body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      const x = m.x + ox;
      const top = r.base - m.h;
      // The sunlit cliff on the left, the shaded one on the right.
      fill(ctx, [pt(x - m.top / 2 - m.flare, r.base), pt(x - m.top / 2 - 4, top), pt(x - m.top / 2 + 8, top), pt(x - m.top / 2 + 4, r.base)], lit, 0.5);
      fill(ctx, [pt(x + m.top / 2 - 6, top), pt(x + m.top / 2 + m.flare, r.base), pt(x + m.top / 2 + m.flare + 40, r.base), pt(x + m.top / 2 + 40, top)], shade, 0.45);
      // Bands of its layers, and the darker caprock along its top.
      for (let k = 1; k < 5; k++) {
        const y = top + m.h * 0.42 * (k / 5) + 2;
        ctx.globalAlpha = 0.18 * r.light;
        ctx.fillStyle = k % 2 ? shade : lit;
        ctx.fillRect(x - m.top, y, m.top * 2, m.h * 0.04 + 1);
      }
      ctx.globalAlpha = 0.5 * r.light + 0.2;
      ctx.fillStyle = mix(r.color, '#4a2a26', 0.45);
      ctx.fillRect(x - m.top, top, m.top * 2, Math.max(2, m.h * 0.06));
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  });
  // Dust lying along the range's foot, thickening into the ground band.
  const foot = ctx.createLinearGradient(0, r.base - r.height * 0.3, 0, r.base + 60);
  foot.addColorStop(0, rgba(HAZE, 0));
  foot.addColorStop(0.55, rgba(HAZE, 0.4 - r.light * 0.15));
  foot.addColorStop(1, rgba(HAZE, 0.65 - r.light * 0.2));
  ctx.fillStyle = foot;
  ctx.fillRect(0, r.base - r.height * 0.3, w, h - r.base + r.height * 0.3);
  if (r.ink <= 0) return;
  for (const m of ms) tiled(w, m.x, m.top / 2 + m.flare + 10, (ox) => d.pen.stroke(shapeOf(m, r.base, ox), 1, d.ink, r.ink, false));
  d.pen.stroke([pt(-20, r.base + 2), pt(w + 20, r.base + 2)], 1, d.ink, r.ink * 0.6, false);
}

/** A dust devil walking across the flats: a thin twisting column of dust, widening as it climbs, fading at the top. */
function dustDevil(d: Draw, x: number, base: number, height: number): void {
  const ctx = d.pen.ctx;
  for (let k = 0; k < 18; k++) {
    const t = k / 18;
    const y = base - height * t;
    const r = 3 + t * height * 0.16;
    const sway = Math.sin(t * 5) * height * 0.04;
    ctx.globalAlpha = 0.16 * (1 - t * 0.7);
    ctx.fillStyle = '#b97a56';
    ctx.beginPath();
    ctx.ellipse(x + sway, y, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  d.pen.hair([pt(x - 2, base), pt(x + Math.sin(2) * height * 0.04, base - height * 0.4), pt(x + Math.sin(4) * height * 0.04, base - height * 0.8)], 0.5, d.ink, 0.25);
}

export function drawTalusRidges(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const rng = createRng(437);
  const ranges: Range[] = [
    { base: horizon - 8, height: horizon * 0.75, color: '#e2b394', ink: 0, blur: 1.6, light: 0.3 },
    { base: horizon - 2, height: horizon * 0.55, color: '#c98a68', ink: 0.3, blur: 0.6, light: 0.6 },
    { base: horizon + 3, height: horizon * 0.34, color: mix(style.soil, '#a3553e', 0.35), ink: 0.85, blur: 0, light: 1 },
  ];
  paintRange(d, rng, w, h, ranges[0]!);
  paintRange(d, rng, w, h, ranges[1]!);
  dustDevil(d, w * 0.37, horizon - 1, horizon * 0.45);
  paintRange(d, rng, w, h, ranges[2]!);
}
