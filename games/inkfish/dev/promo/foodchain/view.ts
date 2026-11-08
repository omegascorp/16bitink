import { createRng } from '../../../src/logic/rng';
import { FRAME } from '../descent/frame';
import { drawAnimal, type Extras, type Look } from './cast';
import { NOSE, type Climb, type Pt } from './climb';
import type { Kind } from './species';

/**
 * Draws a chain (climb.ts) through its camera: every link with its pose and
 * its gulp, and around each one a school of its own kind (the diatoms'
 * cloud, the copepods' swarm, the anchovies' school) that scatters when the
 * link it swims with is eaten.
 */

const W = FRAME.width;
const H = FRAME.height;

export interface Camera {
  readonly centre: Pt;
  /** Screen width in metres. */
  readonly width: number;
}

export const scaleOf = (cam: Camera): number => W / cam.width;

export function toScreen(cam: Camera, p: Pt): Pt {
  const k = scaleOf(cam);
  return { x: W / 2 + (p.x - cam.centre.x) * k, y: H / 2 + (p.y - cam.centre.y) * k };
}

/** A camera zoomed out from `cam` by `factor` about the same centre (the slow pull-backs). */
export const pulledBack = (cam: Camera, factor: number): Camera => ({ centre: cam.centre, width: cam.width * factor });

interface Mate {
  /** Offset from its link's body, body lengths, and its own scale. */
  readonly dx: number;
  readonly dy: number;
  readonly size: number;
  readonly phase: number;
  /** Which way it scatters when the school breaks up. */
  readonly fx: number;
  readonly fy: number;
}

/** How many companions each kind swims with. */
const SCHOOL: Partial<Record<Kind, number>> = { diatom: 26, copepod: 24, anchovy: 13, mackerel: 7 };
/** How spread out the school is, body lengths. */
const SPREAD: Partial<Record<Kind, number>> = { diatom: 4, copepod: 5, anchovy: 1.7, mackerel: 2.2 };

export interface ChainView {
  /** Draws the chain at t through `cam` (the chain's own camera unless given). */
  draw(ctx: CanvasRenderingContext2D, t: number, cam?: Camera, opts?: ViewOptions): void;
  /** Where link i is on screen and how it's posed. */
  lookOf(i: number, t: number, cam: Camera): Look;
  /** World positions of the mouths of link i and its school at t (what eats a food field). */
  mouths(i: number, t: number): Pt[];
}

export interface ViewOptions {
  /** Links not to draw (an insert shows them its own way). */
  readonly hide?: ReadonlySet<number>;
  /** Extra pose per link. */
  readonly extras?: (i: number, t: number) => Extras;
  /** Overrides each link's jaw (the anchovies swim with their mouths open). */
  readonly jaw?: (i: number, t: number) => number | undefined;
  /** Hide the schools. */
  readonly noSchools?: boolean;
}

export function createChainView(climb: Climb, seed: number): ChainView {
  const rng = createRng(seed);
  const schools = climb.links.map((l): Mate[] => {
    const n = SCHOOL[l.kind] ?? 0;
    const spread = SPREAD[l.kind] ?? 3;
    return Array.from({ length: n }, () => {
      const a = rng() * Math.PI * 2;
      const r = (0.25 + 0.75 * Math.sqrt(rng())) * spread;
      return {
        dx: Math.cos(a) * r * 1.6,
        dy: Math.sin(a) * r * 0.75,
        size: 0.7 + rng() * 0.5,
        phase: rng() * 10,
        fx: Math.cos(a),
        fy: Math.sin(a),
      };
    });
  });

  const lookOf = (i: number, t: number, cam: Camera): Look => {
    const l = climb.links[i]!;
    const k = scaleOf(cam);
    const left = climb.left(i, t);
    let body = climb.body(i, t);
    let length = l.length * k;
    if (left < 1 && i + 1 < climb.links.length) {
      // Being swallowed: shrink into the eater's mouth.
      const m = climb.mouth(i + 1, t);
      body = { x: m.x + (body.x - m.x) * left, y: m.y + (body.y - m.y) * left };
      length *= 0.35 + 0.65 * left;
    }
    const p = toScreen(cam, body);
    const b = climb.beat(i, t);
    return { x: p.x, y: p.y, length, facing: l.dir, tilt: climb.tilt(i, t), beat: b.phase, effort: b.effort, jaw: climb.jaw(i, t), alpha: left > 0 ? 1 : 0 };
  };

  /** Where a school mate's body is: round its link's path, frozen where the link was eaten, scattering after. */
  const matePos = (i: number, m: Mate, t: number): Pt & { scatter: number } => {
    const l = climb.links[i]!;
    const anchor = i === 0 ? l.at : climb.body(i, Math.min(t, l.eaten));
    const scatter = Math.max(0, t - l.eaten) * 0.9;
    const still = l.kind === 'diatom';
    const wob = still ? 0 : 0.12 * Math.sin(t * 1.3 + m.phase);
    return {
      x: anchor.x + (m.dx + m.fx * scatter * 3) * l.length + (still ? 0 : l.dir * scatter * l.length),
      y: anchor.y + (m.dy + m.fy * scatter * 2 + wob) * l.length,
      scatter,
    };
  };

  const drawSchool = (ctx: CanvasRenderingContext2D, i: number, t: number, cam: Camera, extras: Extras): void => {
    const l = climb.links[i]!;
    const mates = schools[i]!;
    if (mates.length === 0) return;
    const k = scaleOf(cam);
    if (l.length * k < 1.5 || l.length * k > W * 3) return;
    for (const m of mates) {
      const { x, y, scatter } = matePos(i, m, t);
      const p = toScreen(cam, { x, y });
      const len = l.length * k * m.size;
      if (p.x < -len || p.x > W + len || p.y < -len || p.y > H + len) continue;
      const facing: 1 | -1 = scatter > 0 && m.fx !== 0 ? (m.fx > 0 ? 1 : -1) : l.dir;
      drawAnimal(ctx, l.kind, { x: p.x, y: p.y, length: len, facing, beat: t * 8 + m.phase, effort: scatter > 0 ? 0.9 : 0.35, tilt: 0 }, t + m.phase, { ...extras, spin: t * 0.2 + m.phase, pennate: m.phase > 6, kick: 0.5 + 0.5 * Math.sin(t * 5 + m.phase) });
    }
  };

  const mouths = (i: number, t: number): Pt[] => {
    const l = climb.links[i]!;
    const own = climb.mouth(i, t);
    return [own, ...schools[i]!.map((m) => {
      const p = matePos(i, m, t);
      return { x: p.x + l.dir * NOSE * l.length * m.size, y: p.y };
    })];
  };

  return {
    lookOf,
    mouths,
    draw(ctx, t, cam = climb.camera(t), opts = {}) {
      climb.links.forEach((l, i) => {
        // Only links that have started their approach (or are the first) and aren't long gone.
        if (opts.hide?.has(i)) return;
        if (i > 0 && t < l.zoomFrom - 3 && t < l.gulp - 3) return;
        const extras = opts.extras?.(i, t) ?? {};
        if (!opts.noSchools) drawSchool(ctx, i, t, cam, extras);
        if (climb.left(i, t) <= 0) return;
        const look = lookOf(i, t, cam);
        const jaw = opts.jaw?.(i, t);
        const kick = l.kind === 'copepod' ? 0.5 + 0.5 * Math.sin(t * 6) : undefined;
        drawAnimal(ctx, l.kind, jaw === undefined ? look : { ...look, jaw: Math.max(jaw, look.jaw ?? 0) }, t, { kick, spin: t * 0.25, ...extras });
      });
    },
  };
}

/** The mouth of link i on screen. */
export function mouthOnScreen(climb: Climb, i: number, t: number, cam: Camera): Pt {
  return toScreen(cam, climb.mouth(i, t));
}

export { NOSE };
