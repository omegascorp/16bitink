import type { Rng } from '../../logic/rng';
import { polar, SHADOW } from '../groundKit';
import { bezier, closed, type Draw, pt, TAU } from '../kit';
import { FLAME, GLOW, GLOW_DEEP, MOON } from '../nightKit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze, petalBlade } from '../propsKit';
import { mix, rgba } from '../wash';

/**
 * The tawny owl's plumage and head, seen from above facing +x: mottled
 * russet feathers laid as overlapping painted scallops with dark shaft
 * streaks and cream flecks, barred flight feathers, and the round head
 * with the facial disc at its front, the dark-ringed glowing eyes and the
 * small hooked beak. The head sits in the same place in every pose so the
 * game can lay the glowing eyes over the night.
 */
export const OWL = {
  russet: '#a5653c',
  rust: '#c07a45',
  deep: '#5e3823',
  dark: '#3a2419',
  buff: '#d6ab76',
  cream: '#efdcb8',
  disc: '#cfa475',
  beak: '#cdbf98',
} as const;

/** The head's centre and radius. */
export const HEAD = pt(13, 0);
export const HEAD_R = 18.5;
/** The eyes' centres (left, right) and the iris radii: the same in every pose. */
export const EYES: readonly Pt[] = [pt(23.4, -7.4), pt(23.4, 7.4)];
const IRIS = { rx: 3.3, ry: 3.9 } as const;

/** A faint moonlit rim round a silhouette, so the owl reads against the night (it vanishes on pale ground). */
export function moonRim(d: Draw, shape: readonly Pt[]): void {
  d.pen.stroke(closed(shape), 3.2, MOON, 0.32, false);
}

/** Whether p lies inside the closed polygon. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * Feathers over `shape`: `n` small scallops, each tipped along dir(p) and
 * laid so the ones nearer their roots lie over those behind, painted as
 * glazes of russet, deep brown and buff with a dark shaft streak and now and
 * then a cream bar, their tips edged with the pen. `ruffle` throws them askew.
 */
export function plumage(d: Draw, shape: readonly Pt[], rng: Rng, dir: (p: Pt) => number, n: number, size: number, ruffle = 0): void {
  const { pen } = d;
  const pts: { p: Pt; a: number; key: number }[] = [];
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let tries = 0; pts.length < n && tries < n * 6; tries++) {
    const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    if (!inside(shape, p)) continue;
    const a = dir(p) + (rng() - 0.5) * (0.35 + ruffle * 1.6);
    pts.push({ p, a, key: -(p.x * Math.cos(dir(p)) + p.y * Math.sin(dir(p))) });
  }
  pts.sort((u, v) => u.key - v.key);
  pen.clipped(shape, () => {
    for (const { p, a } of pts) {
      const s = size * (0.8 + rng() * 0.45);
      const f = petalBlade(polar(p, a + Math.PI, s * 0.35), a, s, s * 0.78, (rng() - 0.5) * 0.1);
      const tone = rng();
      pen.fill(f.shape, tone < 0.45 ? OWL.russet : tone < 0.7 ? OWL.rust : tone < 0.88 ? OWL.deep : OWL.buff, 0.42);
      pen.hair([f.at(0.15, 0), f.at(0.85, 0)], s * 0.16, OWL.dark, 0.75);
      if (rng() < 0.35) pen.hair([f.at(0.6, -s * 0.25), f.at(0.66, s * 0.25)], s * 0.12, OWL.cream, 0.85);
      if (rng() < 0.3) pen.hair([f.at(0.42, -s * 0.24), f.at(0.46, s * 0.24)], s * 0.09, OWL.dark, 0.6);
      pen.hair(f.shape.slice(9, 25), 0.4, OWL.dark, 0.55);
      pen.hair(f.shape.slice(11, 23).map((q) => pt(q.x - Math.cos(a) * 0.5, q.y - Math.sin(a) * 0.5)), 0.35, OWL.cream, 0.35);
    }
  });
}

/** A barred flight feather from `base` to `tip`, `w` wide: buff with dark bars, pale edge, dark shaft. */
export function barredFeather(d: Draw, base: Pt, tip: Pt, w: number, bars: number, alpha = 1, shift = 0, warm = false): Pt[] {
  const { pen } = d;
  const len = Math.hypot(tip.x - base.x, tip.y - base.y);
  const ang = Math.atan2(tip.y - base.y, tip.x - base.x);
  const f = petalBlade(base, ang, len, w, 0);
  pen.fill(f.shape, PAPER_FILL, alpha);
  pen.fill(f.shape, mix(OWL.buff, OWL.russet, warm ? 0.6 : 0.3), 0.85 * alpha);
  pen.clipped(f.shape, () => {
    for (let i = 0; i < bars; i++) {
      const u = 0.2 + shift + (i / bars) * 0.72;
      const h = 0.04;
      pen.fill([f.at(u - h, -w), f.at(u - h + 0.04, w), f.at(u + h + 0.04, w), f.at(u + h, -w)], OWL.deep, 0.6 * alpha);
    }
    pen.fill([f.at(0.92, -w), f.at(0.92, w), f.at(1.1, w), f.at(1.1, -w)], OWL.deep, 0.5 * alpha);
    pen.hair([f.at(0.1, -w * 0.3), f.at(0.95, -w * 0.3)], 0.6, OWL.cream, 0.4 * alpha);
  });
  pen.hair([f.at(0.02, 0), f.at(0.9, 0)], 0.45, OWL.dark, 0.8 * alpha);
  pen.hair(closed(f.shape), 0.5, d.ink, 0.8 * alpha);
  return f.shape;
}

/** The head's outline: round, a little broader across the face. */
export function headShape(ruffled = 0, rng?: Rng): Pt[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const jag = ruffled > 0 && rng ? (i % 3 === 0 ? 1 + ruffled * (0.05 + rng() * 0.08) : 1) : 1;
    return polar(HEAD, a, HEAD_R * (1 + 0.04 * Math.cos(2 * a)) * jag);
  });
}

/** The facial disc at the front of the head: its outline (clipped to the head by the caller). */
function discShape(): Pt[] {
  return ellipseAt(22.5, 0, 10, 16.5, 0, 40);
}

/** One iris, glowing: a hot centre through gold to amber, the big dark pupil, a glint. */
function iris(d: Draw, c: Pt, glowAlpha: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const shape = ellipseAt(c.x, c.y, IRIS.rx, IRIS.ry, 0, 20);
  const g = ctx.createRadialGradient(c.x - 0.4, c.y, 0.3, c.x, c.y, IRIS.ry);
  g.addColorStop(0, rgba(FLAME, 1));
  g.addColorStop(0.45, rgba(GLOW, 1));
  g.addColorStop(1, rgba(GLOW_DEEP, 1));
  pen.clipped(shape, () => {
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 5, c.y - 5, 10, 10);
  });
  if (glowAlpha > 0) glaze(d, c.x, c.y, IRIS.rx * 0.9, IRIS.ry * 0.9, 0, FLAME, glowAlpha);
  pen.fill(ellipseAt(c.x + 0.5, c.y, 1.7, 2.1, 0, 16), '#120c10', 1);
  pen.dot(c.x - 0.5, c.y - 1.1, 0.6, '#ffffff', 0.95);
  pen.hair(closed(shape), 0.55, d.ink, 0.95);
}

/** The glowing eyes alone, with their halos: what the game lays over the night. */
export function glowingEyes(d: Draw): void {
  const { ctx } = d.pen;
  for (const e of EYES) {
    const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 14);
    g.addColorStop(0, rgba(GLOW, 0.65));
    g.addColorStop(0.3, rgba(GLOW_DEEP, 0.32));
    g.addColorStop(1, rgba(GLOW_DEEP, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(e.x - 14, e.y - 14, 28, 28);
    ctx.restore();
    iris(d, e, 0.35);
  }
}

/**
 * The head: its cast shadow, the crown's radiating feathers, the facial disc
 * with its dark ruff, pale brows and fine radial feathering, the eyes in
 * their dark rings (or shut), and the beak.
 */
export function drawHead(d: Draw, rng: Rng, o: { shut: boolean; ruffle: number }): Pt[] {
  const { pen } = d;
  const head = headShape(o.ruffle, rng);
  pen.fill(head.map((p) => pt(p.x + SHADOW.x * 3, p.y + SHADOW.y * 3)), d.ink, 0.22);
  moonRim(d, head);
  pen.fill(head, PAPER_FILL, 1);
  pen.fill(head, OWL.russet, 0.85);
  const face = pt(30, 0);
  plumage(d, head, rng, (p) => Math.atan2(p.y - face.y, p.x - face.x), 120, 4.6, o.ruffle);
  const disc = discShape();
  pen.clipped(head, () => {
    pen.fill(disc, PAPER_FILL, 0.9);
    pen.fill(disc, OWL.disc, 0.85);
    pen.clipped(disc, () => {
      for (const e of EYES) {
        for (let k = 0; k < 22; k++) {
          const a = (k / 22) * TAU;
          pen.hair([polar(e, a, 5.5), polar(e, a + 0.15, 10.5)], 0.35, OWL.deep, 0.45);
        }
      }
      // Pale brows meeting over the beak, darker edges round the disc.
      for (const s of [-1, 1]) pen.stroke(bezier(pt(28, s * 0.6), pt(22, s * 1.5), pt(17.5, s * 9), 8), 1.8, OWL.cream, 0.9, false);
      pen.crescent(disc, pt(1.5, 0), () => pen.fill(disc, OWL.deep, 0.3));
    });
    // The ruff: a dark rim where the disc meets the crown, scalloped round each eye.
    for (const s of [-1, 1]) {
      pen.stroke(bezier(pt(21, s * 1), pt(13, s * 8), pt(20, s * 16.5), 10), 1.5, OWL.dark, 0.85, false);
      pen.hair(bezier(pt(22, s * 1.5), pt(14.5, s * 8), pt(21, s * 15.5), 10), 0.9, OWL.cream, 0.6);
    }
  });
  for (const e of EYES) {
    const ring = ellipseAt(e.x - 0.3, e.y, IRIS.rx + 1.7, IRIS.ry + 1.9, 0, 22);
    pen.fill(ring, OWL.dark, 0.9);
    if (o.shut) {
      pen.fill(ellipseAt(e.x, e.y, IRIS.rx + 0.3, IRIS.ry + 0.3, 0, 18), mix(OWL.disc, OWL.deep, 0.35), 1);
      pen.stroke(bezier(pt(e.x - 0.8, e.y - IRIS.ry), pt(e.x + 2.2, e.y), pt(e.x - 0.8, e.y + IRIS.ry), 8), 1.1, d.ink, 0.95, false);
      for (const k of [-0.5, 0, 0.5]) pen.hair([pt(e.x + 1.4, e.y + k * IRIS.ry * 1.2), pt(e.x + 2.8, e.y + k * IRIS.ry * 1.5)], 0.4, d.ink, 0.7);
    } else {
      iris(d, e, 0.2);
    }
  }
  // The beak: a small hooked horn-grey bill between the eyes, its tip curving down.
  const beak = [pt(26.4, -2.3), pt(30.5, -1.4), pt(33.2, 0), pt(30.5, 1.4), pt(26.4, 2.3), pt(25.6, 0)];
  pen.fill(beak, PAPER_FILL, 1);
  pen.fill(beak, OWL.beak, 0.9);
  pen.crescent(beak, pt(-0.6, -0.8), () => pen.fill(beak, OWL.deep, 0.45));
  pen.hair([pt(27, -0.4), pt(32, 0)], 0.5, PAPER_FILL, 0.7);
  pen.hair(closed(beak), 0.6, d.ink, 0.95);
  // Volume: lit towards the moon at the upper left, the far side in shade, a pen contour.
  pen.clipped(head, () => glaze(d, HEAD.x - 6, HEAD.y - 8, 12, 9, -0.6, PAPER_FILL, 0.18));
  pen.crescent(head, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(head, OWL.dark, 0.3));
  pen.crescent(head, pt(-SHADOW.x * 6, -SHADOW.y * 6), () => pen.hatch(head, 2, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
  pen.stroke(closed(head), 1.3, d.ink, 0.95);
  return head;
}
