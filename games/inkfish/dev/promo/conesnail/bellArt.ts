import { INK, Pen, type Pt } from '../../../src/art/pen';
import { type Bell, flareAt, onBell, RIM_SLANT } from './shape';

/**
 * The false mouth (rostrum) as a funnel of thin, see-through pink flesh:
 * its dark inside, the wall over whatever is going in (the fish shows
 * through it as a ghost), fine muscle lines that become a net, and the
 * fleshy rim. A fish inside swells the funnel round it.
 *
 * Drawn live in snail px, in two passes either side of the fish: `drawBellBack`
 * (the dark inside and the far lip), then the fish, then `drawBellFront`.
 */

const WALL_BASE = '#8e5470';
const WALL_RIM = '#ecbfca';
const LIP = '#f2cfd6';
const SPECK = '#55233c';

/** A fish inside, as the bulge it makes: where its body is along the axis (sp from the base) and its half-height. */
export interface Lump {
  readonly from: number;
  readonly to: number;
  readonly half: number;
}

const N = 28;

/** The funnel's half-width at s (0 base .. 1 rim), swollen round a fish inside. */
export function widthAt(b: Bell, s: number, lump: Lump | null): number {
  const flare = flareAt(b, s);
  if (!lump || lump.half <= 0) return flare;
  const d = s * b.len;
  const u = (d - lump.from) / (lump.to - lump.from);
  if (u <= 0 || u >= 1) return flare;
  return Math.max(flare, lump.half * Math.sin(Math.PI * u) ** 0.45);
}

/** The rim's ellipse at angle a: 0 on the +normal side, π/2 the far lip (along the axis), π the -normal side. */
const rimAt = (b: Bell, a: number): Pt => ({
  x: b.centre.x + b.nrm.x * b.rim * Math.cos(a) + b.dir.x * b.rim * RIM_SLANT * Math.sin(a),
  y: b.centre.y + b.nrm.y * b.rim * Math.cos(a) + b.dir.y * b.rim * RIM_SLANT * Math.sin(a),
});
const arc = (b: Bell, from: number, to: number, n = 24): Pt[] => Array.from({ length: n + 1 }, (_, i) => rimAt(b, from + ((to - from) * i) / n));

function sides(b: Bell, lump: Lump | null): { readonly plus: Pt[]; readonly minus: Pt[] } {
  const plus: Pt[] = [];
  const minus: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const w = widthAt(b, s, lump);
    plus.push(onBell(b, s, w));
    minus.push(onBell(b, s, -w));
  }
  return { plus, minus };
}

/** The funnel's outline: one side, round the far lip, back along the other side. */
export function silhouette(b: Bell, lump: Lump | null): Pt[] {
  const { plus, minus } = sides(b, lump);
  return [...plus, ...arc(b, 0, Math.PI), ...[...minus].reverse()];
}

const opening = (b: Bell): Pt[] => arc(b, 0, Math.PI * 2, 40);

function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[], move = true): void {
  pts.forEach((p, i) => (i === 0 && move ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** The dark inside of the funnel (all of it), and the far lip's inner face. */
export function drawBellBack(ctx: CanvasRenderingContext2D, b: Bell, lump: Lump | null, boil: number): void {
  const pen = new Pen(ctx, 811 + boil * 977, 0.6);
  const shape = silhouette(b, lump);
  const g = ctx.createRadialGradient(b.base.x, b.base.y, 4, b.base.x, b.base.y, b.len + b.rim);
  g.addColorStop(0, '#0d0409');
  g.addColorStop(0.6, '#2a0f1f');
  g.addColorStop(1, '#5a2741');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  pathOf(ctx, shape);
  ctx.fill();
  // The far lip's inner face catches a little light.
  ctx.beginPath();
  pathOf(ctx, opening(b));
  ctx.clip();
  const lipFace = arc(b, Math.PI * 0.12, Math.PI * 0.88, 18);
  pen.stroke(lipFace, Math.max(2, b.rim * 0.07), '#b9788e', 0.5, false);
  ctx.restore();
  pen.stroke(arc(b, 0, Math.PI), Math.max(2, b.rim * 0.08), LIP, 0.6, false);
  pen.stroke(arc(b, 0, Math.PI), 2.2, INK, 0.95);
}

/**
 * The wall in front: translucent pink flesh over everything inside the
 * funnel but the opening, freckled, with muscle lines (a net when `mesh`
 * is up), the outline and the near lip.
 */
export function drawBellFront(ctx: CanvasRenderingContext2D, b: Bell, lump: Lump | null, wall: number, mesh: number, boil: number): void {
  const pen = new Pen(ctx, 823 + boil * 977, 0.6);
  const shape = silhouette(b, lump);
  const hole = opening(b);
  const { plus, minus } = sides(b, lump);

  ctx.save();
  ctx.beginPath();
  pathOf(ctx, shape);
  pathOf(ctx, hole);
  ctx.clip('evenodd');
  // Flesh, darker at the base, lit on its upper side.
  const along = ctx.createLinearGradient(b.base.x, b.base.y, b.centre.x, b.centre.y);
  along.addColorStop(0, WALL_BASE);
  along.addColorStop(1, WALL_RIM);
  ctx.globalAlpha = wall;
  ctx.fillStyle = along;
  ctx.fillRect(Math.min(b.base.x, b.centre.x) - b.rim - 40, Math.min(b.base.y, b.centre.y) - b.rim - 40, Math.abs(b.centre.x - b.base.x) + 2 * b.rim + 80, Math.abs(b.centre.y - b.base.y) + 2 * b.rim + 80);
  ctx.globalAlpha = 1;
  const lit = b.nrm.y < 0 ? 1 : -1;
  const midW = Math.max(30, b.rim);
  const a = onBell(b, 0.6, lit * midW);
  const c = onBell(b, 0.6, -lit * midW);
  const across = ctx.createLinearGradient(a.x, a.y, c.x, c.y);
  across.addColorStop(0, 'rgba(255,238,244,0.32)');
  across.addColorStop(0.45, 'rgba(255,238,244,0)');
  across.addColorStop(1, 'rgba(50,14,34,0.42)');
  ctx.fillStyle = across;
  ctx.fillRect(-2000, -2000, 4000, 4000);
  pen.stipple(shape, Math.round(120 + b.len * 1.4), () => 0.55, 1.1, SPECK);
  // Muscle lines along it, and rings round it; more of them, darker, as a net.
  const strength = 0.22 + 0.5 * mesh;
  for (const f of [-0.75, -0.4, 0, 0.4, 0.75]) {
    const line = Array.from({ length: N + 1 }, (_, i) => onBell(b, i / N, f * widthAt(b, i / N, lump)));
    pen.hair(line, 0.9, '#5b2440', strength);
  }
  if (mesh > 0.01) {
    for (let k = 0; k < 10; k++) {
      for (const sign of [1, -1]) {
        const helix = Array.from({ length: N + 1 }, (_, i) => {
          const s = i / N;
          return onBell(b, s, widthAt(b, s, lump) * Math.cos(k * 0.63 + sign * s * 5.2));
        });
        pen.hair(helix, 0.8, '#3a1428', 0.5 * mesh);
      }
    }
  }
  for (const s of [0.3, 0.5, 0.68, 0.84]) {
    const w = widthAt(b, s, lump);
    const ring = Array.from({ length: 13 }, (_, i) => {
      const t = Math.PI + (i / 12) * Math.PI;
      const p = onBell(b, s, w * Math.cos(t));
      return { x: p.x + b.dir.x * w * RIM_SLANT * Math.sin(t), y: p.y + b.dir.y * w * RIM_SLANT * Math.sin(t) };
    });
    pen.hair(ring, 0.8, '#5b2440', strength * 0.9);
  }
  ctx.restore();

  pen.stroke(plus, 2.3);
  pen.stroke(minus, 2.3);
  // The near lip: a fleshy roll, inked.
  const near = arc(b, Math.PI, Math.PI * 2);
  pen.stroke(near, Math.max(3, b.rim * 0.15), LIP, 0.95, false);
  pen.stroke(near, 2.2, INK, 1);
  pen.hair(arc(b, Math.PI * 1.1, Math.PI * 1.9, 16).map((p) => ({ x: p.x + b.dir.x * 5, y: p.y + b.dir.y * 5 })), 0.8, '#5b2440', 0.6);
}
