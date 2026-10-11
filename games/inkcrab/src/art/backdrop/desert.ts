import { bezier, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Props for a desert coast, sketched as a naturalist would: welwitschia and
 * camelthorn, dry grass, a weathered signpost, bleached whale bones, and the
 * small far silhouettes of gemsbok, camels and birds.
 */
const BARK = '#8a6a4c';
const THORN_LEAF = '#97a173';
const WELW = '#7f8f4c';
const WELW_DRY = '#a88a5a';
const CONE = '#b8664a';
const STRAW = '#c9a865';
const WOOD = '#b39368';
const BONE = '#ebe2cb';
const STONE = '#b7a58a';
const RUST = '#a0583a';
const TOWER = '#efe6d4';

const rot = (p: Pt, c: Pt, a: number): Pt => {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return pt(c.x + (p.x - c.x) * cs - (p.y - c.y) * sn, c.y + (p.x - c.x) * sn + (p.y - c.y) * cs);
};

/** A shape on paper, washed with `color`, inked faintly. */
function inked(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.7): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape), w, t.ink, FAR, false);
}

/**
 * A camelthorn: a short, gnarled trunk forking into crooked limbs under a
 * flat umbrella crown of fine grey-green leaves, its shadow pooled beneath.
 */
export function camelthorn(t: Draw, x: number, ground: number, h: number, w: number): void {
  const { pen } = t;
  pen.fill(oval(x + w * 0.08, ground + 1.5, w * 0.46, 3.5, 24), t.ink, 0.07);
  const fork = pt(x + pen.jitter(4), ground - h * 0.36);
  const wood: Pt[][] = [tube(bezier(pt(x - 3, ground + 1), pt(x + 5, ground - h * 0.18), fork, 8), 8, 4.6)];
  const limbs = 5;
  for (let k = 0; k < limbs; k++) {
    const end = pt(x - w * 0.4 + (k * w * 0.8) / (limbs - 1) + pen.jitter(5), ground - h * 0.74 - pen.rng() * h * 0.08);
    const mid = pt((fork.x + end.x) / 2 + pen.jitter(8), (fork.y + end.y) / 2 + pen.jitter(5));
    wood.push(tube([...bezier(fork, mid, end, 8)], 3.6 - Math.abs(k - 2) * 0.4, 1.1));
  }
  for (const limb of wood) {
    pen.fill(limb, PAPER_FILL, 1);
    pen.fill(limb, BARK, 0.55);
  }
  for (const limb of wood) pen.stroke(edges(limb), 0.7, t.ink, FAR, false);
  pen.clipped(wood[0]!, () => pen.hatch(wood[0]!, 1.6, 1.45, 0.4, { color: t.ink, alpha: FAR * 0.6 }));
  // The crown: flat, ragged tiers of fine leaves, the lower ones tucked under the top.
  const tiers: [number, number, number][] = [[-w * 0.22, h * 0.1, w * 0.6], [w * 0.2, h * 0.06, w * 0.62], [0, -h * 0.02, w * 0.8]];
  const unders: Pt[][] = [];
  for (const [dx, dy, tw] of tiers) {
    const cy = ground - h + dy;
    const top: Pt[] = [];
    const bot: Pt[] = [];
    const n = Math.round(tw / 6);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const cx = x + dx - tw / 2 + tw * u;
      const dome = Math.sin(u * Math.PI) ** 0.5;
      top.push(pt(cx, cy + (1 - dome) * h * 0.1 - dome * h * 0.07 - pen.rng() * 3.2));
      bot.push(pt(cx, cy + h * 0.08 + (1 - dome) * h * 0.02 + pen.rng() * 2.5));
    }
    const crown = [...top, ...[...bot].reverse()];
    pen.fill(crown, PAPER_FILL, 1);
    pen.fill(crown, THORN_LEAF, 0.45);
    pen.clipped(crown, () => {
      for (let i = 0; i < tw * 1.6; i++) {
        const lx = x + dx - tw / 2 + pen.rng() * tw;
        const ly = cy - h * 0.08 + pen.rng() * h * 0.18;
        pen.hair([pt(lx, ly), pt(lx + 1.4 + pen.rng(), ly + pen.jitter(0.8))], 0.45, t.ink, FAR * 0.45);
      }
      pen.fill(bot.map((q) => pt(q.x, q.y - h * 0.05)).concat([...bot].reverse().map((q) => pt(q.x, q.y + 3))), t.ink, 0.12);
    });
    for (let i = 0; i + 3 < top.length; i += 3) pen.hair(top.slice(i, i + 4), 0.8, t.ink, FAR * 0.9);
    for (let i = 0; i + 3 < bot.length; i += 5) pen.hair(bot.slice(i, i + 3), 0.5, t.ink, FAR * 0.6);
    unders.push(bot);
  }
  // Twigs poking out under the canopy, and grey seed pods hanging.
  for (let k = 0; k < 8; k++) {
    const bot = unders[k % unders.length]!;
    const p = bot[1 + Math.floor(pen.rng() * (bot.length - 2))]!;
    pen.hair([p, pt(p.x + pen.jitter(4), p.y + 3 + pen.rng() * 3)], 0.45, t.ink, FAR * 0.8);
    if (k % 2) pen.hair(bezier(pt(p.x + 2, p.y), pt(p.x + 4, p.y + 3), pt(p.x + 2.5, p.y + 6), 4), 0.9, '#9a9a8a', 0.7);
  }
}

/**
 * A dead camelthorn, centuries dry: a black, twisted skeleton of a tree
 * with bare forking limbs, standing on a scrap of cracked white clay.
 */
export function deadTree(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const pan = oval(x, ground + 1, h * 0.55, 3, 20);
  pen.fill(pan, '#efe9dc', 0.9);
  for (let k = 0; k < 6; k++) {
    const cx = x - h * 0.45 + k * h * 0.18;
    pen.hair([pt(cx, ground - 0.5), pt(cx + 3 + pen.jitter(2), ground + 1.5), pt(cx + 1, ground + 3)], 0.35, t.ink, FAR * 0.5);
  }
  const limb = (from: Pt, a: number, len: number, w: number, depth: number): void => {
    const end = pt(from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
    const mid = pt((from.x + end.x) / 2 + pen.jitter(len * 0.15), (from.y + end.y) / 2 + pen.jitter(len * 0.1));
    const shape = tube(bezier(from, mid, end, 6), w, Math.max(0.5, w * 0.55));
    pen.fill(shape, '#3a2f2a', 0.55);
    pen.hair(edges(shape), 0.4, t.ink, FAR * 0.8);
    if (depth <= 0) return;
    const n = depth > 1 ? 2 : 2 + Math.floor(pen.rng() * 2);
    for (let i = 0; i < n; i++) limb(end, a + (i - (n - 1) / 2) * 0.7 + pen.jitter(0.25), len * (0.6 + pen.rng() * 0.15), w * 0.6, depth - 1);
  };
  limb(pt(x, ground + 1), -Math.PI / 2 + 0.12, h * 0.4, 5, 3);
}

/**
 * Welwitschia: a low woody crown with two strap leaves sprawled either way
 * across the sand, split by the wind into ribbons that curl and dry at the
 * tips, and a few cones on the crown.
 */
export function welwitschia(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  // A heap of ribbons: back ones arch high and fall over, front ones sprawl low.
  for (let k = 0; k < 9; k++) {
    const side = k % 2 ? 1 : -1;
    const back = 1 - k / 8;
    const len = (14 + pen.rng() * 10 + (1 - back) * 8) * s;
    const rise = (4 + back * 9 + pen.rng() * 3) * s;
    const end = pt(x + side * len, ground - (0.5 + pen.rng() * 2 + back * 2) * s);
    const spine = [...bezier(pt(x + side * 2 * s, ground - 4 * s), pt(x + side * len * 0.4, ground - rise - 4 * s), end, 10)];
    // The torn tip curls back over itself.
    spine.push(pt(end.x + side * 2 * s, end.y - 1.5 * s), pt(end.x + side * 1 * s, end.y - 3 * s));
    const strip = tube(spine, (3.6 - back) * s, 0.8 * s);
    pen.fill(strip, PAPER_FILL, 1);
    pen.fill(strip, WELW, 0.5 + 0.1 * back);
    pen.fill(tube(spine.slice(7), 2 * s, 0.8 * s), WELW_DRY, 0.65);
    pen.stroke(edges(strip), 0.45, t.ink, FAR * 0.9, false);
    pen.hair(spine.slice(1, 8).map((q) => pt(q.x, q.y + 0.3)), 0.3, t.ink, FAR * 0.45);
  }
  const crown = oval(x, ground - 3.5 * s, 6 * s, 3.4 * s, 16);
  inked(t, crown, BARK, 0.6);
  for (let k = -2; k <= 2; k++) pen.hair([pt(x + k * 2 * s, ground - 6 * s), pt(x + k * 2.6 * s, ground - 1.5 * s)], 0.4, t.ink, FAR * 0.6);
  for (const dx of [-3, 0, 2.5, 4.5]) {
    const cone = oval(x + dx * s, ground - (8.5 + Math.abs(dx) * 0.2) * s, 1.3 * s, 2 * s, 10);
    pen.hair([pt(x + dx * 0.7 * s, ground - 6 * s), pt(x + dx * s, ground - 7 * s)], 0.4, t.ink, FAR);
    inked(t, cone, CONE, 0.6, 0.45);
  }
}

/** A tuft of dry dune grass: thin straw blades bowing away from the wind. */
export function grass(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const n = 7 + Math.floor(pen.rng() * 5);
  for (let k = 0; k < n; k++) {
    const a = -1.2 + (k / (n - 1)) * 2.1 + pen.jitter(0.15);
    const len = h * (0.55 + pen.rng() * 0.5);
    const tip = pt(x + Math.sin(a) * len + 3, ground - Math.cos(a) * len * 0.9);
    const blade = bezier(pt(x + pen.jitter(1.5), ground), pt(x + Math.sin(a) * len * 0.3, ground - len * 0.7), tip, 6);
    pen.hair(blade, 0.8, STRAW, 0.85);
    pen.hair(blade, 0.4, t.ink, FAR * 0.75);
  }
  pen.fill(oval(x, ground + 0.5, h * 0.35, 1.2, 10), t.ink, 0.08);
}

/** A few rounded stones half sunk in the sand. */
export function stones(t: Draw, x: number, ground: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const r = 1.6 + pen.rng() * 2.4;
    const st = oval(x + k * 5 + pen.jitter(2), ground - r * 0.4, r * 1.3, r * 0.8, 10);
    inked(t, st, STONE, 0.6, 0.5);
  }
}

/**
 * A weathered signpost, leaning, with two arrow boards pointing opposite
 * ways: split grain, nail heads and lettering too worn to read, on a cairn.
 */
export function signpost(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const base = pt(x, ground);
  const lean = 0.05;
  const R = (dx: number, dy: number, a = 0, c = base): Pt => rot(pt(c.x + dx * s, c.y + dy * s), c, a + lean);
  const post = [R(-1.6, 1), R(1.6, 1), R(1.4, -46), R(-1.4, -47)];
  inked(t, post, WOOD, 0.55);
  pen.hair([R(0, -4), R(0.3, -40)], 0.35, t.ink, FAR * 0.6);
  const board = (y: number, dir: 1 | -1, len: number, a: number): void => {
    const c = R(0, y);
    const P = (dx: number, dy: number): Pt => rot(pt(c.x + dx * s, c.y + dy * s), c, a);
    const shape = dir > 0
      ? [P(-4, -3), P(len - 4, -3), P(len, 0), P(len - 4, 3), P(-4, 3)]
      : [P(4, -3), P(-len + 4, -3), P(-len, 0), P(-len + 4, 3), P(4, 3)];
    inked(t, shape, WOOD, 0.6);
    pen.clipped(shape, () => {
      for (const gy of [-1.6, 0.4, 1.9]) pen.hair([P(-len, gy), P(len, gy + 0.3)], 0.3, t.ink, FAR * 0.5);
    });
    // Worn lettering: a few short scrawls.
    for (let k = 0; k < 4; k++) {
      const lx = dir * (2 + k * (len - 10) / 4);
      pen.hair([P(lx, -0.8), P(lx + dir * 1.5, 0.8), P(lx + dir * 3, -0.6)], 0.4, t.ink, FAR * 0.55);
    }
    pen.dot(P(0, 0).x, P(0, 0).y, 0.5 * s, t.ink, FAR);
  };
  board(-38, 1, 26, -0.05);
  board(-29, -1, 21, 0.07);
  stones(t, x - 7 * s, ground + 1, 4);
}

/** A whale's bleached ribs arching up out of the sand, with a vertebra and a sunk jawbone. */
export function whaleBones(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const jaw = tube(bezier(pt(x + 44 * s, ground), pt(x + 66 * s, ground - 6 * s), pt(x + 90 * s, ground - 1 * s), 12), 3.4 * s, 1.6 * s);
  inked(t, jaw, BONE, 0.8, 0.6);
  for (let i = 0; i < 5; i++) {
    const bx = x + i * 9 * s;
    const h = (27 - Math.abs(i - 1.5) * 4) * s;
    const rib = tube(bezier(pt(bx, ground + 1), pt(bx + 4 * s, ground - h * 1.1), pt(bx + 15 * s, ground - h * 0.45 + pen.jitter(2)), 12), 3.2 * s, 1.1 * s);
    inked(t, rib, BONE, 0.8, 0.6);
    pen.crescent(rib, pt(-1.2, -1.2), () => pen.fill(rib, t.ink, 0.1));
  }
  const vert = oval(x - 12 * s, ground - 3 * s, 5 * s, 3.2 * s, 14);
  inked(t, vert, BONE, 0.8, 0.6);
  pen.hair([pt(x - 12 * s, ground - 6 * s), pt(x - 13 * s, ground - 11 * s)], 1.2 * s, t.ink, FAR * 0.6);
  pen.dot(x - 12 * s, ground - 3 * s, 1 * s, t.ink, FAR * 0.6);
  pen.fill(oval(x + 30 * s, ground + 1.5, 46 * s, 2.5, 20), t.ink, 0.06);
}

/** A gemsbok side-on, small: a sturdy body, black-and-white face, and long straight horns raked back. */
export function gemsbok(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  const body = [P(-6, -10.5), P(4, -11), P(6, -8), P(5, -5.5), P(-5, -5.5), P(-7, -8)];
  pen.fill(body, '#b8a690', 0.85);
  pen.fill([P(-6, -6.2), P(5, -6.2), P(5, -5.5), P(-5, -5.5)], t.ink, 0.45);
  const neck = [P(3.5, -9.6), P(6.5, -13.5), P(8, -13), P(6, -8)];
  pen.fill(neck, '#b8a690', 0.85);
  pen.fill(oval(x + 8 * s * dir, ground - 13.3 * s, 1.8 * s, 1.1 * s, 8), PAPER_FILL, 0.95);
  pen.hair([P(7.5, -14), P(4, -21)], 0.55 * s, t.ink, FAR * 1.2);
  pen.hair([P(8, -14), P(5, -21.5)], 0.5 * s, t.ink, FAR * 1.1);
  for (const lx of [-5, -3.5, 3, 4.5]) pen.hair([P(lx, -6), P(lx + 0.3, 0)], 0.6 * s, t.ink, FAR * 1.1);
  pen.hair([P(-7, -8.5), P(-8.5, -4.5)], 0.6 * s, t.ink, FAR * 1.1);
  pen.hair(edges(body), 0.45, t.ink, FAR);
}

/** A dromedary under way, side-on, small; `rider` puts a figure on the hump. */
export function camel(t: Draw, x: number, ground: number, s: number, rider: boolean): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const back = [P(-7, -10), ...bezier(P(-6, -11), P(-1, -18), P(4, -11), 6), P(6, -10), ...bezier(P(6, -10), P(9, -9), P(10, -15), 4).slice(1), P(11.5, -16.5), P(14.5, -15), P(14, -13.8), P(11, -13.6), ...bezier(P(10.5, -13), P(10, -7), P(6, -7), 4), P(-6, -7)];
  pen.fill(back, '#a98a68', 0.8);
  pen.hair(edges(back), 0.45, t.ink, FAR);
  for (const [lx, sw] of [[-5, 0.6], [-3.5, -0.6], [4, -0.5], [5.5, 0.6]] as const) pen.hair([P(lx, -7.5), P(lx + sw * 0.5, -4), P(lx + sw, 0)], 0.6 * s, t.ink, FAR * 1.1);
  if (rider) {
    pen.fill(oval(x - 0.5 * s, ground - 19 * s, 1.5 * s, 2.6 * s, 8), '#e9e1cf', 0.95);
    pen.dot(x - 0.4 * s, ground - 22.4 * s, 1 * s, t.ink, FAR * 1.1);
    pen.hair(edges(oval(x - 0.5 * s, ground - 19 * s, 1.5 * s, 2.6 * s, 8)), 0.35, t.ink, FAR);
  }
}

/** A kestrel hovering: pointed wings held up, tail fanned. */
export function kestrel(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  pen.stroke([...bezier(P(-10, -4), P(-5, -1), P(-1, 0), 5), ...bezier(P(1, 0), P(5, -1), P(10, -5), 5)], 0.9, t.ink, FAR * 1.1, false);
  pen.fill([P(-1.2, -1), P(1.2, -1), P(1, 3), P(-1, 3)], t.ink, FAR);
  pen.fill([P(-0.8, 3), P(0.8, 3), P(2.2, 7), P(-2.2, 7)], t.ink, FAR * 0.7);
}

/** A tern: slender, sharply bent wings and a forked tail. `flap` (-1..1) lifts or lowers the wings. */
export function tern(t: Draw, x: number, y: number, s: number, flap = 0): void {
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const up = flap * 3;
  t.pen.stroke([P(-8, -3 - up), P(-4, -2.5 - up * 0.6), P(-1, 0.5), P(2, -3 - up * 0.6), P(8, -1.5 - up)], 0.75, t.ink, FAR * 1.05, false);
  t.pen.hair([P(-1, 0.5), P(-3, 2.5)], 0.4, t.ink, FAR);
  t.pen.hair([P(-1, 0.5), P(-1.5, 3)], 0.4, t.ink, FAR);
}

/**
 * An old lighthouse on a low rocky point on the horizon, long dark: its
 * faded bands, a blind window, and the lantern gone, leaving a broken rim.
 */
export function ruinedLighthouse(t: Draw, x: number, horizon: number, s: number): void {
  const { pen } = t;
  const point = [pt(x - 30 * s, horizon), ...bezier(pt(x - 30 * s, horizon), pt(x - 8 * s, horizon - 7 * s), pt(x + 18 * s, horizon), 8).slice(1)];
  pen.fill(point, '#9a8f80', 0.55);
  pen.hair(point, 0.6, t.ink, FAR);
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, horizon - 5 * s + dy * s);
  const tower = [P(-4, 0), P(4, 0), P(2.8, -28), P(1.6, -30), P(0.6, -28.6), P(-0.6, -31), P(-2.8, -28)];
  pen.fill(tower, PAPER_FILL, 1);
  pen.fill(tower, TOWER, 0.8);
  pen.clipped(tower, () => {
    for (const by of [-9, -19]) pen.fill([P(-5, by), P(5, by), P(5, by - 4), P(-5, by - 4)], '#b85a46', 0.35);
    pen.hatch(tower, 1.2, 1.4, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: horizon - 30 * s });
  });
  pen.fill([P(-0.6, -14), P(0.6, -14), P(0.6, -11.5), P(-0.6, -11.5)], t.ink, FAR);
  pen.stroke(edges(tower), 0.6, t.ink, FAR * 1.1, false);
  pen.hair([P(-3.4, -28), P(3.4, -28)], 0.5, t.ink, FAR);
  // A fallen keeper's hut beside it, roofless.
  const hut = [P(6, 0), P(13, 0), P(13, -4), P(11, -5), P(8, -4.4), P(6, -5)];
  pen.fill(hut, TOWER, 0.6);
  pen.hair(edges(hut), 0.45, t.ink, FAR);
}

/** A small rusted trawler aground in the surf, listing, bow up, its wheelhouse gutted. */
export function wreck(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const c = pt(x, water);
  const R = (dx: number, dy: number): Pt => rot(pt(x + dx * s, water + dy * s), c, -0.12);
  const hull = [R(-16, -1), R(-15, -5), R(12, -6), R(17, -9), R(15, -2), R(10, 1), R(-14, 1)];
  inked(t, hull, RUST, 0.55);
  pen.clipped(hull, () => {
    for (let k = 0; k < 9; k++) pen.hair([R(-14 + k * 3.2, -5), R(-14.6 + k * 3.2, 0)], 0.5, '#6e3b26', 0.45);
  });
  const house = [R(-9, -5), R(-2, -5.2), R(-2.5, -10), R(-8.5, -10)];
  inked(t, house, '#c2b6a2', 0.55, 0.5);
  for (const wx of [-7.5, -5, -3.8]) pen.fill([R(wx, -8.6), R(wx + 1, -8.6), R(wx + 1, -7.2), R(wx, -7.2)], t.ink, FAR);
  pen.stroke([R(5, -6), R(4.5, -17)], 0.7, t.ink, FAR, false);
  pen.hair([R(4.6, -14), R(9, -7)], 0.35, t.ink, FAR * 0.7);
  for (let k = 0; k < 4; k++) pen.hair(bezier(R(-18 + k * 10, 1.5), R(-14 + k * 10, -1), R(-10 + k * 10, 1.5), 4), 1, PAPER_FILL, 0.9);
}
