import { beadEye, glaze } from '../../../src/art/critters/preyKit';
import { cub, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { BEAR, claw, paintFur } from './bearKit';

/**
 * The sun bear standing up on its hind legs, turned three-quarters to us and
 * facing +x, the way sun bears rear up to look round: the short glossy black
 * coat, the small round ear, the short pale muzzle with its black nose, the
 * cream-to-gold U crescent on its chest, long pale claws, and the radio
 * collar round its neck (an orange belt, a grey transmitter at the throat, a
 * short whip antenna). Art units: feet at y ≈ +140, ear top at y ≈ -128.
 */

/** Where the transmitter sits on the collar, art units (the waves start here). */
export const COLLAR_BOX: Pt = pt(50, -42);

const TORSO: readonly Pt[] = [
  ...cub(pt(-36, -58), pt(-62, -40), pt(-70, 30), pt(-56, 96), 14),
  ...cub(pt(-56, 96), pt(-48, 122), pt(20, 126), pt(44, 100), 12).slice(1),
  ...cub(pt(44, 100), pt(64, 70), pt(66, 10), pt(58, -24), 12).slice(1),
  ...cub(pt(58, -24), pt(54, -46), pt(40, -60), pt(22, -64), 10).slice(1),
  ...cub(pt(22, -64), pt(4, -70), pt(-20, -68), pt(-36, -58), 8).slice(1),
];

const HEAD: readonly Pt[] = [
  ...cub(pt(-22, -76), pt(-28, -104), pt(-6, -130), pt(22, -128), 14),
  ...cub(pt(22, -128), pt(46, -126), pt(58, -110), pt(62, -98), 10).slice(1),
  ...cub(pt(62, -98), pt(64, -80), pt(54, -60), pt(30, -56), 10).slice(1),
  ...cub(pt(30, -56), pt(8, -54), pt(-16, -60), pt(-22, -76), 10).slice(1),
];

const MUZZLE: readonly Pt[] = [
  ...cub(pt(46, -104), pt(62, -108), pt(80, -102), pt(88, -92), 10),
  ...cub(pt(88, -92), pt(92, -84), pt(88, -74), pt(78, -71), 8).slice(1),
  ...cub(pt(78, -71), pt(66, -66), pt(50, -66), pt(42, -74), 8).slice(1),
  ...cub(pt(42, -74), pt(38, -86), pt(38, -100), pt(46, -104), 8).slice(1),
];

const LEG_NEAR: readonly Pt[] = [
  ...cub(pt(-34, 70), pt(-44, 100), pt(-40, 126), pt(-34, 136), 10),
  ...cub(pt(-34, 136), pt(-20, 144), pt(14, 146), pt(26, 138), 8).slice(1),
  ...cub(pt(26, 138), pt(30, 128), pt(14, 126), pt(10, 118), 6).slice(1),
  ...cub(pt(10, 118), pt(14, 96), pt(10, 76), pt(-34, 70), 8).slice(1),
];

const LEG_FAR: readonly Pt[] = LEG_NEAR.map((p) => pt(p.x + 34, p.y - 4));

const ARM = (dx: number, dy: number): Pt[] => [
  ...cub(pt(4 + dx, -40 + dy), pt(28 + dx, -36 + dy), pt(52 + dx, 10 + dy), pt(68 + dx, 46 + dy), 12),
  ...cub(pt(68 + dx, 46 + dy), pt(74 + dx, 58 + dy), pt(62 + dx, 66 + dy), pt(52 + dx, 60 + dy), 6).slice(1),
  ...cub(pt(52 + dx, 60 + dy), pt(40 + dx, 30 + dy), pt(20 + dx, 4 + dy), pt(-6 + dx, -6 + dy), 12).slice(1),
];

function paws(d: Draw, at: Pt, n = 5): void {
  for (let i = 0; i < n; i++) claw(d, pt(at.x - 8 + i * 4, at.y + i * 1.2), Math.PI / 2 - 0.5 + i * 0.12, 15);
}

/** The U crescent on the chest: cream at the bottom of the U, deepening to gold up its arms. */
function crescent(d: Draw): void {
  const { pen } = d;
  const u = cub(pt(6, -50), pt(10, 14), pt(62, 14), pt(60, -40), 20);
  const band = ribbon(u, (k) => 11 + 9 * Math.sin(k * Math.PI)).shape;
  pen.fill(band, BEAR.crescent, 0.97);
  pen.clipped(band, () => {
    glaze(d, 34, 0, 26, 10, 0, '#fbe6b2', 0.7);
    glaze(d, 8, -40, 8, 16, 0, BEAR.crescentDeep, 0.8);
    glaze(d, 60, -34, 8, 16, 0, BEAR.crescentDeep, 0.8);
  });
  pen.hair([...band, band[0]!], 0.6, BEAR.line, 0.5);
}

function collar(d: Draw): void {
  const { pen } = d;
  const belt = ribbon(cub(pt(-30, -66), pt(-6, -50), pt(26, -42), pt(56, -50), 16), () => 9).shape;
  pen.fill(belt, '#c97a32', 1);
  pen.clipped(belt, () => glaze(d, 10, -52, 30, 4, 0.2, '#f0b060', 0.6));
  pen.stroke([...belt, belt[0]!], 0.9, BEAR.line, 1, false);
  const box = [pt(40, -52), pt(60, -50), pt(60, -32), pt(40, -34)];
  pen.fill(box, '#8f9494', 1);
  pen.clipped(box, () => glaze(d, 46, -48, 9, 5, 0, '#d8dddd', 0.7));
  pen.stroke([...box, box[0]!], 0.9, BEAR.line, 1, false);
  pen.stroke(cub(pt(58, -36), pt(68, -26), pt(74, -10), pt(76, 6), 10), 1.2, '#2a2a2a', 1, false);
}

function face(d: Draw): void {
  const { pen } = d;
  pen.fill(MUZZLE, BEAR.muzzle, 1);
  pen.clipped(MUZZLE, () => {
    glaze(d, 64, -94, 18, 8, 0, '#ecd2ae', 0.8);
    glaze(d, 58, -72, 20, 6, 0, BEAR.muzzleDeep, 0.7);
    glaze(d, 44, -88, 6, 14, 0, BEAR.coal, 0.5);
  });
  pen.stroke([...MUZZLE, MUZZLE[0]!], 0.9, BEAR.line, 0.9, false);
  const nose = oval(86, -88, 6.5, 5, 16);
  pen.fill(nose, BEAR.nose, 1);
  pen.dot(84, -90, 1.6, '#9aa0aa', 0.8);
  pen.hair(cub(pt(84, -78), pt(76, -73), pt(64, -72), pt(54, -74), 8), 0.8, BEAR.line, 0.9);
  beadEye(d, pt(40, -98), 4.4);
  // The worried brow lines sun bears have, and the ear.
  for (const dy of [0, 5]) pen.hair(cub(pt(18, -114 + dy), pt(24, -118 + dy), pt(32, -118 + dy), pt(38, -112 + dy), 6), 0.5, BEAR.sheen, 0.6);
  const ear = oval(-2, -118, 12, 11, 16);
  paintFur(d, ear, { lights: [[-5, -122, 8, 6, 0]], dir: () => -Math.PI / 2, hairs: 80, len: 3, seed: 7410, line: 1.1 });
  pen.fill(oval(0, -116, 6, 5.5, 12), BEAR.brown, 0.8);
}

function drawBear(d: Draw): void {
  const { pen } = d;
  paintFur(d, LEG_FAR, { lights: [[0, 110, 14, 20, 0]], dir: () => Math.PI / 2, hairs: 300, len: 4, seed: 7401, line: 1.2 });
  pen.fill(LEG_FAR, BEAR.line, 0.3);
  paintFur(d, ARM(-14, 22), { lights: [[30, 0, 14, 30, -0.6]], dir: () => Math.PI / 2 - 0.4, hairs: 300, len: 4, seed: 7402, line: 1.2 });
  pen.fill(ARM(-14, 22), BEAR.line, 0.3);
  paws(d, pt(56, 84));
  paintFur(d, TORSO, {
    lights: [[-30, -20, 30, 60, 0.1], [20, -40, 40, 18, 0], [10, 90, 50, 18, 0]],
    dir: (p) => Math.PI / 2 + 0.08 * Math.sign(-p.x), hairs: 2600, len: 4.5, seed: 7403,
  });
  pen.clipped(TORSO, () => glaze(d, 40, 60, 30, 50, 0, BEAR.line, 0.5));
  crescent(d);
  paintFur(d, LEG_NEAR, { lights: [[-20, 100, 14, 24, 0]], dir: () => Math.PI / 2, hairs: 360, len: 4, seed: 7404, line: 1.3 });
  paws(d, pt(18, 138), 4);
  paintFur(d, HEAD, { lights: [[10, -110, 34, 18, -0.2], [-10, -80, 12, 18, 0]], dir: (p) => Math.atan2(p.y + 90, p.x - 20) * 0.2 + Math.PI, hairs: 1200, len: 3.8, seed: 7405 });
  face(d);
  collar(d);
  paintFur(d, ARM(4, 20), { lights: [[24, -10, 16, 34, -0.6]], dir: () => Math.PI / 2 - 0.5, hairs: 420, len: 4, seed: 7406, line: 1.3 });
  paws(d, pt(74, 82));
}

export const BEAR_STAND: SpriteArt<'stand'> = { frame: 320, res: 4, poses: ['stand'], draw: drawBear };
