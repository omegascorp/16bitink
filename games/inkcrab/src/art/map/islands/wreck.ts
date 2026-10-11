import { bezier, type Draw, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL, RED } from '../../palette';
import { type IslandArt, straight } from '../context';
import type { BiomeArt } from '../island';
import { awash, breakers, cottage, crown, palmStar, rock, tuft, wader } from '../symbols';
import { anywhere, centre, name, place, watersOf } from './common';
import { ripples } from '../creatures';

/**
 * Beach 7, Wreck Cove: a Gulf shelling beach curved round a cove between
 * two points, a reef across its mouth with an old two-master broken on
 * it, the iron skeleton lighthouse on the east point, sea grape and
 * cabbage palms behind the sea oats, shell drifts on the sand and a pond
 * of spoonbills inland.
 */

/** The reef across the cove's mouth, from point to point. */
function reefLine(a: IslandArt): Pt[] {
  const w = a.at(0.02);
  const e = a.at(0.98);
  return bezier(pt(w, a.coast(w) + 16), pt(a.at(0.5), 640), pt(e, a.coast(e) + 16), 40);
}

/** The wreck: a two-master on her beam ends, masts snapped and leaning, with the chart's danger ring round her. */
function wreckedShip(d: Draw, x: number, y: number, s: number): void {
  d.pen.circle(x, y - 6 * s, 46 * s, 0.6, d.ink);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    d.pen.dot(x + Math.cos(a) * 52 * s, y - 6 * s + Math.sin(a) * 52 * s, 0.7, d.ink, 0.6);
  }
  const tilt = 0.22;
  const P = (dx: number, dy: number): Pt => pt(x + (dx * Math.cos(tilt) - dy * Math.sin(tilt)) * s, y + (dx * Math.sin(tilt) + dy * Math.cos(tilt)) * s);
  const hull = [P(-34, -12), P(30, -12), P(36, -20), P(28, 0), P(-28, 2)];
  d.pen.fill(hull, PAPER_FILL, 1);
  d.pen.fill(hull, '#7a5a3a', 0.85);
  d.pen.clipped(hull, () => {
    for (let k = 0; k < 5; k++) d.pen.hair([P(-36, -10 + k * 3), P(36, -14 + k * 3)], 0.5, d.ink, 0.6);
  });
  // A hole stove in her side, ribs showing.
  const hole = [P(-6, -10), P(8, -10), P(10, -3), P(-4, -2)];
  d.pen.fill(hole, '#2f2b28', 0.8);
  for (let k = 0; k < 4; k++) d.pen.hair([P(-4 + k * 4, -10), P(-3 + k * 4, -2)], 0.6, '#b9a684', 0.9);
  d.pen.stroke(straight(hull, 2), 1.2, d.ink, 0.9, false);
  // Masts: the fore standing at a lean, the main snapped short, rigging trailing.
  d.pen.stroke([P(-14, -12), P(-30, -58)], 1.6, d.ink, 0.9, false);
  d.pen.stroke([P(12, -12), P(18, -34)], 1.6, d.ink, 0.9, false);
  d.pen.stroke([P(18, -34), P(34, -30)], 1.2, d.ink, 0.8, false);
  d.pen.hair([P(-30, -58), P(30, -14)], 0.5, d.ink, 0.6);
  d.pen.hair([P(-30, -58), P(-36, -12)], 0.5, d.ink, 0.6);
  d.pen.hair(bezier(P(-24, -40), P(-10, -30), P(-6, -18), 6), 0.5, d.ink, 0.5);
  const rag = [P(-28, -52), P(-18, -50), P(-21, -40), P(-26, -42)];
  d.pen.fill(rag, '#efe1bd', 0.8);
  d.pen.hair(straight(rag, 1.5), 0.5, d.ink, 0.7);
  ripples(d, x, y + 4 * s, 44 * s, 0.55);
}

/** The Sanibel light: an iron skeleton tower, its stair column inside, the lantern dark on top. */
function skeletonLight(d: Draw, x: number, y: number, s: number): void {
  const h = 50 * s;
  const legs: [Pt, Pt][] = [[pt(x - 10 * s, y), pt(x - 3 * s, y - h)], [pt(x + 10 * s, y), pt(x + 3 * s, y - h)], [pt(x - 4 * s, y + 2 * s), pt(x - 1 * s, y - h)], [pt(x + 4 * s, y + 2 * s), pt(x + 1 * s, y - h)]];
  for (const [p, q] of legs) d.pen.hair([p, q], 0.9, d.ink, 0.9);
  for (let k = 0; k < 6; k++) {
    const t0 = k / 6;
    const t1 = (k + 1) / 6;
    const w0 = 10 - 7 * t0;
    const w1 = 10 - 7 * t1;
    d.pen.hair([pt(x - w0 * s, y - h * t0), pt(x + w1 * s, y - h * t1)], 0.4, d.ink, 0.7);
    d.pen.hair([pt(x + w0 * s, y - h * t0), pt(x - w1 * s, y - h * t1)], 0.4, d.ink, 0.7);
  }
  d.pen.stroke([pt(x, y), pt(x, y - h)], 2, '#3a3a3a', 0.8, false);
  const lamp = [pt(x - 4 * s, y - h), pt(x + 4 * s, y - h), pt(x + 3 * s, y - h - 7 * s), pt(x - 3 * s, y - h - 7 * s)];
  d.pen.fill(lamp, '#e8c75a', 0.8);
  d.pen.hair(straight(lamp, 1.5), 0.7, d.ink, 0.9);
  d.pen.fill([pt(x - 5 * s, y - h - 7 * s), pt(x + 5 * s, y - h - 7 * s), pt(x, y - h - 12 * s)], '#2f2b28', 0.85);
}

/** A little drift of shells: whelks, a conch, a scallop or two. */
function shellDrift(d: Draw, x: number, y: number): void {
  for (let k = 0; k < 4; k++) {
    const sx = x + d.pen.jitter(7);
    const sy = y + d.pen.jitter(4);
    const kind = d.pen.rng();
    if (kind < 0.4) {
      const fan = Array.from({ length: 7 }, (_, i) => pt(sx + Math.cos(Math.PI * (1 + i / 6)) * 3, sy + Math.sin(Math.PI * (1 + i / 6)) * 3));
      d.pen.fill([...fan, pt(sx, sy + 1.5)], '#e8b99a', 0.9);
      d.pen.hair([...fan, pt(sx, sy + 1.5), fan[0]!], 0.4, d.ink, 0.8);
    } else {
      const cone = [pt(sx - 3.5, sy), pt(sx + 3.5, sy - 1.5), pt(sx + 1, sy + 2)];
      d.pen.fill(cone, '#efe1c8', 0.95);
      d.pen.hair([...cone, cone[0]!], 0.4, d.ink, 0.8);
      d.pen.hair([pt(sx - 1, sy - 0.5), pt(sx + 0.5, sy + 1.3)], 0.3, d.ink, 0.7);
    }
  }
}

function sea(a: IslandArt): void {
  const reef = reefLine(a);
  const d = a.pen(10);
  // Clear shallows over sea grass inside the reef.
  const cove = [...reef, ...Array.from({ length: 30 }, (_, i) => pt(reef.at(-1)!.x - ((reef.at(-1)!.x - reef[0]!.x) * i) / 29, 0)).map((p) => pt(p.x, a.coast(p.x)))];
  d.pen.fill(cove, '#8fd0c8', a.draft ? 0.06 : 0.2);
  d.pen.stipple(cove, 900, (x, y) => (y > a.coast(x) + 20 && Math.sin(x / 31) * Math.cos(y / 17) > 0.2 ? 0.8 : 0), 0.6, '#5f8a52');
  a.el(a.at(0.5), 600, 800, (e) => {
    breakers(e, reef.map((p) => pt(p.x, p.y + 6)), 6, 3, 0.55);
    for (let i = 0; i < reef.length; i += 1) {
      const p = reef[i]!;
      if (i % 3 === 0) awash(e, p.x + e.pen.jitter(6), p.y + e.pen.jitter(4), 3, 0.6);
      else rock(e, p.x + e.pen.jitter(5), p.y + e.pen.jitter(4), 2.5 + e.pen.rng() * 2, '#8c8a80');
    }
  });
  name(a, 'the reef', a.at(0.74), 646, 14, -0.12);
}

function land(a: IslandArt): void {
  // Sea grape and cabbage palms behind a line of sea oats.
  const inland = (q: Pt): boolean => a.interior(q.x, q.y, 5);
  for (const p of place(a, 120, () => anywhere(a), inland, 14)) a.el(p.x, p.y, 8, (e) => crown(e, p.x, p.y, 4 + e.pen.rng() * 3, '#7f9a5a', 0.8));
  for (const p of place(a, 45, () => anywhere(a), inland, 24)) a.el(p.x, p.y, 10, (e) => palmStar(e, p.x, p.y, 7.5, '#6f9a4a'));
  for (let x = a.at(-0.02); x < a.at(1.02); x += 11) {
    const y = a.scrub(x) + 5;
    if (!a.clear(x, y, 4)) continue;
    a.el(x, y, 6, (e) => tuft(e, x + e.pen.jitter(3), y, 6, 0.6));
  }
  // The spoonbill pond.
  const pond = watersOf(a, 'lake')[0];
  if (pond) {
    const c = centre(pond.shape);
    // Spoonbills wading in a loose line, sweeping their bills.
    for (const [k, dx] of [-22, -10, 1, 12, 22].entries()) {
      const wy = c.y + 6 + (k % 2) * 4;
      a.el(c.x + dx, wy, 14, (e) => wader(e, c.x + dx, wy, 0.7, k % 2 ? -1 : 1, '#eba8b2', 'spoon'));
    }
    name(a, 'spoonbill pond', c.x, c.y + 28, 13);
  }
  // Shell drifts along the tideline, clear of the route.
  for (const p of place(a, 60, () => anywhere(a, -0.03, 1.03), (q) => q.y > a.coast(q.x) - 30 && a.onLand(q.x, q.y, 4) && a.clear(q.x, q.y, 6), 16)) a.el(p.x, p.y, 10, (e) => shellDrift(e, p.x, p.y));
  name(a, 'shelling beach', a.at(0.5), a.coast(a.at(0.5)) + 26, 14);
  // The skeleton light on the east point, its keeper's cottage beside it.
  const lx = a.at(0.985);
  const ly = a.coast(lx) - 22;
  if (a.clear(lx, ly - 20, 12)) {
    a.el(lx, ly - 25, 60, (e) => {
      cottage(e, lx - 22, ly + 4, 0.8, '#f1ead8', '#5f6b5a');
      skeletonLight(e, lx, ly, 1);
    });
  }
  name(a, 'old iron light', lx + 4, ly + 22, 13);
  // A beached rowboat and a ruined cannon on the west point.
  const wx = a.at(0.0);
  const wy = a.coast(wx) - 14;
  if (a.clear(wx, wy, 10)) a.el(wx, wy, 14, (e) => {
    e.pen.stroke([pt(wx - 9, wy), pt(wx + 9, wy - 2)], 3.2, '#3a3a3a', 0.85, false);
    e.pen.circle(wx - 9, wy, 2.2, 0.7, a.ink);
  });
}

function over(a: IslandArt): void {
  const reef = reefLine(a);
  const p = reef[Math.round(reef.length * 0.34)]!;
  a.el(p.x, p.y, 90, (e) => wreckedShip(e, p.x, p.y + 4, 1.25));
  name(a, 'wreck of the Two Sisters', p.x + 96, p.y + 30, 15);
  const flag = pt(a.at(0.8), 596);
  a.el(flag.x, flag.y, 12, (e) => {
    e.pen.hair([pt(flag.x, flag.y), pt(flag.x, flag.y - 14)], 0.8, a.ink, 0.9);
    e.pen.fill([pt(flag.x, flag.y - 14), pt(flag.x + 8, flag.y - 11), pt(flag.x, flag.y - 8)], RED, 0.85);
    e.pen.circle(flag.x, flag.y + 1, 2, 0.6, a.ink);
  });
}

export const WRECK: BiomeArt = { sea, land, over, shallows: '#c7e3e2', edge: 'scallop' };
