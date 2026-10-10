import { bezier, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FAR } from './common';

/**
 * Mangroves, drawn the way a field illustrator sketches a tidal forest:
 * red mangroves (Rhizophora) standing on cages of arching prop roots, with
 * rounded dark crowns stippled with leaf rosettes and hung with propagules;
 * stemless nipa palms; and the pencil roots (pneumatophores) that poke up
 * through the mud round black mangroves. `fade` (0..1) pales far ones.
 */
export const CANOPY = '#4e7a48';
export const BARK = '#8b7b63';
const LEAF_LIGHT = '#a9c27a';
const PROPAGULE = '#6d7f3c';
const PROP_CAP = '#8a5a34';
const NIPA = '#7b9a50';
const OYSTER = '#ece6d6';
const PENCIL = '#5a5243';

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** The lowest edge of a heap of puffs at x, if any puff reaches it. */
function underside(puffs: readonly Puff[], x: number): number | undefined {
  let y: number | undefined;
  for (const p of puffs) {
    const dx = x - p.x;
    if (Math.abs(dx) < p.r) y = Math.max(y ?? -Infinity, p.y + Math.sqrt(p.r * p.r - dx * dx));
  }
  return y;
}

/** A lobe's outline, scalloped by the leaf clusters along it. */
function scallop(p: Puff): Pt[] {
  const steps = Math.max(16, Math.round(p.r * 1.6));
  const bumps = Math.max(3, Math.round(p.r / 2.6));
  return Array.from({ length: steps + 1 }, (_, j) => {
    const a = (j / steps) * Math.PI * 2;
    const r = p.r - 0.6 + 1.2 * Math.abs(Math.sin((a * bumps) / 2));
    return pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
  });
}

/**
 * Foliage: a heap of round leaf masses, painted back to front (higher
 * lobes behind lower ones), each washed green, darkening towards the
 * heap's foot, hatched on its shadow side, textured with leaf rosettes and
 * inked round its scalloped edge, so the front lobes cut across the ones
 * behind as an illustrator draws a crown.
 */
function foliage(t: Draw, puffs: readonly Puff[], fade: number): void {
  const { pen } = t;
  const { ctx } = pen;
  const y0 = Math.min(...puffs.map((p) => p.y - p.r));
  const y1 = Math.max(...puffs.map((p) => p.y + p.r));
  for (const p of [...puffs].sort((a, b) => a.y - b.y)) {
    const lobe = scallop(p);
    pen.fill(lobe, PAPER_FILL, 1);
    pen.fill(lobe, CANOPY, 0.46 * fade);
    pen.clipped(lobe, () => {
      const g = ctx.createLinearGradient(0, y0 + (y1 - y0) * 0.3, 0, y1);
      g.addColorStop(0, 'rgba(40,62,42,0)');
      g.addColorStop(1, `rgba(40,62,42,${0.34 * fade})`);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.r - 2, p.y - p.r - 2, p.r * 2 + 4, p.r * 2 + 4);
      // Leaf rosettes: four short leaves round a twig tip, pale towards the lit upper left.
      for (let i = 0, n = Math.round((p.r * p.r) / 9); i < n; i++) {
        const a = pen.rng() * Math.PI * 2;
        const d = Math.sqrt(pen.rng()) * p.r;
        const x = p.x + Math.cos(a) * d;
        const y = p.y + Math.sin(a) * d;
        const lit = (x - p.x) + (y - p.y) < -p.r * 0.2 && pen.rng() < 0.8;
        const a0 = pen.rng() * Math.PI;
        for (let j = 0; j < 4; j++) {
          const b = a0 + (j * Math.PI) / 2 + pen.jitter(0.3);
          const l = 1.7 + pen.rng() * 1.3;
          pen.hair([pt(x, y), pt(x + Math.cos(b) * l, y + Math.sin(b) * l * 0.8)], 0.55, lit ? LEAF_LIGHT : t.ink, lit ? 0.75 * fade : FAR * 0.5 * fade);
        }
      }
    });
    if (p.r > 5) pen.crescent(lobe, pt(-p.r * 0.35, -p.r * 0.45), () => pen.hatch(lobe, 1.9, 2.3, 0.4, { color: t.ink, alpha: FAR * 0.42 * fade }));
    const half = Math.floor(lobe.length / 2);
    pen.hair(lobe.slice(half), 0.8, t.ink, FAR * 0.9 * fade);
    pen.hair(lobe.slice(0, half + 1), 0.5, t.ink, FAR * 0.5 * fade);
  }
}

/** A rounded crown of lobes filling the box centred on (cx, cy). Returns its puffs. */
function crown(t: Draw, cx: number, cy: number, w: number, h: number, fade: number): Puff[] {
  const { pen } = t;
  const puffs: Puff[] = [];
  const n = Math.max(3, Math.round(w / (h * 0.36)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const r = h * (0.2 + 0.12 * Math.sin(Math.PI * u) ** 0.5) * (0.85 + pen.rng() * 0.3);
    const x = cx - w / 2 + r + (w - 2 * r) * u + pen.jitter(r * 0.15);
    puffs.push({ x, y: cy + h / 2 - r - Math.sin(Math.PI * u) * h * 0.06, r });
  }
  for (let i = 0, m = n - 1; i < m; i++) {
    const u = 0.12 + (0.76 * (i + 0.5)) / m;
    const r = h * (0.26 + pen.rng() * 0.1);
    puffs.push({ x: cx - w / 2 + w * u + pen.jitter(3), y: cy - h / 2 + r + (1 - Math.sin(Math.PI * u)) * h * 0.3, r });
  }
  // Small tufts breaking the outline.
  for (let i = 0; i < n; i++) {
    const u = pen.rng();
    const r = h * (0.1 + pen.rng() * 0.06);
    puffs.push({ x: cx - w * 0.46 + w * 0.92 * u, y: cy - h * 0.5 + r * 0.6 + (1 - Math.sin(Math.PI * u)) * h * 0.45, r });
  }
  foliage(t, puffs, fade);
  return puffs;
}

/**
 * A long, low wall of mangrove canopy from x0 to x1, its top at
 * `top(x)`: overlapping lobes in two tiers, `depth` deep.
 */
export function canopyWall(t: Draw, x0: number, x1: number, top: (x: number) => number, depth: number, fade: number): void {
  const { pen } = t;
  const puffs: Puff[] = [];
  for (let x = x0; x < x1; x += 9 + pen.rng() * 9) {
    const r = 10 + pen.rng() * 9;
    puffs.push({ x, y: top(x) + r * 0.9, r });
    const r2 = 12 + pen.rng() * 8;
    puffs.push({ x: x + 5, y: top(x) + depth * (0.5 + pen.rng() * 0.3), r: r2 });
  }
  foliage(t, puffs, fade);
}

/** One prop root: a tapering limb of grey bark arching out and down, crusted with oysters near its foot. */
function root(t: Draw, spine: readonly Pt[], w0: number, w1: number, fade: number, bark: string): void {
  const { pen } = t;
  const r = ribbon(spine, (u) => w0 + (w1 - w0) * u);
  pen.fill(r.shape, PAPER_FILL, fade);
  pen.fill(r.shape, bark, 0.55 * fade);
  pen.hair(r.top, 0.45, t.ink, FAR * 0.75 * fade);
  pen.hair(r.bot, 0.55, t.ink, FAR * 0.95 * fade);
  for (const p of spine.slice(-4)) pen.dot(p.x + pen.jitter(w0 * 0.4), p.y + pen.jitter(1), 0.45 + pen.rng() * 0.3, OYSTER, 0.85 * fade);
}

/**
 * The cage of prop roots under a red mangrove, leaving the trunk at `knee`
 * and plunging into the mud at `ground` across `w`; a few fork again on
 * the way down. `bark` lets an old dead cage go bleached.
 */
export function rootCage(t: Draw, x: number, knee: number, ground: number, w: number, s: number, fade = 1, bark = BARK): void {
  const { pen } = t;
  const n = 4 + Math.round(w / 22);
  const h = ground - knee;
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1;
    const u = (k + 1 + pen.rng() * 0.8) / (n + 0.8);
    const p0 = pt(x + side * 1.5 * s, knee - pen.rng() * h * 0.4 * u);
    const reach = (w / 2) * (0.25 + 0.75 * u) * (0.85 + pen.rng() * 0.25);
    const end = pt(x + side * reach, ground + 1 + pen.rng() * 2);
    const rise = h * (0.15 + pen.rng() * 0.2);
    const drop = end.y - p0.y;
    const spine = cub(p0, pt(p0.x + side * reach * 0.45, p0.y - rise), pt(end.x - side * reach * 0.12, p0.y - rise * 0.2 + drop * 0.15), end, 16);
    root(t, spine, 2.6 * s, 1.3 * s, fade, bark);
    if (pen.rng() < 0.4) {
      const from = spine[6]!;
      const out = reach * (0.25 + pen.rng() * 0.2);
      root(t, cub(from, pt(from.x + side * out * 0.7, from.y - 2), pt(from.x + side * out, from.y + (ground - from.y) * 0.3), pt(from.x + side * out * 1.15, ground + 1), 10), 1.5 * s, 0.9 * s, fade, bark);
    }
  }
}

/** Propagules hanging under a crown: long green cigars with a brown cap. */
function propagules(t: Draw, puffs: readonly Puff[], x0: number, x1: number, n: number, fade: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const x = x0 + pen.rng() * (x1 - x0);
    const y = underside(puffs, x);
    if (y === undefined) continue;
    const l = 6 + pen.rng() * 5;
    const tip = pt(x + pen.jitter(0.8), y + l);
    pen.hair([pt(x, y - 1), tip], 1.25, PROPAGULE, 0.8 * fade);
    pen.hair([pt(x + 0.5, y - 1), pt(tip.x + 0.5, tip.y)], 0.3, t.ink, FAR * 0.6 * fade);
    pen.dot(x, y, 0.8, PROP_CAP, 0.8 * fade);
  }
}

/**
 * A red mangrove: a cage of prop roots under a short, leaning trunk, a few
 * aerial roots dropping from the branches, and a rounded crown `w` across
 * whose top is `h` above the mud or water at `ground`.
 */
export function rhizophora(t: Draw, x: number, ground: number, h: number, w: number, fade = 1): void {
  const { pen } = t;
  const s = Math.max(0.5, h / 130);
  const lean = pen.jitter(0.1);
  const crownH = h * 0.5;
  const crownY = ground - h + crownH / 2;
  const knee = ground - h * 0.27;
  const top = pt(x + lean * h * 0.4, crownY + crownH * 0.2);
  // Aerial roots dropping from the branches, behind everything.
  for (const k of [-1, 1]) {
    const dx = k * w * (0.25 + pen.rng() * 0.1);
    const line = bezier(pt(x + dx * 0.8, crownY + crownH * 0.35), pt(x + dx * 1.05, (crownY + ground) / 2), pt(x + dx * 1.1 + k * 4, ground + 1), 8);
    pen.hair(line, 0.7, BARK, 0.5 * fade);
    pen.hair(line.map((p) => pt(p.x + 0.6, p.y)), 0.3, t.ink, FAR * 0.5 * fade);
  }
  rootCage(t, x, knee, ground, w * 1.05, s, fade);
  // The trunk, and its branches fanning up into the crown.
  const spine = bezier(pt(x, knee + 6), pt(x + lean * h * 0.1, (knee + top.y) / 2), top, 10);
  const trunk = ribbon(spine, (u) => (6 - 2.4 * u) * s);
  pen.fill(trunk.shape, PAPER_FILL, fade);
  pen.fill(trunk.shape, BARK, 0.6 * fade);
  pen.clipped(trunk.shape, () => pen.hatch(trunk.shape, 1.6, 1.2, 0.4, { color: t.ink, alpha: FAR * 0.45 * fade }));
  pen.hair(trunk.top, 0.6, t.ink, FAR * fade);
  pen.hair(trunk.bot, 0.7, t.ink, FAR * fade);
  for (const dx of [-0.32, -0.1, 0.14, 0.34]) pen.hair(bezier(top, pt(top.x + dx * w * 0.4, top.y - crownH * 0.15), pt(x + dx * w, crownY + crownH * 0.15), 6), 1.1 * s, t.ink, FAR * 0.8 * fade);
  const puffs = crown(t, x + lean * h * 0.3, crownY, w, crownH, fade);
  propagules(t, puffs, x - w * 0.42, x + w * 0.42, Math.round(w / 7), fade);
}

/** One nipa frond: a stiff rib rising from the mud with long leaflets drooping off both sides. */
function nipaFrond(t: Draw, base: Pt, ang: number, len: number, fade: number): void {
  const { pen } = t;
  const tip = pt(base.x + Math.cos(ang) * len, base.y + Math.sin(ang) * len);
  const bend = Math.cos(ang) * len * 0.25;
  const rib = bezier(base, pt(base.x + Math.cos(ang) * len * 0.55 - bend * 0.2, base.y + Math.sin(ang) * len * 0.62), pt(tip.x + bend, tip.y + len * 0.12), 12);
  for (let i = 3; i < rib.length; i++) {
    const p = rib[i]!;
    const u = i / (rib.length - 1);
    const l = len * 0.24 * Math.sin(Math.PI * Math.min(1, 0.2 + u * 0.9));
    for (const side of [-1, 1]) {
      const end = pt(p.x + side * l * 0.75, p.y + l * 0.55);
      const leaf = bezier(p, pt(p.x + side * l * 0.45, p.y - l * 0.05), end, 4);
      pen.hair(leaf, 1.3, NIPA, 0.55 * fade);
      pen.hair(leaf, 0.35, t.ink, FAR * 0.55 * fade);
    }
  }
  pen.stroke(rib, 0.9, t.ink, FAR * 0.9 * fade, false);
}

/** A nipa palm: a fountain of great feather fronds springing straight from the mud, no trunk. */
export function nipa(t: Draw, x: number, ground: number, h: number, fade = 1): void {
  const { pen } = t;
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + ((k / (n - 1)) * 2 - 1) * 0.75 + pen.jitter(0.12);
    nipaFrond(t, pt(x + pen.jitter(2), ground), a, h * (0.75 + pen.rng() * 0.3), fade);
  }
  pen.fill(oval(x, ground - 1, 6, 2.5, 10), '#6e6046', 0.45 * fade);
}

/** Pencil roots: a field of thin spikes poking up from the mud, taller towards the parent tree. */
export function pneumatophores(t: Draw, x0: number, x1: number, ground: (x: number) => number, n: number, hMax: number, fade = 1): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const x = x0 + pen.rng() * (x1 - x0);
    const y = ground(x) + pen.rng() * 8;
    const mid = 1 - Math.abs((x - x0) / (x1 - x0) - 0.5) * 2;
    const h = (1.5 + pen.rng() * hMax) * (0.4 + 0.6 * mid);
    const tip = pt(x + pen.jitter(0.6), y - h);
    pen.hair([pt(x, y), tip], 1.1, PENCIL, 0.7 * fade);
    pen.dot(tip.x, tip.y + 0.4, 0.4, OYSTER, 0.6 * fade);
  }
}

/** A propagule that has dropped and speared into the mud upright, perhaps sprouting its first pair of leaves. */
export function stuckPropagule(t: Draw, x: number, ground: number, h: number, lean: number, sprout: boolean): void {
  const { pen } = t;
  const tip = pt(x + lean * h, ground - h);
  pen.hair([pt(x, ground + 1), tip], 1.6, PROPAGULE, 0.75);
  pen.hair([pt(x + 0.7, ground + 1), pt(tip.x + 0.7, tip.y)], 0.35, t.ink, FAR * 0.8);
  pen.hair([pt(tip.x + lean * 2, tip.y + 2), tip], 1.8, PROP_CAP, 0.7);
  if (sprout) {
    for (const side of [-1, 1]) {
      const leaf = [tip, ...bezier(tip, pt(tip.x + side * 3, tip.y - 3.5), pt(tip.x + side * 5, tip.y - 1.5), 5).slice(1), ...bezier(pt(tip.x + side * 5, tip.y - 1.5), pt(tip.x + side * 2.5, tip.y), tip, 4).slice(1)];
      pen.fill(leaf, CANOPY, 0.55);
      pen.hair(leaf, 0.35, t.ink, FAR * 0.8);
    }
  }
  pen.fill(oval(x, ground + 1, 2.5, 0.8, 8), t.ink, 0.1);
}

/**
 * A dead mangrove left standing on the flat: a bleached, split trunk
 * forking into a few bare branches. Returns the tip of its highest branch,
 * a perch.
 */
export function snag(t: Draw, x: number, ground: number, h: number, lean: number): Pt {
  const { pen } = t;
  const top = pt(x + lean * h, ground - h);
  const spine = bezier(pt(x, ground + 2), pt(x + lean * h * 0.2, ground - h * 0.5), top, 12);
  const trunk = ribbon(spine, (u) => 6 - 4 * u);
  pen.fill(trunk.shape, PAPER_FILL, 1);
  pen.fill(trunk.shape, '#bcb39f', 0.55);
  pen.clipped(trunk.shape, () => {
    for (let k = -2; k <= 2; k++) pen.hair(spine.map((p, i) => pt(p.x + k * (1 - i / spine.length) * 1.1, p.y)), 0.3, t.ink, FAR * 0.45);
  });
  pen.hair(trunk.top, 0.6, t.ink, FAR);
  pen.hair(trunk.bot, 0.7, t.ink, FAR);
  let perch = top;
  for (const [u, a, l] of [[0.55, -0.9, 0.3], [0.7, 0.7, 0.26], [0.85, -0.5, 0.2]] as const) {
    const from = spine[Math.round(u * (spine.length - 1))]!;
    const tip = pt(from.x + Math.sin(a) * h * l, from.y - Math.cos(a) * h * l);
    const branch = bezier(from, pt((from.x + tip.x) / 2, (from.y + tip.y) / 2 - 3), tip, 6);
    pen.fill(ribbon(branch, (v) => 2.4 - 2 * v).shape, '#bcb39f', 0.6);
    pen.hair(branch, 0.7, t.ink, FAR * 0.9);
    if (tip.y < perch.y) perch = tip;
  }
  pen.fill(oval(x, ground + 2, 8, 2, 12), t.ink, 0.08);
  return perch;
}

/** A fallen mangrove trunk half sunk in the mud, crusted with oysters along its waterline. */
export function log(t: Draw, x0: number, x1: number, ground: number, r: number): void {
  const { pen } = t;
  const spine = bezier(pt(x0, ground - r * 0.3), pt((x0 + x1) / 2, ground - r * 0.7), pt(x1, ground - r * 0.2), 14);
  const body = ribbon(spine, (u) => r * 2 * (1 - 0.3 * u));
  pen.fill(body.shape, PAPER_FILL, 1);
  pen.fill(body.shape, BARK, 0.55);
  pen.clipped(body.shape, () => {
    for (let k = 0; k < 3; k++) pen.hair(spine.map((p) => pt(p.x, p.y - r * 0.5 + k * r * 0.4)), 0.3, t.ink, FAR * 0.4);
    pen.hatch(body.shape, 1.6, 2.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: ground - r * 0.2 });
    for (let k = 0; k < (x1 - x0) * 0.6; k++) {
      const p = spine[Math.floor(pen.rng() * spine.length)]!;
      pen.dot(p.x + pen.jitter(4), p.y + r * (0.4 + pen.rng() * 0.6), 0.5 + pen.rng() * 0.4, OYSTER, 0.85);
    }
  });
  pen.hair(body.top, 0.7, t.ink, FAR);
  pen.hair(body.bot, 0.5, t.ink, FAR * 0.6);
  const end = oval(x0, ground - r * 0.3, r * 0.45, r, 12);
  pen.fill(end, '#cdb48a', 0.7);
  pen.hair([...end, end[0]!], 0.5, t.ink, FAR);
  pen.hair(oval(x0, ground - r * 0.3, r * 0.2, r * 0.5, 10), 0.3, t.ink, FAR * 0.5);
}
