import type { Draw } from './kit';
import type { Pt } from './pen';
import { rgba } from './wash';

/**
 * A small helper the allotment's painters share: solid round stock (a
 * handle, a cane, a hose, a wire) of even width, which the pen's tapering
 * stroke would thin to whiskers at both ends.
 */

/** Solid round stock along `pts`: an ink edge, the body colour, and a lit line along the side towards the light. */
export function rod(d: Draw, pts: readonly Pt[], width: number, colour: string, alpha = 1, edge = 0.85): void {
  const { ctx } = d.pen;
  const path = (dx = 0, dy = 0): void => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (edge > 0) {
    path();
    ctx.lineWidth = width + 1.3;
    ctx.strokeStyle = rgba(d.ink, edge * alpha);
    ctx.stroke();
  }
  path();
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.stroke();
  if (width >= 2.5) {
    path(-width * 0.18, -width * 0.24);
    ctx.lineWidth = width * 0.28;
    ctx.strokeStyle = rgba('#fffaf0', 0.4 * alpha);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft shadow of round stock along `pts`, `width` wide (no edge, no light). */
export function rodShadow(d: Draw, pts: readonly Pt[], width: number, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(d.ink, alpha);
  ctx.stroke();
  ctx.restore();
}
