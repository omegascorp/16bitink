import { bezier, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { inside } from '../../../scenes/map/plan';
import { MAP } from '../../../scenes/map/layout';
import { type IslandArt, offsetShape } from '../context';
import type { BiomeArt } from '../island';
import { awash, boatTop, breakers, crown, palmStar, roof, sailboat } from '../symbols';
import { turtle } from '../creatures';
import { anywhere, centre, name, offshore, place, ring, watersOf } from './common';

/**
 * Beach 1, a Maldives atoll: a ring of coral sand round a turquoise
 * lagoon, its northern rim broken into motus by passes, palms everywhere,
 * a walkway of water villas out over the lagoon, and a reef with the surf
 * breaking on it all the way round.
 */
const REEF = 60;

/** Whether a point on the reef line sits in the mouth of one of the passes. */
function inPass(a: IslandArt, p: Pt): boolean {
  return watersOf(a, 'pass').some((w) => Math.abs(p.x - w.spine[0]!.x) < 34 && p.y < a.inland(p.x));
}

function sea(a: IslandArt): void {
  const d = a.pen(10);
  const reef = ring(a, REEF);
  // Pale shallows inside the reef, deep blue falling away outside it.
  d.pen.fill(reef, '#9be6dc', a.draft ? 0.08 : 0.22);
  a.ctx.save();
  a.ctx.globalAlpha = a.draft ? 0.04 : 0.1;
  a.ctx.strokeStyle = '#1f6f93';
  a.ctx.lineWidth = 26;
  a.ctx.beginPath();
  ring(a, REEF + 18).forEach((p, i) => (i === 0 ? a.ctx.moveTo(p.x, p.y) : a.ctx.lineTo(p.x, p.y)));
  a.ctx.closePath();
  a.ctx.stroke();
  a.ctx.restore();
  // The reef: a foam line with surf curling on its seaward side, broken at the passes.
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 3 && run.some((p) => p.x > a.span.x0 - 20 && p.x < a.span.x1 + 20)) {
      d.pen.stroke(run, 4, PAPER_FILL, 0.7, false);
      d.pen.hair(run, 0.7, a.ink, 0.55);
      breakers(d, offsetShape(run, 0, 0).map((p, i) => (i % 2 ? p : pt(p.x, p.y + (p.y > a.inland(p.x) ? 5 : -5)))), 7, 3, 0.55);
    }
    run = [];
  };
  for (const p of reef) {
    if (inPass(a, p)) flush();
    else run.push(p);
  }
  flush();
  // Coral heads scattered in the shallows.
  for (const p of place(a, 46, () => anywhere(a, -0.08, 1.08), (q) => !a.onLand(q.x, q.y, -14) && inside(reef, q) && !inPass(a, q), 14)) {
    a.el(p.x, p.y, 6, (e) => (e.pen.rng() < 0.5 ? awash(e, p.x, p.y, 3, 0.55) : e.pen.circle(p.x, p.y, 2 + e.pen.rng() * 2, 0.5, a.ink)));
  }
}

function lagoon(a: IslandArt): void {
  const lag = watersOf(a, 'lagoon')[0];
  if (!lag) return;
  const d = a.pen(11);
  d.pen.fill(offsetShape(lag.shape, -22, 4), '#2f9fb0', a.draft ? 0.1 : 0.3);
  d.pen.fill(offsetShape(lag.shape, -40, 4), '#1f7f9f', a.draft ? 0.06 : 0.18);
  // Sand shoals stippled along its edges, coral heads in the middle.
  d.pen.stipple(lag.shape, 900, (x, y) => (inside(offsetShape(lag.shape, -12, 2), pt(x, y)) ? 0.06 : 0.7), 0.5, '#9c8a62');
  for (const p of place(a, 30, () => anywhere(a, 0.05, 0.95), (q) => inside(offsetShape(lag.shape, -14, 2), q), 18)) {
    a.el(p.x, p.y, 5, (e) => e.pen.circle(p.x, p.y, 1.6 + e.pen.rng() * 2.4, 0.5, a.ink));
  }
  const c = centre(lag.shape);
  name(a, 'the Lagoon', a.at(0.3), c.y + 4, 17);
  // A walkway of water villas out over the lagoon, from a jetty on its southern shore.
  const jx = a.at(0.5);
  const foot = pt(jx - 30, a.coast(jx - 30) - MAP.sandBand - 22);
  const walk = bezier(foot, pt(jx + 10, foot.y - 50), pt(jx + 80, foot.y - 66), 14);
  a.el(jx + 20, foot.y - 40, 120, (e) => {
    for (let k = 3; k < walk.length; k += 2) {
      for (const dir of [-1, 1]) {
        const p = walk[k]!;
        const q = walk[Math.min(walk.length - 1, k + 1)]!;
        const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        const nx = (-(q.y - p.y) / l) * dir;
        const ny = ((q.x - p.x) / l) * dir;
        e.pen.stroke([p, pt(p.x + nx * 10, p.y + ny * 10)], 1.6, '#b9925e', 0.95, false);
        roof(e, p.x + nx * 17, p.y + ny * 17, 12, 10, Math.atan2(ny, nx), '#c9a46a');
      }
    }
    e.pen.stroke(walk, 3.4, '#b9925e', 0.95, false);
    e.pen.hair(walk, 0.5, a.ink, 0.8);
    const end = walk.at(-1)!;
    roof(e, end.x + 10, end.y, 18, 14, -0.2, '#c9a46a');
  });
  name(a, 'water villas', jx + 40, foot.y + 12, 14);
  // A seaplane moored at the end of the lagoon.
  const sx = a.at(0.78);
  const sy = c.y + 6;
  a.el(sx, sy, 20, (e) => {
    boatTop(e, sx, sy, 22, 0.1, '#e8e2d2');
    e.pen.stroke([pt(sx - 3, sy - 16), pt(sx + 2, sy + 16)], 3, '#e8e2d2', 0.95, false);
    e.pen.hair([pt(sx - 3, sy - 16), pt(sx + 2, sy + 16)], 0.6, a.ink, 0.8);
  });
}

function land(a: IslandArt): void {
  lagoon(a);
  // Palms crowd the rim; low scrub between them.
  const ok = (q: Pt): boolean => a.interior(q.x, q.y, 5) || (a.onLand(q.x, q.y, 6) && q.y < a.scrub(q.x) + 8 && a.clear(q.x, q.y, 10));
  for (const p of place(a, 60, () => anywhere(a), ok, 9)) a.el(p.x, p.y, 7, (e) => crown(e, p.x, p.y, 4 + e.pen.rng() * 2.5, '#8cbf6a', 0.75));
  for (const p of place(a, 130, () => anywhere(a), ok, 15)) a.el(p.x, p.y, 12, (e) => palmStar(e, p.x, p.y, 8 + e.pen.rng() * 3));
  for (const w of watersOf(a, 'pass')) name(a, 'pass', w.spine[0]!.x + 22, w.spine[0]!.y - 4, 13, -0.2);
}

function over(a: IslandArt): void {
  const reefLabel = ring(a, REEF + 12).find((p) => p.x > a.at(0.06) && p.y > a.inland(p.x));
  if (reefLabel) name(a, 'outer reef', reefLabel.x, reefLabel.y + 4, 14, 0.12);
  const boat = offshore(a, 128, 138, 0.22, 0.24);
  a.el(boat.x, boat.y, 20, (e) => sailboat(e, boat.x, boat.y, 0.9, '#f3ead2'));
  const t = offshore(a, 40, 46, 0.42, 0.44);
  a.el(t.x, t.y, 20, (e) => turtle(e, t.x, t.y, 0.8, 0.6));
}

export const ATOLL: BiomeArt = { sea, land, over, shallows: '#bdeee6', inner: '#5cc4c4', edge: 'soft' };
