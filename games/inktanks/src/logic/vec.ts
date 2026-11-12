export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const TAU = Math.PI * 2;

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist2(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** An angle wrapped to (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r <= -Math.PI) r += TAU;
  else if (r > Math.PI) r -= TAU;
  return r;
}

/** `from` turned towards `to` by at most `max` radians. */
export function turnTowards(from: number, to: number, max: number): number {
  const d = wrapAngle(to - from);
  if (Math.abs(d) <= max) return wrapAngle(to);
  return wrapAngle(from + Math.sign(d) * max);
}

export function angleTo(a: Pt, b: Pt): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
