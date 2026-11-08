import type { Rng } from '../../logic/rng';
import { blob, SHADOW, wash } from '../groundKit';
import { type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, type Pt } from '../pen';
import { noiseOf, perArea, strokes } from '../places/farmKit';
import { rgba } from '../wash';
import { specks } from '../places/farmGroundParts';
import { along, fieldWash, H, SAND, SAND_COOL, SAND_DEEP, SAND_LIT, SAND_WARM, type SandField, W } from './dunesPlaceKit';

/**
 * The Dunes' loose sand, painted over the gravel flats: a pale warm wash
 * where the level's sand zones lie, then the dunes' relief: low transverse
 * ridges across the wind, the gentle windward slopes catching the light
 * from the upper left, each steep slip face in shade (cooling to violet in
 * its depths) under a crisp crest line, hatched down the slope in pen; wind
 * ripples combed across the open slopes, dark mineral grains in their
 * troughs.
 */

/** Where along a ridge a point lies (its whole part counts the ridges) and how tall the dunes are there (0..1). */
export interface Relief {
  readonly phase: (x: number, y: number) => number;
  readonly amp: (x: number, y: number) => number;
}

/** Where the crest lies in each ridge's span: the windward slope runs up to it, the slip face drops after. */
const CREST = 0.78;
/** How tall a ridge is, px of "height" for the shading. */
const TALL = 14;

const frac = (v: number): number => v - Math.floor(v);
/** The ridges' march: downwind, a little south of it, so their crests run slantwise across the board. */
const DUNE_AXIS = pt(0.86, 0.51);
const DUNE_ACROSS = pt(-DUNE_AXIS.y, DUNE_AXIS.x);

export function reliefOf(depth: SandField, rng: Rng): Relief {
  const span = 230 + rng() * 70;
  const bend = noiseOf(rng, 230);
  const bend2 = noiseOf(rng, 90);
  const size = noiseOf(rng, 280);
  return {
    phase: (x, y) => (x * DUNE_AXIS.x + y * DUNE_AXIS.y) / span + bend(x, y) * 1.1 + bend2(x, y) * 0.22,
    amp: (x, y) => depth(x, y) * Math.max(0, Math.min(1, 0.45 + 0.9 * size(x, y))),
  };
}

/** The ridge's height profile at a phase: a long rise to the crest, a short steep drop. */
function profile(f: number): number {
  return f < CREST ? (f / CREST) ** 1.4 : (1 - (f - CREST) / (1 - CREST)) ** 2;
}

const heightOf = (r: Relief, x: number, y: number): number => TALL * r.amp(x, y) * profile(frac(r.phase(x, y)));

/** How a spot faces the light: > 0 lit (a slope turned to the upper left), < 0 in shade. */
function facing(r: Relief, x: number, y: number): number {
  const e = 2;
  const gx = (heightOf(r, x + e, y) - heightOf(r, x - e, y)) / (2 * e);
  const gy = (heightOf(r, x, y + e) - heightOf(r, x, y - e)) / (2 * e);
  return gx * SHADOW.x + gy * SHADOW.y;
}

/** The sand's washes: its body, warm blooms where it dried unevenly, the relief's light and shade. */
export function sandWashes(d: Draw, sand: SandField, relief: Relief, rng: Rng): void {
  fieldWash(d, 4, SAND, (x, y) => sand(x, y) * 0.93);
  const bloom = noiseOf(rng, 120);
  const bloom2 = noiseOf(rng, 45);
  fieldWash(d, 4, SAND_WARM, (x, y) => sand(x, y) * Math.max(0, bloom(x, y) * 0.8 + bloom2(x, y) * 0.3) * 0.5);
  for (let k = 0; k < perArea(60); k++) {
    const p = pt(rng() * W, rng() * H);
    if (sand(p.x, p.y) < 0.9) continue;
    wash(d, blob(p, 30 + rng() * 80, 18 + rng() * 40, rng, 0.35, 22, rng() * Math.PI), rng() < 0.5 ? SAND_WARM : SAND_DEEP, 0.05 + rng() * 0.04, 0.6);
  }
  fieldWash(d, 3, SAND_LIT, (x, y) => Math.max(0, facing(relief, x, y)) * 9);
  fieldWash(d, 3, SAND_DEEP, (x, y) => Math.max(0, -facing(relief, x, y)) * 2.4);
  fieldWash(d, 3, SAND_COOL, (x, y) => Math.max(0, -facing(relief, x, y) - 0.1) * 1.6);
}

/** The crest lines: where each ridge's windward slope tops out, found on a grid and chained into lines along the ridge. */
function crestLines(relief: Relief): Pt[][] {
  const ridges = new Map<number, Pt[]>();
  const step = 2;
  for (let y = 0; y <= H; y += step) {
    for (let x = 0; x <= W; x += step) {
      const a = relief.phase(x, y) - CREST;
      const b = relief.phase(x + DUNE_AXIS.x * step, y + DUNE_AXIS.y * step) - CREST;
      if (Math.floor(a) === Math.floor(b) || relief.amp(x, y) < 0.15) continue;
      const k = Math.floor(b);
      const list = ridges.get(k) ?? [];
      list.push(pt(x, y));
      ridges.set(k, list);
    }
  }
  const lines: Pt[][] = [];
  for (const pts of ridges.values()) {
    pts.sort((p, q) => p.x * DUNE_ACROSS.x + p.y * DUNE_ACROSS.y - (q.x * DUNE_ACROSS.x + q.y * DUNE_ACROSS.y));
    let line: Pt[] = [];
    for (const p of pts) {
      const last = line[line.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) > 7) {
        if (line.length > 4) lines.push(line);
        line = [];
      }
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2.5) line.push(p);
    }
    if (line.length > 4) lines.push(line);
  }
  return lines;
}

/** Each crest in pen, lit along its windward lip, the slip face below it hatched down the slope. */
export function crests(d: Draw, relief: Relief, rng: Rng): void {
  for (const line of crestLines(relief)) {
    const pen = new Pen(d.pen.ctx, Math.floor(rng() * 1e6), 0.4);
    // Break the line where the dune is low, so crests come and go.
    let run: Pt[] = [];
    const flush = (): void => {
      if (run.length > 3) {
        const a = Math.min(1, relief.amp(run[0]!.x, run[0]!.y) * 1.3);
        pen.hair(run.map((p) => along(p, DUNE_AXIS, -1.3)), 0.9, PAPER_FILL, 0.5 * a);
        pen.hair(run, 0.7, SAND_DEEP, 0.75 * a);
        pen.hair(run, 0.45, d.ink, 0.32 * a);
      }
      run = [];
    };
    for (const p of line) {
      if (relief.amp(p.x, p.y) < 0.2 || rng() < 0.01) flush();
      else run.push(p);
    }
    flush();
    // Slip-face hatching: short strokes down the lee from the crest.
    strokes(d, SAND_DEEP, 0.3, 0.5, line.length, () => {
      const p = line[Math.floor(rng() * line.length)]!;
      const a = relief.amp(p.x, p.y);
      if (a < 0.35 || rng() > 0.55) return null;
      return [p.x + DUNE_AXIS.x * 1.5, p.y + DUNE_AXIS.y * 1.5, Math.atan2(DUNE_AXIS.y, DUNE_AXIS.x) + (rng() - 0.5) * 0.3, (5 + rng() * 12) * a, (rng() - 0.5) * 1.5];
    });
  }
}

/**
 * Wind ripples across the open slopes (none on the slip faces): long wavy
 * lines running across the wind, neighbours bending together, each a shaded
 * trough under a lit crest, broken into lengths; dark grains in the troughs.
 */
export function ripples(d: Draw, sand: SandField, relief: Relief, rng: Rng): void {
  const sway = noiseOf(rng, 150);
  const sway2 = noiseOf(rng, 30);
  const sway3 = noiseOf(rng, 9);
  const gap = 8;
  const reach = Math.hypot(W, H);
  const lines: Pt[][] = [];
  const grains: (readonly [number, number, number])[] = [];
  const o = pt(W / 2, H / 2);
  for (let j = -reach / 2; j < reach / 2; j += gap * (0.85 + rng() * 0.3)) {
    let t = -reach / 2 + rng() * 40;
    while (t < reach / 2) {
      const len = 40 + rng() * 110;
      const line: Pt[] = [];
      for (let u = t; u < t + len; u += 3) {
        const base = pt(o.x + DUNE_AXIS.x * j + DUNE_ACROSS.x * u, o.y + DUNE_AXIS.y * j + DUNE_ACROSS.y * u);
        const off = sway(base.x, base.y) * 18 + sway2(base.x, base.y) * 7 + sway3(base.x, base.y) * 1.6;
        const p = along(base, DUNE_AXIS, off);
        const ok = p.x > -4 && p.x < W + 4 && p.y > -4 && p.y < H + 4 && sand(p.x, p.y) > 0.35
          && !(frac(relief.phase(p.x, p.y)) > CREST - 0.03 && relief.amp(p.x, p.y) > 0.25);
        if (ok) line.push(p);
        else if (line.length) break;
      }
      if (line.length > 3) lines.push(line);
      t += len + 2 + rng() * 14;
    }
  }
  const { ctx } = d.pen;
  const trace = (dx: number, dy: number): void => {
    ctx.beginPath();
    for (const l of lines) l.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(SAND_DEEP, 0.26);
  ctx.lineWidth = 0.6;
  trace(0, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba(PAPER_FILL, 0.38);
  ctx.lineWidth = 0.55;
  trace(-SHADOW.x * 1.2, -SHADOW.y * 1.2);
  ctx.stroke();
  ctx.restore();
  for (const l of lines) for (const p of l) if (rng() < 0.12) grains.push([p.x + DUNE_AXIS.x * 1.4, p.y + DUNE_AXIS.y * 1.4, 0.25 + rng() * 0.3]);
  specks(d, '#5a4a40', 0.3, grains);
}

/** Loose grains over the sand, finer where it's open, and a scatter of it blown out over the gravel at its edges. */
export function sandGrain(d: Draw, sand: SandField, rng: Rng): void {
  const at = (n: number, r0: number, r1: number, keep: (s: number) => boolean): (readonly [number, number, number])[] => {
    const out: (readonly [number, number, number])[] = [];
    for (let k = 0; k < perArea(n); k++) {
      const x = rng() * W;
      const y = rng() * H;
      if (keep(sand(x, y))) out.push([x, y, r0 + rng() * (r1 - r0)]);
    }
    return out;
  };
  specks(d, SAND_DEEP, 0.22, at(26000, 0.25, 0.6, (s) => s > 0.3 && rng() < s));
  specks(d, PAPER_FILL, 0.5, at(14000, 0.25, 0.6, (s) => s > 0.3 && rng() < s));
  specks(d, SAND, 0.75, at(24000, 0.3, 0.9, (s) => s > 0.02 && s < 0.5 && rng() < 0.4 + s));
}
