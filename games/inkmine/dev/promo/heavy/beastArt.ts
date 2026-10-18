import { capsule, cub, oval, pt, type Draw } from '../../../src/art/kit';
import { dab, gleam, mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { Finish } from '../../../src/art/textures';
import { curveAt } from '../short';
import { bakeSprite, type Sprite } from '../sprites';
import { LEG_LEN } from './story';

/**
 * The heavy-world deer: what a deer might become under three times our
 * gravity. Short and wide, a bison's hump of muscle over the shoulders to
 * carry its head, its weight spread over six thick column legs with broad
 * padded feet, its back roofed with overlapping armour bands like an
 * armadillo's, and a heavy low head with a deer's ears, muzzle and a pair of
 * short, thick antlers so it still reads as a deer. Drawn facing right, its
 * ground point at the middle under its body (y = 0). The body and each leg
 * are baked separately so the legs can move (they hang from under it).
 */
export const BEAST_BODY = { w: 300, h: 190, ox: 146, oy: 176 } as const;
const LEG_ART = { w: 54, h: 80, ox: 27, oy: 16 } as const;

const SKIN = '#544a42';
const SKIN_LIT = '#8a7866';
const BELLY = '#988468';
const PLATE = '#7c4f2b';
const PLATE_EDGE = '#f1c987';
const HORN = '#e4d2a6';
const NOSE = '#2e2729';
const FINISH: Finish = { line: 0.9, rim: 0.75 };

/** The line of its back, rump to neck: low behind, the hump high over the shoulders. */
const BACK = [
  { t: -122, at: -88 }, { t: -90, at: -112 }, { t: -40, at: -124 }, { t: 14, at: -142 }, { t: 52, at: -140 }, { t: 82, at: -118 }, { t: 98, at: -96 },
];
export const backAt = (x: number): number => curveAt(BACK, x).at;

function torso(d: Draw): Pt[] {
  const top: Pt[] = [];
  for (let x = -122; x <= 98; x += 5) top.push(pt(x, backAt(x)));
  const shape = [
    pt(-104, -36),
    ...cub(pt(-104, -36), pt(-124, -46), pt(-130, -70), pt(-122, -88), 6),
    ...top,
    ...cub(pt(98, -96), pt(106, -80), pt(104, -56), pt(86, -36), 8),
    ...cub(pt(86, -36), pt(50, -26), pt(-60, -26), pt(-104, -36), 10),
  ];
  paint(d, shape, SKIN, { alpha: 1, shadow: 0.75, hatch: 0.26, cross: true, line: 0.9 });
  // The underside in its own shadow, the hide mottled and folded in wrinkles.
  const belly = [pt(-96, -40), ...cub(pt(-96, -40), pt(-40, -50), pt(40, -52), pt(84, -42), 8), ...cub(pt(84, -42), pt(50, -26), pt(-50, -26), pt(-96, -40), 8)];
  d.pen.clipped(shape, () => dab(d, belly, mix(BELLY, SHADOW, 0.55), 0.55, 2.5));
  d.pen.stipple(shape, 320, (_, y) => Math.max(0, (y + 20) / 70), 0.75, mix(SKIN, SHADOW, 0.55));
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 11; k++) {
      const x = -96 + k * 18 + row * 6;
      const y = -46 - row * 12;
      d.pen.hair([pt(x, y + 6), pt(x + 3, y), pt(x + 1, y - 7)], 0.55, mix(SKIN, SHADOW, 0.65), 0.65);
    }
  }
  return shape;
}

/** One armour band over the back from `x0` to `x1`, overlapping the next like an armadillo's, its rim lit, a knob on its crest. */
function band(d: Draw, x0: number, x1: number, low: number): void {
  const lip = 4;
  const y0 = backAt(x0) - lip;
  const y1 = backAt(x1) - lip;
  const crest = backAt((x0 + x1) / 2) - lip - 4;
  const shape = [
    pt(x0, low),
    ...cub(pt(x0, low), pt(x0 - 3, low - 24), pt(x0 - 2, y0 + 10), pt(x0, y0), 6),
    ...cub(pt(x0, y0), pt(x0 + (x1 - x0) * 0.3, crest), pt(x0 + (x1 - x0) * 0.7, crest), pt(x1 + 1, y1), 6),
    ...cub(pt(x1 + 1, y1), pt(x1 + 3, y1 + 14), pt(x1 + 2, low - 18), pt(x1, low + 1), 6),
    ...cub(pt(x1, low + 1), pt(x1 - (x1 - x0) * 0.3, low + 6), pt(x0 + (x1 - x0) * 0.3, low + 6), pt(x0, low), 6),
  ];
  paint(d, shape, PLATE, { alpha: 1, shadow: 0.7, hatch: 0.24, line: 0.85 });
  d.pen.stipple(shape, 50, () => 0.7, 0.6, mix(PLATE, SHADOW, 0.45));
  // Its overlapping rim, lit: the edge it laps over the next band with.
  d.pen.stroke([pt(x1 - 2, low - 3), pt(x1 - 0.5, (low + y1) / 2), pt(x1 - 1, y1 + 2)], 1.6, PLATE_EDGE, 0.85, false);
  // Growth lines across it, and a knob on its crest.
  for (let k = 1; k <= 3; k++) {
    const y = low - k * ((low - crest) / 4);
    d.pen.hair([pt(x0 + 3, y + 2), pt((x0 + x1) / 2, y), pt(x1 - 3, y + 2)], 0.5, mix(PLATE, SHADOW, 0.55), 0.6);
  }
  const mid = (x0 + x1) / 2;
  paint(d, oval(mid, crest - 1, 5, 3.6, 12), mix(PLATE, PLATE_EDGE, 0.5), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6 });
}

/** A domed shield of armour (over the hump, over the rump): a mosaic of small scutes like a glyptodont's, its lower rim lit. */
function shield(d: Draw, x0: number, x1: number, low: number): void {
  const lip = 5;
  const top: Pt[] = [];
  for (let x = x0 + 4; x <= x1 - 4; x += 4) top.push(pt(x, backAt(x) - lip));
  const shape = [
    pt(x0 + 6, low),
    ...cub(pt(x0 + 6, low), pt(x0 - 4, low - 10), pt(x0 - 2, backAt(x0) + 6), pt(x0 + 4, backAt(x0 + 4) - lip), 6),
    ...top,
    ...cub(pt(x1 - 4, backAt(x1 - 4) - lip), pt(x1 + 4, backAt(x1) + 8), pt(x1 + 4, low - 10), pt(x1 - 6, low), 6),
    ...cub(pt(x1 - 6, low), pt(x1 - (x1 - x0) * 0.3, low + 7), pt(x0 + (x1 - x0) * 0.3, low + 7), pt(x0 + 6, low), 8),
  ];
  paint(d, shape, PLATE, { alpha: 1, shadow: 0.75, hatch: 0.26, line: 0.9 });
  d.pen.clipped(shape, () => {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 12; col++) {
        const cx = x0 + 4 + col * 9 + (row % 2) * 4.5;
        const cy = low - 4 - row * 8.5;
        if (cx > x1 || cy < backAt(cx) - lip - 6) continue;
        const cell = Array.from({ length: 6 }, (_, k) => pt(cx + Math.cos((k / 6) * Math.PI * 2 + 0.5) * 4.6, cy + Math.sin((k / 6) * Math.PI * 2 + 0.5) * 4));
        d.pen.hair([...cell, cell[0]!], 0.55, mix(PLATE, SHADOW, 0.6), 0.75);
        d.pen.dot(cx - 0.8, cy - 1, 1.3, mix(PLATE, PLATE_EDGE, 0.55), 0.5);
      }
    }
  });
  d.pen.stroke(cub(pt(x0 + 8, low - 1), pt(x0 + (x1 - x0) * 0.3, low + 5), pt(x0 + (x1 - x0) * 0.7, low + 5), pt(x1 - 8, low - 1), 8), 1.6, PLATE_EDGE, 0.8, false);
}

/** The rump shield, four overlapping bands across the middle (where it bends), and the great shield over the hump. */
function armour(d: Draw): void {
  shield(d, -124, -58, -78);
  const edges = [-62, -42, -22, -2, 18];
  edges.slice(0, -1).forEach((x, i) => band(d, x, edges[i + 1]! + 4, -86 + i * 0.5));
  shield(d, 14, 96, -82);
}

function antler(d: Draw, base: Pt, lean: number, far: boolean): void {
  const c = far ? mix(HORN, SHADOW, 0.35) : HORN;
  const o = { alpha: 1, shadow: 0.5, hatch: 0, line: 0.75 } as const;
  // A short, thick rack: the beam sweeping back and up, a brow tine forward, two tines off its top.
  const mid = pt(base.x - 6 + lean * 0.5, base.y - 18);
  const beam = pt(base.x - 14 + lean, base.y - 34);
  paint(d, capsule(base, mid, 8, 6.4), c, o);
  paint(d, capsule(mid, beam, 6.4, 4.4), c, o);
  paint(d, capsule(pt(base.x - 1, base.y - 8), pt(base.x + 12 + lean, base.y - 18), 5, 3), c, o);
  paint(d, capsule(mid, pt(mid.x + 10, mid.y - 14), 4.6, 2.8), c, o);
  paint(d, capsule(beam, pt(beam.x - 10, beam.y - 4), 4.2, 2.6), c, o);
  paint(d, capsule(beam, pt(beam.x + 3, beam.y - 11), 4.2, 2.6), c, o);
  paint(d, oval(base.x, base.y + 1, 6, 3.2, 12), mix(c, SHADOW, 0.3), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.6 });
}

function head(d: Draw): void {
  antler(d, pt(112, -98), 2, true);
  const skull = [
    pt(84, -100),
    ...cub(pt(84, -100), pt(96, -112), pt(122, -106), pt(134, -88), 8),
    ...cub(pt(134, -88), pt(142, -76), pt(154, -64), pt(152, -52), 6),
    ...cub(pt(152, -52), pt(150, -40), pt(132, -36), pt(118, -38), 6),
    ...cub(pt(118, -38), pt(100, -38), pt(84, -50), pt(78, -66), 6),
  ];
  paint(d, skull, mix(SKIN, SKIN_LIT, 0.35), { alpha: 1, shadow: 0.65, hatch: 0.24, line: 0.9 });
  // A horny brow plate, the jowl, the dark wet nose, the mouth, the eye under its heavy brow.
  const brow = [pt(100, -104), ...cub(pt(100, -104), pt(114, -110), pt(130, -100), pt(134, -88), 6), ...cub(pt(134, -88), pt(122, -92), pt(110, -94), pt(100, -104), 6)];
  paint(d, brow, mix(PLATE, PLATE_EDGE, 0.35), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.7 });
  d.pen.hair([pt(98, -44), pt(108, -56), pt(122, -58)], 0.6, mix(SKIN, SHADOW, 0.6), 0.6);
  paint(d, oval(149, -57, 5.5, 6.5, 14), NOSE, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.55, gloss: true });
  d.pen.dot(147.5, -59.5, 1, PAPER_FILL, 0.8);
  d.pen.stroke([pt(150, -44), pt(140, -42), pt(126, -44)], 0.8, d.ink, 0.85, false);
  d.pen.dot(124, -84, 3, d.ink);
  d.pen.dot(125, -85.2, 0.9, PAPER_FILL);
  d.pen.stroke([pt(116, -90), pt(124, -92), pt(132, -88)], 1.5, d.ink, 0.9, false);
  const ear = [pt(100, -100), ...cub(pt(100, -100), pt(90, -116), pt(76, -120), pt(70, -114), 6), ...cub(pt(70, -114), pt(78, -104), pt(90, -96), pt(100, -94), 6)];
  paint(d, ear, mix(SKIN, '#c7a68c', 0.45), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.75 });
  antler(d, pt(118, -100), 4, false);
  gleam(d, [pt(98, -106), pt(110, -109), pt(122, -105)], 0.9, 0.55);
}

function tail(d: Draw): void {
  paint(d, capsule(pt(-116, -86), pt(-134, -66), 10, 6.5), SKIN, { alpha: 1, shadow: 0.55, hatch: 0.15, line: 0.8 });
}

/** The body sits up on its legs: drawn this much above where its shapes were laid out. */
const LIFT = 14;
function drawBody(d: Draw): void {
  d.pen.ctx.translate(0, -LIFT);
  tail(d);
  torso(d);
  armour(d);
  head(d);
}

/** A column leg from the hip (y = 0) to the sole (y = LEG_LEN): thick, waisted at the ankle, a broad padded foot with toenails. */
function drawLeg(d: Draw, far: boolean): void {
  const c = far ? mix(SKIN, SHADOW, 0.4) : SKIN;
  const L = LEG_LEN;
  const shape = [
    pt(-19, -10),
    ...cub(pt(-19, -10), pt(-19, 14), pt(-13, L - 22), pt(-14, L - 10), 8),
    ...cub(pt(-14, L - 10), pt(-21, L - 4), pt(-21, L + 0.5), pt(-13, L + 0.5), 6),
    pt(15, L + 0.5),
    ...cub(pt(15, L + 0.5), pt(22, L + 0.5), pt(21, L - 5), pt(14, L - 10), 6),
    ...cub(pt(14, L - 10), pt(13, L - 22), pt(19, 14), pt(19, -10), 8),
    ...cub(pt(19, -10), pt(10, -16), pt(-10, -16), pt(-19, -10), 6),
  ];
  paint(d, shape, c, { alpha: 1, shadow: 0.75, hatch: 0.26, cross: true, line: 0.85 });
  d.pen.stipple(shape, 70, () => 0.6, 0.6, mix(c, SHADOW, 0.5));
  for (let k = 0; k < 5; k++) d.pen.hair([pt(-13, 12 + k * 7), pt(0, 14.5 + k * 7), pt(13, 12 + k * 7)], 0.5, mix(c, SHADOW, 0.65), 0.6);
  for (const x of [-10, 0, 10]) paint(d, oval(x + 2, L - 2.5, 4, 2.8, 12), far ? mix(HORN, SHADOW, 0.4) : HORN, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.55 });
}

export interface BeastSprites {
  readonly body: Sprite;
  readonly near: Sprite;
  readonly far: Sprite;
}
/** Baked at `res` canvas px per unit. */
export function makeBeast(res: number): BeastSprites {
  return {
    body: bakeSprite(BEAST_BODY, res, 6100, drawBody, FINISH),
    near: bakeSprite(LEG_ART, res, 6200, (d) => drawLeg(d, false), FINISH),
    far: bakeSprite(LEG_ART, res, 6300, (d) => drawLeg(d, true), FINISH),
  };
}
