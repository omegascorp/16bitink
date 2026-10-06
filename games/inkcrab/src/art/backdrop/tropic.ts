import { bezier, closed, type Draw, normals, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FAR } from './common';

/**
 * Props for a coral-island beach, drawn the way a field illustrator sketches
 * the view behind a subject: pen contours, a little hatching on the shadow
 * side, and pale watercolour washes.
 */
export const SKY_WASH = '#a9d8ea';
const TRUNK = '#cdb48a';
const FROND = '#6fa65c';
const LEAF = '#5e9a55';
const NUT = '#a8934e';
const THATCH = '#d9b877';
const TIMBER = '#b98e62';
const ISLAND = '#7fb07a';

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Splits a polyline into the runs where `keep` holds. */
function runs(pts: readonly Pt[], keep: (p: Pt) => boolean): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of pts) {
    if (keep(p)) cur.push(p);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length > 2);
}

/**
 * A tropical cumulus: heaped puffs on a flat base. Only the outside of the
 * heap is inked, the underside is washed blue-grey and hatched, and a few
 * inner curves suggest the puffs behind.
 */
export function cloud(d: Draw, x: number, y: number, w: number, n: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const puffs: Puff[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const r = (w / n) * (0.6 + 0.5 * Math.sin(t * Math.PI)) * (0.9 + pen.rng() * 0.25);
    puffs.push({ x: x - w / 2 + w * t, y: y - r * 0.45 - Math.sin(t * Math.PI) * w * 0.05, r });
  }
  // A second tier: the towering middle.
  for (let i = 0; i < Math.max(1, n - 3); i++) {
    const t = 0.35 + (0.3 * (i + 0.5)) / Math.max(1, n - 3);
    const r = (w / n) * (0.75 + pen.rng() * 0.3);
    puffs.push({ x: x - w / 2 + w * t, y: y - w * 0.16 - r * 0.4, r });
  }
  const heap = (): void => {
    ctx.beginPath();
    for (const p of puffs) {
      ctx.moveTo(p.x + p.r, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w, y - w * 2, w * 2, w * 2);
  ctx.clip();
  heap();
  ctx.clip();
  ctx.fillStyle = PAPER_FILL;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(x - w, y - w * 2, w * 2, w * 2);
  // The shaded underside: a cool wash, then light hatching.
  const under = ctx.createLinearGradient(0, y - w * 0.14, 0, y);
  under.addColorStop(0, 'rgba(120,150,180,0)');
  under.addColorStop(1, 'rgba(120,150,180,0.35)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = under;
  ctx.fillRect(x - w, y - w * 0.14, w * 2, w * 0.14);
  const belly = [pt(x - w, y - w * 0.09), pt(x + w, y - w * 0.09), pt(x + w, y), pt(x - w, y)];
  pen.hatch(belly, 2.4, 0.12, 0.55, { color: d.ink, alpha: FAR * 0.45 });
  ctx.restore();
  // The outer contour: each puff's arc where no other puff covers it.
  for (const p of puffs) {
    const arc = Array.from({ length: 33 }, (_, i) => {
      const a = Math.PI + (i / 32) * Math.PI * 1.15 - 0.08;
      return pt(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r);
    });
    const outside = (q: Pt): boolean => q.y < y - 0.5 && puffs.every((o) => o === p || Math.hypot(q.x - o.x, q.y - o.y) > o.r * 0.99);
    for (const run of runs(arc, outside)) pen.stroke(run, 1.15, d.ink, FAR, false);
    // A faint inner curve where this puff sits in front of another.
    const inner = runs(arc.slice(4, 20), (q) => q.y < y - p.r * 0.3 && !outside(q));
    if (inner[0] && pen.rng() < 0.6) pen.hair(inner[0], 0.6, d.ink, FAR * 0.45);
  }
  pen.hair([pt(x - w / 2 - 4, y), pt(x - w * 0.1, y + 0.4)], 0.7, d.ink, FAR * 0.5);
  pen.hair([pt(x + w * 0.05, y + 0.3), pt(x + w / 2 + 2, y)], 0.7, d.ink, FAR * 0.5);
}

/** A frigatebird gliding: a long, crooked M. */
export function bird(d: Draw, x: number, y: number, s: number): void {
  d.pen.stroke([...bezier(pt(x - 9 * s, y - 1 * s), pt(x - 5 * s, y - 4 * s), pt(x - 1 * s, y + 1 * s), 5), ...bezier(pt(x - 1 * s, y + 1 * s), pt(x + 4 * s, y - 4 * s), pt(x + 9 * s, y - 2 * s), 5).slice(1)], 0.9, d.ink, FAR * 1.1, false);
}

/** A little seaplane: high wing, twin floats, a blurred propeller. Faces left. */
export function seaplane(d: Draw, x: number, y: number, s: number): void {
  const { pen } = d;
  const ink = (pts: Pt[], w = 0.9, a = FAR * 1.1): void => pen.stroke(pts, w * s, d.ink, a, false);
  const body = [...bezier(pt(x - 16 * s, y), pt(x - 15 * s, y - 5 * s), pt(x - 6 * s, y - 5 * s), 6), ...bezier(pt(x - 6 * s, y - 5 * s), pt(x + 10 * s, y - 4 * s), pt(x + 20 * s, y - 2 * s), 6).slice(1), pt(x + 20 * s, y - 0.5 * s), ...bezier(pt(x + 20 * s, y - 0.5 * s), pt(x + 4 * s, y + 3 * s), pt(x - 16 * s, y), 6).slice(1)];
  const fin = [pt(x + 14 * s, y - 2.5 * s), pt(x + 19 * s, y - 10 * s), pt(x + 22 * s, y - 10 * s), pt(x + 21 * s, y - 2 * s)];
  const wing = oval(x - 3 * s, y - 6.5 * s, 15 * s, 1.4 * s, 16);
  const float = (fy: number): Pt[] => [...bezier(pt(x - 13 * s, fy), pt(x - 10 * s, fy - 2 * s), pt(x - 4 * s, fy - 1.8 * s), 4), pt(x + 8 * s, fy - 1.4 * s), pt(x + 8 * s, fy), pt(x - 13 * s, fy)];
  for (const shape of [fin, body, wing, float(y + 8 * s)]) {
    pen.fill(shape, PAPER_FILL, 0.95);
    pen.fill(shape, '#dde6ea', 0.6);
  }
  pen.hair([pt(x - 12 * s, y - 1 * s), pt(x + 18 * s, y - 1.2 * s)], 0.9 * s, '#b3322b', 0.45);
  for (const shape of [fin, body, wing, float(y + 8 * s)]) ink(closed(shape));
  // Struts, cockpit window, propeller disc.
  for (const sx of [-8, 2]) ink([pt(x + sx * s, y + 1 * s), pt(x + (sx - 1) * s, y + 6.5 * s)], 0.6);
  ink([pt(x - 6 * s, y - 6 * s), pt(x - 5 * s, y + 1.5 * s)], 0.5, FAR * 0.7);
  pen.fill([pt(x - 12 * s, y - 3.2 * s), pt(x - 7 * s, y - 4.4 * s), pt(x - 7 * s, y - 2 * s), pt(x - 11.5 * s, y - 1.5 * s)], d.ink, FAR * 0.5);
  pen.hair(oval(x - 17 * s, y - 1 * s, 1 * s, 5 * s, 12).slice(0, 13), 0.5 * s, d.ink, FAR * 0.6);
}

/** A far-off island on the horizon: a sliver of sand under a dark fringe of palms and scrub. */
export function motu(d: Draw, x: number, horizon: number, w: number): void {
  const { pen } = d;
  const top: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const hump = Math.sin(t * Math.PI) ** 0.6 * (4 + 2 * Math.sin(t * 17 + x));
    top.push(pt(x - w / 2 + w * t, horizon - 1.5 - hump));
  }
  const scrub = [...top, pt(x + w / 2, horizon - 1.5), pt(x - w / 2, horizon - 1.5)];
  pen.fill(scrub, ISLAND, 0.55);
  pen.hair(top, 0.8, d.ink, FAR * 0.8);
  pen.fill([pt(x - w / 2 - 6, horizon), pt(x + w / 2 + 6, horizon), pt(x + w / 2, horizon - 1.8), pt(x - w / 2, horizon - 1.8)], PAPER_FILL, 0.9);
  // Tiny palms poking above the scrub, leaning every which way.
  const count = Math.max(2, Math.round(w / 14));
  for (let i = 0; i < count; i++) {
    const px = x - w * 0.4 + (w * 0.8 * (i + pen.rng() * 0.6)) / count;
    const h = 8 + pen.rng() * 7;
    const lean = pen.jitter(3);
    const crown = pt(px + lean, horizon - 3 - h);
    pen.hair(bezier(pt(px, horizon - 3), pt(px + lean * 0.2, horizon - 3 - h * 0.5), crown, 4), 0.7, d.ink, FAR * 0.9);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI + (k / 5) * Math.PI + pen.jitter(0.2);
      const tip = pt(crown.x + Math.cos(a) * 5, crown.y + Math.sin(a) * 3 + 2.5);
      pen.hair(bezier(crown, pt(crown.x + Math.cos(a) * 3, crown.y + Math.sin(a) * 3 - 1), tip, 4), 0.55, d.ink, FAR * 0.8);
    }
  }
}

/** One palm frond: an arching rib with leaflets hanging from both sides, under a green wash. */
function frond(d: Draw, base: Pt, ang: number, len: number, s: number, front: boolean): void {
  const { pen } = d;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const droop = len * (0.25 + 0.35 * Math.abs(dir.x));
  const rib = bezier(base, pt(base.x + dir.x * len * 0.55, base.y + dir.y * len * 0.55 - len * 0.18), pt(base.x + dir.x * len, base.y + dir.y * len + droop), 14);
  const nrm = normals(rib);
  const alpha = front ? FAR * 1.05 : FAR * 0.7;
  for (const side of [1, -1] as const) {
    const tips: Pt[] = [];
    for (let i = 2; i < rib.length; i++) {
      const t = i / (rib.length - 1);
      const p = rib[i]!;
      const a = rib[i - 1]!;
      const ux = p.x - a.x;
      const uy = p.y - a.y;
      const ul = Math.hypot(ux, uy) || 1;
      const ll = len * 0.3 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.85)) * s * (0.85 + pen.rng() * 0.3);
      let lx = nrm[i]!.x * side * 0.55 + (ux / ul) * 0.6;
      let ly = nrm[i]!.y * side * 0.55 + (uy / ul) * 0.6 + 0.75;
      const l = Math.hypot(lx, ly) || 1;
      lx /= l;
      ly /= l;
      const tip = pt(p.x + lx * ll, p.y + ly * ll);
      tips.push(tip);
      pen.hair(bezier(p, pt(p.x + lx * ll * 0.5, p.y + ly * ll * 0.5 - 1), tip, 3), 0.5, d.ink, alpha * 0.85);
    }
    pen.fill([...rib.slice(2), ...[...tips].reverse()], FROND, front ? 0.34 : 0.24);
  }
  pen.stroke(rib, 1.1 * s, d.ink, alpha, false);
}

/**
 * A coconut palm: a ringed trunk bowing from a flared foot, a crown of
 * arching fronds and a cluster of nuts. Returns the trunk's centre line.
 */
export function palm(d: Draw, x: number, ground: number, h: number, lean: number, s = 1): Pt[] {
  const { pen } = d;
  const top = pt(x + lean * h, ground - h);
  const spine = bezier(pt(x, ground), pt(x + lean * h * 0.1, ground - h * 0.6), top, 26);
  const trunk = tube(spine, 10 * s, 4.6 * s);
  const half = trunk.length / 2;
  const foot = [pt(x - 9 * s, ground), ...bezier(pt(x - 9 * s, ground), pt(x - 4 * s, ground - 2 * s), spine[3]!, 4).slice(1)];
  pen.fill(trunk, PAPER_FILL, 1);
  pen.fill(trunk, TRUNK, 0.6);
  pen.fill([...foot, pt(x + 8 * s, ground)], TRUNK, 0.5);
  // Leaf scars: shallow arcs around the trunk, closer together towards the crown.
  const n = normals(spine);
  for (let i = 1; i < spine.length - 1; i++) {
    const p = spine[i]!;
    const w = (10 - 5.4 * (i / (spine.length - 1))) * s * 0.5;
    const a = pt(p.x + n[i]!.x * w, p.y + n[i]!.y * w);
    const b = pt(p.x - n[i]!.x * w, p.y - n[i]!.y * w);
    pen.hair(bezier(a, pt(p.x + 0.8, p.y + 1.6 * s), b, 4), 0.55, d.ink, FAR * 0.75);
  }
  // Shadow side of the trunk, hatched along its length.
  pen.clipped(trunk, () => {
    for (let i = 0; i < spine.length - 1; i++) {
      const p = spine[i]!;
      const w = (10 - 5.4 * (i / (spine.length - 1))) * s * 0.5;
      pen.hair([pt(p.x + w * 0.35, p.y), pt(p.x + w, p.y + 1)], 0.45, d.ink, FAR * 0.6);
    }
  });
  pen.stroke(trunk.slice(0, half), 1.1 * s, d.ink, FAR * 1.1, false);
  pen.stroke(trunk.slice(half), 1.1 * s, d.ink, FAR * 0.8, false);
  pen.hair(foot, 0.8, d.ink, FAR * 0.8);
  // Crown: back fronds, nuts, then the front fronds over them.
  const len = h * 0.36 + 18 * s;
  const angles = [-2.75, -2.35, -1.95, -1.25, -0.8, -0.35, -0.05];
  angles.forEach((a, i) => i % 2 === 1 && frond(d, top, a + pen.jitter(0.1), len * (0.75 + pen.rng() * 0.2), s, false));
  for (const [dx, dy] of [[-3, 4], [2, 5], [0, 7.5], [4.5, 2.5]] as const) {
    const nut = oval(top.x + dx * s, top.y + dy * s, 2.8 * s, 2.5 * s, 10);
    pen.fill(nut, PAPER_FILL, 1);
    pen.fill(nut, NUT, 0.65);
    pen.stroke(closed(nut), 0.7, d.ink, FAR, false);
  }
  angles.forEach((a, i) => i % 2 === 0 && frond(d, top, a + pen.jitter(0.1), len * (0.85 + pen.rng() * 0.25), s, true));
  return spine;
}

/** A clump of beach scrub (naupaka): a lumpy mound of broad leaves, shaded underneath. */
export function scrub(d: Draw, x: number, ground: number, w: number, h: number): void {
  const { pen } = d;
  const bumps = Math.max(3, Math.round(w / 16));
  const top: Pt[] = [];
  for (let i = 0; i <= bumps; i++) {
    const t = i / bumps;
    const bx = x - w / 2 + w * t;
    const by = ground - h * Math.sin(Math.PI * (0.08 + t * 0.84)) * (0.8 + pen.rng() * 0.25);
    if (i > 0) {
      const prev = top[top.length - 1]!;
      top.push(...bezier(prev, pt((prev.x + bx) / 2, Math.min(prev.y, by) - w / bumps * 0.45), pt(bx, by), 6).slice(1));
    } else top.push(pt(bx, ground));
  }
  top.push(pt(x + w / 2, ground));
  const shape = [...top, pt(x + w / 2, ground + 6), pt(x - w / 2, ground + 6)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, LEAF, 0.5);
  pen.clipped(shape, () => {
    // Leaves: little pointed ovals with a midrib, thickest along the top.
    for (let i = 0; i < w * 0.35; i++) {
      const lx = x - w / 2 + pen.rng() * w;
      const ly = ground - pen.rng() ** 0.7 * h;
      const a = -Math.PI / 2 + pen.jitter(1.3);
      const L = 3 + pen.rng() * 2.5;
      const tip = pt(lx + Math.cos(a) * L, ly + Math.sin(a) * L);
      const nx = -Math.sin(a) * L * 0.35;
      const ny = Math.cos(a) * L * 0.35;
      const leaf = [pt(lx, ly), pt((lx + tip.x) / 2 + nx, (ly + tip.y) / 2 + ny), tip, pt((lx + tip.x) / 2 - nx, (ly + tip.y) / 2 - ny)];
      pen.fill(leaf, PAPER_FILL, 0.25);
      pen.hair(closed(leaf), 0.45, d.ink, FAR * 0.55);
    }
    pen.hatch([pt(x - w, ground - h * 0.35), pt(x + w, ground - h * 0.35), pt(x + w, ground + 6), pt(x - w, ground + 6)], 2.2, 2.2, 0.5, { color: d.ink, alpha: FAR * 0.5 });
  });
  pen.stroke(top, 1, d.ink, FAR, false);
}

/** A water villa on stilts: deck, plank walls, a window and door, under a hipped thatch roof. */
export function villa(d: Draw, x: number, water: number, s: number): void {
  const { pen } = d;
  const deck = water - 9 * s;
  // Stilts, each with a broken reflection.
  for (const sx of [-15, -7, 1, 9, 15]) {
    pen.hair([pt(x + sx * s, deck), pt(x + sx * s, water + 1.5 * s)], 0.8 * s, d.ink, FAR * 0.9);
    pen.hair([pt(x + sx * s - 1, water + 3 * s), pt(x + sx * s + 1, water + 3.5 * s)], 0.5, d.ink, FAR * 0.5);
    pen.hair([pt(x + sx * s + 0.5, water + 5.5 * s), pt(x + sx * s + 1.5, water + 6 * s)], 0.5, d.ink, FAR * 0.35);
  }
  const wallTop = deck - 11 * s;
  const walls = [pt(x - 12 * s, deck), pt(x + 12 * s, deck), pt(x + 12 * s, wallTop), pt(x - 12 * s, wallTop)];
  pen.fill(walls, PAPER_FILL, 1);
  pen.fill(walls, TIMBER, 0.35);
  for (let k = 1; k < 4; k++) pen.hair([pt(x - 12 * s, wallTop + k * 2.8 * s), pt(x + 12 * s, wallTop + k * 2.8 * s)], 0.4, d.ink, FAR * 0.45);
  pen.fill([pt(x - 9 * s, deck), pt(x - 5 * s, deck), pt(x - 5 * s, deck - 7.5 * s), pt(x - 9 * s, deck - 7.5 * s)], d.ink, FAR * 0.55);
  const win = [pt(x + 1 * s, deck - 3.5 * s), pt(x + 9 * s, deck - 3.5 * s), pt(x + 9 * s, deck - 8 * s), pt(x + 1 * s, deck - 8 * s)];
  pen.fill(win, '#7fc4cf', 0.45);
  pen.hair(closed(win), 0.5, d.ink, FAR * 0.8);
  pen.hair([pt(x + 5 * s, deck - 3.5 * s), pt(x + 5 * s, deck - 8 * s)], 0.45, d.ink, FAR * 0.6);
  pen.stroke(closed(walls), 0.8 * s, d.ink, FAR, false);
  // Deck boards and a rail.
  const boards = [pt(x - 18 * s, deck + 1.5 * s), pt(x + 18 * s, deck + 1.5 * s), pt(x + 18 * s, deck - 0.5 * s), pt(x - 18 * s, deck - 0.5 * s)];
  pen.fill(boards, TIMBER, 0.6);
  pen.stroke(closed(boards), 0.7 * s, d.ink, FAR, false);
  pen.hair([pt(x + 12 * s, deck - 4 * s), pt(x + 18 * s, deck - 4 * s)], 0.5, d.ink, FAR * 0.8);
  pen.hair([pt(x + 18 * s, deck - 0.5 * s), pt(x + 18 * s, deck - 4.5 * s)], 0.5, d.ink, FAR * 0.8);
  // The roof: a steep hip of thatch, straw drawn ridge to eave, a ragged fringe.
  const eave = wallTop + 2 * s;
  const ridge = wallTop - 11 * s;
  const roof = [pt(x - 17 * s, eave), pt(x + 17 * s, eave), pt(x + 6 * s, ridge), pt(x - 6 * s, ridge)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, THATCH, 0.7);
  pen.clipped(roof, () => {
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pen.hair([pt(x - 6 * s + 12 * s * t, ridge), pt(x - 17 * s + 34 * s * t + pen.jitter(0.6), eave + 1)], 0.4, d.ink, FAR * 0.5);
    }
    pen.hatch([pt(x + 2 * s, eave), pt(x + 17 * s, eave), pt(x + 6 * s, ridge)], 1.8, 1.1, 0.45, { color: d.ink, alpha: FAR * 0.55 });
  });
  pen.stroke(closed(roof), 0.9 * s, d.ink, FAR * 1.1, false);
  const fringe: Pt[] = [];
  for (let k = 0; k <= 17; k++) fringe.push(pt(x - 17 * s + 2 * s * k, eave + (k % 2 ? 1.6 : 0.2) * s));
  pen.hair(fringe, 0.5, d.ink, FAR * 0.8);
}

/**
 * The jetty out to the villas: a boardwalk on piles running from the near
 * shore (bottom) out across the lagoon, narrowing as it goes, then along
 * past the villas.
 */
export function jetty(d: Draw, x0: number, y0: number, x1: number, y1: number, x2: number): void {
  const { pen } = d;
  const near = 9;
  const far = 2.4;
  const walk = [pt(x0 - near, y0), pt(x0 + near, y0), pt(x1 + far, y1), pt(x1 - far, y1)];
  // Piles under the boardwalk, shortening into the distance.
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const w = near + (far - near) * t;
    for (const side of [-1, 1]) pen.hair([pt(px + side * w, py), pt(px + side * w, py + 2 + 6 * (1 - t))], 0.6, d.ink, FAR * 0.7);
  }
  for (let k = 0; k <= 22; k++) {
    const px = x1 + ((x2 - x1) * k) / 22;
    pen.hair([pt(px, y1), pt(px, y1 + 5)], 0.55, d.ink, FAR * 0.7);
  }
  pen.fill(walk, PAPER_FILL, 1);
  pen.fill(walk, TIMBER, 0.45);
  // Planks crossing the near boardwalk, closer together as it recedes.
  for (let k = 1; k < 14; k++) {
    const t = 1 - (1 - k / 14) ** 1.6;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const w = near + (far - near) * t;
    pen.hair([pt(px - w, py), pt(px + w, py)], 0.4, d.ink, FAR * 0.5);
  }
  pen.stroke(closed(walk), 0.8, d.ink, FAR, false);
  const along = [pt(x1, y1 + 1.5), pt(x2, y1 + 1.5), pt(x2, y1 - 0.5), pt(x1, y1 - 0.5)];
  pen.fill(along, TIMBER, 0.55);
  pen.stroke(closed(along), 0.7, d.ink, FAR, false);
}

/** A dhoni, the Maldivian boat: a curved hull sweeping up to a tall, hooked prow, a canvas awning and a sail. Faces right. */
export function dhoni(d: Draw, x: number, water: number, s: number): void {
  const { pen } = d;
  const gun = water - 6 * s;
  const hull = [
    pt(x - 24 * s, gun - 3 * s),
    ...bezier(pt(x - 24 * s, gun - 3 * s), pt(x, gun + 1 * s), pt(x + 18 * s, gun), 8).slice(1),
    ...bezier(pt(x + 18 * s, gun), pt(x + 26 * s, gun - 2 * s), pt(x + 27 * s, gun - 20 * s), 8).slice(1),
    ...bezier(pt(x + 27 * s, gun - 20 * s), pt(x + 25 * s, gun - 23 * s), pt(x + 23.5 * s, gun - 20 * s), 4).slice(1),
    ...bezier(pt(x + 23.5 * s, gun - 20 * s), pt(x + 24 * s, gun - 4 * s), pt(x + 14 * s, water), 8).slice(1),
    ...bezier(pt(x + 14 * s, water), pt(x - 8 * s, water + 1.5 * s), pt(x - 22 * s, water - 2 * s), 8).slice(1),
  ];
  // Mast and sail first, behind the awning.
  pen.hair([pt(x - 2 * s, gun), pt(x - 2 * s, gun - 34 * s)], 0.9 * s, d.ink, FAR);
  const sail = [pt(x - 1 * s, gun - 32 * s), pt(x + 14 * s, gun - 30 * s), ...bezier(pt(x + 14 * s, gun - 30 * s), pt(x + 17 * s, gun - 18 * s), pt(x + 13 * s, gun - 9 * s), 6).slice(1), pt(x - 1 * s, gun - 10 * s)];
  pen.fill(sail, PAPER_FILL, 1);
  pen.fill(sail, '#efe2c4', 0.6);
  pen.hatch(sail, 2, 1.3, 0.4, { color: d.ink, alpha: FAR * 0.35 });
  for (const t of [0.33, 0.66]) pen.hair([pt(x - 1 * s, gun - 32 * s + 22 * s * t), pt(x + 15 * s, gun - 30 * s + 21 * s * t)], 0.4, d.ink, FAR * 0.5);
  pen.stroke(closed(sail), 0.8, d.ink, FAR, false);
  const awning = [pt(x - 20 * s, gun - 2 * s), pt(x - 20 * s, gun - 9 * s), ...bezier(pt(x - 20 * s, gun - 9 * s), pt(x - 13 * s, gun - 11 * s), pt(x - 6 * s, gun - 9 * s), 4).slice(1), pt(x - 6 * s, gun - 1 * s)];
  pen.fill(awning, PAPER_FILL, 1);
  pen.fill(awning, '#d7c7a2', 0.55);
  pen.stroke(closed(awning), 0.7, d.ink, FAR, false);
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, '#c89a66', 0.55);
  pen.hair(bezier(pt(x - 22 * s, gun - 0.5 * s), pt(x, gun + 3.5 * s), pt(x + 21 * s, gun + 1 * s), 8), 0.8 * s, '#3c7a8c', 0.6);
  pen.clipped(hull, () => pen.hatch(hull, 1.8, 0.4, 0.4, { color: d.ink, alpha: FAR * 0.45, onlyBelow: gun + 2 * s }));
  pen.stroke(closed(hull), 0.9 * s, d.ink, FAR * 1.1, false);
  // Reflection.
  for (let k = 0; k < 4; k++) pen.hair([pt(x - 16 * s + k * 9 * s, water + (2 + k % 2) * s), pt(x - 11 * s + k * 9 * s, water + (2 + k % 2) * s)], 0.5, d.ink, FAR * 0.4);
}

/** A string hammock slung between two trunk points, sagging under its own weight. */
export function hammock(d: Draw, a: Pt, b: Pt): void {
  const { pen } = d;
  const mid = pt((a.x + b.x) / 2, Math.max(a.y, b.y) + Math.abs(b.x - a.x) * 0.22);
  const bed = bezier(pt(a.x + 8, a.y + 3), mid, pt(b.x - 8, b.y + 3), 12);
  const under = bezier(pt(a.x + 8, a.y + 3), pt(mid.x, mid.y + 6), pt(b.x - 8, b.y + 3), 12);
  pen.fill([...bed, ...[...under].reverse()], '#d9876b', 0.45);
  for (let k = 1; k < 8; k++) pen.hair([bed[Math.round((k * 12) / 8)]!, under[Math.round((k * 12) / 8)]!], 0.4, d.ink, FAR * 0.6);
  pen.stroke(bed, 0.8, d.ink, FAR, false);
  pen.stroke(under, 0.8, d.ink, FAR, false);
  for (const [p, q] of [[a, bed[0]!], [b, bed[bed.length - 1]!]] as const) {
    for (const k of [-1, 0, 1]) pen.hair([p, pt(q.x, q.y + k * 1.5)], 0.4, d.ink, FAR * 0.7);
  }
}
