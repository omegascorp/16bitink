import { curveAt, type Key } from '../short';

/**
 * Tools for the short's moving values, all pure functions of time. A paced
 * track is a value that runs on at a rate (the wings' flap phase, how far
 * the haze has scrolled): give the rate at each moment and it is summed into
 * keys for curveAt. A key can ask to land on a given value modulo `period`
 * (the wings frozen with their tips up; back where the loop began), and the
 * segment ending at its `slack` key runs a little faster to get there.
 */
export interface Pace {
  readonly t: number;
  /** Rate at t, per second. */
  readonly rate: number;
  /** Land on this value modulo the period here. */
  readonly mod?: number;
  /** Index of the key whose segment (ending at it) absorbs the catch-up. */
  readonly slack?: number;
}

/** Keys for a value that starts at `start` and changes at each pace's rate. */
export function paced(spec: readonly Pace[], start: number, period = 1): Key[] {
  const ats = spec.reduce<number[]>((acc, p, i) => {
    if (i === 0) return [start];
    const prev = spec[i - 1]!;
    const at = acc[i - 1]! + ((p.t - prev.t) * (prev.rate + p.rate)) / 2;
    const next = [...acc, at];
    if (p.mod === undefined) return next;
    const catchUp = ((((p.mod - at) % period) + period) % period);
    const from = p.slack ?? i;
    return next.map((v, k) => (k >= from ? v + catchUp : v));
  }, []);
  return spec.map((p, i) => ({ t: p.t, at: ats[i]!, rate: p.rate }));
}

/** A keyed value as a function of time. */
export const track = (keys: readonly Key[]) => (t: number): number => curveAt(keys, t).at;

/** Keys from [t, value] pairs, rates left to Catmull-Rom except where given. */
export const keys = (pairs: readonly (readonly [number, number, number?])[]): Key[] =>
  pairs.map(([t, at, rate]) => (rate === undefined ? { t, at } : { t, at, rate }));

/** Every time in [from, to) where a rising value crosses `level` modulo 1, sampled every `dt` s. */
export function crossings(value: (t: number) => number, from: number, to: number, level: number, dt = 0.002): number[] {
  const n = Math.floor((to - from) / dt);
  return Array.from({ length: n }, (_, i) => from + i * dt).filter((t) => {
    const a = Math.floor(value(t) - level);
    const b = Math.floor(value(Math.min(t + dt, to - 1e-9)) - level);
    return b > a;
  });
}
