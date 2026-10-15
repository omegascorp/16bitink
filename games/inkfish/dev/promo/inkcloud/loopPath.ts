import { curveAt, type Key } from '../short';
import type { PathKey, PathPoint } from '../gameplay/zoomPath';

export type { PathKey, PathPoint };

const shifted = (k: PathKey, dt: number, dx: number): PathKey => ({ ...k, t: k.t + dt, x: k.x + dx });

const axis = (keys: readonly PathKey[], at: 'x' | 'y', rate: 'vx' | 'vy'): Key[] =>
  keys.map((k) => ({ t: k.t, at: k[at], ...(k[rate] === undefined ? {} : { rate: k[rate] }) }));

/**
 * A smooth path through keys (times in [0, loopS)) for a loop where the
 * whole scene travels `shiftX` world px to the right each time round (the
 * camera with it): the path ends where it began, `shiftX` further on, moving
 * just as fast. Like gameplay/zoomPath's zoomLoopPath, but sliding instead of
 * zooming. Keys are wrapped round the seam, shifted, before the curve is
 * fitted, so the curve has no kink there. Read it at t in [0, loopS).
 */
export function slideLoopPath(keys: readonly PathKey[], loopS: number, shiftX: number): (t: number) => PathPoint {
  const wrapped = [
    ...keys.slice(-2).map((k) => shifted(k, -loopS, -shiftX)),
    ...keys,
    ...keys.slice(0, 2).map((k) => shifted(k, loopS, shiftX)),
  ];
  const xs = axis(wrapped, 'x', 'vx');
  const ys = axis(wrapped, 'y', 'vy');
  return (t) => {
    const x = curveAt(xs, t);
    const y = curveAt(ys, t);
    return { x: x.at, y: y.at, vx: x.rate, vy: y.rate };
  };
}
