import type { Rng } from '../../logic/rng';
import { closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beam, CROWN_BLUE, CROWN_GOLD, frontOf, P, sideOf, STONE, TIMBER, TIMBER_DARK, type Box } from '../sites/build';
import { blob, castShadow, groundShadow, LIGHT, mix, paint, SHADOW, soft } from '../sites/paintKit';
import { IRON } from '../sites/parts';
import {
  apron, banner, barrel, box, door, gableRoof, quoins, SLATE, STEEL, STRAW, stringCourse, tufts, window,
} from './dwellingKit';

/**
 * The barracks, where swordsmen hire: a long two-storey stone range under
 * slate, a gate bay with its own gable and the swordsmen's banner, a
 * practice pell in the yard.
 */
const BARRACK_STONE = mix(STONE, '#978366', 0.3);
const SHUTTER = mix(CROWN_BLUE, '#474d63', 0.35);

/** Gilt crossed swords: the swordsmen's device, `c` at the crossing. */
export function swordsCharge(d: Draw, c: Pt, s: number): void {
  for (const k of [-1, 1]) {
    const tip = pt(c.x + k * s * 0.55, c.y - s * 0.7);
    const pommel = pt(c.x - k * s * 0.5, c.y + s * 0.62);
    const guard = pt(c.x - k * s * 0.32, c.y + s * 0.4);
    d.pen.stroke([guard, tip], s * 0.16, mix(STEEL, LIGHT, 0.3), 1, false);
    d.pen.hair([guard, tip], 0.35, '#2a1d14', 0.7);
    d.pen.stroke([pt(guard.x - s * 0.18, guard.y - k * s * 0.16), pt(guard.x + s * 0.18, guard.y + k * s * 0.16)], s * 0.12, CROWN_GOLD, 1, false);
    d.pen.stroke([guard, pommel], s * 0.12, CROWN_GOLD, 1, false);
    d.pen.dot(pommel.x, pommel.y, s * 0.09, CROWN_GOLD, 1);
  }
}

/** A chimney stack on the roof at (x, z), from the roof at h0 up to h1, with its pots. */
function chimney(d: Draw, rng: Rng, x: number, z: number, h0: number, h1: number, color: string): void {
  const b: Box = { x0: x - 5, x1: x + 5, z0: z - 4, z1: z + 4, h0, h1 };
  box(d, rng, b, color, 'stone', true);
  const cap: Box = { x0: x - 6.2, x1: x + 6.2, z0: z - 5, z1: z + 5, h0: h1, h1: h1 + 2.4 };
  box(d, rng, cap, mix(color, LIGHT, 0.2), 'none', true);
  for (const dx of [-2.4, 2.4]) {
    const top = P(x + dx, z, h1 + 2.4);
    const pot = [pt(top.x - 1.6, top.y), pt(top.x + 1.6, top.y), pt(top.x + 1.3, top.y - 4), pt(top.x - 1.3, top.y - 4)];
    paint(d, pot, '#844626', { shadow: 0.45, hatch: 0, line: 0.5 });
    d.pen.fill(oval(top.x, top.y - 4, 1.3, 0.6, 10), '#17100c', 0.95);
  }
}

/** A practice pell with a straw-stuffed dummy on its crossbar, a wooden shield on one arm. */
function pell(d: Draw, rng: Rng, foot: Pt): void {
  const { pen } = d;
  beam(d, pt(foot.x, foot.y + 1), pt(foot.x, foot.y - 34), 3.4, TIMBER);
  for (let v = 6; v < 30; v += 5) pen.hair([pt(foot.x - 1.4, foot.y - v), pt(foot.x + 1.2, foot.y - v - 1.2)], 0.5, TIMBER_DARK, 0.8);
  beam(d, pt(foot.x - 12, foot.y - 25), pt(foot.x + 12, foot.y - 26), 2.4, TIMBER_DARK);
  // The dummy: a sacking torso bound with cord, straw bursting from its seams, a sack head.
  const torso = blob(pt(foot.x, foot.y - 20), 6.5, 9, rng, 0.12, 18);
  paint(d, torso, '#8e7e5c', { shadow: 0.5, hatch: 0.22, line: 0.65 });
  pen.clipped(torso, () => {
    for (const v of [-25, -16]) pen.stroke([pt(foot.x - 7, foot.y + v), pt(foot.x + 7, foot.y + v + 1)], 0.9, '#51371b', 0.85, false);
  });
  for (let i = 0; i < 7; i++) {
    const p = pt(foot.x - 5 + rng() * 10, foot.y - 12 + rng() * 2);
    pen.stroke([p, pt(p.x + (rng() - 0.5) * 4, p.y + 2 + rng() * 3)], 0.6, STRAW, 0.95, false);
  }
  const head = oval(foot.x + 0.4, foot.y - 31.5, 3.6, 4, 16);
  paint(d, head, '#948564', { shadow: 0.45, hatch: 0, line: 0.6 });
  // An old dented kettle helm jammed on its head.
  const helm = [pt(foot.x - 6, foot.y - 32.4), pt(foot.x + 6.8, foot.y - 32.6), pt(foot.x + 4.2, foot.y - 34), pt(foot.x + 3.2, foot.y - 37.6), pt(foot.x - 2.4, foot.y - 37.6), pt(foot.x - 3.6, foot.y - 34)];
  paint(d, helm, '#6a6568', { shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  pen.hair([pt(foot.x - 3, foot.y - 36.6), pt(foot.x - 1.6, foot.y - 34.6)], 0.6, PAPER_FILL, 0.8);
  // A dented wooden shield on its left arm, a cut across it.
  const sc = pt(foot.x - 11, foot.y - 21);
  const sh = oval(sc.x, sc.y, 4.6, 5.4, 18);
  paint(d, sh, '#714b29', { shadow: 0.5, hatch: 0.2, line: 0.65 });
  pen.stroke(closed(oval(sc.x, sc.y, 3.8, 4.6, 16)), 0.8, IRON, 0.9);
  pen.dot(sc.x, sc.y, 1.1, IRON, 1);
  pen.hair([pt(sc.x - 2.6, sc.y - 3), pt(sc.x + 1.4, sc.y + 2)], 0.5, '#17100c', 0.8);
}

/** A wooden practice sword leant against something, from its point `foot` up to the pommel. */
function woodenSword(d: Draw, foot: Pt, lean: number): void {
  const top = pt(foot.x + lean, foot.y - 20);
  d.pen.stroke([foot, top], 2.2, d.ink, 1, false);
  d.pen.stroke([foot, top], 1.4, '#7e6039', 1, false);
  const g = pt(foot.x + lean * 0.72, foot.y - 14.4);
  d.pen.stroke([pt(g.x - 3, g.y + 0.4), pt(g.x + 3, g.y - 0.4)], 1.6, TIMBER_DARK, 1, false);
}

function barracks(d: Draw, rng: Rng): void {
  const C = BARRACK_STONE;
  const B: Box = { x0: -80, x1: 56, z0: 0, z1: 38, h0: 0, h1: 62 };
  const W = B.x1 - B.x0;
  box(d, rng, { x0: -81.5, x1: 57.5, z0: -1.5, z1: 39.5, h0: 0, h1: 4 }, mix(C, SHADOW, 0.12), 'stone', true);
  box(d, rng, { ...B, h0: 4 }, C, 'stone', false);
  const at = frontOf(B);
  quoins(d, at, 0.5, 62, C, 1);
  quoins(d, at, W - 0.5, 62, C, -1);
  stringCourse(d, at, 0, W, 31, C);
  window(d, sideOf(B), 12, 38, 8, 12, C, { arched: true, tone: 0.4 });
  window(d, sideOf(B), 13, 10, 7, 11, C, { tone: 0.4 });
  // Two floors of windows either side of the gate bay: shuttered above, some lit below.
  const bay = [52, 82];
  const cols = [9, 27, 45 - 3, 89 + 3, 107, 124];
  cols.forEach((u, i) => {
    window(d, at, u - 4.5, 41, 9, 13, C, { arched: true, bars: true, shutters: SHUTTER });
    window(d, at, u - 4.5, 10, 9, 12, C, { bars: true, lit: i === 1 || i === 4 });
  });
  gableRoof(d, rng, B, 30, 'x', SLATE, 'slate', C, 4);
  chimney(d, rng, -52, 19, 86, 104, C);
  chimney(d, rng, 30, 19, 86, 102, C);
  // The gate bay, projecting under its own gable: the arched door, the swordsmen's banner, an oculus.
  const G: Box = { x0: B.x0 + bay[0]!, x1: B.x0 + bay[1]!, z0: -6, z1: 8, h0: 0, h1: 64 };
  box(d, rng, { x0: G.x0 - 1.5, x1: G.x1 + 1.5, z0: G.z0 - 1.5, z1: G.z1, h0: 0, h1: 4 }, mix(C, SHADOW, 0.12), 'stone', true);
  box(d, rng, { ...G, h0: 4 }, C, 'stone', false);
  const ga = frontOf(G);
  quoins(d, ga, 0.5, 64, C, 1);
  quoins(d, ga, 29.5, 64, C, -1);
  stringCourse(d, ga, 0, 30, 31, C);
  door(d, rng, ga, 7, 16, 26, C, { ring: 4.2 });
  gableRoof(d, rng, { ...G, z1: 22 }, 22, 'z', SLATE, 'slate', C, 4);
  const oc = ga(15, 75);
  paint(d, oval(oc.x, oc.y, 5.2, 5.2, 18), mix(C, LIGHT, 0.3), { shadow: 0.3, hatch: 0, line: 0.55 });
  paint(d, oval(oc.x, oc.y, 3.4, 3.4, 16), '#24262e', { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.stroke([pt(oc.x - 3.4, oc.y), pt(oc.x + 3.4, oc.y)], 0.8, C, 0.95, false);
  d.pen.stroke([pt(oc.x, oc.y - 3.4), pt(oc.x, oc.y + 3.4)], 0.8, C, 0.95, false);
  banner(d, ga(15, 62), 13, 26, CROWN_BLUE, (c) => swordsCharge(d, c, 8), 0.6);
  // The yard: barrels and a crate on the left, the pell and wooden swords on the right.
  barrel(d, pt(-84, 5), 5.6, 13);
  const cr: Box = { x0: -96, x1: -86, z0: -12, z1: -4, h0: 0, h1: 8 };
  box(d, rng, cr, '#735632', 'plank', true);
  pell(d, rng, pt(84, 0));
  woodenSword(d, pt(66, 4), 4);
  woodenSword(d, pt(70, 5), 6);
  beam(d, pt(62, 6), pt(76, 4), 2.2, TIMBER);
}

function barracksGround(d: Draw, rng: Rng): void {
  groundShadow(d, -10, -4, 96, 12, 0.26);
  castShadow(d, [P(56, -1, 0), P(56, 39, 0), P(80, 30, 0), P(82, -4, 0)], 0, 0, 0.2, 3);
  // The trodden yard around the pell, the step before the gate.
  soft(d.pen.ctx, 3, () => d.pen.fill(blob(pt(80, 2), 22, 7, rng, 0.2, 18), '#887350', 0.5));
  apron(d, rng, pt(-13, 6), 18, 4.5);
  tufts(d, rng, -80, -40, 3, 5);
  tufts(d, rng, 20, 56, 3, 4);
}

export const BARRACKS = { draw: barracks, ground: barracksGround } as const;

