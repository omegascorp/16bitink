import { glaze } from '../../../src/art/critters/preyKit';
import { capsule, closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The two field biologists, side on, facing +x: bush hats, long-sleeved
 * field shirts, trousers, boots. Ana has an auburn ponytail and an olive
 * shirt; Ben a short dark beard and a khaki shirt. The faces are people's:
 * brow, nose, lips, chin, an eye with its white, iris and lid, an eyebrow,
 * an ear. Poses: 'peer' (leaning in, the near hand pointing), 'hold' (both
 * hands forward at the waist, holding the snake), 'startle' (the same hold,
 * eyes wide, brows up, mouth open) and 'hands' (only the near forearm and
 * hand, drawn over the snake so it is gripped). Art units: boots at y ≈
 * +192, hat top at y ≈ −196; the hands at HANDS.
 */
export type PersonPose = 'peer' | 'hold' | 'startle' | 'hands';
export type Look = 'ana' | 'ben';

interface Palette {
  readonly skin: string;
  readonly skinDeep: string;
  readonly hair: string;
  readonly shirt: string;
  readonly shirtDeep: string;
  readonly hat: string;
  readonly hatDeep: string;
  readonly trousers: string;
  readonly trousersDeep: string;
}

const LOOKS: Readonly<Record<Look, Palette>> = {
  ana: { skin: '#e2ab86', skinDeep: '#b0704e', hair: '#7a3a1e', shirt: '#7f8a5a', shirtDeep: '#525a38', hat: '#b8a678', hatDeep: '#7a6a48', trousers: '#a89a74', trousersDeep: '#6e6448' },
  ben: { skin: '#b97a56', skinDeep: '#7e4c32', hair: '#2a1e16', shirt: '#bba676', shirtDeep: '#7f6c46', hat: '#8f7d56', hatDeep: '#5a4c32', trousers: '#5d5c44', trousersDeep: '#3a392a' },
};
const LINE = '#1c1712';
const BAND = '#4a3a26';
const BOOT = '#3b2a1e';

/** Where the hands grip in 'hold' (near, far), art units. */
export const HANDS = { near: pt(70, -2), far: pt(40, 2) } as const;

function wash(d: Draw, shape: readonly Pt[], colour: string, deep: string, light: Pt, w = 1.3): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, colour, 0.97);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  pen.clipped(shape, () => {
    glaze(d, light.x, light.y, rx * 0.8, ry * 0.6, 0, PAPER_FILL, 0.3);
    pen.crescent(shape, pt(-rx * 0.25, -ry * 0.18), () => pen.fill(shape, deep, 0.5));
    glaze(d, cx + rx * 0.5, cy + ry * 0.5, rx * 0.6, ry * 0.5, 0, deep, 0.25);
  });
  pen.stroke(closed(shape), w, LINE, 0.95, false);
}

const FACE: readonly Pt[] = [
  pt(-22, -164), pt(0, -172), pt(20, -164), pt(27, -150), pt(28, -144), pt(27, -140), pt(36, -128), pt(34, -125), pt(29, -125),
  pt(31, -121), pt(28, -118), pt(30, -114), pt(27, -105), pt(14, -99), pt(-2, -106), pt(-14, -112), pt(-24, -130),
];

function face(d: Draw, p: Palette, look: Look, pose: PersonPose): void {
  const { pen } = d;
  const wide = pose === 'startle';
  wash(d, [pt(-8, -112), pt(12, -102), pt(14, -86), pt(-12, -86)], p.skin, p.skinDeep, pt(4, -100), 1.1);
  if (look === 'ana') {
    // The ponytail out from under the hat at the back.
    const tail = [...cub(pt(-18, -160), pt(-34, -152), pt(-40, -128), pt(-34, -100), 10), ...cub(pt(-34, -100), pt(-28, -112), pt(-22, -132), pt(-14, -146), 10).slice(1)];
    wash(d, tail, p.hair, '#3e1a0c', pt(-30, -140), 1.1);
    d.pen.hair(cub(pt(-22, -154), pt(-32, -140), pt(-34, -122), pt(-32, -106), 8), 0.6, '#b0603a', 0.7);
  }
  wash(d, FACE, p.skin, p.skinDeep, pt(22, -140), 1.3);
  pen.clipped(FACE, () => {
    glaze(d, 22, -126, 8, 6, 0, '#e0857a', look === 'ana' ? 0.45 : 0.3);
    glaze(d, 18, -112, 12, 7, 0, '#6a4a3a', 0.25);
  });
  pen.fill([pt(-24, -164), pt(-6, -162), pt(-10, -146), pt(-22, -128), pt(-26, -146)], p.hair, 0.95);
  wash(d, oval(-6, -138, 6, 9, 14), p.skin, p.skinDeep, pt(-7, -141), 0.9);
  pen.hair(cub(pt(-6, -144), pt(-3, -140), pt(-4, -135), pt(-7, -132), 6), 0.6, p.skinDeep, 0.9);
  if (look === 'ben') {
    // A short beard along the jaw and chin.
    const beard = [pt(-14, -124), pt(0, -120), pt(14, -116), pt(26, -114), pt(30, -110), pt(27, -104), pt(14, -98), pt(-2, -104), pt(-14, -112)];
    pen.fill(beard, p.hair, 0.88);
    pen.stipple(beard, 120, () => 0.8, 0.5, '#0c0806');
    pen.fill([pt(24, -121.5), pt(31, -121), pt(30, -118), pt(24, -118.5)], p.hair, 0.8);
  }
  // The eye: its white, the iris, the lid, the brow; wide open when startled.
  const open = wide ? 2.6 : 1;
  const eye = [pt(15, -144), pt(20, -146 - open), pt(25.5, -144.5), pt(20, -142.5 + (wide ? 1.2 : 0))];
  pen.fill(eye, '#f6efe4', 1);
  pen.dot(21.8, -144.4, wide ? 1.3 : 1.7, '#3b2618', 1);
  pen.dot(21.3, -145.2, 0.5, PAPER_FILL, 1);
  pen.hair([pt(14.5, -144.5), pt(20, -147.2 - open), pt(26, -145)], 0.9, LINE, 1);
  const lift = wide ? -5 : pose === 'peer' ? 1.5 : 0;
  pen.hair(cub(pt(13, -151 + lift), pt(18, -153.5 + lift), pt(24, -153 + lift), pt(28, -150 + lift * 0.6), 6), look === 'ben' ? 2 : 1.3, p.hair, 0.95);
  pen.hair(cub(pt(27, -140), pt(31, -133), pt(33, -129), pt(31, -126), 6), 0.6, p.skinDeep, 0.8);
  if (wide) {
    // The mouth dropped open.
    pen.fill(oval(27.5, -117.5, 2.8, 3.6, 12), '#4a1a16', 1);
    pen.hair(closed(oval(27.5, -117.5, 2.8, 3.6, 12)), 0.5, LINE, 0.9);
  } else pen.hair([pt(25, -119), pt(30, -118)], 0.8, look === 'ana' ? '#a04a40' : '#5a2a22', 0.9);
}

function hat(d: Draw, p: Palette): void {
  const crown = [pt(-24, -164), ...cub(pt(-24, -164), pt(-24, -186), pt(-14, -194), pt(2, -194), 8).slice(1), ...cub(pt(2, -194), pt(18, -194), pt(24, -186), pt(22, -164), 8).slice(1)];
  wash(d, crown, p.hat, p.hatDeep, pt(-6, -186));
  d.pen.fill([pt(-24, -170), pt(22, -170), pt(22, -164), pt(-24, -164)], BAND, 0.95);
  const brim = oval(0, -164, 44, 6.5, 26).map((q) => pt(q.x, q.y + (q.x / 44) * 2.5));
  wash(d, brim, p.hat, p.hatDeep, pt(-10, -166), 1.2);
}

/** A hand: palm and curled fingers round a grip at `at`, the knuckles up; `point` extends the index finger instead. */
function hand(d: Draw, p: Palette, at: Pt, rot: number, point = false): void {
  const { pen } = d;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const to = (x: number, y: number): Pt => pt(at.x + x * c - y * s, at.y + x * s + y * c);
  const palm = [to(-8, -7), to(4, -9), to(10, -4), to(10, 6), to(0, 9), to(-9, 6)];
  wash(d, palm, p.skin, p.skinDeep, to(-2, -4), 1.1);
  if (point) {
    wash(d, capsule(to(8, -4), to(24, -5), 2.8, 2.4), p.skin, p.skinDeep, to(14, -6), 0.9);
    wash(d, capsule(to(0, -8), to(6, -13), 2.6, 2.2), p.skin, p.skinDeep, to(2, -10), 0.9);
    return;
  }
  for (let k = 0; k < 4; k++) pen.hair([to(-2 + k * 3.6, -7.5), to(-1 + k * 3.6, 6)], 0.6, p.skinDeep, 0.9);
  pen.hair([to(-8, -2), to(-3, 3)], 0.6, p.skinDeep, 0.8);
  wash(d, capsule(to(-8, -5), to(-14, 2), 3.2, 2.6), p.skin, p.skinDeep, to(-10, -3), 0.9);
}

function arm(d: Draw, p: Palette, shoulder: Pt, elbow: Pt, wrist: Pt, deep: boolean): void {
  wash(d, capsule(shoulder, elbow, 15, 13), deep ? p.shirtDeep : p.shirt, deep ? LINE : p.shirtDeep, pt((shoulder.x + elbow.x) / 2, (shoulder.y + elbow.y) / 2 - 4));
  wash(d, capsule(elbow, wrist, 12, 10), deep ? p.shirtDeep : p.shirt, deep ? LINE : p.shirtDeep, pt((elbow.x + wrist.x) / 2, (elbow.y + wrist.y) / 2 - 3));
  // The rolled cuff.
  const cuff = capsule(pt(wrist.x - (wrist.x - elbow.x) * 0.2, wrist.y - (wrist.y - elbow.y) * 0.2), wrist, 11.5, 11);
  wash(d, cuff, deep ? p.shirtDeep : p.shirt, LINE, wrist, 1);
}

const NEAR = { shoulder: pt(4, -76), elbow: pt(26, -30), wrist: pt(60, -6) } as const;
const FAR = { shoulder: pt(-12, -80), elbow: pt(4, -34), wrist: pt(32, 0) } as const;

function body(d: Draw, p: Palette): void {
  // Legs and boots, the far one a shade darker.
  wash(d, [pt(-26, 28), pt(-4, 28), pt(-8, 110), pt(-14, 176), pt(-30, 176), pt(-30, 110)], p.trousersDeep, LINE, pt(-20, 60));
  wash(d, [pt(-34, 172), pt(-10, 172), pt(4, 184), pt(4, 192), pt(-34, 192)], BOOT, LINE, pt(-20, 178));
  wash(d, [pt(-14, 28), pt(18, 28), pt(20, 110), pt(14, 176), pt(-6, 176), pt(-6, 110)], p.trousers, p.trousersDeep, pt(2, 60));
  wash(d, [pt(-10, 172), pt(16, 172), pt(36, 184), pt(36, 192), pt(-10, 192)], BOOT, LINE, pt(4, 178));
  const shirt = [
    ...cub(pt(-28, -86), pt(-40, -50), pt(-36, 0), pt(-30, 32), 10),
    pt(26, 32),
    ...cub(pt(26, 32), pt(30, 0), pt(34, -50), pt(20, -88), 10).slice(1),
    pt(-2, -92),
  ];
  wash(d, shirt, p.shirt, p.shirtDeep, pt(-4, -50));
  d.pen.fill([pt(-30, 24), pt(27, 24), pt(27, 32), pt(-30, 32)], BAND, 0.95);
  // The pocket with its flap, the button line, the collar.
  d.pen.stroke([pt(8, -70), pt(24, -70), pt(24, -50), pt(8, -50), pt(8, -70)], 0.8, LINE, 0.6, false);
  d.pen.stroke([pt(8, -70), pt(16, -64), pt(24, -70)], 0.7, LINE, 0.6, false);
  d.pen.hair([pt(26, -84), pt(28, 20)], 0.6, LINE, 0.45);
  d.pen.fill([pt(2, -92), pt(20, -88), pt(10, -80)], p.shirtDeep, 0.8);
}

function draw(look: Look) {
  return (d: Draw, pose: PersonPose): void => {
    const p = LOOKS[look];
    if (pose === 'hands') {
      arm(d, p, pt(NEAR.elbow.x - 6, NEAR.elbow.y - 10), NEAR.elbow, NEAR.wrist, false);
      hand(d, p, HANDS.near, 0.3);
      return;
    }
    if (pose === 'peer') {
      arm(d, p, FAR.shoulder, pt(2, -36), pt(22, 12), true);
      hand(d, p, pt(28, 18), 0.6);
    } else {
      arm(d, p, FAR.shoulder, FAR.elbow, FAR.wrist, true);
      hand(d, p, HANDS.far, 0.3);
    }
    body(d, p);
    if (pose === 'peer') {
      arm(d, p, NEAR.shoulder, pt(36, -58), pt(64, -76), false);
      hand(d, p, pt(72, -80), -0.25, true);
    } else arm(d, p, NEAR.shoulder, NEAR.elbow, pt(NEAR.wrist.x - 20, NEAR.wrist.y - 10), false);
    face(d, p, look, pose);
    hat(d, p);
  };
}

const art = (look: Look): SpriteArt<PersonPose> => ({ frame: 420, res: 4, poses: ['peer', 'hold', 'startle', 'hands'], draw: draw(look) });
export const ANA = art('ana');
export const BEN = art('ben');
