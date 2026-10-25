import { catchable, preySpec, type Prey } from './prey';
import type { Snake } from './snake';
import { SPACING } from './trail';
import { dist, inPolygon, pt, type Pt } from './vec';

/** The head closes a loop when it comes back this close to its body, in body widths. */
const CLOSE_AT = 1.35;
/** From this close (body widths) a dotted ring shows the loop is about to close. */
const HINT_AT = 5;
/** The shortest loop that counts, in body widths of body: anything less is just a tight turn. */
const MIN_LOOP = 7;
/** How long a squeeze takes, s. */
export const SQUEEZE_TIME = 0.85;
/** How long swallowing one coiled meal takes, s. */
export const SWALLOW_TIME = 0.45;

/** A loop of body round prey: the body samples 0..k and what they hold. */
export interface Loop {
  readonly k: number;
  readonly prey: readonly Prey[];
  /** The loop's middle: where its prey are pulled to. */
  readonly centre: Pt;
}

/**
 * The loop the head is closing round prey, if any: the first body sample
 * past MIN_LOOP within `reach` body widths of the head, where the body up
 * to it encircles prey that's on the board and not too big to hold.
 */
export function findLoop(snake: Snake, prey: readonly Prey[], reach = CLOSE_AT): Loop | null {
  const pts = snake.trail.pts;
  const h = snake.head;
  const w = snake.width;
  const first = Math.max(snake.neck, Math.ceil((w * MIN_LOOP) / SPACING));
  const end = snake.trail.count;
  const max = snake.coilMax;
  const candidates = prey.filter((p) => catchable(p) && preySpec(p.kind).size <= max);
  if (!candidates.length) return null;
  const reachPx = w * reach;
  for (let k = first; k < end; k++) {
    if (dist(h, pts[k]!) > reachPx) continue;
    const held = candidates.filter((p) => inPolygon(p, pts, k + 1));
    if (held.length) {
      const centre = pt(held.reduce((s, p) => s + p.x, 0) / held.length, held.reduce((s, p) => s + p.y, 0) / held.length);
      return { k, prey: held, centre };
    }
    // The rest of this stretch of body near the head closes the same loop: skip past it.
    while (k + 1 < end && dist(h, pts[k + 1]!) <= reachPx) k++;
  }
  return null;
}

/** The loop about to close, for the dotted ring that says so. */
export function loopHint(snake: Snake, prey: readonly Prey[]): Loop | null {
  return findLoop(snake, prey, HINT_AT);
}

/**
 * The squeeze: where each sample of the loop is pulled to, a ring hugging
 * what it holds (each sample keeps its angle round the middle).
 */
export function ringTargets(loopPts: readonly Pt[], centre: Pt, radius: number): Pt[] {
  return loopPts.map((p) => {
    const a = Math.atan2(p.y - centre.y, p.x - centre.x);
    return pt(centre.x + Math.cos(a) * radius, centre.y + Math.sin(a) * radius);
  });
}

/** The radius a squeezed loop closes to round prey this wide, for a body this wide. */
export function ringRadius(preySize: number, width: number): number {
  return preySize / 2 + width / 2 + 1;
}
