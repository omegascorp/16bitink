import type { Rng } from './rng';

/**
 * The storm: 4–5 phases. Each phase waits, then shrinks the safe circle
 * towards a new one inside it. Outside, a tank loses HP per second, more each
 * phase. A last collapse to nothing makes sure every match ends.
 */
export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface StormPhase {
  /** When the wait starts, seconds from the match start. */
  readonly start: number;
  readonly wait: number;
  readonly shrink: number;
  readonly from: Circle;
  readonly to: Circle;
  /** HP per second outside the circle during this phase. */
  readonly dps: number;
}

export interface StormPlan {
  readonly phases: readonly StormPhase[];
  /** When the last circle has closed to nothing. */
  readonly end: number;
}

export interface StormNow {
  readonly circle: Circle;
  /** The circle being shrunk to (the minimap ring). */
  readonly next: Circle;
  readonly phase: number;
  readonly shrinking: boolean;
  /** Seconds until the current wait or shrink ends. */
  readonly timer: number;
  readonly dps: number;
}

const DPS = [2, 4, 7, 11, 16, 24];

export interface StormOptions {
  /** Screens of open land: more land, one more phase. */
  readonly area: number;
  /** Seconds until the last circle closes (5–7 minute matches). */
  readonly length?: number;
  /** Picks a valid centre for a new circle (on open, dry land). */
  readonly isValid?: (x: number, y: number) => boolean;
}

export function planStorm(start: Circle, rng: Rng, opts: StormOptions): StormPlan {
  const count = opts.area <= 12 ? 4 : 5;
  const length = opts.length ?? 330;
  const finalR = 150;
  // Radii shrink geometrically from the start circle to the final one.
  const ratio = Math.pow(finalR / start.r, 1 / count);
  const slice = length / (count + 0.6);
  const phases: StormPhase[] = [];
  let from = start;
  let t = 0;
  for (let i = 0; i < count; i++) {
    const r = Math.max(finalR, from.r * ratio);
    const to = innerCircle(from, r, rng, opts.isValid);
    const wait = i === 0 ? slice * 0.75 : slice * 0.5;
    const shrink = i === 0 ? slice * 0.55 : slice * 0.5;
    phases.push({ start: t, wait, shrink, from, to, dps: DPS[i]! });
    t += wait + shrink;
    from = to;
  }
  // The collapse: a short wait, then the final circle closes to a point.
  const collapse = { x: from.x, y: from.y, r: 0 };
  phases.push({ start: t, wait: 25, shrink: 45, from, to: collapse, dps: DPS[count]! });
  return { phases, end: t + 70 };
}

function innerCircle(from: Circle, r: number, rng: Rng, isValid?: (x: number, y: number) => boolean): Circle {
  const slack = Math.max(0, from.r - r);
  for (let tries = 0; tries < 40; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * slack;
    const x = from.x + Math.cos(a) * d;
    const y = from.y + Math.sin(a) * d;
    if (!isValid || isValid(x, y)) return { x, y, r };
  }
  return { x: from.x, y: from.y, r };
}

const mix = (a: Circle, b: Circle, k: number): Circle => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: a.r + (b.r - a.r) * k });

export function stormAt(plan: StormPlan, t: number): StormNow {
  const phases = plan.phases;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i]!;
    const waitEnd = p.start + p.wait;
    const shrinkEnd = waitEnd + p.shrink;
    if (t < waitEnd) return { circle: p.from, next: p.to, phase: i, shrinking: false, timer: waitEnd - t, dps: i === 0 ? 0 : phases[i - 1]!.dps };
    if (t < shrinkEnd) return { circle: mix(p.from, p.to, (t - waitEnd) / p.shrink), next: p.to, phase: i, shrinking: true, timer: shrinkEnd - t, dps: p.dps };
  }
  const last = phases[phases.length - 1]!;
  return { circle: last.to, next: last.to, phase: phases.length - 1, shrinking: false, timer: 0, dps: last.dps };
}

export function insideCircle(c: Circle, x: number, y: number): boolean {
  const dx = x - c.x;
  const dy = y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

/** A storm that never closes, for missions with the storm off. */
export function calmStorm(start: Circle): StormPlan {
  const big = { ...start, r: start.r * 4 };
  return { phases: [{ start: 0, wait: 1e9, shrink: 1, from: big, to: big, dps: 0 }], end: Infinity };
}
