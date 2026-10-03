import type Phaser from 'phaser';

/**
 * The bait: an earthworm threaded on the hook, drawn live every frame so it
 * squirms. The middle is pierced along the shank; both ends hang free and
 * wriggle, the lower one longer. Coordinates are in hook-texture units,
 * relative to the hook's origin (the eye of the hook at the line).
 */
interface Pt {
  readonly x: number;
  readonly y: number;
}

const FLESH = 0xc0675d;
const BAND = 0xd98b80;
const OUTLINE = 0x1b1a1f;
/** The worm's threaded middle: zigzags over the shank (x = 0 is the shank). */
const THREADED: readonly Pt[] = [{ x: 0, y: 16 }, { x: 4, y: 21 }, { x: -3, y: 27 }, { x: 4, y: 33 }, { x: -2, y: 39 }];
const STEP = 1.6;

/** A free end hanging from `from`, wriggling: the bend grows towards the tip. */
function tail(from: Pt, heading: number, length: number, t: number, speed: number, phase: number): Pt[] {
  const pts: Pt[] = [from];
  let { x, y } = from;
  const n = Math.round(length / STEP);
  for (let k = 1; k <= n; k++) {
    const s = k / n;
    const a = heading + Math.sin(s * 4.2 - t * speed + phase) * 0.9 * s + Math.sin(t * speed * 0.5 + phase) * 0.35 * s;
    x += Math.cos(a) * STEP;
    y += Math.sin(a) * STEP;
    pts.push({ x, y });
  }
  return pts;
}

/** Catmull-Rom through the threaded points so the middle reads as one soft body. */
function smooth(points: readonly Pt[], t: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const n = Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / STEP);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const u2 = u * u;
      const u3 = u2 * u;
      const c = (a: number, b: number, d: number, e: number): number =>
        0.5 * (2 * b + (-a + d) * u + (2 * a - 5 * b + 4 * d - e) * u2 + (-a + 3 * b - 3 * d + e) * u3);
      // The pierced body still squirms a little against the steel.
      const squirm = Math.sin(t * 5 + i * 1.7) * 0.6;
      out.push({ x: c(p0.x, p1.x, p2.x, p3.x) + squirm, y: c(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** The whole worm as one path, top free end to bottom free end, `t` in seconds. */
export function wormPath(t: number, frantic: boolean): Pt[] {
  const speed = frantic ? 11 : 5;
  const middle = smooth(THREADED, t);
  const top = tail(THREADED[0]!, -2.3, 13, t, speed, 0).reverse();
  const bottom = tail(THREADED[THREADED.length - 1]!, 1.9, 30, t, speed, 2.1);
  return [...top, ...middle, ...bottom.slice(1)];
}

/** Body radius along the worm (0..1): plump in the middle, tapering at both ends. */
const radiusAt = (s: number): number => 1.3 + 2 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)) ** 0.8);

/** Draws the worm into `g` with its origin at the hook's eye (x, y). */
export function drawWorm(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, frantic: boolean): void {
  const path = wormPath(t, frantic);
  const last = path.length - 1;
  const at = (i: number): Pt => ({ x: x + path[i]!.x, y: y + path[i]!.y });
  // Ink outline first, flesh over it: a soft tube with a pen edge.
  g.fillStyle(OUTLINE, 0.9);
  for (let i = 0; i <= last; i++) g.fillCircle(at(i).x, at(i).y, radiusAt(i / last) + 0.8);
  for (let i = 0; i <= last; i++) {
    const s = i / last;
    // The saddle (clitellum): a paler band a third of the way down.
    g.fillStyle(s > 0.22 && s < 0.32 ? BAND : FLESH, 1).fillCircle(at(i).x, at(i).y, radiusAt(s));
  }
  // Segment rings across the body and a wet highlight along the top.
  for (let i = 2; i < last; i += 2) {
    const a = at(i - 1);
    const b = at(i + 1);
    const p = at(i);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const r = radiusAt(i / last) * 0.9;
    g.lineStyle(0.6, OUTLINE, 0.45).lineBetween(p.x - nx * r, p.y - ny * r, p.x + nx * r, p.y + ny * r);
    g.fillStyle(0xfff4ea, 0.5).fillCircle(p.x - nx * r * 0.45, p.y - ny * r * 0.45, 0.45);
  }
}
