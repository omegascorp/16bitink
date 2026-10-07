import { bezier, type Draw, oval, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Granite for a cold Atlantic coast: grey rock speckled with mica and pink
 * feldspar, warm where the light catches it and cool, hatched blue-grey on
 * the shadow side, crusted with yellow-orange lichen, weathered into
 * rounded woolsack blocks and cliffs split by vertical joints.
 */
export const GRANITE = '#a8a59f';
export const PINK = '#d9ad9a';
export const COLD = '#687792';
export const LICHEN = '#dc9f36';
export const LICHEN_GREY = '#b9c096';
export const GRASS = '#8eaa62';
export const THRIFT = '#e48aac';
const SPECK = '#5f626e';
const FELDSPAR = '#c7897b';

/** Twice-signed area of a polygon, as a positive size. */
function area(shape: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i]!;
    const q = shape[(i + 1) % shape.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

function bounds(shape: readonly Pt[]): { x0: number; x1: number; y0: number; y1: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * A rounded-square block (a superellipse), a little lopsided: granite
 * weathers along its joints into pillowy woolsacks. `flat` cuts its
 * underside off where it sits on the ground.
 */
export function woolsack(t: Draw, cx: number, cy: number, rx: number, ry: number, n = 3, flat?: number, lump = 1): Pt[] {
  const { pen } = t;
  const [p1, p2, p3] = [pen.rng() * TAU, pen.rng() * TAU, pen.rng() * TAU];
  const steps = Math.max(24, Math.round((rx + ry) / 2.5));
  const out: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k = 1 + lump * (0.05 * Math.sin(3 * a + p1) + 0.03 * Math.sin(5 * a + p2) + 0.06 * Math.sin(2 * a + p3));
    const x = cx + rx * k * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + ry * k * Math.sign(s) * Math.abs(s) ** (2 / n);
    out.push(pt(x, flat === undefined ? y : Math.min(y, flat)));
  }
  return out;
}

export interface RockOpts {
  /** 0..1: how strongly it is washed and inked (lower for further back). */
  readonly fade?: number;
  /** Lichen blotches on its top. */
  readonly lichen?: number;
  readonly wash?: string;
  readonly ink?: number;
  /** Hatching on the shadow side. */
  readonly hatch?: boolean;
  /** Round form shading (lit rim, shadow crescent); off for big masses that are shaded block by block. */
  readonly form?: boolean;
}

/** A mass of granite: paper, grey wash, warm light, cool hatched shade, speckle, lichen and a pen contour. */
export function rock(t: Draw, shape: readonly Pt[], o: RockOpts = {}): void {
  const { pen } = t;
  const fade = o.fade ?? 1;
  const b = bounds(shape);
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const a = area(shape);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, o.wash ?? GRANITE, 0.5 * fade);
  if (o.form !== false) {
    // Light from the upper left: shifting the shape away from it leaves the lit rim, towards it the shadow.
    pen.crescent(shape, pt(size * 0.12, size * 0.18), () => pen.fill(shape, PINK, 0.32 * fade));
    pen.crescent(shape, pt(-size * 0.15, -size * 0.24), () => {
      pen.fill(shape, COLD, 0.24 * fade);
      if (o.hatch !== false) pen.hatch(shape, Math.max(1.5, size / 46), 1.05, 0.38, { color: t.ink, alpha: FAR * 0.42 * fade });
    });
  }
  pen.stipple(shape, Math.round(a / 14), () => 0.6, 0.32, SPECK);
  pen.stipple(shape, Math.round(a / 40), () => 0.6, 0.4, FELDSPAR);
  const top = shape.filter((p) => p.y < b.y0 + (b.y1 - b.y0) * 0.45);
  for (let k = 0; k < (o.lichen ?? 2) && top.length; k++) {
    const at = top[Math.floor(pen.rng() * top.length)]!;
    const r = 2 + pen.rng() * Math.min(7, size * 0.08);
    const blot = oval(at.x + (b.x0 + b.x1 - 2 * at.x) * 0.06, at.y + r * 0.5, r * 1.5, r * 0.8, 12).map((p) => pt(p.x + pen.jitter(r * 0.25), p.y + pen.jitter(r * 0.2)));
    pen.clipped(shape, () => {
      pen.fill(blot, pen.rng() < 0.7 ? LICHEN : LICHEN_GREY, 0.45 * fade);
      pen.stipple(blot, Math.round(r * 8), () => 0.7, 0.35, '#a7741e');
    });
  }
  // Straight runs kept straight, so the smoothing can't swing a long side out into a loop.
  pen.stroke(edges(shape, 3), 0.85, t.ink, FAR * fade * (o.ink ?? 1), false);
}

/** A crack in the rock: a fine wandering line. */
export function joint(t: Draw, pts: readonly Pt[], alpha = 0.5): void {
  t.pen.hair(pts, 0.45, t.ink, FAR * alpha);
}

/** Linear interpolation through [x, value] pairs (sorted by x), flat beyond the ends. */
export function through(pts: readonly (readonly [number, number])[]): (x: number) => number {
  return (x) => {
    if (x <= pts[0]![0]) return pts[0]![1];
    for (let i = 1; i < pts.length; i++) {
      const [xa, ya] = pts[i - 1]!;
      const [xb, yb] = pts[i]!;
      if (x <= xb) {
        const u = (x - xa) / (xb - xa);
        return ya + (yb - ya) * u * u * (3 - 2 * u);
      }
    }
    return pts[pts.length - 1]![1];
  };
}

/** Sea pinks: low green cushions starred with pink flowers. */
export function thrift(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  const cushion = oval(x, y - 1.2 * s, 3 * s, 1.8 * s, 12).filter((p) => p.y <= y);
  pen.fill([...cushion, pt(x + 3 * s, y), pt(x - 3 * s, y)], GRASS, 0.6);
  pen.hair(cushion, 0.4, t.ink, FAR * 0.5);
  for (let k = 0; k < 3 + Math.round(s); k++) {
    const fx = x + pen.jitter(2.4 * s);
    const fy = y - 2.6 * s - pen.rng() * 2.2 * s;
    pen.hair([pt(fx, fy), pt(fx + pen.jitter(0.4), y - 1.5 * s)], 0.35, '#6c8a48', 0.7);
    pen.fill(oval(fx, fy, 0.95 * s, 0.85 * s, 8), THRIFT, 0.85);
  }
}

/** A seabird on a ledge: a white blob with a dark back, as a kittiwake reads from far off. */
export function ledgeBird(t: Draw, x: number, y: number, s: number, dark = false): void {
  const { pen } = t;
  pen.fill(oval(x, y - 1.3 * s, 0.9 * s, 1.4 * s, 10), dark ? '#4a4a55' : PAPER_FILL, 1);
  pen.hair([pt(x + 0.5 * s, y - 2.4 * s), pt(x + 0.8 * s, y - 0.4 * s)], 0.45 * s, dark ? t.ink : '#8a93a3', 0.8);
  pen.dot(x - 0.1 * s, y - 2.9 * s, 0.6 * s, dark ? '#4a4a55' : PAPER_FILL, 1);
  if (dark) pen.dot(x - 0.4 * s, y - 1.1 * s, 0.5 * s, PAPER_FILL, 1);
}

export interface CliffSpec {
  readonly x0: number;
  readonly x1: number;
  /** Where it meets the water. */
  readonly foot: number;
  /** Height above the foot along x. */
  readonly height: (x: number) => number;
  /** Vertical joints, each opening into a shaded gully. */
  readonly joints: readonly number[];
  readonly fade?: number;
  /** Seabirds nesting along the ledges. */
  readonly birds?: number;
  /** A cap of turf and sea pinks. */
  readonly turf?: boolean;
}

/**
 * A granite cliff, built as granite weathers: stacked, pillowy blocks
 * between vertical joints and sheeting joints, each block its own shade of
 * grey or pink, shadow under every overhang and down the right side of
 * every gully, seabirds nesting on the ledges, white with their droppings,
 * the wet weed band at its foot, and turf and thrift on top. Returns its
 * skyline.
 */
export function cliff(t: Draw, c: CliffSpec): Pt[] {
  const { pen } = t;
  const fade = c.fade ?? 1;
  // Each buttress weathers to a rounded top, so the skyline dips into a notch at every joint.
  const notches = c.joints.map((x) => ({ x, depth: 3 + pen.rng() * 8 }));
  const height = (x: number): number => c.height(x) - notches.reduce((s, n) => s + n.depth * Math.max(0, 1 - Math.abs(x - n.x) / 7) ** 2, 0);
  const top: Pt[] = [];
  for (let x = c.x0; x <= c.x1; x += 2) top.push(pt(x, c.foot - Math.max(0, height(x)) + 0.8 * Math.sin(x * 0.7)));
  top.push(pt(c.x1, c.foot - c.height(c.x1)));
  const shape = [...top, pt(c.x1, c.foot + 3), pt(c.x0, c.foot + 3)];
  rock(t, shape, { fade, lichen: Math.round((c.x1 - c.x0) / 30), form: false });
  const topAt = (x: number): number => c.foot - height(x);
  const peak = Math.max(...top.map((p) => c.foot - p.y));
  // Shared sheeting levels, so the joints run on across the gullies, a little stepped.
  const levels: number[] = [];
  for (let y = c.foot - 10 - pen.rng() * 6; y > c.foot - peak; y -= 13 + pen.rng() * 15) levels.push(y);
  const cols = [c.x0, ...c.joints, c.x1];
  pen.clipped(shape, () => {
    // Light falls from above: the upper face is warmer, the foot cooler.
    const { ctx } = pen;
    const g = ctx.createLinearGradient(0, c.foot - peak, 0, c.foot);
    g.addColorStop(0, `rgba(217,173,154,${0.3 * fade})`);
    g.addColorStop(1, `rgba(104,119,146,${0.22 * fade})`);
    ctx.fillStyle = g;
    ctx.fillRect(c.x0 - 2, c.foot - peak - 4, c.x1 - c.x0 + 4, peak + 8);
    for (let i = 0; i + 1 < cols.length; i++) {
      const [a, b] = [cols[i]!, cols[i + 1]!];
      let below = c.foot + 3;
      const shift = pen.jitter(6);
      for (const lv of [...levels, -Infinity]) {
        const y = lv === -Infinity ? c.foot - peak - 4 : lv + shift + pen.jitter(3);
        if (lv !== -Infinity && (pen.rng() < 0.35 || below - y < 8)) continue;
        const block = [pt(a, y), pt(b, y), pt(b, below), pt(a, below)];
        const r = pen.rng();
        if (r < 0.3) pen.fill(block, PINK, 0.2 * fade);
        else if (r < 0.5) pen.fill(block, COLD, 0.14 * fade);
        else if (r < 0.62) pen.fill(block, PAPER_FILL, 0.3 * fade);
        // The right side of each block turns from the light.
        const sw = Math.min(5 + pen.rng() * 5, (b - a) * 0.3);
        pen.fill([pt(b - sw, y + 2), pt(b, y), pt(b, below), pt(b - sw * 0.8, below)], COLD, 0.2 * fade);
        if (lv !== -Infinity && y > topAt((a + b) / 2) + 4) {
          // The sheeting joint, the overhang's shadow beneath it, and a ledge for the birds.
          // Some joints run right across; others peter out partway.
          const [la, lb] = pen.rng() < 0.6 ? [a, b] : pen.rng() < 0.5 ? [a, b - (b - a) * (0.2 + pen.rng() * 0.4)] : [a + (b - a) * (0.2 + pen.rng() * 0.4), b];
          const line = bezier(pt(la, y + pen.jitter(1)), pt((la + lb) / 2, y + pen.jitter(2.5)), pt(lb, y + pen.jitter(1)), 8);
          const shadow = [...line, ...[...line].reverse().map((p) => pt(p.x, p.y + 2.2 + pen.rng() * 0.8))];
          pen.fill(shadow, COLD, 0.32 * fade);
          pen.hatch(shadow, 1.3, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.4 * fade });
          joint(t, line, 0.65 * fade);
          pen.hair(line.map((p) => pt(p.x, p.y - 0.8)), 0.7, PAPER_FILL, 0.55);
          if ((c.birds ?? 0) > 0 && y < c.foot - 18 && pen.rng() < 0.65) {
            for (let x = la + 3; x < lb - 3; x += 3 + pen.rng() * 5) {
              const yy = line[Math.round(((x - la) / (lb - la)) * 8)]!.y;
              pen.hair([pt(x, yy + 2.5), pt(x + pen.jitter(0.6), yy + 4 + pen.rng() * 7)], 0.6, PAPER_FILL, 0.7);
              if (pen.rng() < (c.birds ?? 0)) ledgeBird(t, x, yy, 0.9, pen.rng() < 0.35);
            }
          }
        }
        below = y;
        if (y < topAt((a + b) / 2)) break;
      }
    }
    for (const xj of c.joints) {
      const lean = pen.jitter(3);
      const gully: Pt[] = [];
      for (let k = 0; k <= 12; k++) gully.push(pt(xj + lean * (k / 12) + 1.2 * Math.sin(k * 1.3 + xj), topAt(xj) - 2 + ((height(xj) + 6) * k) / 12));
      const face = [...gully, ...[...gully].reverse().map((p) => pt(p.x - 3.5, p.y))];
      pen.fill(face, COLD, 0.35 * fade);
      pen.hair(gully, 0.65, t.ink, FAR * 0.85 * fade);
    }
    // The wet, weedy band the tide leaves at the foot.
    const tide = top.map((p) => pt(p.x, c.foot - 8 - 1.5 * Math.sin(p.x * 0.11)));
    pen.fill([...tide, pt(c.x1, c.foot + 3), pt(c.x0, c.foot + 3)], '#5c5a36', 0.35 * fade);
    pen.hair(tide, 0.4, t.ink, FAR * 0.4 * fade);
  });
  if (c.turf !== false) {
    const cap = [...top, ...[...top].reverse().map((p) => pt(p.x, p.y + 3.5 + 2 * Math.sin(p.x * 0.23)))];
    pen.clipped(shape, () => pen.fill(cap, GRASS, 0.7 * fade));
    for (let x = c.x0 + 4; x < c.x1 - 4; x += 3 + pen.rng() * 5) {
      const y = topAt(x) + 0.5;
      if (height(x) < 12) continue;
      if (pen.rng() < 0.35) thrift(t, x, y + 1, 0.9 + pen.rng() * 0.4);
      else pen.hair([pt(x, y), pt(x + pen.jitter(1.5), y - 2 - pen.rng() * 2.5)], 0.45, '#5f7d40', 0.75 * fade);
    }
  }
  pen.stroke(top, 0.95, t.ink, FAR * fade, false);
  return top;
}
