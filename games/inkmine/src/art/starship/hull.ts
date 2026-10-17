import { oval, pt, type Draw } from '../kit';
import { BOUNCE, dab, glow, LIGHT, mix, rgba, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { rivets, seam } from '../prospector/parts';

/**
 * The starship's shared drawing kit (index.ts): its colours, the way a
 * plated cylinder lying on its side is painted, its frames and plates, its
 * windows and lights, and the wear on it. Units are the ship's frame
 * (STARSHIP_ART), nose to the right, light from the upper left.
 */

/** How the ship stands: which systems are mended (logic/starship.ts). Its jump drive is always burnt out. */
export interface ShipLook {
  readonly power: boolean;
  readonly telescope: boolean;
  readonly tank: boolean;
  readonly engine: boolean;
}

export const COLOR = {
  hull: '#d6d1c4',
  hold: '#cbc5b6',
  bridge: '#d9d5ca',
  engine: '#727a8a',
  gunmetal: '#596173',
  dark: '#363b49',
  metal: '#a9b2be',
  stripe: '#3d4f86',
  ochre: '#d0a24c',
  pod: '#b48a55',
  ring: '#2c2f3d',
  radiator: '#97a4b8',
  ceramic: '#ece5d6',
  fibre: '#41444e',
  copper: '#b8723f',
  windowLit: '#ffe3a0',
  windowDark: '#333a52',
  glass: '#26314f',
  red: '#e0533f',
  green: '#63c27f',
  white: '#fff6e2',
  ion: '#8fc4ff',
  scorch: '#2a2633',
  grime: '#5a5560',
} as const;

/** One circumferential frame of a cylinder of radius `r` lying along x, its near half: it bulges `e` towards the nose. */
export function frameArc(x: number, r: number, e: number, cy = 0, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    return pt(x + Math.cos(a) * e, cy + Math.sin(a) * r);
  });
}

/** A cylinder lying along x from `x0` to `x1`: its far end bulging back, its near end bulging forward. */
export function drumShape(x0: number, x1: number, r: number, e: number, cy = 0): Pt[] {
  const near = frameArc(x1, r, e, cy);
  const far = frameArc(x0, r, e, cy).map((p) => pt(x0 - (p.x - x0), p.y)).reverse();
  return [...near, ...far];
}

/**
 * Plate rolled round a cylinder lying on its side, lit from above: a bright
 * band a third of the way down, a core shadow under it, light bounced up
 * into the keel, and an engraver's hatching along the shadow.
 */
export function cylinder(d: Draw, shape: readonly Pt[], color: string, y0: number, y1: number, o: { readonly hatch?: number; readonly gloss?: boolean } = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const xs = shape.map((p) => p.x);
  const x0 = Math.min(...xs) - 2;
  const x1 = Math.max(...xs) + 2;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const v = ctx.createLinearGradient(0, y0, 0, y1);
    v.addColorStop(0, mix(color, SHADOW, 0.25));
    v.addColorStop(0.08, color);
    v.addColorStop(0.24, mix(color, LIGHT, o.gloss ? 0.75 : 0.55));
    v.addColorStop(0.4, mix(color, LIGHT, 0.15));
    v.addColorStop(0.66, mix(color, SHADOW, 0.24));
    v.addColorStop(0.86, mix(color, SHADOW, 0.44));
    v.addColorStop(1, mix(color, BOUNCE, 0.45));
    ctx.fillStyle = v;
    ctx.fillRect(x0, y0 - 2, x1 - x0, y1 - y0 + 4);
    const h = ctx.createLinearGradient(x0, 0, x1, 0);
    h.addColorStop(0, rgba(LIGHT, 0.12));
    h.addColorStop(0.5, rgba(LIGHT, 0));
    h.addColorStop(1, rgba(SHADOW, 0.1));
    ctx.fillStyle = h;
    ctx.fillRect(x0, y0 - 2, x1 - x0, y1 - y0 + 4);
  });
  const hatch = o.hatch ?? 0.2;
  if (hatch <= 0) return;
  const sy = y0 + (y1 - y0) * 0.68;
  pen.clipped([pt(x0, sy), pt(x1, sy), pt(x1, y1 + 2), pt(x0, y1 + 2)], () => pen.hatch(shape, 0.9, 0.05, 0.22, { color: d.ink, alpha: hatch }));
}

/** A flat-sided box section, faceted top, side and keel (the hold): each facet its own tone, lit from above. */
export function faceted(d: Draw, shape: readonly Pt[], color: string, y0: number, chines: readonly [number, number], y1: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const xs = shape.map((p) => p.x);
  const x0 = Math.min(...xs) - 2;
  const x1 = Math.max(...xs) + 2;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const band = (a: number, b: number, from: string, to: string): void => {
      const g = ctx.createLinearGradient(0, a, 0, b);
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      ctx.fillStyle = g;
      ctx.fillRect(x0, a, x1 - x0, b - a);
    };
    band(y0 - 2, chines[0], mix(color, LIGHT, 0.62), mix(color, LIGHT, 0.4));
    band(chines[0], chines[1], mix(color, LIGHT, 0.12), mix(color, SHADOW, 0.2));
    band(chines[1], y1 + 2, mix(color, SHADOW, 0.38), mix(color, BOUNCE, 0.5));
  });
  pen.clipped([pt(x0, chines[1]), pt(x1, chines[1]), pt(x1, y1 + 2), pt(x0, y1 + 2)], () => pen.hatch(shape, 0.85, 0.05, 0.2, { color: d.ink, alpha: 0.22 }));
}

/**
 * Plates over a section: each a shade off its neighbours (as plate rolled
 * in different batches weathers), frames round it with rivets down them,
 * and seams along it with the joints staggered.
 */
export function plates(d: Draw, clip: readonly Pt[], frames: readonly number[], rows: readonly number[], r: number, e: number, o: { readonly rivet?: number; readonly cy?: number } = {}): void {
  const { pen } = d;
  const cy = o.cy ?? 0;
  const edges = [cy - r, ...rows, cy + r];
  pen.clipped(clip, () => {
    const cols = [Math.min(...clip.map((p) => p.x)), ...frames, Math.max(...clip.map((p) => p.x))];
    for (let i = 0; i + 1 < cols.length; i++) {
      for (let j = 0; j + 1 < edges.length; j++) {
        // Joints staggered: every other row splits its bay in two.
        const split = j % 2 === 1 ? [cols[i]!, (cols[i]! + cols[i + 1]!) / 2, cols[i + 1]!] : [cols[i]!, cols[i + 1]!];
        for (let k = 0; k + 1 < split.length; k++) {
          const tone = pen.rng();
          const cell = [pt(split[k]! + e, edges[j]!), pt(split[k + 1]! + e, edges[j]!), pt(split[k + 1]! + e, edges[j + 1]!), pt(split[k]! + e, edges[j + 1]!)];
          pen.fill(cell, tone < 0.5 ? LIGHT : SHADOW, 0.03 + Math.abs(tone - 0.5) * 0.14);
          if (k > 0) seam(d, [pt(split[k]! + e, edges[j]!), pt(split[k]! + e, edges[j + 1]!)], 0.22);
        }
      }
    }
    for (const x of frames) seam(d, frameArc(x, r, e, cy), 0.32);
    for (const y of rows) seam(d, [pt(cols[0]!, y), pt(cols[cols.length - 1]!, y)], 0.24);
    const rr = o.rivet ?? 0.2;
    if (rr <= 0) return;
    for (const x of frames) rivets(d, frameArc(x + 0.9, r * 0.94, e, cy, 14).slice(1, -1), rr);
  });
}

/** A porthole: a lens in a bright rim, warm and glowing once the power's back, else dark glass catching the light. */
export function porthole(d: Draw, c: Pt, r: number, lit: boolean): void {
  const { pen } = d;
  if (lit) glow(pen.ctx, c, r * 2.6, COLOR.windowLit, 0.45);
  pen.fill(oval(c.x, c.y, r * 1.45, r * 1.45, 18), mix(COLOR.hull, LIGHT, 0.55), 0.95);
  pen.hair(oval(c.x, c.y, r * 1.45, r * 1.45, 18), 0.22, d.ink, 0.6);
  pen.fill(oval(c.x + r * 0.15, c.y + r * 0.15, r * 1.12, r * 1.12, 16), SHADOW, 0.3);
  pen.fill(oval(c.x, c.y, r, r, 16), lit ? COLOR.windowLit : COLOR.windowDark, 1);
  if (lit) pen.fill(oval(c.x - r * 0.15, c.y - r * 0.15, r * 0.6, r * 0.6, 12), '#fff7dc', 0.7);
  else pen.hair([pt(c.x - r * 0.55, c.y + r * 0.1), pt(c.x - r * 0.05, c.y - r * 0.6)], r * 0.22, PAPER_FILL, 0.55);
  pen.hair(oval(c.x, c.y, r, r, 14), 0.26, d.ink, 0.85);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    pen.dot(c.x + Math.cos(a) * r * 1.25, c.y + Math.sin(a) * r * 1.25, 0.1, d.ink, 0.55);
  }
}

/** A light on a tip or a mast: a coloured lens, glowing once the power's on. */
export function navLight(d: Draw, at: Pt, color: string, lit: boolean, r = 0.8): void {
  if (lit) glow(d.pen.ctx, at, r * 5, color, 0.55);
  d.pen.fill(oval(at.x, at.y + r * 0.6, r * 1.1, r * 0.55, 10), COLOR.dark, 0.9);
  d.pen.dot(at.x, at.y, r, lit ? color : mix(color, SHADOW, 0.55));
  d.pen.hair(oval(at.x, at.y, r, r, 10), 0.22, d.ink, 0.8);
  if (lit) d.pen.dot(at.x - r * 0.3, at.y - r * 0.3, r * 0.35, COLOR.white, 0.9);
  else d.pen.dot(at.x - r * 0.3, at.y - r * 0.35, r * 0.25, PAPER_FILL, 0.6);
}

/** Pitting from years of dust at speed, denser on the leading faces. */
export function pitting(d: Draw, clip: readonly Pt[], count: number): void {
  d.pen.stipple(clip, count, () => 0.6, 0.13, rgba(SHADOW, 0.35));
  d.pen.stipple(clip, Math.round(count / 3), () => 0.6, 0.11, rgba(LIGHT, 0.6));
}

/** Grime streaked back along the hull from a ridge, as exhaust and the years leave it. */
export function streaks(d: Draw, clip: readonly Pt[], from: readonly Pt[], len: number, alpha = 0.07): void {
  d.pen.clipped(clip, () => {
    for (const p of from) {
      const w = 0.6 + d.pen.rng() * 1.2;
      const l = len * (0.5 + d.pen.rng() * 0.7);
      dab(d, [pt(p.x, p.y - w / 2), pt(p.x, p.y + w / 2), pt(p.x - l, p.y + w * 0.3), pt(p.x - l, p.y - w * 0.3)], COLOR.grime, alpha, 0.5);
    }
  });
}

/** Stencilled lettering, as small as it's painted on a hull: a few dark dashes in a row. */
export function stencil(d: Draw, x: number, y: number, w: number, h: number, color: string = COLOR.dark, alpha = 0.6): void {
  let cx = x;
  while (cx < x + w) {
    const cw = h * (0.4 + d.pen.rng() * 0.5);
    if (d.pen.rng() > 0.15) d.pen.fill([pt(cx, y), pt(cx + cw, y), pt(cx + cw, y + h), pt(cx, y + h)], color, alpha * (0.7 + d.pen.rng() * 0.3));
    cx += cw + h * 0.3;
  }
}

/** A hand-lettered hull number in the guild's blue. */
export function letters(d: Draw, text: string, x: number, y: number, size: number, color: string = COLOR.stripe): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.font = `700 ${size}px "EB Garamond", Georgia, serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.82;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A rounded bolted patch of other plate: a field repair. */
export function repairPlate(d: Draw, shape: readonly Pt[], color: string): void {
  const { pen } = d;
  pen.fill(shape, color, 0.55);
  pen.hair([...shape, shape[0]!], 0.26, d.ink, 0.7);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs) + 0.6, Math.max(...xs) - 0.6, Math.min(...ys) + 0.6, Math.max(...ys) - 0.6];
  rivets(d, [pt(x0, y0), pt(x1, y0), pt(x0, y1), pt(x1, y1), pt((x0 + x1) / 2, y0), pt((x0 + x1) / 2, y1)], 0.18);
}
