import { curveAt, type Key } from '../short';

/** A position at a moment, world px; give a velocity (px/s) to pin how it moves there, or leave it to the neighbours. */
export interface PathKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly vx?: number;
  readonly vy?: number;
}

export interface PathPoint {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

const scaled = (k: PathKey, shift: number, scale: number): PathKey => ({
  t: k.t + shift,
  x: k.x * scale,
  y: k.y * scale,
  ...(k.vx === undefined ? {} : { vx: k.vx * scale }),
  ...(k.vy === undefined ? {} : { vy: k.vy * scale }),
});

const axis = (keys: readonly PathKey[], at: 'x' | 'y', rate: 'vx' | 'vy'): Key[] =>
  keys.map((k) => ({ t: k.t, at: k[at], ...(k[rate] === undefined ? {} : { rate: k[rate] }) }));

/**
 * A smooth path through keys (times in [0, loopS)) for a loop where the
 * camera pulls back `scale` times: the path ends where it began, `scale`
 * times further from the world's origin and moving `scale` times faster, so
 * on screen the end flows into the start. Keys are wrapped round the seam,
 * scaled, before the curve is fitted, so the curve has no kink there.
 */
export function zoomLoopPath(keys: readonly PathKey[], loopS: number, scale: number): (t: number) => PathPoint {
  const wrapped = [
    ...keys.slice(-2).map((k) => scaled(k, -loopS, 1 / scale)),
    ...keys,
    ...keys.slice(0, 2).map((k) => scaled(k, loopS, scale)),
  ];
  const xs = axis(wrapped, 'x', 'vx');
  const ys = axis(wrapped, 'y', 'vy');
  return (t) => {
    const u = ((t % loopS) + loopS) % loopS;
    const x = curveAt(xs, u);
    const y = curveAt(ys, u);
    return { x: x.at, y: y.at, vx: x.rate, vy: y.rate };
  };
}
