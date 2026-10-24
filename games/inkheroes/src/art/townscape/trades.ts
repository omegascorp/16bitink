import type { Rng } from '../../logic/rng';
import { closed, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beam, CROWN_BLUE, CROWN_GOLD, frontOf, P, sideOf, STONE, STONE_WARM, TIMBER, TIMBER_DARK, type Box, type Surface } from '../sites/build';
import { IRON } from '../sites/parts';
import { blob, crisp, dab, flat, glow, groundShadow, mix, paint, SHADOW, soft } from '../sites/paintKit';
import { TRADES_B } from './trades2';
import { TRADES_C } from './trades3';
import {
  barrel, casement, earth, face, kiteShield, OAK, paintIn, plankDoor, PLASTER, roof, scroll, smoke, solid, STEEL, throwShadow, timbers, tufts, turn as turnPts, WARM,
} from './tradesKit';
import type { TownDrawer } from './types';

/**
 * The Crown's trade buildings on the town screen: the tavern, the smithy,
 * the market, the stables, the tiltyard and the seraphs' spire. Each is
 * painted on its own at its slot's anchor (types.ts) and finished as the
 * map's sites are, with a rim of light and one weighted ink silhouette.
 */
const TAVERN_ROOF = '#714128';

// ---- The tavern: a timber-framed inn, a cross-wing to the left, its sign out over the door ----

const WING_G: Box = { x0: -84, x1: -30, z0: 0, z1: 34, h0: 0, h1: 24 };
const WING_U: Box = { x0: -84, x1: -30, z0: -3, z1: 34, h0: 24, h1: 51 };
const HALL_G: Box = { x0: -32, x1: 58, z0: 12, z1: 46, h0: 0, h1: 24 };
const HALL_U: Box = { x0: -32, x1: 58, z0: 9, z1: 46, h0: 24, h1: 52 };
const DORMER: Box = { x0: 4, x1: 20, z0: 15, z1: 24, h0: 61, h1: 73 };
const CHIMNEY: Box = { x0: 38, x1: 48, z0: 31, z1: 40, h0: 30, h1: 93 };

/** Lit windows, [box, u, v, w, h] on the box's front. */
const TAVERN_WINDOWS: readonly (readonly [Box, number, number, number, number])[] = [
  [WING_G, 9, 6, 13, 11], [WING_G, 33, 6, 13, 11],
  [WING_U, 14, 5, 11, 14], [WING_U, 29, 5, 11, 14],
  [HALL_G, 46, 5, 14, 11], [HALL_G, 70, 5, 13, 11],
  [HALL_U, 24, 6, 10, 14], [HALL_U, 52, 6, 10, 14], [HALL_U, 79, 6, 9, 14], [DORMER, 4.5, 2, 7, 8],
];

const windowCentre = ([b, u, v, w, h]: readonly [Box, number, number, number, number]): Pt => frontOf(b)(u + w / 2, v + h / 2);

/** The hall: stone below, a jettied timber-framed storey above, the chimney through the back of its roof. */
function tavernHall(d: Draw, rng: Rng): void {
  solid(d, rng, HALL_G, STONE_WARM, 'stone');
  const sideU: Surface = sideOf(HALL_U);
  face(d, rng, sideU, HALL_U.z1 - HALL_U.z0, 28, PLASTER, 'plaster', 0.4);
  timbers(d, sideU, 0, HALL_U.z1 - HALL_U.z0, [0, 18, 37], [0, 14, 28], [[0, 0, 9, 15], [37, 0, 28, 15]], mix(TIMBER_DARK, SHADOW, 0.25));
  const at = frontOf(HALL_U);
  face(d, rng, at, 90, 28, PLASTER, 'plaster', 0.04);
  timbers(d, at, 0, 90, [8, 22, 36, 50, 64, 78, 90], [0, 13, 28], [[36, 0, 43, 13], [50, 0, 43, 13], [64, 13, 71, 28], [78, 13, 71, 28], [8, 13, 15, 28], [22, 13, 15, 28]]);
  // Joist ends under the jetty, and the jetty's shadow on the stone below.
  const g = frontOf(HALL_G);
  d.pen.clipped(crisp([g(0, 0), g(90, 0), g(90, 24), g(0, 24)], 4), () => d.pen.fill([g(0, 24), g(90, 24), g(90, 19.5), g(0, 21)], SHADOW, 0.3));
  for (let u = 3; u < 90; u += 6) d.pen.fill(crisp([at(u, -0.2), at(u + 2.2, -0.2), at(u + 2.2, 1.8), at(u, 1.8)], 1), mix(TIMBER_DARK, SHADOW, 0.3), 0.95);
  roof(d, rng, HALL_U, 32, 'x', TAVERN_ROOF, 'shingle', PLASTER, {
    o: 3.5,
    barge: TIMBER_DARK,
    end: (_, s) => timbers(d, s, 0, 37, [18.5], [0, 12], [[3, 0, 18.5, 12], [34, 0, 18.5, 12]], mix(TIMBER_DARK, SHADOW, 0.25)),
    between: () => chimney(d, rng),
  });
  face(d, rng, frontOf(DORMER), 16, 12, PLASTER, 'plaster', 0.04);
  timbers(d, frontOf(DORMER), 0, 16, [0, 16], [0, 12], []);
  roof(d, rng, DORMER, 9, 'z', TAVERN_ROOF, 'shingle', PLASTER, { o: 2, barge: TIMBER });
}

function chimney(d: Draw, rng: Rng): void {
  solid(d, rng, CHIMNEY, STONE, 'stone', true);
  // A corbelled cap and two clay pots.
  const cap: Box = { ...CHIMNEY, x0: CHIMNEY.x0 - 1.5, x1: CHIMNEY.x1 + 1.5, z0: CHIMNEY.z0 - 1.5, h0: CHIMNEY.h1 - 4, h1: CHIMNEY.h1 };
  solid(d, rng, cap, STONE, 'none', true);
  for (const x of [41, 45.5]) {
    const foot = P(x, 35, CHIMNEY.h1);
    const pot = crisp([pt(foot.x - 1.6, foot.y), pt(foot.x - 1.3, foot.y - 6), pt(foot.x + 1.3, foot.y - 6), pt(foot.x + 1.6, foot.y)], 1.5);
    paint(d, pot, '#844628', { shadow: 0.5, hatch: 0, line: 0.6 });
    d.pen.fill([pt(foot.x - 1.3, foot.y - 6), pt(foot.x + 1.3, foot.y - 6), pt(foot.x + 1, foot.y - 6.8), pt(foot.x - 1, foot.y - 6.8)], '#321f1a', 0.9);
  }
}

/** The cross-wing: its gable to the street, stone below, the upper storey jettied and framed with crosses. */
function tavernWing(d: Draw, rng: Rng): void {
  solid(d, rng, WING_G, STONE_WARM, 'stone');
  face(d, rng, sideOf(WING_U), 13, 27, PLASTER, 'plaster', 0.4);
  const at = frontOf(WING_U);
  face(d, rng, at, 54, 27, PLASTER, 'plaster', 0.04);
  timbers(d, at, 0, 54, [0, 12, 27, 42, 54], [0, 13, 27], [[0, 0, 12, 13], [0, 13, 12, 0], [42, 0, 54, 13], [42, 13, 54, 0], [0, 13, 12, 27], [0, 27, 12, 13], [42, 13, 54, 27], [42, 27, 54, 13]]);
  const g = frontOf(WING_G);
  d.pen.clipped(crisp([g(0, 0), g(54, 0), g(54, 24), g(0, 24)], 4), () => d.pen.fill([g(0, 24), g(54, 24), g(54, 19.5), g(0, 21)], SHADOW, 0.3));
  for (let u = 2; u < 54; u += 6) d.pen.fill(crisp([at(u, -0.2), at(u + 2.2, -0.2), at(u + 2.2, 1.8), at(u, 1.8)], 1), mix(TIMBER_DARK, SHADOW, 0.3), 0.95);
  roof(d, rng, WING_U, 32, 'z', TAVERN_ROOF, 'shingle', PLASTER, {
    o: 3.5,
    barge: TIMBER,
    end: (_, s) => {
      timbers(d, s, 10, 44, [27], [0, 13], [[12, 13, 4, 0], [42, 13, 50, 0]]);
      casement(d, s, 22, 2, 10, 8.5, { lead: false });
      beam(d, s(27, 13), s(27, 31), 2.4, TIMBER_DARK, 0.5);
    },
  });
}

/** The sign out over the door: a scrolled iron bracket, two chains and a blue board with a gilt tankard. */
function sign(d: Draw): void {
  const { pen } = d;
  const a = P(-30, -3, 39);
  const b = P(-9, -3, 39);
  pen.stroke([a, b], 1.4, IRON, 1, false);
  pen.stroke([P(-30, -3, 31), P(-22, -3, 37), P(-16, -3, 39)], 1, IRON, 1, false);
  scroll(d, P(-22.5, -3, 35), 2.4, 1);
  pen.dot(b.x, b.y, 0.9, IRON, 1);
  const [l, r, top, bot] = [-26, -12, 33.5, 19];
  for (const x of [l + 1.5, r - 1.5]) pen.stroke([P(x, -3, 39), P(x, -3, top)], 0.6, IRON, 1, false);
  const board = crisp([P(l, -3, bot), P(r, -3, bot), P(r, -3, top), P(l, -3, top)], 2);
  paint(d, board, CROWN_BLUE, { shadow: 0.35, hatch: 0, line: 0.9 });
  pen.stroke(closed(crisp([P(l + 1, -3, bot + 1), P(r - 1, -3, bot + 1), P(r - 1, -3, top - 1), P(l + 1, -3, top - 1)], 2)), 0.7, CROWN_GOLD, 0.95);
  // A tankard with its froth.
  const c = P((l + r) / 2, -3, (bot + top) / 2);
  const mug = crisp([pt(c.x - 3, c.y - 3), pt(c.x + 2.4, c.y - 3), pt(c.x + 2.2, c.y + 4), pt(c.x - 2.8, c.y + 4)], 1.2);
  paint(d, mug, CROWN_GOLD, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  pen.stroke([pt(c.x + 2.3, c.y - 1.5), pt(c.x + 4.4, c.y - 0.6), pt(c.x + 4.2, c.y + 2), pt(c.x + 2.3, c.y + 2.6)], 0.8, CROWN_GOLD, 1, false);
  paint(d, [pt(c.x - 3.6, c.y - 3), pt(c.x - 2.6, c.y - 5.2), pt(c.x - 0.4, c.y - 4.6), pt(c.x + 1.4, c.y - 5.4), pt(c.x + 3, c.y - 3)], '#ae9f88', { shadow: 0.2, hatch: 0, line: 0.45 });
}

/** The ground floor's door, its step and lantern, the barrels and a bench. */
function tavernFront(d: Draw, rng: Rng): void {
  const g = frontOf(HALL_G);
  plankDoor(d, g, 26, 12, 19.5, OAK, true);
  solid(d, rng, { x0: -8, x1: 8, z0: 9, z1: 12, h0: 0, h1: 1.8 }, STONE, 'none', true);
  const lamp = g(41, 18);
  d.pen.stroke([g(40, 20), pt(lamp.x, lamp.y - 4)], 0.8, IRON, 1, false);
  const glass = crisp([pt(lamp.x - 1.6, lamp.y - 3.6), pt(lamp.x + 1.6, lamp.y - 3.6), pt(lamp.x + 1.2, lamp.y + 1.6), pt(lamp.x - 1.2, lamp.y + 1.6)], 1);
  paint(d, glass, '#f8d27a', { shadow: 0.15, hatch: 0, line: 0.6, gloss: true });
  d.pen.fill([pt(lamp.x - 2, lamp.y - 3.6), pt(lamp.x + 2, lamp.y - 3.6), pt(lamp.x, lamp.y - 5.6)], IRON, 1);
  // A bench under the window, a mug left on it.
  for (const x of [17, 31]) beam(d, P(x, 5, 0), P(x, 5, 7), 1.6, TIMBER_DARK, 0.5);
  solid(d, rng, { x0: 14, x1: 34, z0: 3, z1: 7, h0: 7, h1: 8.6 }, mix(OAK, '#987a4e', 0.25), 'none', true);
  const mug = P(28, 5, 8.6);
  paint(d, crisp([pt(mug.x - 1.4, mug.y), pt(mug.x - 1.4, mug.y - 3.4), pt(mug.x + 1.4, mug.y - 3.4), pt(mug.x + 1.4, mug.y)], 1), '#735f49', { shadow: 0.4, hatch: 0, line: 0.5 });
  barrel(d, P(-23, 3), 5.2, 13, OAK);
  barrel(d, P(-12, 1), 4.8, 12, mix(OAK, '#785028', 0.4));
  barrel(d, pt(P(-23, 3).x + 0.5, P(-23, 3).y - 13), 3.4, 8, mix(OAK, SHADOW, 0.1));
}

function tavern(d: Draw, rng: Rng): void {
  tavernHall(d, rng);
  tavernWing(d, rng);
  for (const w of TAVERN_WINDOWS) {
    const [b, u, v, ww, h] = w;
    const upper = b !== WING_G && b !== HALL_G;
    casement(d, frontOf(b), u, v, ww, h, { shutter: upper ? undefined : CROWN_BLUE, sill: upper ? undefined : STONE });
  }
  // Window boxes of red geraniums under the wing's upper windows.
  for (const u of [13, 28]) {
    const at = frontOf(WING_U);
    flat(d, crisp([at(u, 2.6), at(u + 13, 2.6), at(u + 13, 5.6), at(u, 5.6)], 2), OAK, { tone: 0.1, line: 0.5 });
    for (let k = 0; k < 7; k++) {
      const p = at(u + 1 + k * 1.8 + rng(), 6.2 + rng() * 1.6);
      d.pen.dot(p.x, p.y, 1.1, k % 3 === 0 ? '#365930' : '#932c25', 1);
      d.pen.dot(p.x - 0.3, p.y - 0.3, 0.35, PAPER_FILL, 0.6);
    }
  }
  tavernFront(d, rng);
  sign(d);
}

function tavernGround(d: Draw, rng: Rng): void {
  groundShadow(d, -8, 2, 92, 9, 0.24);
  throwShadow(d, 58, 12, 46, 26);
  earth(d, rng, [P(-94, -8), P(66, -8), P(70, 10), P(40, 14), P(-90, 6)], '#867252', 0.55);
  tufts(d, rng, -92, -84, 2, 3);
  tufts(d, rng, 62, 72, -2, 3);
}

function tavernAir(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  for (const w of TAVERN_WINDOWS) glow(ctx, windowCentre(w), 11, WARM, 0.2);
  glow(ctx, frontOf(HALL_G)(41, 16), 9, WARM, 0.45);
  smoke(d, rng, P(43, 35, CHIMNEY.h1 + 6), 18, 30, 10);
}

// ---- The smithy: stone and timber, open to the street on the forge's glow, its chimney up the far end ----

const SMITHY: Box = { x0: -60, x1: 38, z0: 10, z1: 44, h0: 0, h1: 40 };
const FLUE_LOW: Box = { x0: -76, x1: -58, z0: 18, z1: 34, h0: 0, h1: 58 };
const FLUE: Box = { x0: -73, x1: -61, z0: 21, z1: 31, h0: 58, h1: 92 };
const SLATE = '#525264';
const COAL = '#281a1f';
const FIRE = '#f08a32';
/** The forge's coal bed, where the glow comes from. */
const HEARTH_GLOW = P(-37, 36, 13);
const ANVIL = P(-12, -4, 0);

function forgeChimney(d: Draw, rng: Rng): void {
  solid(d, rng, FLUE_LOW, STONE, 'stone');
  // The weathered shoulder where the flue narrows.
  flat(d, crisp([P(FLUE_LOW.x0, FLUE_LOW.z0, FLUE_LOW.h1), P(FLUE_LOW.x1, FLUE_LOW.z0, FLUE_LOW.h1), P(FLUE.x1, FLUE.z0, FLUE.h0 + 5), P(FLUE.x0, FLUE.z0, FLUE.h0 + 5)], 3), mix(STONE, '#695946', 0.3), { tone: 0.05, hatch: 0.15, line: 0.7 });
  solid(d, rng, { ...FLUE, h0: FLUE.h0 + 4 }, STONE, 'stone', true);
  const cap: Box = { x0: FLUE.x0 - 1.5, x1: FLUE.x1 + 1.5, z0: FLUE.z0 - 1.5, z1: FLUE.z1, h0: FLUE.h1 - 4, h1: FLUE.h1 };
  solid(d, rng, cap, mix(STONE, SHADOW, 0.08), 'none', true);
  d.pen.fill(crisp([P(FLUE.x0 + 1, FLUE.z0 + 1, FLUE.h1), P(FLUE.x1 - 1, FLUE.z0 + 1, FLUE.h1), P(FLUE.x1 - 1, FLUE.z1 - 1, FLUE.h1), P(FLUE.x0 + 1, FLUE.z1 - 1, FLUE.h1)], 2), '#26181f', 0.9);
  // Soot licking up from the top.
  const at = frontOf(cap);
  d.pen.clipped(crisp([at(0, -40), at(15, -40), at(15, 4), at(0, 4)], 3), () => soft(d.pen.ctx, 2, () => d.pen.fill([at(2, 4), at(13, 4), at(11, -12), at(4, -10)], '#33272c', 0.3)));
}

/** Inside the open front: the floor, the far wall lit by the fire, the hearth and hood, tools on their pegs. */
function smithyInside(d: Draw, rng: Rng, hole: readonly Pt[]): void {
  const { pen } = d;
  const ctx = pen.ctx;
  pen.clipped(hole, () => {
    pen.fill(hole, COAL, 1);
    const back = crisp([P(-50, 42, 0), P(28, 42, 0), P(28, 42, 40), P(-50, 42, 40)], 4);
    flat(d, back, '#3f2724', { tone: 0.25, line: 0 });
    pen.clipped(back, () => {
      for (let v = 4; v < 40; v += 5.2) pen.hair([P(-50, 42, v), P(28, 42, v)], 0.4, '#251515', 0.5);
    });
    flat(d, crisp([P(-50, 10, 0), P(-50, 42, 0), P(-50, 42, 36), P(-50, 10, 36)], 4), '#4a2f24', { tone: 0.15, line: 0.5 });
    flat(d, crisp([P(-50, 10, 0), P(28, 10, 0), P(28, 42, 0), P(-50, 42, 0)], 4), '#38251d', { tone: 0.25, line: 0 });
    // Tongs and hammers on the far wall.
    for (let i = 0; i < 5; i++) {
      const top = P(-14 + i * 6, 42, 30);
      pen.dot(top.x, top.y, 0.6, '#8e6e49', 0.9);
      const len = 9 + (i % 2) * 4;
      pen.stroke([top, pt(top.x + (i % 2 ? 0.5 : -0.5), top.y + len)], 0.8, '#1b1213', 0.95, false);
      if (i % 2) pen.fill(crisp([pt(top.x - 2, top.y + len), pt(top.x + 3, top.y + len), pt(top.x + 3, top.y + len + 2.2), pt(top.x - 2, top.y + len + 2.2)], 1), '#1b1213', 0.95);
      else pen.stroke([pt(top.x - 0.5, top.y + len), pt(top.x - 1.6, top.y + len + 3)], 0.7, '#1b1213', 0.95, false);
    }
    // The hearth: a stone bed of coals under a hood that runs up to the flue.
    const hearth: Box = { x0: -49, x1: -25, z0: 30, z1: 42, h0: 0, h1: 12 };
    solid(d, rng, hearth, '#574338', 'stone', false);
    const bed = crisp([P(hearth.x0, hearth.z0, 12), P(hearth.x1, hearth.z0, 12), P(hearth.x1, hearth.z1, 12), P(hearth.x0, hearth.z1, 12)], 2);
    pen.fill(bed, '#31140e', 1);
    pen.clipped(bed, () => {
      for (let i = 0; i < 40; i++) {
        const c = P(hearth.x0 + 2 + rng() * 20, hearth.z0 + 1 + rng() * 10, 12);
        pen.dot(c.x, c.y, 0.8 + rng() * 0.9, rng() < 0.35 ? '#fbd36a' : rng() < 0.6 ? FIRE : '#b8381e', 0.95);
      }
    });
    flame(d, P(-37, 35, 12), 9);
    const hood = crisp([P(-51, 32, 22), P(-23, 32, 22), P(-30, 38, 36), P(-44, 38, 36)], 3);
    flat(d, hood, '#5a4133', { tone: 0.1, line: 0.7 });
    pen.clipped(hood, () => soft(ctx, 2, () => pen.fill([P(-51, 32, 22), P(-23, 32, 22), P(-23, 32, 26), P(-51, 32, 26)], FIRE, 0.4)));
    bellows(d, P(-12, 38, 9));
    // Horseshoes on pegs along the far wall, and a cask of bar iron.
    for (let i = 0; i < 4; i++) {
      const c = P(6 + i * 5, 42, 24);
      pen.stroke(Array.from({ length: 9 }, (_, k) => pt(c.x + Math.cos(Math.PI * (0.1 + k * 0.1)) * 1.6, c.y + Math.sin(Math.PI * (0.1 + k * 0.1)) * 2)), 0.8, '#685f62', 0.9, false);
    }
    for (let i = 0; i < 5; i++) pen.stroke([P(17.5 + i * 1.4, 22, 9), P(16 + i * 1.9, 22, 23 + (i % 2) * 3)], 0.9, '#493f45', 1, false);
    barrel(d, P(20, 20), 5, 11, '#543928');
    // The fire's light thrown over the inside, strongest round the hearth.
    ctx.save();
    const g = ctx.createRadialGradient(HEARTH_GLOW.x, HEARTH_GLOW.y, 0, HEARTH_GLOW.x, HEARTH_GLOW.y, 52);
    g.addColorStop(0, 'rgba(255,160,70,0.42)');
    g.addColorStop(0.45, 'rgba(230,110,50,0.16)');
    g.addColorStop(1, 'rgba(230,110,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(HEARTH_GLOW.x - 52, HEARTH_GLOW.y - 52, 104, 104);
    ctx.restore();
    const at = frontOf(SMITHY);
    soft(ctx, 3, () => pen.fill([at(0, 40), at(98, 40), at(98, 30), at(0, 30)], '#1b0f18', 0.55));
  });
}

/** The great bellows beside the hearth: two boards and the pleated leather between, its nozzle to the fire. */
function bellows(d: Draw, c: Pt): void {
  const leather = crisp([pt(c.x - 9, c.y - 1.5), pt(c.x + 7, c.y - 4.5), pt(c.x + 7, c.y + 3.5), pt(c.x - 9, c.y + 0.5)], 2);
  paint(d, leather, '#5c3624', { shadow: 0.5, hatch: 0, line: 0.6 });
  for (const k of [-4, 0, 3.5]) d.pen.hair([pt(c.x + k, c.y - 2.4 - k * 0.2), pt(c.x + k, c.y + 1.6 + k * 0.15)], 0.45, '#241108', 0.8);
  d.pen.stroke([pt(c.x - 9, c.y - 1.8), pt(c.x + 8, c.y - 5.4)], 1.2, '#65482c', 1, false);
  d.pen.stroke([pt(c.x - 9, c.y + 0.8), pt(c.x + 8, c.y + 4.2)], 1.2, '#503723', 1, false);
  d.pen.stroke([pt(c.x - 9, c.y - 0.6), pt(c.x - 14, c.y - 0.2)], 1, IRON, 1, false);
  d.pen.stroke([pt(c.x + 8, c.y - 5.4), pt(c.x + 10, c.y - 9)], 0.8, '#65482c', 1, false);
}

/** A flame: layered tongues, deep orange outside to a pale core. */
function flame(d: Draw, c: Pt, h: number): void {
  const tongue = (k: number, color: string, dx: number): void => {
    const w = h * 0.4 * k;
    const shape = [pt(c.x - w + dx, c.y), pt(c.x - w * 0.9 + dx, c.y - h * k * 0.45), pt(c.x - w * 0.2 + dx, c.y - h * k * 0.8), pt(c.x + dx + w * 0.1, c.y - h * k), pt(c.x + w * 0.35 + dx, c.y - h * k * 0.6), pt(c.x + w * 0.8 + dx, c.y - h * k * 0.5), pt(c.x + w + dx, c.y)];
    d.pen.fill(shape, color, 0.95);
  };
  tongue(1, '#d8542a', 0);
  tongue(0.7, '#f0a83a', 0.4);
  tongue(0.4, '#fdeab0', 0.6);
}

function smithyFront(d: Draw, rng: Rng): void {
  const at = frontOf(SMITHY);
  solid(d, rng, SMITHY, STONE_WARM, 'stone');
  const hole = crisp([at(10, 0), at(88, 0), at(88, 34), at(10, 34)], 4);
  smithyInside(d, rng, hole);
  d.pen.stroke(closed(hole), 0.8, d.ink, 0.9);
  // Posts and a lintel across the opening, braced, the timber dark with soot above.
  for (const u of [36, 62]) {
    beam(d, at(u, 0), at(u, 34), 3.6, TIMBER, 0.65);
    beam(d, at(u - 6, 34), at(u, 28), 2, TIMBER_DARK, 0.5);
    beam(d, at(u + 6, 34), at(u, 28), 2, TIMBER_DARK, 0.5);
    solid(d, rng, { x0: SMITHY.x0 + u - 3, x1: SMITHY.x0 + u + 3, z0: 8, z1: 12, h0: 0, h1: 2 }, STONE, 'none', true);
  }
  beam(d, at(8, 35.5), at(90, 35.5), 3.6, TIMBER_DARK, 0.7);
  roof(d, rng, SMITHY, 26, 'x', SLATE, 'slate', STONE_WARM, {
    o: 3.5,
    end: (_, s) => {
      const v = crisp([s(14, 6), s(20, 6), s(20, 14), s(14, 14)], 2);
      d.pen.fill(v, '#26181f', 0.9);
      d.pen.stroke(closed(v), 0.6, d.ink, 0.9);
    },
  });
  // A horseshoe nailed over the opening, for luck.
  const hs = at(49, 37.5);
  d.pen.stroke(Array.from({ length: 9 }, (_, i) => pt(hs.x + Math.cos(Math.PI * (0.1 + i * 0.1)) * 2.2, hs.y + 1 - Math.sin(Math.PI * (0.1 + i * 0.1)) * 2.6)), 1, '#877f80', 1, false);
}

/** The anvil on its stump, a bar of iron glowing on its face, a hammer leant against the stump. */
function anvil(d: Draw): void {
  const { pen } = d;
  const foot = ANVIL;
  const stump = { r: 6, h: 8 };
  const top = foot.y - stump.h;
  const body = [pt(foot.x - stump.r, foot.y), pt(foot.x - stump.r, top), pt(foot.x + stump.r, top), pt(foot.x + stump.r, foot.y)];
  paint(d, crisp(body, 2), OAK, { shadow: 0.55, hatch: 0.25, line: 0.7 });
  for (let k = -2; k <= 2; k++) pen.hair([pt(foot.x + k * 2.2, foot.y), pt(foot.x + k * 2.2 + 0.3, top)], 0.4, mix(OAK, SHADOW, 0.6), 0.6);
  paint(d, ovalPts(foot.x, top, stump.r, stump.r * 0.55), '#91734b', { shadow: 0.2, hatch: 0, line: 0.6 });
  const c = pt(foot.x + 0.5, top - 9.5);
  const steel = '#4c474f';
  const shape = [pt(c.x - 6, c.y), pt(c.x + 8, c.y), pt(c.x + 8, c.y + 3.2), pt(c.x + 4, c.y + 4.6), pt(c.x + 3.4, c.y + 7), pt(c.x + 6.5, c.y + 9.5), pt(c.x - 5.5, c.y + 9.5), pt(c.x - 2.6, c.y + 7), pt(c.x - 3, c.y + 4.6), pt(c.x - 5.2, c.y + 3.4), pt(c.x - 9, c.y + 2.6), pt(c.x - 13.5, c.y + 0.8), pt(c.x - 9.5, c.y - 0.4)];
  paint(d, shape, steel, { shadow: 0.55, hatch: 0.2, line: 0.85, gloss: true });
  pen.fill([pt(c.x - 9.5, c.y - 0.4), pt(c.x - 6, c.y), pt(c.x + 8, c.y), pt(c.x + 9, c.y - 1.6), pt(c.x - 5, c.y - 1.8)], mix(steel, LIGHT_STEEL, 0.6), 0.95);
  pen.hair([pt(c.x - 12, c.y + 0.6), pt(c.x + 7.5, c.y + 0.3)], 0.5, PAPER_FILL, 0.6);
  // The hot bar.
  const bar = crisp([pt(c.x - 4, c.y - 2.4), pt(c.x + 10, c.y - 3.4), pt(c.x + 10.2, c.y - 2.2), pt(c.x - 4, c.y - 1.2)], 1);
  pen.fill(bar, '#f5a040', 1);
  pen.fill(crisp([pt(c.x + 3, c.y - 2.9), pt(c.x + 10, c.y - 3.4), pt(c.x + 10.2, c.y - 2.2), pt(c.x + 3, c.y - 1.8)], 1), '#fde29a', 1);
  pen.stroke([pt(c.x - 4, c.y - 1.8), pt(c.x - 14, c.y - 0.8)], 0.8, IRON, 1, false);
  // A sledge leant on the stump.
  pen.stroke([pt(foot.x + 5, foot.y + 1), pt(foot.x + 12, top - 4)], 1.1, TIMBER, 1, false);
  paint(d, crisp(turnPts([pt(foot.x + 10, top - 7), pt(foot.x + 15, top - 7), pt(foot.x + 15, top - 3.6), pt(foot.x + 10, top - 3.6)], pt(foot.x + 12.5, top - 5.3), 0.45), 1), steel, { shadow: 0.4, hatch: 0, line: 0.6, gloss: true });
}

const LIGHT_STEEL = '#d6d0c6';
const ovalPts = (x: number, y: number, rx: number, ry: number): Pt[] => Array.from({ length: 18 }, (_, i) => pt(x + Math.cos((i / 18) * Math.PI * 2) * rx, y + Math.sin((i / 18) * Math.PI * 2) * ry));

/** A sword hung point down from a bar at `top`: pommel, grip, a gilt guard, the blade with its fuller. */
function sword(d: Draw, top: Pt, len: number): void {
  const { pen } = d;
  pen.stroke([pt(top.x, top.y - 5.2), pt(top.x, top.y - 0.4)], 1.7, '#462d20', 1, false);
  for (let v = -4.6; v < -0.6; v += 1.1) pen.hair([pt(top.x - 0.85, v + top.y), pt(top.x + 0.85, v + top.y + 0.5)], 0.35, '#241108', 0.7);
  paint(d, ovalPts(top.x, top.y - 6.2, 1.4, 1.3), CROWN_GOLD, { shadow: 0.35, hatch: 0, line: 0.45, gloss: true });
  const guard = crisp([pt(top.x - 4.6, top.y - 0.4), pt(top.x + 4.6, top.y - 0.4), pt(top.x + 4.6, top.y + 1), pt(top.x - 4.6, top.y + 1)], 1.2);
  paint(d, guard, CROWN_GOLD, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  const blade = [pt(top.x - 1.3, top.y + 1), pt(top.x + 1.3, top.y + 1), pt(top.x + 1.1, top.y + len - 3.2), pt(top.x, top.y + len), pt(top.x - 1.1, top.y + len - 3.2)];
  paint(d, blade, STEEL, { shadow: 0.4, hatch: 0, line: 0.55, gloss: true });
  pen.hair([pt(top.x + 0.1, top.y + 1.5), pt(top.x + 0.1, top.y + len * 0.72)], 0.4, mix(STEEL, SHADOW, 0.55), 0.8);
  pen.hair([pt(top.x - 0.6, top.y + 2), pt(top.x - 0.55, top.y + len * 0.65)], 0.4, PAPER_FILL, 0.85);
}

/** The weapon rack by the door: a trestle with its swords hung through the bars, shields leant at its foot. */
function weaponRack(d: Draw, rng: Rng): void {
  const [x0, x1, z] = [47, 81, 2];
  for (const x of [x0, x1]) beam(d, P(x, z, 0), P(x, z, 40), 2.8, TIMBER, 0.6);
  for (const h of [36, 25]) beam(d, P(x0 - 2, z, h), P(x1 + 2, z, h), 2.2, TIMBER_DARK, 0.55);
  for (let i = 0; i < 4; i++) sword(d, P(x0 + 6 + i * 7.4, z, 36.5), 22 + (i % 2) * 2);
  kiteShield(d, P(54, -3, 17), 13, CROWN_BLUE, CROWN_GOLD, 'cross', -0.1);
  kiteShield(d, P(73, -4, 16), 12.5, '#a89880', CROWN_BLUE, 'chevron', 0.12);
  void rng;
}

/** A half-barrel of water for quenching, a little steam over it. */
function quenchTub(d: Draw): void {
  const foot = P(14, -3);
  barrel(d, foot, 6.5, 7, mix(OAK, SHADOW, 0.1));
  const water = ovalPts(foot.x, foot.y - 7, 5.6, 5.6 * 0.6 * 0.9);
  paint(d, water, '#3c4156', { shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
  d.pen.hair([pt(foot.x - 3.4, foot.y - 7.8), pt(foot.x - 0.5, foot.y - 8.4)], 0.6, PAPER_FILL, 0.7);
}

function smithy(d: Draw, rng: Rng): void {
  forgeChimney(d, rng);
  smithyFront(d, rng);
  quenchTub(d);
  anvil(d);
  weaponRack(d, rng);
  // A heap of coal at the corner.
  for (let i = 0; i < 9; i++) {
    const c = P(-56 + (i % 5) * 3.2, 3 - Math.floor(i / 5) * 1.2, 1.4 + Math.floor(i / 5) * 2.4);
    paint(d, ovalPts(c.x, c.y, 2, 1.6), '#2e2428', { shadow: 0.4, hatch: 0, line: 0.45, gloss: true });
  }
}

function smithyGround(d: Draw, rng: Rng): void {
  groundShadow(d, -12, 2, 82, 8, 0.24);
  throwShadow(d, 38, 10, 44, 24);
  earth(d, rng, [P(-80, -10), P(84, -10), P(84, 8), P(40, 12), P(-78, 14)], '#78664d', 0.6);
  // Soot and cinders trodden into the yard before the forge.
  dab(d, [P(-40, -6), P(20, -8), P(26, 8), P(-36, 9)], '#3f2f30', 0.18, 4);
  tufts(d, rng, 80, 86, -2, 2);
}

function smithyAir(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  glow(ctx, HEARTH_GLOW, 34, FIRE, 0.3);
  glow(ctx, pt(ANVIL.x + 3, ANVIL.y - 20), 10, '#f8b050', 0.45);
  for (let i = 0; i < 7; i++) {
    const p = pt(ANVIL.x + 2 + (rng() - 0.3) * 14, ANVIL.y - 21 - rng() * 10);
    d.pen.dot(p.x, p.y, 0.5, rng() < 0.5 ? '#fde29a' : '#f5a040', 0.95);
  }
  smoke(d, rng, P(-67, 26, FLUE.h1 + 3), 15, 32, 9);
  for (let i = 0; i < 3; i++) dab(d, blob(pt(P(14, -3).x - 1 + i * 2, P(14, -3).y - 14 - i * 5), 2.4 + i, 1.6 + i * 0.5, rng, 0.3, 12), '#c4bcb4', 0.25 - i * 0.06, 1.2);
}

export const TRADES: Readonly<Record<'tavern' | 'blacksmith' | 'marketplace' | 'stables' | 'tiltyard' | 'seraphSpire', TownDrawer>> = {
  'tavern': paintIn('tavern', tavern, tavernGround, tavernAir),
  'blacksmith': paintIn('blacksmith', smithy, smithyGround, smithyAir),
  ...TRADES_B,
  ...TRADES_C,
};
