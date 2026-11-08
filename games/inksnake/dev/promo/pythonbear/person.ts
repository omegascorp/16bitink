import { glaze } from '../../../src/art/critters/preyKit';
import { capsule, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The field researcher, side on, facing +x: a bush hat, headphones over his
 * ears, a khaki shirt and olive trousers, boots; one hand holds the
 * direction-finding antenna (a boom with three cross elements) up and
 * forward, the other the receiver at his waist on its strap. Painted in
 * washes with a firm pen line; the face is a person's: brow, nose, lips,
 * chin, an eye with its lid, an ear. Art units: boots at y ≈ +192, hat top
 * at y ≈ -192.
 */
const P = {
  skin: '#d9a07a', skinLit: '#f0c4a0', skinDeep: '#a8694a', hair: '#3c2a1e', hat: '#a8956a', hatDeep: '#6e5f40', band: '#4a3a26',
  shirt: '#b8a272', shirtDeep: '#7f6c46', trousers: '#5d5c44', trousersDeep: '#3a392a', boot: '#3b2a1e', metal: '#c9ced6', metalDeep: '#7d848e',
  box: '#3f4a42', strap: '#5a4630', phones: '#26262c', line: '#1c1712',
} as const;

/** Where the antenna's boom ends (art units): the waves arrive here. */
export const ANTENNA_TIP: Pt = pt(170, -150);

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
  pen.stroke([...shape, shape[0]!], w, P.line, 0.95);
}

const FACE: readonly Pt[] = [
  pt(-22, -164), pt(0, -172), pt(20, -164), pt(27, -150), pt(28, -144), pt(27, -140), pt(37, -128), pt(35, -125), pt(29, -125),
  pt(31, -121), pt(28, -118), pt(30, -114), pt(27, -105), pt(14, -99), pt(-2, -106), pt(-14, -112), pt(-24, -130),
];

function head(d: Draw): void {
  const { pen } = d;
  wash(d, [pt(-8, -112), pt(12, -102), pt(14, -86), pt(-12, -86)], P.skin, P.skinDeep, pt(4, -100), 1.1);
  wash(d, FACE, P.skin, P.skinDeep, pt(22, -140), 1.3);
  pen.clipped(FACE, () => {
    glaze(d, 30, -126, 8, 6, 0, '#e0857a', 0.35);
    glaze(d, 18, -112, 12, 7, 0, '#6a4a3a', 0.3);
  });
  // Hair below the hat at the back, the ear, the headphones.
  pen.fill([pt(-24, -164), pt(-6, -162), pt(-10, -146), pt(-22, -128), pt(-26, -146)], P.hair, 0.95);
  const ear = oval(-6, -138, 6, 9, 14);
  wash(d, ear, P.skin, P.skinDeep, pt(-7, -141), 0.9);
  pen.stroke(cub(pt(-6, -158), pt(-2, -168), pt(4, -170), pt(8, -166), 6), 3, P.phones, 1, false);
  const cup = oval(-8, -137, 9, 12, 16);
  pen.fill(cup, P.phones, 1);
  pen.dot(-11, -142, 2, '#6a6a76', 0.8);
  // The eye: white, the iris, the lid's line and the brow.
  const eye = [pt(16, -144), pt(20, -146.5), pt(25, -144.5), pt(20, -142.5)];
  pen.fill(eye, '#f6efe4', 1);
  pen.dot(21.5, -144.5, 1.7, '#3b2618', 1);
  pen.dot(21, -145.2, 0.5, PAPER_FILL, 1);
  pen.hair([pt(15, -144.5), pt(20, -147.6), pt(25.5, -145)], 0.9, P.line, 1);
  pen.hair(cub(pt(13, -151), pt(18, -153.5), pt(24, -153), pt(28, -150), 6), 1.6, P.hair, 0.95);
  pen.hair(cub(pt(27, -140), pt(31, -133), pt(33, -129), pt(31, -126), 6), 0.6, P.skinDeep, 0.8);
  pen.hair([pt(25, -119), pt(30, -118)], 0.8, '#7a3a30', 0.9);
  // Stubble along the jaw.
  pen.stipple(FACE, 260, (x, y) => (y > -122 && x < 28 ? 0.6 : 0), 0.45, P.hair);
}

function hat(d: Draw): void {
  const crown = [pt(-24, -164), ...cub(pt(-24, -164), pt(-24, -186), pt(-14, -194), pt(2, -194), 8).slice(1), ...cub(pt(2, -194), pt(18, -194), pt(24, -186), pt(22, -164), 8).slice(1)];
  wash(d, crown, P.hat, P.hatDeep, pt(-6, -186));
  d.pen.fill([pt(-24, -170), pt(22, -170), pt(22, -164), pt(-24, -164)], P.band, 0.95);
  const brim = oval(0, -164, 44, 6.5, 26).map((p) => pt(p.x, p.y + (p.x / 44) * 2.5));
  wash(d, brim, P.hat, P.hatDeep, pt(-10, -166), 1.2);
}

function antenna(d: Draw): void {
  const { pen } = d;
  const a = pt(52, -108);
  const b = ANTENNA_TIP;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const dir = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const nrm = pt(-dir.y, dir.x);
  const boom = capsule(a, b, 3.6, 3);
  for (const [u, half] of [[0.38, 34], [0.64, 30], [0.9, 26]] as const) {
    const c = pt(a.x + dir.x * len * u, a.y + dir.y * len * u);
    const bar = capsule(pt(c.x - nrm.x * half, c.y - nrm.y * half), pt(c.x + nrm.x * half, c.y + nrm.y * half), 2.6, 2.6);
    pen.fill(bar, P.metal, 1);
    pen.stroke([...bar, bar[0]!], 0.8, P.line, 1, false);
  }
  pen.fill(boom, P.metal, 1);
  pen.clipped(boom, () => pen.fill(boom.map((p) => pt(p.x + nrm.x * 1.6, p.y + nrm.y * 1.6)), P.metalDeep, 0.5));
  pen.stroke([...boom, boom[0]!], 0.9, P.line, 1, false);
  pen.stroke(cub(pt(48, -104), pt(30, -60), pt(40, -30), pt(22, -14), 12), 1.4, '#1a1a1a', 0.95, false);
}

function drawResearcher(d: Draw): void {
  const { pen } = d;
  // The far leg and boot, a shade darker.
  wash(d, [pt(-26, 28), pt(-4, 28), pt(-8, 110), pt(-14, 176), pt(-30, 176), pt(-30, 110)], P.trousersDeep, P.line, pt(-20, 60));
  wash(d, [pt(-34, 172), pt(-10, 172), pt(4, 184), pt(4, 192), pt(-34, 192)], P.boot, P.line, pt(-20, 178));
  // The far arm with the receiver at the waist, and its strap.
  pen.stroke(cub(pt(-26, -84), pt(-6, -50), pt(14, -30), pt(22, -10), 10), 3.2, P.strap, 1, false);
  wash(d, capsule(pt(-14, -74), pt(-20, -28), 15, 13), P.shirtDeep, P.line, pt(-16, -60));
  wash(d, capsule(pt(-20, -28), pt(6, -12), 12, 10), P.skinDeep, P.line, pt(-8, -20));
  wash(d, [pt(4, -24), pt(40, -22), pt(40, 2), pt(4, 0)], P.box, '#1b221e', pt(14, -18));
  pen.fill([pt(10, -19), pt(26, -18.5), pt(26, -8), pt(10, -8.5)], '#9fc7a0', 0.9);
  pen.dot(33, -12, 3, '#b8b8b0', 1);
  // The near leg and boot, the shirt and belt.
  wash(d, [pt(-14, 28), pt(18, 28), pt(20, 110), pt(14, 176), pt(-6, 176), pt(-6, 110)], P.trousers, P.trousersDeep, pt(2, 60));
  wash(d, [pt(-10, 172), pt(16, 172), pt(36, 184), pt(36, 192), pt(-10, 192)], P.boot, P.line, pt(4, 178));
  const shirt = [
    ...cub(pt(-28, -86), pt(-40, -50), pt(-36, 0), pt(-30, 32), 10),
    pt(26, 32),
    ...cub(pt(26, 32), pt(30, 0), pt(34, -50), pt(20, -88), 10).slice(1),
    pt(-2, -92),
  ];
  wash(d, shirt, P.shirt, P.shirtDeep, pt(-4, -50));
  pen.fill([pt(-30, 24), pt(27, 24), pt(27, 32), pt(-30, 32)], P.band, 0.95);
  pen.stroke([pt(8, -70), pt(24, -70), pt(24, -50), pt(8, -50), pt(8, -70)], 0.8, P.line, 0.6, false);
  // The near arm raising the antenna.
  antenna(d);
  wash(d, capsule(pt(6, -78), pt(38, -64), 17, 14), P.shirt, P.shirtDeep, pt(16, -76));
  wash(d, capsule(pt(38, -64), pt(54, -104), 12, 10), P.skin, P.skinDeep, pt(44, -86));
  wash(d, oval(54, -106, 8, 7, 14), P.skin, P.skinDeep, pt(52, -108), 1.1);
  head(d);
  hat(d);
}

export const RESEARCHER: SpriteArt<'listen'> = { frame: 420, res: 4, poses: ['listen'], draw: drawResearcher };
