import { bezier, type Draw, oval, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { type IslandArt, straight } from '../context';
import type { BiomeArt } from '../island';
import { boatTop, lighthouse, palmStar, roof, sailboat } from '../symbols';
import { anywhere, centre, name, place, watersOf } from './common';

/**
 * Beach 8, Monsoon Harbour: a Kerala fishing town behind a stone
 * breakwater, boats moored in the basin, Chinese fishing nets along the
 * shore, backwaters winding inland past paddy fields and houseboats,
 * coconut groves everywhere else, and a monsoon squall marching in.
 */
const TILE = '#c0583a';

/** A Chinese fishing net in elevation: a cantilever of poles over the water, its square net hanging. */
function chineseNet(d: Draw, x: number, y: number, s: number, dir: 1 | -1): void {
  const pivot = pt(x, y - 4 * s);
  const tip = pt(x + dir * 26 * s, y - 20 * s);
  d.pen.stroke([pt(x - dir * 8 * s, y + 2 * s), pivot, tip], 1, '#7a5a3a', 0.9, false);
  d.pen.hair([pt(x - dir * 6 * s, y - 16 * s), tip], 0.5, d.ink, 0.7);
  d.pen.hair([pt(x - dir * 6 * s, y - 16 * s), pivot], 0.6, d.ink, 0.8);
  const net = [pt(tip.x - 9 * s, tip.y + 3 * s), pt(tip.x + 9 * s, tip.y + 3 * s), pt(tip.x + 6 * s, tip.y + 14 * s), pt(tip.x - 6 * s, tip.y + 14 * s)];
  d.pen.fill(net, PAPER_FILL, 0.4);
  for (let k = 0; k < 4; k++) d.pen.hair([pt(tip.x - 8 * s + k * 5 * s, tip.y + 3 * s), pt(tip.x - 5 * s + k * 3.5 * s, tip.y + 14 * s)], 0.3, d.ink, 0.6);
  d.pen.hair(straight(net, 1.5), 0.5, d.ink, 0.8);
  for (const c of [net[0]!, net[1]!]) d.pen.hair([tip, c], 0.4, d.ink, 0.7);
}

/** A kettuvallam: a long backwater houseboat with its arched thatch roof. */
function houseboat(d: Draw, x: number, y: number, angle: number): void {
  boatTop(d, x, y, 30, angle, '#7a5a3a');
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const P = (dx: number, dy: number): Pt => pt(x + dx * c - dy * s, y + dx * s + dy * c);
  const roofPts = [P(-9, -4), P(8, -4), P(8, 4), P(-9, 4)];
  d.pen.fill(roofPts, '#c9a46a', 0.95);
  for (let k = -7; k <= 6; k += 3) d.pen.hair([P(k, -4), P(k, 4)], 0.4, d.ink, 0.6);
  d.pen.hair(straight(roofPts, 1.5), 0.5, d.ink, 0.85);
}

/** Paddy fields: a patchwork of plots ruled with their furrows. */
function paddies(a: IslandArt): void {
  const x0 = a.at(0.14);
  const x1 = a.at(0.44);
  for (let x = x0; x < x1; x += 34) {
    for (let k = 0; k < 4; k++) {
      const y = a.inland(x) + 30 + k * 20;
      const plot = [pt(x, y), pt(x + 30, y - 3), pt(x + 31, y + 15), pt(x + 1, y + 17)];
      if (!plot.every((p) => a.interior(p.x, p.y, 3))) continue;
      a.el(x + 15, y + 8, 20, (e) => {
        e.pen.fill(plot, (k + Math.round(x / 34)) % 3 ? '#b5d48a' : '#cfe09a', 0.85);
        for (let f = 3; f < 15; f += 3) e.pen.hair([pt(x + 2, y + f - 0.2 * f), pt(x + 29, y + f - 3 + 0.05 * f)], 0.35, '#5f8a52', 0.7);
        e.pen.hair(straight(plot, 2), 0.5, a.ink, 0.6);
      });
    }
  }
  name(a, 'paddy', a.at(0.29), a.scrub(a.at(0.29)) - 14, 13);
}

/** The town: lanes running inland, tiled roofs along them, the church at the square. */
function town(a: IslandArt): void {
  const x0 = a.at(0.56);
  const x1 = a.at(0.9);
  const d = a.pen(18);
  for (const lx of [a.at(0.62), a.at(0.74), a.at(0.85)]) {
    const lane = bezier(pt(lx, a.scrub(lx) - 4), pt(lx + 14, a.inland(lx)), pt(lx - 6, a.top(lx) + 20), 12);
    a.el(lx, a.inland(lx), 150, () => {
      d.pen.hair(lane.map((p) => pt(p.x - 3, p.y)), 0.4, a.ink, 0.5);
      d.pen.hair(lane.map((p) => pt(p.x + 3, p.y)), 0.4, a.ink, 0.5);
    });
  }
  for (const p of place(a, 70, () => pt(x0 + a.rng() * (x1 - x0), 0), () => true, 0, 70)) {
    const y = a.top(p.x) + 16 + a.rng() * (a.scrub(p.x) - a.top(p.x) - 30);
    if (!a.interior(p.x, y, 7)) continue;
    const w = 9 + a.rng() * 6;
    a.el(p.x, y, w, (e) => roof(e, p.x, y, w, 7 + e.pen.rng() * 3, e.pen.jitter(0.25), e.pen.rng() < 0.8 ? TILE : '#d8cdb8'));
  }
  // The church: a cross-shaped roof with a tower at its west end.
  // East of where the backwaters end, on dry land.
  const cx = a.at(0.78);
  const cy = a.inland(cx) + 6;
  a.el(cx, cy, 30, (e) => {
    roof(e, cx, cy, 34, 10, 0, '#e6dfcf');
    roof(e, cx + 6, cy, 10, 24, 0, '#e6dfcf');
    roof(e, cx - 20, cy, 9, 9, 0, '#b8b0a0');
    e.pen.hair([pt(cx - 20, cy - 8), pt(cx - 20, cy - 16)], 0.8, a.ink, 0.9);
    e.pen.hair([pt(cx - 23, cy - 13), pt(cx - 17, cy - 13)], 0.8, a.ink, 0.9);
  });
  name(a, 'old town', a.at(0.8), a.top(a.at(0.8)) + 22, 14);
}

function sea(a: IslandArt): void {
  // Boats moored in the basin behind the breakwater.
  const mole = a.plan.islets.find((s) => s.kind === 'breakwater');
  if (mole) {
    const basin = centre(mole.spine.slice(8));
    for (let k = 0; k < 7; k++) {
      const x = basin.x - 70 + (k % 4) * 30;
      const y = a.coast(basin.x) + 40 + Math.floor(k / 4) * 26;
      a.el(x, y, 16, (e) => boatTop(e, x, y, 16, 1.2 + e.pen.jitter(0.2), ['#3f7f9f', '#b3322b', '#d9a441'][k % 3]!));
    }
    const tip = mole.spine.at(-1)!;
    a.el(tip.x, tip.y, 50, (e) => lighthouse(e, tip.x + 4, tip.y - 2, 0.6));
    name(a, 'breakwater', mole.spine[14]!.x, mole.spine[14]!.y + 18, 13);
    name(a, 'harbour', basin.x - 40, a.coast(basin.x) + 112, 14);
  }
  // Fishing boats under sail beyond it, and a squall marching in from the south-east.
  for (const [u, y] of [[0.38, 644], [0.48, 618]] as const) a.el(a.at(u), y, 20, (e) => sailboat(e, a.at(u), y, 0.8, '#e8d9b0'));
}

function land(a: IslandArt): void {
  paddies(a);
  town(a);
  // Coconut groves wherever there's room.
  for (const p of place(a, 170, () => anywhere(a), (q) => a.interior(q.x, q.y, 6) && (q.x < a.at(0.13) || q.x > a.at(0.44) || q.y < a.inland(q.x) + 20) && (q.x < a.at(0.55) || q.x > a.at(0.92)), 13)) {
    a.el(p.x, p.y, 10, (e) => palmStar(e, p.x, p.y, 7 + e.pen.rng() * 2, '#5f9a48'));
  }
  // Houseboats on the backwaters, stilt huts along the banks.
  const back = watersOf(a, 'canal')[1];
  if (back) {
    for (const k of [6, 15, 24]) {
      const p = back.spine[k];
      const q = back.spine[k + 1];
      if (!p || !q) continue;
      a.el(p.x, p.y, 20, (e) => houseboat(e, p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x)));
    }
    name(a, 'backwaters', back.spine[10]!.x, back.spine[10]!.y - 20, 14);
  }
  // Chinese fishing nets along the north shore.
  for (const u of [0.24, 0.33, 0.9]) {
    const x = a.at(u);
    a.el(x, a.top(x) - 10, 30, (e) => chineseNet(e, x, a.top(x) + 4, 0.9, u > 0.5 ? 1 : -1));
  }
  name(a, 'Chinese nets', a.at(0.285), a.top(a.at(0.285)) + 22, 13);
}

/** The squall: a heaped cloud of puffs with rain slanting out of its dark base over the sea. */
function over(a: IslandArt): void {
  const x = a.at(0.17);
  const y = 584;
  a.el(x, y + 30, 120, (e) => {
    for (let k = 0; k < 30; k++) {
      const rx = x - 74 + k * 5 + e.pen.jitter(1.5);
      const len = 40 + e.pen.rng() * 40;
      e.pen.hair([pt(rx, y + 4), pt(rx - len * 0.3, y + 4 + len)], 0.5, a.ink, 0.5);
    }
    const puffs: [number, number, number][] = [[-62, 0, 16], [-40, -12, 20], [-14, -20, 24], [14, -14, 22], [40, -6, 18], [62, 2, 14], [-30, 4, 16], [4, 4, 18], [34, 6, 15]];
    for (const [dx, dy, r] of puffs) {
      const puff = oval(x + dx, y + dy, r, r * 0.78, 16).map((p) => pt(p.x + e.pen.jitter(1.5), p.y + e.pen.jitter(1.5)));
      e.pen.fill(puff, PAPER_FILL, 0.95);
      e.pen.fill(puff, '#7d8796', 0.25 + (dy > 0 ? 0.25 : 0));
      e.pen.hair([...puff, puff[0]!], 0.6, a.ink, 0.7);
    }
  });
  name(a, 'monsoon squall', x + 6, y + 92, 14);
}

export const HARBOUR: BiomeArt = { sea, land, over, shallows: '#c9e2dd', inner: '#4d93a0', edge: 'scallop' };
