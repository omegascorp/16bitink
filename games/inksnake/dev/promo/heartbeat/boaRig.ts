import { VIDEO } from '../short';
import { type BodyPose, drawBody, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';
import { JAW_ART, type EyeState } from './boaHead';
import type { Cast } from './cast';

/**
 * The boa's side-on head: two sprites hung from hinges on the neck and
 * pointing at the lips, and the boa's body laid along a spine.
 */
export interface Jaws {
  /** The middle of the mouth's rim, the way the head points and the head's length. */
  readonly rim: Pt;
  readonly heading: number;
  readonly len: number;
  readonly neck: number;
  /** How far the neck stands off the axis at the hinges, each side (a meal spreads them). */
  readonly hingeTop: number;
  readonly hingeBottom: number;
  /** The gape at the rim, each side of the axis. */
  readonly top: number;
  readonly bottom: number;
  readonly eye: EyeState;
}

export interface Axis {
  readonly e: Pt;
  readonly up: Pt;
}

export const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

export const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

interface Place {
  readonly hingeU: Pt;
  readonly hingeL: Pt;
  readonly tipU: Pt;
  readonly tipL: Pt;
}

function placeOf(j: Jaws): Place {
  const a = axisOf(j.heading);
  // Shut, the lips meet back to the hinge; open, the jaws spring from the top and bottom of the neck.
  const hinge = 0.04 + 0.68 * Math.min(1, (j.top + j.bottom) / 120);
  const half = j.neck / 2;
  const offU = Math.max(j.hingeTop, half) - half * (1 - hinge);
  const offL = Math.max(j.hingeBottom, half) - half * (1 - hinge);
  return { hingeU: along(j.rim, a, -j.len, offU), hingeL: along(j.rim, a, -j.len, -offL), tipU: along(j.rim, a, 0, j.top), tipL: along(j.rim, a, 0, -j.bottom) };
}

function drawJaw(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, hinge: Pt, tip: Pt, alpha: number): void {
  const rotation = Math.atan2(tip.y - hinge.y, tip.x - hinge.x);
  drawSprite(ctx, sprite, boil, { x: hinge.x, y: hinge.y, rotation, flip: -1, scale: Math.hypot(tip.x - hinge.x, tip.y - hinge.y) / JAW_ART, alpha });
}

/** The jaws over the neck and over whatever is in them. */
export function drawJaws(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, j: Jaws): void {
  const q = placeOf(j);
  drawJaw(ctx, cast.lower, boil, q.hingeL, q.tipL, 1);
  drawJaw(ctx, cast.upper[j.eye], boil, q.hingeU, q.tipU, 1);
}

/** A length of the boa as the game lays a body, with a brown contour over the strip's edge. */
export function drawBoaBody(ctx: CanvasRenderingContext2D, strip: Strip, boil: number, pose: BodyPose): void {
  drawBody(ctx, strip, boil, pose);
  const n = pose.spine.length;
  const side = (s: 1 | -1): Pt[] => pose.spine.map((p, i) => {
    const a = pose.spine[Math.max(0, i - 1)]!;
    const c = pose.spine[Math.min(n - 1, i + 1)]!;
    const l = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const half = (pose.widths[i]! / 2) * s;
    return { x: p.x - ((a.y - c.y) / l) * half, y: p.y + ((a.x - c.x) / l) * half };
  });
  ctx.save();
  ctx.strokeStyle = '#150c0a';
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'round';
  for (const edge of [side(1), side(-1)]) {
    ctx.beginPath();
    edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** The picture zoomed about a point on screen, shaken by (`dx`, `dy`). */
export function zoomAbout(ctx: CanvasRenderingContext2D, at: Pt, zoom: number, dx = 0, dy = 0): void {
  ctx.translate(at.x + dx, at.y + dy);
  ctx.scale(zoom, zoom);
  ctx.translate(-at.x, -at.y);
}

/** The dark ground, `off` screen px from its centre. */
export function drawDark(ctx: CanvasRenderingContext2D, dark: HTMLCanvasElement, off: Pt = { x: 0, y: 0 }): void {
  ctx.drawImage(dark, off.x - (dark.width - VIDEO.width) / 2, off.y - (dark.height - VIDEO.height) / 2);
}
