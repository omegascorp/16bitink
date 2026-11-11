import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { drawHeadOn, type Lay } from '../cobra/lay';
import { lengths, spineOf } from '../pythonbear/python';
import { lerp, ramp } from '../short';
import { drawSprite, type Placement, type Pt, type Sprite } from '../sprites';
import { BURM_SNOUT } from './burmeseHead';
import type { Cast } from './cast';
import { bodyShare, drawSnake, lumpShare } from './lay';
import { sawgrass } from './swamp';
import { gapeAt, jumpBack, lengthLabel, liftAt, lumpPulse, peer, startle, throwUp } from './story';

/**
 * The biologists. "…spotted a huge lump in its belly…": the two crouched in
 * the sawgrass either side, leaning in and pointing at the python laid out
 * on the bank in front, a huge bulge mid-body (11 ft / 3.4 m along it).
 * "so they picked it up… and it threw the whole deer back UP!": the two
 * standing, the python held between them at the waist, the bulge sagging;
 * on "threw" its jaws gape, the fawn slides out head first and drops onto
 * the grass, the bulge goes, and the two jump back with a "!" each.
 */

/** A person, facing right, or mirrored to face left. */
function person(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, at: Placement, left: boolean): void {
  if (!left) return drawSprite(ctx, sprite, boil, at);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(-1, 1);
  drawSprite(ctx, sprite, boil, { ...at, x: 0, y: 0 });
  ctx.restore();
}

function lay(knots: readonly Pt[], base: number, lump: number, at: number, len: number, headRight: boolean): Lay {
  const spine = spineOf(knots, 3);
  const s = lengths(spine);
  const total = s[s.length - 1]!;
  return { spine, widths: s.map((d) => base * (bodyShare(d / total) + lumpShare(d / total, at, len, lump))), base, headRight };
}

// ---------------------------------------------------------------- spotted

const SPOT_KNOTS: readonly Pt[] = [{ x: 96, y: 1452 }, { x: 260, y: 1420 }, { x: 520, y: 1440 }, { x: 760, y: 1470 }, { x: 930, y: 1440 }, { x: 1040, y: 1400 }];

function tape(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#fbf6ec';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(80, 1600);
  ctx.lineTo(1040, 1600);
  for (const x of [80, 1040]) {
    ctx.moveTo(x, 1578);
    ctx.lineTo(x, 1622);
  }
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, '11 ft', 470, 1690, 96, 700, a, PAPER_ON_DARK);
  drawTextLine(ctx, '3.4 m', 680, 1690, 62, 700, a, PAPER_ON_DARK);
}

export function drawSpot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const p = peer(t);
  const pulse = lumpPulse(t);
  ctx.drawImage(cast.spotBg, 0, 0);
  const lean = 0.08 + 0.2 * p;
  person(ctx, cast.ana.peer, boil, { x: 230, y: 1190 + 30 * p, scale: 1.2, rotation: lean }, false);
  person(ctx, cast.ben.peer, boil, { x: 850, y: 1190 + 30 * p, scale: 1.2, rotation: lean }, true);
  for (let x = -30; x < 1120; x += 60) sawgrass(ctx, x, 1290, 170, 70, 10, 300 + x, 0.15);
  const l = lay(SPOT_KNOTS, 62, 3.4 + 0.25 * pulse, 0.46, 0.3, false);
  drawSnake(ctx, cast.burm, boil, l, 0.8);
  drawHeadOn(ctx, cast.head.shut, boil, l, -0.05);
  for (let x = -20; x < 1120; x += 110) sawgrass(ctx, x, 1560, 70, 60, 5, 500 + x, 0.35);
  tape(ctx, lengthLabel(t));
}

// ---------------------------------------------------------------- picked up

const PEOPLE = { ana: 390, ben: 830, belt: 1262, k: 1.75 } as const;
const HELD: readonly Pt[] = [{ x: 236, y: 1222 }, { x: 350, y: 1252 }, { x: 490, y: 1270 }, { x: 610, y: 1336 }, { x: 710, y: 1272 }, { x: 850, y: 1266 }, { x: 950, y: 1320 }, { x: 990, y: 1440 }, { x: 1000, y: 1560 }];
const GROUND: readonly Pt[] = [{ x: 200, y: 1590 }, { x: 330, y: 1600 }, { x: 470, y: 1610 }, { x: 610, y: 1620 }, { x: 730, y: 1612 }, { x: 860, y: 1606 }, { x: 960, y: 1610 }, { x: 1030, y: 1600 }, { x: 1100, y: 1590 }];
const FAWN_K = 0.85;
const FAWN_LAND: Pt = { x: 250, y: 1615 };
/** How far the held head droops when it gapes (radians). */
const DROOP = 1.35;

function exclaim(ctx: CanvasRenderingContext2D, x: number, y: number, a: number): void {
  if (a <= 0) return;
  drawTextLine(ctx, '!', x, y, 150 * (0.8 + 0.2 * Math.min(1, a * 1.5)), 700, Math.min(1, a * 2), { fill: '#ff6a4a', halo: '#0b1a2a' });
}

/** The fawn coming out: sliding out of the mouth along the head's line, then dropping onto the grass. */
function drawThrown(ctx: CanvasRenderingContext2D, cast: Cast, boil: number, l: Lay, k: number): void {
  if (k <= 0) return;
  const a = l.spine[0]!;
  const b = l.spine[3]!;
  const fwd = Math.atan2(a.y - b.y, a.x - b.x) - DROOP;
  const dir = { x: Math.cos(fwd), y: Math.sin(fwd) };
  const sc = l.widths[0]! / 24;
  const mouth = { x: a.x + dir.x * BURM_SNOUT.x * sc * 0.8, y: a.y + dir.y * BURM_SNOUT.x * sc * 0.8 };
  const half = 200 * FAWN_K;
  if (k < 0.5) {
    const u = k / 0.5;
    const c = { x: mouth.x + dir.x * lerp(-half, half * 0.9, u), y: mouth.y + dir.y * lerp(-half, half * 0.9, u) };
    ctx.save();
    ctx.beginPath();
    const n = { x: -dir.y, y: dir.x };
    ctx.moveTo(mouth.x + n.x * 600, mouth.y + n.y * 600);
    ctx.lineTo(mouth.x + n.x * 600 + dir.x * 900, mouth.y + n.y * 600 + dir.y * 900);
    ctx.lineTo(mouth.x - n.x * 600 + dir.x * 900, mouth.y - n.y * 600 + dir.y * 900);
    ctx.lineTo(mouth.x - n.x * 600, mouth.y - n.y * 600);
    ctx.closePath();
    ctx.clip();
    drawSprite(ctx, cast.fawn, boil, { x: c.x, y: c.y, scale: FAWN_K, rotation: fwd - Math.PI });
    ctx.restore();
    return;
  }
  const u = ramp(k, 0.5, 1);
  const from = { x: mouth.x + dir.x * half * 0.9, y: mouth.y + dir.y * half * 0.9 };
  const fall = u * u;
  drawSprite(ctx, cast.fawn, boil, { x: lerp(from.x, FAWN_LAND.x, u), y: lerp(from.y, FAWN_LAND.y, fall), scale: FAWN_K, rotation: lerp(fwd - Math.PI, 0, u) });
}

export function drawLift(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const lift = liftAt(t);
  const gape = gapeAt(t);
  const out = throwUp(t);
  const jump = jumpBack(t);
  const shock = startle(t) > 0.5;
  ctx.drawImage(cast.liftBg, 0, 0);
  for (let x = -30; x < 1120; x += 70) sawgrass(ctx, x, 1330, 200, 80, 9, 700 + x, 0.2);
  const dip = (1 - lift) * 150;
  const lean = (1 - lift) * 0.32;
  const ana: Placement = { x: PEOPLE.ana - 34 * jump, y: PEOPLE.belt + dip - 46 * jump, scale: PEOPLE.k, rotation: lean - 0.14 * jump };
  const ben: Placement = { x: PEOPLE.ben + 34 * jump, y: PEOPLE.belt + dip - 46 * jump, scale: PEOPLE.k, rotation: lean - 0.14 * jump };
  const pose = shock ? 'startle' : 'hold';
  person(ctx, cast.ana[pose], boil, ana, false);
  person(ctx, cast.ben[pose], boil, ben, true);
  const knots = HELD.map((h, i) => ({ x: lerp(GROUND[i]!.x, h.x, lift), y: lerp(GROUND[i]!.y, h.y, lift) + (i > 0 && i < 8 ? -46 * jump * lift : 0) }));
  const lump = 1 + 1.65 * (1 - ramp(out, 0.05, 0.5));
  const l = lay(knots, 56, lump, 0.42, 0.3, false);
  drawThrown(ctx, cast, boil, l, out);
  drawSnake(ctx, cast.burm, boil, l, 0.5 * (1 - lift));
  drawHeadOn(ctx, gape > 0.3 ? cast.head.gape : cast.head.shut, boil, l, -DROOP * gape, 1 + 0.15 * gape);
  person(ctx, cast.ana.hands, boil, ana, false);
  person(ctx, cast.ben.hands, boil, ben, true);
  for (let x = -20; x < 1120; x += 90) sawgrass(ctx, x, 1760, 150, 70, 7, 900 + x, 0.35);
  const a = startle(t);
  exclaim(ctx, ana.x + 10, ana.y - 210 * PEOPLE.k, a);
  exclaim(ctx, ben.x - 10, ben.y - 210 * PEOPLE.k, a);
}
