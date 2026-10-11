import { bezier, closed, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';
import { NIGHT, union } from './nightSky';

/**
 * The shore of a Queensland bay at night: a headland of dark rainforest,
 * crowns heaped on crowns, with hoop pines standing up out of it in their
 * tufted tiers; she-oaks (casuarinas) weeping their fine needles; a fibro
 * beach shack on its stumps, its iron roof catching the moon, a rainwater
 * tank beside it and a warm lamp lit in its window; a campfire on the sand
 * with two people sitting at it, the firelight pooled round them. All are
 * drawn as by day and sunk into the night with a glaze (see `moonlit`);
 * only what gives its own light keeps its warmth.
 */
const CANOPY = '#3f6a46';
const CANOPY_LIT = '#7d9f74';
const PINE = '#355a3f';
const ROCK = '#7d766c';
const ROCK_DARK = '#4f4a44';
const BARK = '#7a6650';
const OAK = '#7b8c6c';
const OAK_DARK = '#4f5f48';
const FIBRO = '#cfe0cf';
const TRIM = '#e9e4d4';
const IRON = '#b8bfc4';
const STUMP = '#6d5c48';
export const LAMP = '#ffd27a';
export const FIRE = '#ff9a3c';
const FIRE_CORE = '#fff1b8';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** A hoop pine's tuft: a dense clump of foliage at a branch's end, bristling with needles round its top, shaded under. */
function pineTuft(t: Draw, x: number, y: number, rx: number, ry: number): void {
  const { pen } = t;
  const lobes = [oval(x, y, rx, ry, 14), oval(x - rx * 0.5, y + ry * 0.2, rx * 0.6, ry * 0.75, 12), oval(x + rx * 0.5, y + ry * 0.15, rx * 0.65, ry * 0.8, 12)].map((l) => l.map((p) => pt(p.x + pen.jitter(0.5), p.y + pen.jitter(0.4))));
  union(t, lobes, PAPER_FILL, 1);
  union(t, lobes, PINE, 0.88);
  union(t, lobes, '', 0, () => pen.hatch(oval(x, y + ry * 0.6, rx * 1.6, ry, 12), 1.1, 0.9, 0.3, { color: t.ink, alpha: FAR * 0.6 }));
  // Needles bristling off its top, and its skyline inked.
  for (let k = 0; k < Math.round(rx * 2.5); k++) {
    const a = -Math.PI * (0.1 + 0.8 * pen.rng());
    const from = pt(x + Math.cos(a) * rx * 0.9, y + Math.sin(a) * ry * 0.9);
    pen.hair([from, pt(from.x + Math.cos(a) * 1.4, from.y + Math.sin(a) * 1.4)], 0.4, k % 2 ? PINE : t.ink, k % 2 ? 0.9 : FAR * 0.6);
  }
  pen.hair(lobes[0]!.slice(7, 14), 0.4, t.ink, FAR * 0.6);
}

/**
 * A hoop pine: a tall, straight, bare trunk carrying its foliage in dense,
 * bristling tufts at the ends of short, upturned branches, tier on tier,
 * a few missing, the crown a ragged column narrowing at last to a spire.
 * `ground` is where its trunk leaves the canopy.
 */
export function hoopPine(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const top = pt(x + pen.jitter(1.5), ground - h);
  pen.stroke([pt(x, ground), top], Math.max(0.8, h * 0.025), BARK, 0.9, false);
  pen.hair([pt(x + 0.4, ground), top], 0.4, t.ink, FAR * 0.8);
  const tiers = Math.max(4, Math.round(h / 7));
  for (let i = 0; i < tiers; i++) {
    const u = i / (tiers - 1);
    const y = ground - h * (0.3 + 0.62 * u) + pen.jitter(1.5);
    const reach = h * 0.16 * (1 - u ** 2 * 0.7) * (0.7 + pen.rng() * 0.5) + 1.5;
    for (const side of [-1, 1] as const) {
      if (pen.rng() < 0.22 && u < 0.85) continue;
      const end = pt(x + side * reach, y - reach * 0.3);
      pen.hair(bezier(pt(x, y + 1), pt(x + side * reach * 0.6, y), end, 4), 0.55, BARK, 0.85);
      pineTuft(t, end.x - side * reach * 0.15, end.y, reach * 0.5 + 1.2, reach * 0.22 + 1.2);
    }
  }
  pineTuft(t, top.x, top.y + 2, 1.6, 2.6);
}

/**
 * Rainforest cloaking a headland from x0 to x1, `height(x)` above `water`
 * down to `foot(x)` (the water itself by default): heaped, rounded crowns
 * of broadleaf trees, the back ones up on the skyline, each lit a little
 * on top and hatched beneath; hoop pines standing up out of it on the
 * ridge. Returns its skyline.
 */
export function rainforest(t: Draw, x0: number, x1: number, water: number, height: (x: number) => number, pines: readonly (readonly [number, number])[], foot: (x: number) => number = () => -2): Pt[] {
  const { pen } = t;
  const crowns: Pt[][] = [];
  for (let x = x0 + 6; x < x1 - 4; x += 7 + pen.rng() * 8) {
    const r = 6 + pen.rng() * 7;
    crowns.push(oval(x, water - height(x) + r * 0.55, r, r * 0.8, 16).map((p) => pt(p.x + pen.jitter(0.8), p.y + pen.jitter(0.8))));
  }
  const body: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) body.push(pt(x, water - height(x) + 6));
  const under: Pt[] = [];
  for (let x = x1; x >= x0; x -= 4) under.push(pt(x, water - foot(x) + pen.jitter(1.5)));
  const mass = [...body, ...under];
  for (const [px, ph] of pines) hoopPine(t, px, water - height(px) + 8, ph);
  union(t, [mass, ...crowns], CANOPY, 0.9);
  union(t, [mass, ...crowns], '', 0, () => {
    // Rows of crowns down the slope, each lit on top, shadowed and hatched below.
    for (let row = 0; row < 4; row++) {
      for (let x = x0 + pen.rng() * 12; x < x1; x += 10 + pen.rng() * 10) {
        const y = water - height(x) * (0.85 - row * 0.22) + 6;
        if (y > water - foot(x) - 2) continue;
        const r = 5 + pen.rng() * 5;
        const c = oval(x, y, r, r * 0.75, 14);
        pen.fill(c.slice(8, 14).concat(c.slice(8, 14).reverse().map((p) => pt(p.x, p.y + r * 0.5))), CANOPY_LIT, 0.45);
        pen.hair(c.slice(9, 15), 0.45, t.ink, FAR * 0.55);
        pen.hatch(c, 1.3, 0.85, 0.3, { color: t.ink, alpha: FAR * 0.45, onlyBelow: y + r * 0.1 });
      }
    }
  });
  for (const c of crowns) pen.hair(c.slice(8, 15), 0.5, t.ink, FAR * 0.6);
  return body;
}

/**
 * A rocky bluff from x0 to x1, `height(x)` above `water`: weathered rock
 * jointed in blocks, its face shadowed and hatched, ledges catching the
 * light, its skyline inked.
 */
export function bluff(t: Draw, x0: number, x1: number, water: number, height: (x: number) => number): Pt[] {
  const { pen } = t;
  const sky: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) sky.push(pt(x, water - height(x) + pen.jitter(0.6)));
  const shape = [...sky, pt(x1, water + 2), pt(x0, water + 2)];
  washed(t, shape, ROCK, 0.7, 0.7);
  pen.clipped(shape, () => {
    // Joints: near-vertical cracks, and the ledges between, lit along their tops.
    for (let x = x0 + 4; x < x1; x += 5 + pen.rng() * 8) {
      const y0 = water - height(x) + 2;
      pen.hair([pt(x, y0), pt(x + pen.jitter(2), water)], 0.4, t.ink, FAR * 0.55);
    }
    for (let y = water - 6; y > water - 140; y -= 6 + pen.rng() * 6) {
      const x = x0 + pen.rng() * (x1 - x0);
      const len = 8 + pen.rng() * 18;
      pen.hair([pt(x, y), pt(x + len, y + pen.jitter(1))], 0.6, PAPER_FILL, 0.45);
      pen.hair([pt(x + 1, y + 1.2), pt(x + len, y + 1.4)], 0.35, t.ink, FAR * 0.5);
    }
    pen.hatch(shape, 1.5, 1.2, 0.35, { color: ROCK_DARK, alpha: 0.55 });
  });
  return shape;
}

/**
 * A she-oak (casuarina): a rough, leaning trunk forking into a few
 * branches, and from them its foliage, fine jointed needles hanging in
 * soft, weeping curtains.
 */
export function casuarina(t: Draw, x: number, ground: number, h: number, lean: number): void {
  const { pen } = t;
  const top = pt(x + lean * h, ground - h);
  const spine = bezier(pt(x, ground), pt(x + lean * h * 0.2, ground - h * 0.55), top, 14);
  const trunk = tube(spine, h * 0.05 + 1, h * 0.02 + 0.6);
  const ends: Pt[] = [top];
  for (const [u, side, len] of [[0.45, -1, 0.42], [0.55, 1, 0.38], [0.72, -1, 0.3], [0.8, 1, 0.28]] as const) {
    const from = spine[Math.round(u * (spine.length - 1))]!;
    const to = pt(from.x + side * h * len * 0.7, from.y - h * len * 0.6);
    ends.push(to);
    pen.stroke(bezier(from, pt(from.x + side * h * len * 0.3, from.y - h * len * 0.45), to, 6), Math.max(0.6, h * 0.018), BARK, 0.9, false);
  }
  washed(t, trunk, BARK, 0.7, 0.6);
  pen.clipped(trunk, () => pen.hatch(trunk, 1.1, 0.2, 0.3, { color: t.ink, alpha: FAR * 0.5 }));
  // The weeping curtains of needles, a soft mass behind them.
  for (const e of ends) {
    const mass = oval(e.x, e.y + h * 0.1, h * 0.17, h * 0.13, 16).map((p) => pt(p.x + pen.jitter(h * 0.03), p.y + pen.jitter(h * 0.03)));
    pen.fill(mass, OAK_DARK, 0.75);
    pen.clipped(mass, () => pen.hatch(mass, 1.2, 1.4, 0.3, { color: t.ink, alpha: FAR * 0.5 }));
    for (let k = 0; k < 34; k++) {
      const a = pt(e.x + pen.jitter(h * 0.17), e.y + pen.jitter(h * 0.06));
      const fall = h * (0.1 + pen.rng() * 0.2);
      const strand = bezier(a, pt(a.x + pen.jitter(2) + lean * 3, a.y + fall * 0.4), pt(a.x + pen.jitter(3), a.y + fall), 6);
      pen.hair(strand, 0.5, k % 4 ? OAK : t.ink, k % 4 ? 0.9 : FAR * 0.6);
    }
  }
}

/** Corrugated iron: the lines of its ribs across a sheet, and its sheen. */
function corrugated(t: Draw, sheet: readonly Pt[], a: Pt, b: Pt, s: number): void {
  const { pen } = t;
  washed(t, sheet, IRON, 0.6, 0.55);
  pen.clipped(sheet, () => {
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (1.3 * s));
    for (let k = 1; k < n; k++) {
      const p = pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n);
      pen.hair([p, pt(p.x + 1.5 * s, p.y + 8 * s)], 0.3, t.ink, FAR * 0.45);
    }
    pen.fill(sheet.map((p) => pt(p.x, p.y - 1 * s)), PAPER_FILL, 0.3);
  });
}

/**
 * A fibro beach shack, Queensland fashion: a low box of pale green sheeting
 * up on timber stumps, a corrugated iron roof, a front veranda on posts
 * with a rail, a round corrugated rainwater tank on its stand beside it
 * and a surfboard leaning on the wall. Returns where its window is, for
 * the lamp.
 */
export function shackBody(t: Draw, x: number, ground: number, s: number): { x: number; y: number; w: number; h: number } {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  // The tank, behind on its stand.
  for (const dx of [-27, -21]) pen.stroke([P(dx, 0), P(dx, -6)], 0.7 * s, STUMP, 0.9, false);
  const tank = [P(-29, -6), P(-19, -6), P(-19, -16), P(-29, -16)];
  corrugated(t, tank, P(-29, -16), P(-19, -16), s);
  washed(t, oval(x - 24 * s, ground - 16 * s, 5 * s, 1.2 * s, 14), IRON, 0.7, 0.45);
  // Stumps under the floor, and the walls.
  for (const dx of [-15, -6, 3, 12]) pen.stroke([P(dx, 0.5), P(dx, -4)], 0.8 * s, STUMP, 0.9, false);
  const wall = [P(-17, -4), P(14, -4), P(14, -17), P(-17, -17)];
  washed(t, wall, FIBRO, 0.6, 0.6);
  pen.clipped(wall, () => {
    for (const dx of [-9, -1, 7]) pen.hair([P(dx, -4), P(dx, -17)], 0.35, t.ink, FAR * 0.5);
    pen.hatch(wall, 1.6, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.35 });
  });
  const door = [P(5, -4), P(9.5, -4), P(9.5, -13.5), P(5, -13.5)];
  washed(t, door, '#5f7f8f', 0.55, 0.45);
  // The roof: a low gable end on, eaves overhanging, the veranda's skillion off the front.
  const roof = [P(-19.5, -16.5), P(16.5, -16.5), P(13, -22), P(-16, -22)];
  corrugated(t, roof, P(-19.5, -16.5), P(16.5, -16.5), s);
  const verandaRoof = [P(14, -17), P(27, -13.5), P(27, -12.3), P(14, -15.5)];
  corrugated(t, verandaRoof, P(14, -17), P(27, -13.5), s);
  for (const dx of [20, 26]) pen.stroke([P(dx, -3.5), P(dx, -13.5 + (dx - 14) * 0.06)], 0.6 * s, TRIM, 0.95, false);
  pen.hair([P(14, -7), P(26.5, -7)], 0.6, TRIM, 0.9);
  for (let dx = 15.5; dx < 26; dx += 2) pen.hair([P(dx, -4), P(dx, -7)], 0.35, t.ink, FAR * 0.6);
  pen.stroke([P(13, -3.6), P(27.5, -3.6)], 0.7 * s, STUMP, 0.9, false);
  // A surfboard leaning on the end wall.
  const board = tube(bezier(P(-19, 0), P(-20.5, -7), P(-19.6, -14), 8), 2.4 * s, 1 * s);
  washed(t, board, '#e9d9a6', 0.7, 0.45);
  pen.hair(bezier(P(-19.1, -0.5), P(-20.5, -7), P(-19.7, -13.5), 8), 0.3, '#c4553a', 0.8);
  return { x: x - 11 * s, y: ground - 13.5 * s, w: 10 * s, h: 6.5 * s };
}

/** The shack's lamp lit in its window: warm panes, the frame's bars dark across them, the light spilling out onto the night. */
export function litWindow(t: Draw, win: { x: number; y: number; w: number; h: number }, s: number): void {
  const { pen } = t;
  const { x, y, w, h } = win;
  glow(t, x + w / 2, y + h / 2, w * 2.4, h * 2.2, LAMP, 0.35);
  glow(t, x + w / 2, y + h * 2.4, w * 1.6, h * 0.5, LAMP, 0.25);
  const pane = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];
  pen.fill(pane, PAPER_FILL, 1);
  pen.fill(pane, LAMP, 0.75);
  glow(t, x + w * 0.4, y + h * 0.5, w * 0.4, h * 0.4, FIRE_CORE, 0.8);
  pen.hair([pt(x + w / 2, y), pt(x + w / 2, y + h)], 0.5 * s, NIGHT, 0.7);
  pen.hair([pt(x, y + h / 2), pt(x + w, y + h / 2)], 0.5 * s, NIGHT, 0.7);
  pen.hair(closed(pane), 0.5, t.ink, FAR);
}

/**
 * A campfire on the sand: a ring of stones, a few crossed sticks, sparks
 * going up, and the firelight pooled round it on the sand; two people
 * sitting at it, dark against the night, lit warm on the side towards the
 * fire. (Its flames flicker on their own, a mover: see `flames`.)
 */
export function campfire(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  glow(t, x, ground - 3 * s, 40 * s, 14 * s, FIRE, 0.3);
  glow(t, x, ground - 6 * s, 16 * s, 12 * s, LAMP, 0.4);
  for (const [dx, side] of [[-11, 1], [12, -1]] as const) sitter(t, x + dx * s, ground, s, side);
  for (const [a, b] of [[-4, 3], [-3, 4]] as const) pen.stroke([pt(x + a * s, ground - 0.4 * s), pt(x + b * s, ground - 2.6 * s)], 1 * s, STUMP, 0.95, false);
  for (let k = 0; k < 7; k++) {
    const sx = x + (k - 3) * 1.6 * s;
    washed(t, oval(sx, ground - 0.4 * s, 1 * s, 0.7 * s, 8), '#8a8780', 0.6, 0.35, 0.7);
  }
  for (let k = 0; k < 9; k++) pen.dot(x + pen.jitter(5 * s), ground - (6 + pen.rng() * 16) * s, 0.35 * s, k % 2 ? FIRE : LAMP, 0.8);
  glow(t, x + 3 * s, ground - 26 * s, 5 * s, 9 * s, '#8f97b4', 0.25);
}

/** Flames off the embers, shaped by frame `f` so they flicker from one to the next. */
export function flames(t: Draw, x: number, base: number, s: number, f: number): void {
  const { pen } = t;
  glow(t, x, base - 2 * s, 7 * s, 5 * s, FIRE, 0.55);
  for (let k = 0; k < 4; k++) {
    const dx = (k - 1.5) * 1.6 * s;
    const h = (4 + 3 * Math.abs(Math.sin(f * 1.7 + k * 2.1))) * s * (k === 1 || k === 2 ? 1.3 : 0.8);
    const lean = Math.sin(f * 2.3 + k) * 0.8 * s;
    const tongue = [pt(x + dx - 1.2 * s, base), ...bezier(pt(x + dx - 1.2 * s, base), pt(x + dx - 0.6 * s + lean, base - h * 0.6), pt(x + dx + lean * 1.5, base - h), 5).slice(1), ...bezier(pt(x + dx + lean * 1.5, base - h), pt(x + dx + 1 * s + lean, base - h * 0.5), pt(x + dx + 1.2 * s, base), 5).slice(1)];
    pen.fill(tongue, FIRE, 0.85);
    pen.fill(tongue.map((p) => pt(x + dx + (p.x - x - dx) * 0.5, base + (p.y - base) * 0.6)), FIRE_CORE, 0.9);
  }
}

/** Someone sitting on the sand hugging their knees, facing the fire (`side` 1: it's to their right). */
function sitter(t: Draw, x: number, ground: number, s: number, side: 1 | -1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + side * dx * s, ground + dy * s);
  const body = [P(-2.2, 0), P(4, 0), P(4.4, -3.4), P(1.6, -3.2), P(1, -7.5), P(-1.6, -7.8), P(-2.6, -3)];
  pen.fill(body, NIGHT, 0.85);
  const head = oval(x + side * -0.2 * s, ground - 9.3 * s, 1.6 * s, 1.7 * s, 10);
  pen.fill(head, NIGHT, 0.85);
  // Firelight on the faces and knees turned to it.
  pen.hair([P(1.2, -7.4), P(1.7, -3.4), P(4.3, -3.3)], 0.6, FIRE, 0.75);
  pen.hair(head.filter((p) => (p.x - x) * side > 0.4 * s), 0.6, FIRE, 0.8);
  pen.hair(edges(body, 2), 0.4, t.ink, FAR * 0.6);
}
