import { createRng, type Rng } from '../logic/rng';
import { pt, type Draw } from './kit';
import { mix, rgba, soft } from './paint';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';

/**
 * The rims of far craters along the horizon, painted in aerial perspective
 * (spec, "Art direction"): three ranges, each nearer one darker, warmer
 * and more firmly inked. Every peak is modelled as a landscape painter
 * blocks one in: the slope turned to the light (upper left) laid in warm,
 * the far side in a cool indigo shadow cut by a spur running down from the
 * summit, gullies scored into the lit faces, faint strata, a bright lip
 * along the crest and dust hazing each range's foot. Crater rims show as
 * a notched plateau with the bowl's far wall in shadow. Drawn from the
 * top-left of a `w`-wide canvas with the horizon at `horizon`; every shape
 * is drawn a canvas-width either side as well, so the layer tiles behind a
 * world that wraps.
 */
export const RIDGE_W = 3200;

const WARM = '#f2dcc0';
const COOL = '#262a55';
const HAZE = '#cdb9b4';

interface Range {
  readonly base: number;
  readonly height: number;
  readonly color: string;
  /** Pen alpha on the crest line. */
  readonly ink: number;
  /** How soft the range's edges are (far ranges are blurred by distance). */
  readonly blur: number;
  /** Hatching alpha in its shadows. */
  readonly hatch: number;
  readonly gullies: boolean;
}

/** The crest from x = 0 to w, back to the height it started at. Peaks and crater rims alternate with valleys. */
function crest(rng: Rng, w: number, base: number, height: number): Pt[] {
  const start = base - height * (0.08 + rng() * 0.1);
  const pts: Pt[] = [pt(0, start)];
  let x = 0;
  const unit = Math.max(50, height * 1.4);
  for (;;) {
    const span = unit * (0.6 + rng() * 1.2);
    if (x + span > w - unit * 0.5) break;
    const top = base - height * (0.35 + rng() * 0.65);
    if (rng() < 0.3) {
      // A crater rim: up to one lip, a notch for the bowl, the other lip a little lower.
      const lip = height * (0.06 + rng() * 0.06);
      pts.push(pt(x + span * 0.22, top), pt(x + span * 0.3, top + lip * 0.6), pt(x + span * 0.5, top + lip), pt(x + span * 0.7, top + lip * 0.5), pt(x + span * 0.8, top + lip * 0.25));
    } else {
      // A peak with a shoulder on one side, so no two look alike.
      const at = 0.35 + rng() * 0.3;
      const shoulder = rng() < 0.5 ? -1 : 1;
      if (shoulder < 0) pts.push(pt(x + span * (at - 0.18), top + height * (0.12 + rng() * 0.1)));
      pts.push(pt(x + span * at, top));
      if (shoulder > 0) pts.push(pt(x + span * (at + 0.16), top + height * (0.1 + rng() * 0.1)));
    }
    x += span;
    pts.push(pt(x, base - height * (0.04 + rng() * 0.2)));
  }
  pts.push(pt(w, start));
  return pts;
}

/** The crest broken up between its points, so rock reads as rock rather than a ruled line. */
function roughen(rng: Rng, c: readonly Pt[], amp: number): Pt[] {
  const out: Pt[] = [c[0]!];
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1]!;
    const b = c[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.floor(len / 14));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      out.push(pt(a.x + (b.x - a.x) * t + (rng() - 0.5) * 3, a.y + (b.y - a.y) * t + (rng() - 0.35) * amp * Math.min(1, len / 60)));
    }
    out.push(b);
  }
  return out;
}

/** Indices of the crest's summits (higher than both neighbours). */
function summits(c: readonly Pt[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < c.length - 1; i++) if (c[i]!.y < c[i - 1]!.y && c[i]!.y < c[i + 1]!.y) out.push(i);
  return out;
}

/** A line wandering from a to b in a few jagged steps: a spur or a gully. */
function jag(rng: Rng, a: Pt, b: Pt, steps: number, amp: number): Pt[] {
  const out: Pt[] = [a];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    out.push(pt(a.x + (b.x - a.x) * t + (rng() - 0.5) * amp, a.y + (b.y - a.y) * t));
  }
  out.push(b);
  return out;
}

function each(w: number, draw: (ox: number) => void): void {
  for (const ox of [-w, 0, w]) draw(ox);
}

function path(ctx: CanvasRenderingContext2D, pts: readonly Pt[], ox: number): void {
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + ox, p.y) : ctx.lineTo(p.x + ox, p.y)));
  ctx.closePath();
}

function paintRange(d: Draw, rng: Rng, w: number, h: number, r: Range): void {
  const ctx = d.pen.ctx;
  const coarse = crest(rng, w, r.base, r.height);
  const c = roughen(rng, coarse, r.height * 0.07);
  const body = [...c, pt(w, h), pt(0, h)];
  const top = r.base - r.height;
  const shadowCol = mix(r.color, COOL, 0.5);
  const litCol = mix(r.color, WARM, 0.35);
  // Shadow wedges: from each summit down its right slope to the next valley, closed by a spur from the summit to the foot.
  const wedges: Pt[][] = [];
  const gullies: Pt[][] = [];
  for (const i of summits(coarse)) {
    let j = i + 1;
    while (j + 1 < coarse.length && coarse[j + 1]!.y > coarse[j]!.y) j++;
    const peak = coarse[i]!;
    const valley = coarse[j]!;
    const foot = r.base + r.height * 0.1;
    // The spur leans away from the light, so each shadow is a wedge, not a slab.
    const spur = jag(rng, peak, pt(peak.x + (foot - peak.y) * (0.55 + rng() * 0.5), foot), 5, r.height * 0.06);
    const slope = c.filter((p) => p.x >= peak.x && p.x <= valley.x);
    wedges.push([...slope, pt(Math.max(valley.x, spur[spur.length - 1]!.x) + r.height * 0.2, foot), ...[...spur].reverse().slice(0, -1)]);
    // Gullies scored down the lit face, left of the summit.
    if (r.gullies) {
      for (let g = 0; g < 2; g++) {
        const k = Math.max(0, i - 1 - g);
        const fx = peak.x + (coarse[k]!.x - peak.x) * (0.25 + rng() * 0.45);
        const onCrest = pt(fx, crestY(c, fx) + 2);
        gullies.push(jag(rng, onCrest, pt(onCrest.x + r.height * (0.12 + rng() * 0.12), onCrest.y + r.height * (0.35 + rng() * 0.3)), 4, r.height * 0.03));
      }
    }
  }
  // The body: lit colour at the crest, the range's own colour lower down, dust hazing its foot.
  // Unclipped, so a far range's blur softens its crest too.
  soft(ctx, r.blur, () => {
    const g = ctx.createLinearGradient(0, top, 0, r.base + r.height * 0.15);
    g.addColorStop(0, litCol);
    g.addColorStop(0.55, r.color);
    g.addColorStop(1, mix(r.color, HAZE, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    each(w, (ox) => path(ctx, body, ox));
    ctx.fill();
  });
  ctx.save();
  ctx.beginPath();
  each(w, (ox) => path(ctx, body, ox));
  ctx.clip();
  soft(ctx, r.blur, () => {
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = shadowCol;
    ctx.beginPath();
    for (const wedge of wedges) each(w, (ox) => path(ctx, wedge, ox));
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  // Ink and light over it, crisp.
  for (const wedge of wedges) {
    each(w, (ox) => {
      if (r.hatch <= 0) return;
      const moved = wedge.map((p) => pt(p.x + ox, p.y));
      if (Math.max(...moved.map((p) => p.x)) < 0 || Math.min(...moved.map((p) => p.x)) > w) return;
      d.pen.hatch(moved, 3, 2.15, 0.45, { color: d.ink, alpha: r.hatch });
    });
  }
  for (const gully of gullies) {
    each(w, (ox) => {
      const moved = gully.map((p) => pt(p.x + ox, p.y));
      d.pen.hair(moved, 1.6, shadowCol, 0.35);
      d.pen.hair(moved.map((p) => pt(p.x - 1.2, p.y)), 0.5, d.ink, r.hatch * 1.4);
    });
  }
  // Faint strata running across the range.
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = d.ink;
  ctx.lineWidth = 0.6;
  for (let k = 0; k < 4; k++) {
    const y = top + r.height * (0.45 + k * 0.15);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 40) {
      // Whole cycles across the layer, so the strata meet themselves at the seam.
      const a = (Math.PI * 2 * x) / w;
      const yy = y + Math.sin(a * 35 + k * 1.7) * 3 + Math.sin(a * 139 + k) * 1.2;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The bright lip along the crest, inside the range.
  ctx.strokeStyle = rgba(WARM, 0.55);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  c.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 1.6) : ctx.lineTo(p.x, p.y + 1.6)));
  ctx.stroke();
  ctx.restore();
  if (r.ink > 0) each(w, (ox) => d.pen.stroke(c.map((p) => pt(p.x + ox, p.y)), 1.15, d.ink, r.ink, false));
}

/** The crest's height at x, by straight lines between its points. */
function crestY(c: readonly Pt[], x: number): number {
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1]!;
    const b = c[i]!;
    if (x <= b.x) return a.y + (b.y - a.y) * ((x - a.x) / Math.max(1e-6, b.x - a.x));
  }
  return c[c.length - 1]!.y;
}

export function drawRidges(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const rng = createRng(91);
  const ranges: Range[] = [
    { base: horizon - 10, height: horizon * 0.72, color: '#a3a2bd', ink: 0.18, blur: 1.4, hatch: 0, gullies: false },
    { base: horizon - 3, height: horizon * 0.5, color: '#908ea4', ink: 0.45, blur: 0.6, hatch: 0.12, gullies: true },
    { base: horizon + 2, height: horizon * 0.3, color: mix(style.stone, '#7d7a8c', 0.4), ink: 0.85, blur: 0, hatch: 0.28, gullies: true },
  ];
  for (const r of ranges) paintRange(d, rng, w, h, r);
}
