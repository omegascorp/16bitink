import { lookOf } from '../logic/gear';
import type { Tech } from '../logic/tech';
import { capsule, cub, edge, oval, pt, ribbon, type Draw } from './kit';
import { bell, crumpledBell, dish, gash, hullPlate, weldPlate } from './landerParts';
import { dab, gleam, glow, mix, paint, SHADOW } from './paint';
import { cell } from './prospector/cell';
import { drill } from './prospector/drill';
import { HEAD, helmet } from './prospector/helmet';
import { jetpack, nozzles } from './prospector/jetpack';
import { pack } from './prospector/pack';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { markOf } from './prospector/marks';
import { part, rivets, roundRect, seam, sheen, WASH } from './prospector/parts';
import { arm, leg, torso } from './prospector/suit';
import { drawStarshipSystem } from './starship/systems';
import { drawPulseTool } from './aster/weapon';

/**
 * The pictures in the lander's technology slots, No Man's Sky style: each
 * slot shows the thing itself. Gear is drawn with the prospector's own
 * parts at its mark, so a slot matches what the character wears; the
 * lander's systems are drawn with the lander's parts, broken until mended;
 * the starship's are drawn like the starship (starship/systems.ts).
 * Each fits a frame of TECH_FRAME units, origin at the centre.
 */
export const TECH_FRAME = 40;

/** What a picture depends on beyond its slot: a gear piece's mark, a system broken or mended. */
export type TechVariant = number | 'broken' | 'mended';

const CHARGE = WASH.charge;
const STEEL = '#b9c1cc';
const CRATE = '#b48a55';
const CORE = '#7fd3e0';

/** Draws `fn` moved by (dx, dy) and scaled by `s` about the origin. */
function placed(d: Draw, dx: number, dy: number, s: number, fn: () => void): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(dx, dy);
  fn();
  ctx.restore();
}

/** The work suit off its wearer: torso, arms hanging, legs. */
function suit(d: Draw, mk: number): void {
  leg(d, mk, pt(-3, 6.6), pt(-3.6, 13), false);
  leg(d, mk, pt(2.4, 6.6), pt(3, 13), true);
  arm(d, mk, pt(-5.6, -1.6), pt(-8.4, 7.4));
  torso(d, mk);
  arm(d, mk, pt(4.4, -1.6), pt(7.8, 7.4));
}

/** The printer: a boxy fabricator with its head over a half-printed part; cracked and dark when broken. */
function printer(d: Draw, broken: boolean): void {
  const body = roundRect(-14, -12, 14, 12, 2);
  hullPlate(d, body, '#c7c9ce', -14, 14, -12, 12, broken ? 0.6 : 0.15);
  edge(d, body, 1);
  const bay = roundRect(-10, -6, 10, 8, 1);
  paint(d, bay, '#2f3346', { alpha: 1, shadow: 0, hatch: 0, line: 0.7 });
  d.pen.stroke([pt(-9, -3), pt(9, -3)], 0.9, WASH.metal, 0.9, false);
  const head = roundRect(-2.4, -4.6, 2.4, -0.4, 0.6);
  part(d, head, broken ? WASH.darkMetal : WASH.metal, { shadow: 0.3, line: 0.5, gloss: true, hatch: 0 });
  if (broken) {
    d.pen.hair([pt(-1, -1), pt(0.6, 1.4), pt(-0.4, 3)], 0.6, '#e9ecf2', 0.9);
  } else {
    glow(d.pen.ctx, pt(0, 1), 3, CHARGE, 0.6);
    d.pen.stroke([pt(0, -0.4), pt(0, 3.6)], 0.8, CHARGE, 1, false);
    part(d, roundRect(-5, 3.6, 5, 7.2, 0.5), '#6f8dc6', { shadow: 0.3, line: 0.5, hatch: 0 });
  }
  for (const x of [-11, -8]) d.pen.dot(x, -9, 1, broken ? '#9e2f28' : '#6fd08a');
  seam(d, [pt(4, -9), pt(11, -9)], 0.5);
}

/** The drive core: a glowing crystal in a cage; cracked through and dark when broken. */
function core(d: Draw, broken: boolean): void {
  const crystal = [pt(0, -13), pt(6, -4), pt(4.6, 10), pt(-4.6, 10), pt(-6, -4)];
  if (!broken) glow(d.pen.ctx, pt(0, -1), 14, CORE, 0.5);
  paint(d, crystal, broken ? '#5d6d78' : CORE, { alpha: 1, shadow: 0.4, gloss: true, line: 0.9 });
  d.pen.hair([pt(0, -13), pt(0.6, 10)], 0.4, d.ink, 0.5);
  d.pen.hair([pt(-6, -4), pt(1, -2), pt(6, -4)], 0.4, d.ink, 0.5);
  if (broken) {
    d.pen.stroke([pt(-3, -9), pt(1, -4), pt(-1, 1), pt(3, 6), pt(2, 10)], 0.8, d.ink, 0.95, false);
    d.pen.stroke([pt(-2.6, -9.4), pt(1.4, -4.4), pt(-0.6, 0.6)], 0.4, '#e9ecf2', 0.8, false);
  } else {
    gleam(d, [pt(-3.6, -4), pt(-2.4, 5)], 1, 0.9);
  }
  for (const [y, w] of [[-14.5, 6], [11.5, 8]] as const) part(d, roundRect(-w, y - 1.6, w, y + 1.6, 0.8), WASH.darkMetal, { shadow: 0.4, line: 0.7, gloss: true, hatch: 0 });
  for (const x of [-7.6, 7.6]) d.pen.stroke([pt(x * 0.75, -13), pt(x, -2), pt(x * 0.9, 10)], 0.9, d.ink, 0.85, false);
}

/** The radio after the crash: the mast snapped off short, the dish fallen on its rim beside it. */
function fallenDish(d: Draw): void {
  const stub = capsule(pt(-12, 14), pt(-11.4, 0), 2.4, 2);
  part(d, stub, WASH.metal, { shadow: 0.4, line: 0.7, hatch: 0 });
  d.pen.stroke([pt(-13.4, 0.4), pt(-12, -1.4), pt(-11.2, 0.2), pt(-9.6, -1.2)], 0.8, d.ink, 0.95, false);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(-6, 11);
  ctx.rotate(1.35);
  ctx.scale(0.9, 0.9);
  dish(d, pt(0, 0), 9);
  ctx.restore();
  // The cable still running from the stub to the fallen dish.
  d.pen.stroke([pt(-11.6, 2), pt(-9, 8), pt(-6.4, 10.4)], 0.6, '#b07a3a', 0.9, false);
  d.pen.hair([pt(-16, 14.4), pt(16, 14.4)], 0.6, d.ink, 0.5);
}

/** The cargo hold: crates stacked and strapped. */
function cargo(d: Draw): void {
  const crate = (x0: number, y0: number, x1: number, y1: number): void => {
    const box = [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
    part(d, box, CRATE, { shadow: 0.5, line: 0.8 });
    d.pen.hair([pt(x0, y0), pt(x1, y1)], 0.6, mix(CRATE, SHADOW, 0.55), 0.9);
    d.pen.hair([pt(x1, y0), pt(x0, y1)], 0.6, mix(CRATE, SHADOW, 0.55), 0.9);
    edge(d, [pt(x0 + 1.4, y0 + 1.4), pt(x1 - 1.4, y0 + 1.4), pt(x1 - 1.4, y1 - 1.4), pt(x0 + 1.4, y1 - 1.4)], 0.5, 0.7);
  };
  crate(-15, -1, -1, 13);
  crate(1, -1, 15, 13);
  crate(-7, -14, 7, -1);
  d.pen.stroke([pt(-16, 5), pt(16, 5)], 1.2, WASH.leather, 0.95, false);
}

/** The winch: a cable drum on its frame, the cable running down to a hook. */
function winch(d: Draw): void {
  const frame = [pt(-14, 4), pt(-11, -12), pt(-8, -12), pt(-10, 4)];
  part(d, frame, WASH.darkMetal, { shadow: 0.4, line: 0.6, hatch: 0 });
  part(d, [pt(14, 4), pt(11, -12), pt(8, -12), pt(10, 4)], WASH.darkMetal, { shadow: 0.4, line: 0.6, hatch: 0 });
  const drum = capsule(pt(-10, -8), pt(10, -8), 9, 9);
  part(d, drum, '#c69a4c', { shadow: 0.55, line: 0.8, gloss: true });
  for (let x = -8; x <= 8; x += 1.6) d.pen.hair([pt(x, -12.2), pt(x + 0.8, -3.8)], 0.45, mix('#c69a4c', SHADOW, 0.6), 0.8);
  d.pen.stroke([pt(5, -4), pt(5, 8)], 0.9, d.ink, 0.9, false);
  d.pen.stroke([pt(5, 8), pt(5, 11), pt(3, 13.6), pt(1, 12.6)], 1.3, STEEL, 1, false);
  d.pen.stroke([pt(5, 8), pt(5, 11), pt(3, 13.6), pt(1, 12.6)], 0.5, d.ink, 0.8, false);
  part(d, roundRect(-14, 4, 14, 7, 0.6), WASH.metal, { shadow: 0.4, line: 0.6, hatch: 0 });
}

/** The supply tanks: a tall air cylinder, cerulean-banded, beside a squat battery with its charge showing, on one cradle. */
function supplyTanks(d: Draw): void {
  const tank = capsule(pt(-6, -13), pt(-6, 10), 12, 12);
  hullPlate(d, tank, '#cfd6de', -12, 0, -19, 16, 0.15);
  edge(d, tank, 0.9);
  for (const y of [-8, 5]) d.pen.fill([pt(-12, y), pt(0, y), pt(0, y + 2.2), pt(-12, y + 2.2)], '#3f8fae', 0.85);
  part(d, roundRect(-8.4, -19.6, -3.6, -17.4, 0.6), WASH.darkMetal, { shadow: 0.3, line: 0.5, hatch: 0 });
  sheen(d, [pt(-9.6, -12), pt(-9.6, 8)], 0.7);
  const battery = roundRect(2, -5, 15, 11, 1.4);
  part(d, battery, WASH.darkMetal, { shadow: 0.45, line: 0.8, gloss: true, hatch: 0.15 });
  part(d, roundRect(4.4, -7.4, 7.2, -5, 0.4), STEEL, { shadow: 0.2, line: 0.45, hatch: 0 });
  part(d, roundRect(9.8, -7.4, 12.6, -5, 0.4), STEEL, { shadow: 0.2, line: 0.45, hatch: 0 });
  for (let k = 0; k < 3; k++) part(d, roundRect(4.6, 7.6 - k * 4.4, 12.4, 9.6 - k * 4.4, 0.4), CHARGE, { shadow: 0.15, line: 0.4, hatch: 0, alpha: 1 });
  part(d, roundRect(-15, 13, 16, 16, 0.6), WASH.metal, { shadow: 0.4, line: 0.6, hatch: 0 });
}

/** The hull refit: a plate on its frame, with the guild's rivets: the lander, built bigger. */
function refit(d: Draw): void {
  const sheet = [pt(-15, -10), pt(13, -13), pt(15, 10), pt(-13, 12)];
  hullPlate(d, sheet, '#d9d9d2', -15, 15, -13, 12, 0.2);
  edge(d, sheet, 1);
  rivets(d, [pt(-12.4, -7.6), pt(10.6, -10.2), pt(12.4, 7.6), pt(-10.6, 9.6), pt(-1, -11.4), pt(1, 11)], 0.7);
  d.pen.stroke([pt(-6, 4), pt(0, -4), pt(6, 4)], 1.6, '#4a5f97', 0.9, false);
  sheen(d, [pt(-12, -6), pt(-9, 6)], 0.8);
}

function gear(d: Draw, t: Extract<Tech, { kind: 'gear' }>, mk: number): void {
  if (t.piece === 'drill') placed(d, -3.4, 2, 1.75, () => drill(d, mk, pt(0, 0), -0.6, 0, false));
  else if (t.piece === 'cell') placed(d, 9.2, -0.4, 1.9, () => cell(d, mk));
  else if (t.piece === 'pack') placed(d, 5.9, -8.6, 3.5, () => pack(d, mk));
  else if (t.piece === 'suit') placed(d, 0, -4.4, 1.3, () => suit(d, mk));
  else if (t.piece === 'helmet') placed(d, -HEAD.x + 0.6, -HEAD.y + 1.2, 1.3, () => helmet(d, mk, pt(0.6, 0.2)));
  else {
    // A work can stands alone (its cell is a slot of its own), so it's drawn bigger and centred.
    const [dx, dy, s] = lookOf(mk) === 0 ? [11.8, -1.9, 1.7] : [10.6, -2.6, 1.45];
    placed(d, dx, dy, s, () => {
      jetpack(d, mk);
      nozzles(d, mk);
    });
  }
}

function system(d: Draw, t: Extract<Tech, { kind: 'repair' }>, broken: boolean): void {
  if (t.id === 'printer') printer(d, broken);
  else if (t.id === 'core') core(d, broken);
  else if (t.id === 'comms') {
    if (broken) fallenDish(d);
    else placed(d, -3, 6, 1.25, () => dish(d, pt(0, 4), 9));
  } else if (t.id === 'hull') {
    const sheet = roundRect(-15, -11, 15, 11, 1.4);
    hullPlate(d, sheet, '#d4d3cc', -15, 15, -11, 11, broken ? 0.6 : 0.2);
    edge(d, sheet, 0.9);
    if (broken) placed(d, 0, 0, 1.25, () => gash(d, pt(0, 0)));
    else weldPlate(d, pt(0, 0));
  } else if (broken) {
    crumpledBell(d, 0, -12, 13, 12);
    dab(d, oval(0, 10, 12, 4, 16), '#2a2733', 0.35, 1.5);
  } else bell(d, 0, -12, 13, 12);
}

/** The receiver: a handheld radio with a whip antenna, a dial and a row of signal bars, three of them lit. */
function receiver(d: Draw): void {
  d.pen.stroke([pt(5, -8), pt(9, -17)], 1.1, d.ink, 0.95, false);
  d.pen.dot(9.2, -17.4, 1.2, d.ink);
  const body = roundRect(-9, -9, 9, 15, 3);
  part(d, body, '#c7703f', { shadow: 0.55, line: 0.85, gloss: true });
  const face = roundRect(-6.4, -6, 6.4, 3, 1.4);
  part(d, face, '#2c3352', { shadow: 0, line: 0.6, hatch: 0 });
  glow(d.pen.ctx, pt(0, -1.6), 8, CHARGE, 0.25);
  for (let k = 0; k < 5; k++) {
    const h = 1.6 + k * 1.3;
    const x = -4.6 + k * 2.3;
    part(d, roundRect(x, 1.2 - h, x + 1.5, 1.2, 0.3), k < 3 ? CHARGE : '#55607e', { shadow: 0, line: 0, hatch: 0, alpha: 1 });
  }
  part(d, oval(-3.4, 8.6, 2.6, 2.6, 14), WASH.metal, { shadow: 0.4, line: 0.6, gloss: true, hatch: 0 });
  d.pen.stroke([pt(-3.4, 8.6), pt(-2, 6.6)], 0.6, d.ink, 0.9, false);
  for (let y = 6.4; y <= 11.4; y += 1.6) d.pen.hair([pt(1.6, y), pt(6.4, y)], 0.5, mix('#c7703f', SHADOW, 0.6), 0.85);
  sheen(d, [pt(-7.6, -7), pt(-7.6, 12)], 0.8);
}

const BRINE = markOf(3);
const COPPER = '#c27a45';
const HALITE = '#f3dcdc';
/** The counterlungs' oilskin: Brine's teal cloth, darkened. */
const LUNG = mix(BRINE.cloth, BRINE.trim, 0.5);

/** A corrugated hose along `spine`: dark rubber, ringed, a gleam down its lit side. */
function hose(d: Draw, spine: readonly Pt[], w: number): void {
  const r = ribbon(spine, () => w);
  part(d, r.shape, BRINE.nozzle, { shadow: 0.5, line: 0.55, gloss: true, hatch: 0 });
  for (let i = 1; i < spine.length - 1; i++) d.pen.hair([r.top[i]!, r.bot[i]!], 0.32, mix(BRINE.nozzle, SHADOW, 0.6), 0.85);
  sheen(d, r.top.slice(1, -1).map((p, i) => pt((p.x * 2 + r.bot[i + 1]!.x) / 3, (p.y * 2 + r.bot[i + 1]!.y) / 3)), 0.45);
}

/** A counterlung: a soft oilskin bag, half full, creased, stitched round its edge, a strap tab with a pearl button. */
function counterlung(d: Draw, s: 1 | -1): void {
  const x0 = s * 7;
  const x1 = s * 16;
  const bag = [pt(x0, -5), ...cub(pt(x0, -5), pt((x0 + x1) / 2, -7.2), pt(x1 + s * 0.6, -6), pt(x1, -2), 6).slice(1), ...cub(pt(x1, -2), pt(x1 + s * 1.2, 4), pt(x1 + s * 0.4, 10), pt(x1 - s * 1.4, 12), 6).slice(1), ...cub(pt(x1 - s * 1.4, 12), pt((x0 + x1) / 2, 13.4), pt(x0 + s * 0.6, 12.4), pt(x0, 10), 6).slice(1)];
  part(d, bag, LUNG, { shadow: 0.55, line: 0.75, hatch: 0.18 });
  const mx = (x0 + x1) / 2;
  for (const [a, b] of [[pt(mx - s * 2, -3), pt(mx - s * 0.6, 3)], [pt(mx + s * 1.6, 2), pt(mx + s * 2.6, 9)], [pt(mx - s * 2.6, 6), pt(mx - s * 1, 10.4)]] as const) {
    d.pen.hair([a, pt((a.x + b.x) / 2 + s * 0.6, (a.y + b.y) / 2), b], 0.35, mix(LUNG, SHADOW, 0.6), 0.8);
    d.pen.hair([pt(a.x - 0.4, a.y), pt((a.x + b.x) / 2 + s * 0.2, (a.y + b.y) / 2), pt(b.x - 0.4, b.y)], 0.3, mix(LUNG, '#ffffff', 0.4), 0.55);
  }
  const inset = bag.map((p) => pt(mx + (p.x - mx) * 0.84, 3.4 + (p.y - 3.4) * 0.88));
  for (let i = 0; i < inset.length - 1; i += 2) d.pen.hair([inset[i]!, inset[i + 1]!], 0.25, mix(BRINE.trim, '#ffffff', 0.45), 0.7);
  const tab = roundRect(mx - 1.6, -8.4, mx + 1.6, -4.4, 0.6);
  part(d, tab, BRINE.trim, { shadow: 0.4, line: 0.5, hatch: 0 });
  d.pen.dot(mx, -6.4, 0.85, BRINE.fitting, 1);
  d.pen.dot(mx - 0.25, -6.7, 0.3, '#ffffff', 0.9);
}

/**
 * The rebreather: the prospector's own, printed from halite and copper to
 * the Aster crew's drawing of the Tidesingers' trick. A chest canister,
 * the salt scrubber, in Brine's teal enamel with a window showing its pink
 * salt granules, capped and banded in copper; a counterlung each side; two
 * ringed hoses up to a copper mouthpiece valve.
 */
function rebreather(d: Draw): void {
  // The hoses first, behind the mouthpiece: from each counterlung's top up to the valve.
  hose(d, cub(pt(-12.6, -5.4), pt(-13.4, -12.6), pt(-9, -15.4), pt(-4.6, -14.4), 12), 2);
  hose(d, cub(pt(12.6, -5.4), pt(13.4, -12.6), pt(9, -15.4), pt(4.6, -14.4), 12), 2);
  counterlung(d, -1);
  counterlung(d, 1);
  // The elbows from the canister into each counterlung.
  for (const s of [-1, 1]) {
    part(d, roundRect(Math.min(s * 5.6, s * 8.4), -2.2, Math.max(s * 5.6, s * 8.4), 0.6, 0.5), COPPER, { shadow: 0.4, line: 0.5, gloss: true, hatch: 0 });
    part(d, roundRect(s * 8.4 - 0.9, -3, s * 8.4 + 0.9, 1.4, 0.4), mix(COPPER, SHADOW, 0.15), { shadow: 0.35, line: 0.45, gloss: true, hatch: 0 });
  }
  // The canister: teal enamel, its window onto the salt.
  const can = roundRect(-6.2, -7, 6.2, 12.4, 2.2);
  part(d, can, BRINE.shell, { shadow: 0.55, line: 0.8, gloss: true, hatch: 0.16 });
  const win = roundRect(-2.8, -3.4, 2.8, 8.2, 1.4);
  part(d, win, HALITE, { shadow: 0.3, line: 0.55, gloss: true, hatch: 0, alpha: 1 });
  d.pen.clipped(win, () => {
    // The granules: little pink-white cubes of salt, packed.
    for (let k = 0; k < 70; k++) {
      const x = -2.8 + d.pen.rng() * 5.6;
      const y = -2.6 + d.pen.rng() * 10.8;
      const r = 0.35 + d.pen.rng() * 0.35;
      const tone = ['#e8b6bf', '#fff6f3', '#d897a5', '#f6d6d6'][k % 4]!;
      const a = d.pen.rng() * 0.8;
      const cube = [0, 1, 2, 3].map((i) => pt(x + Math.cos(a + (i * Math.PI) / 2) * r, y + Math.sin(a + (i * Math.PI) / 2) * r));
      d.pen.fill(cube, tone, 0.95);
      if (k % 3 === 0) d.pen.hair([cube[1]!, cube[2]!, cube[3]!], 0.15, mix('#d897a5', SHADOW, 0.5), 0.7);
    }
    // Spent salt at the bottom goes greyer, as the scrubber works upwards.
    dab(d, roundRect(-3, 5.4, 3, 8.4, 0.6), '#9aa2a8', 0.32, 0.6);
    dab(d, roundRect(-3, -3.4, 3, -2.2, 0.4), PAPER_FILL, 0.4, 0.4);
    sheen(d, [pt(-1.8, -2.6), pt(-1.8, 7)], 0.6);
  });
  for (let k = 0; k < 4; k++) d.pen.hair([pt(3.2, -1.6 + k * 2.8), pt(4.2, -1.6 + k * 2.8)], 0.35, mix(COPPER, SHADOW, 0.35), 0.9);
  // Copper caps and a band, riveted, the guild's way.
  const top = roundRect(-6.8, -9, 6.8, -5.8, 1);
  part(d, top, COPPER, { shadow: 0.45, line: 0.6, gloss: true, hatch: 0 });
  const foot = roundRect(-6.8, 10.6, 6.8, 13.6, 1);
  part(d, foot, COPPER, { shadow: 0.45, line: 0.6, gloss: true, hatch: 0 });
  rivets(d, [pt(-5.2, -7.4), pt(5.2, -7.4), pt(-5.2, 12.1), pt(5.2, 12.1)], 0.45, mix(COPPER, '#ffffff', 0.25));
  seam(d, [pt(-6.2, 9.2), pt(6.2, 9.2)], 0.35);
  // The feed from the canister up to the valve.
  part(d, roundRect(-0.9, -12.6, 0.9, -8.8, 0.4), COPPER, { shadow: 0.4, line: 0.5, gloss: true, hatch: 0 });
  // The mouthpiece: a copper valve barrel, the rubber bite piece facing you, a pearl-tipped lever.
  const barrel = capsule(pt(-5, -14.4), pt(5, -14.4), 3.8, 3.8);
  part(d, barrel, COPPER, { shadow: 0.5, line: 0.7, gloss: true, hatch: 0 });
  for (const x of [-3.2, 3.2]) seam(d, [pt(x, -16.1), pt(x, -12.7)], 0.3);
  d.pen.stroke([pt(1.6, -16.2), pt(3.6, -18.6)], 0.8, mix(COPPER, SHADOW, 0.3), 1, false);
  d.pen.dot(3.8, -18.8, 0.75, BRINE.fitting, 1);
  const bite = oval(0, -12.4, 2.6, 1.7, 16);
  part(d, bite, '#2f3a3f', { shadow: 0.3, line: 0.55, gloss: true, hatch: 0, alpha: 1 });
  d.pen.fill(oval(0, -12.2, 1.4, 0.6, 12), '#14191c', 0.95);
  sheen(d, [pt(-4, -15.6), pt(3, -15.6)], 0.5);
  sheen(d, [pt(-4.8, -5), pt(-4.8, 10)], 0.8);
}

export function drawTech(d: Draw, t: Tech, variant: TechVariant): void {
  if (t.kind === 'gear') gear(d, t, typeof variant === 'number' ? variant : 0);
  else if (t.kind === 'tool') (t.id === 'pulse' ? drawPulseTool : t.id === 'rebreather' ? rebreather : receiver)(d);
  else if (t.kind === 'repair') system(d, t, variant === 'broken');
  else if (t.kind === 'starship') drawStarshipSystem(d, t.id, variant === 'broken');
  else if (t.key === 'cargo') cargo(d);
  else if (t.key === 'winch') winch(d);
  else if (t.key === 'stores') supplyTanks(d);
  else refit(d);
}
