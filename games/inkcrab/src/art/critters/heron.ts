import { bezier, closed, cub, type Draw, edge, lerp, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A striated heron (Butorides striata) hunched on the mangrove mud, side-on
 * and facing right: small and stocky, slate grey-blue back, folded wings
 * with every covert edged buff, a black cap with a short shaggy crest, a
 * white throat streaked down the front of the neck, a yellow eye, a dark
 * dagger bill and short yellow-orange legs on long, spread toes.
 */
const BACK = '#6f8590';
const WING = '#5d727a';
const FRINGE = '#ebdfba';
const BELLY = '#a9b1b6';
const TAIL = '#4b5a61';
const NECK = '#8f9ba3';
const THROAT = '#f1ebdc';
const STREAK = '#93684a';
const CAP = '#23252b';
const BILL = '#2c2d33';
const JAW = '#d9b448';
const IRIS = '#f2d24a';
const LORE = '#c4c062';
const LEG = '#e8ac3a';

/** Where the neck leaves the body, above the ground line; the frame's ground is CRITTER_GROUND (34). */
const NECK_BASE = { x: 17, up: 64 } as const;
const FRAME_GROUND = 34;
/** Base of the neck in frame units from the frame centre: where a stretched neck starts during a strike. */
export const HERON_NECK: { readonly x: number; readonly y: number } = { x: NECK_BASE.x, y: FRAME_GROUND - NECK_BASE.up };
/** Width of the neck at its base, in frame units. */
export const HERON_NECK_WIDTH = 13;

/** The colour a wash shows at `alpha` over paper, as 0xRRGGBB. */
function seen(wash: string, alpha: number): number {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return [0, 1, 2].reduce((acc, i) => (acc << 8) | Math.round(ch(PAPER_FILL, i) * (1 - alpha) + ch(wash, i) * alpha), 0);
}

/** Head colours as they appear on paper, so a neck drawn in code matches the drawing. */
export const HERON_NECK_HEX = seen(NECK, 0.8);
export const HERON_THROAT_HEX = seen(THROAT, 0.85);
export const HERON_CAP_HEX = seen(CAP, 0.95);
export const HERON_BILL_HEX = seen(BILL, 0.92);
export const HERON_JAW_HEX = seen(JAW, 0.85);
export const HERON_IRIS_HEX = seen(IRIS, 1);

/** One leg: a backward-bent heel, a scaled yellow shank, three long toes forward and one back. */
function leg(d: Draw, hipX: number, ph: number, bob: number, far: boolean): void {
  const { pen } = d;
  const g = d.g;
  const step = Math.cos(ph) * 6;
  const lift = Math.max(0, Math.sin(ph)) * 4;
  const foot = pt(hipX + step + 1, g - lift - (far ? 1.5 : 0));
  const heel = pt(hipX + step * 0.3 - 3.5, g - 14 - lift * 0.6 - (far ? 1 : 0));
  limb(d, [pt(hipX, g - 28 + bob), heel, foot], { widths: [far ? 4.4 : 5, far ? 2.8 : 3.2, far ? 2.4 : 2.8], wash: LEG, far, line: 0.85 });
  // Scutes down the shank.
  const scutes = far ? [] : [1, 2, 3, 4].map((k) => lerp(heel, foot, k / 5));
  for (const q of scutes) pen.hair([pt(q.x - 0.8, q.y), pt(q.x + 0.9, q.y + 0.3)], 0.4, d.ink, 0.4);
  const curl = lift > 1.5 ? 0.5 : 1;
  for (const [reach, drop] of [[10, 0.3], [8, 1.2], [-5.5, 0]] as const) {
    const tip = pt(foot.x + reach * curl, foot.y + drop + (curl < 1 ? 2.4 : 0));
    pen.stroke(bezier(foot, pt((foot.x + tip.x) / 2, foot.y - 0.8), tip, 4), far ? 1 : 1.3, d.ink, far ? 0.55 : 1, false);
    pen.hair([foot, tip], 0.8, LEG, far ? 0.5 : 0.9);
  }
}

/** Body, wings, tail and legs: everything but the neck and head. */
function body(d: Draw, bob: number): void {
  const { pen } = d;
  const g = d.g;
  const y = (v: number): number => g + v + bob;
  pen.fill(oval(1, g - 1, 26, 3, 24), d.ink, 0.1);
  const ph = -d.f * (TAU / 3);
  leg(d, 2, ph + Math.PI, bob, true);
  const tail = [pt(-22, y(-43)), pt(-37, y(-36)), pt(-38.5, y(-33)), pt(-24, y(-35))];
  skin(d, tail, TAIL, 0.85);
  edge(d, tail, 1);
  // Hunched and round-backed: the mantle high at the shoulder, a deep grey breast and belly.
  const shape: Pt[] = [
    ...cub(pt(10, y(-68)), pt(-6, y(-70)), pt(-22, y(-60)), pt(-31, y(-47)), 12),
    ...cub(pt(-31, y(-47)), pt(-34, y(-43)), pt(-33, y(-39)), pt(-28, y(-38)), 6).slice(1),
    ...cub(pt(-28, y(-38)), pt(-16, y(-25)), pt(6, y(-22)), pt(17, y(-31)), 12).slice(1),
    ...cub(pt(17, y(-31)), pt(24, y(-40)), pt(26, y(-55)), pt(23, y(-63)), 10).slice(1),
    ...cub(pt(23, y(-63)), pt(20, y(-67.5)), pt(14, y(-68.5)), pt(10, y(-68)), 6).slice(1),
  ];
  skin(d, shape, BACK, 0.82);
  pen.clipped(shape, () => {
    tint(d, oval(6, y(-31), 20, 9, 18), BELLY, 0.7);
    // The pale streak down the breast, under the throat.
    pen.stroke(cub(pt(23, y(-61)), pt(25, y(-52)), pt(22, y(-42)), pt(16, y(-34)), 8), 3, THROAT, 0.6, false);
  });
  shade(d, shape, 0.36);
  edge(d, shape, 1.2);
  // The folded wing: covert rows each edged buff, then the long dark flight feathers.
  const wing: Pt[] = [
    ...cub(pt(10, y(-68)), pt(-6, y(-70)), pt(-24, y(-59)), pt(-42, y(-35)), 14),
    ...cub(pt(-42, y(-35)), pt(-26, y(-33)), pt(-8, y(-34)), pt(6, y(-40)), 12).slice(1),
    ...cub(pt(6, y(-40)), pt(13, y(-45)), pt(16, y(-58)), pt(10, y(-68)), 6).slice(1),
  ];
  skin(d, wing, WING, 0.85);
  pen.clipped(wing, () => {
    // Scaly coverts: each feather a dark-washed scale with a crisp buff edge.
    for (const [cx, cy, n] of [[8, -60, 4], [7, -55, 6], [5, -50, 7], [2, -45, 8], [-2, -40, 8]] as const) {
      for (let k = 0; k < n; k++) {
        const x = cx - k * 3.6 + (cy % 2) * 1.8;
        const yy = y(cy + k * (0.9 + (cy + 60) * 0.02));
        const scale = bezier(pt(x + 1.8, yy - 1.2), pt(x, yy + 1.6), pt(x - 1.8, yy - 0.8), 4);
        pen.stroke(scale, 0.75, FRINGE, 0.9, false);
        pen.hair(scale.map((q) => pt(q.x, q.y - 0.8)), 0.35, d.ink, 0.35);
      }
    }
    for (const k of [0, 1, 2]) pen.hair(cub(pt(-12, y(-38 + k * 1.6)), pt(-20, y(-39 + k * 1.4)), pt(-30, y(-36 + k)), pt(-40, y(-34.5 + k * 0.2)), 8), 0.5, FRINGE, 0.6);
  });
  shade(d, wing, 0.32);
  edge(d, wing, 1.1);
  leg(d, -1, ph, bob, false);
}

/** The hunched neck in an S, head on top, bill held forward. */
function neckAndHead(d: Draw, bob: number): void {
  const { pen } = d;
  const y = (v: number): number => d.g + v + bob;
  const spine = cub(pt(NECK_BASE.x, y(-NECK_BASE.up + 2)), pt(9, y(-68)), pt(22, y(-72)), pt(15, y(-78)), 12);
  const neck = ribbon(spine, (u) => HERON_NECK_WIDTH + 1 - u * 3);
  skin(d, neck.shape, NECK, 0.8);
  pen.clipped(neck.shape, () => {
    // The white throat stripe down the front of the neck, streaked brown.
    const front = ribbon(spine.map((q) => pt(q.x + 4.6, q.y)), (u) => 5 - u);
    tint(d, front.shape, THROAT, 0.85);
    for (const q of spine.slice(4, 10)) pen.hair([pt(q.x + 3.4, q.y - 0.6), pt(q.x + 4.8, q.y + 1)], 0.6, STREAK, 0.8);
  });
  shade(d, neck.shape, 0.3);
  pen.stroke(neck.top, 1.1, d.ink, 0.95, false);
  pen.stroke(neck.bot, 1.1, d.ink, 0.95, false);
  // The bill: a straight dagger, dark above, yellow along the lower mandible.
  const bill: Pt[] = [
    ...cub(pt(20, y(-84.6)), pt(29, y(-84.4)), pt(37, y(-82.6)), pt(44, y(-80.8)), 10),
    ...cub(pt(43.5, y(-80.2)), pt(36, y(-79)), pt(28, y(-78.2)), pt(20, y(-78.4)), 8),
  ];
  skin(d, bill, BILL, 0.92);
  pen.clipped(bill, () => tint(d, [pt(18, y(-81)), pt(45, y(-80.6)), pt(45, y(-77)), pt(18, y(-77))], JAW, 0.85));
  pen.hair(bezier(pt(21, y(-81.2)), pt(31, y(-80.8)), pt(43, y(-80.5)), 6), 0.6, d.ink, 0.9);
  edge(d, bill, 1);
  // Head: a black cap swept back into a shaggy crest, grey cheeks, a dark streak under the eye.
  const head = [...cub(pt(22, y(-77.5)), pt(25, y(-84)), pt(16, y(-89.5)), pt(9, y(-86.5)), 10), ...cub(pt(9, y(-86.5)), pt(5, y(-82)), pt(8, y(-76)), pt(16, y(-75.5)), 8).slice(1)];
  skin(d, head, NECK, 0.8);
  const cap = [...cub(pt(22.5, y(-82.6)), pt(22.5, y(-88.5)), pt(14, y(-91.5)), pt(8, y(-88.5)), 8), pt(1.5, y(-88)), pt(5, y(-86.6)), pt(-1.5, y(-85.4)), pt(4.5, y(-84.4)), pt(1, y(-82.6)), pt(7.5, y(-82.4)), ...cub(pt(8, y(-82.2)), pt(12, y(-83.4)), pt(18, y(-83)), pt(22.5, y(-82.6)), 6)];
  skin(d, cap, CAP, 0.95);
  pen.clipped(cap, () => pen.hair(bezier(pt(10, y(-89)), pt(15, y(-90.4)), pt(20, y(-87.6)), 5), 0.7, PAPER_FILL, 0.4));
  edge(d, head, 1.1);
  edge(d, cap, 1);
  pen.hair(bezier(pt(20.5, y(-78.6)), pt(16, y(-78.2)), pt(12, y(-76.6)), 5), 0.8, CAP, 0.6);
  // The eye, yellow and staring, bare yellow-green skin in front of it.
  pen.fill(oval(20, y(-81.4), 2, 1.3, 10), LORE, 0.85);
  pen.fill(oval(17, y(-81.6), 2.1, 2, 12), IRIS, 1);
  pen.dot(17.3, y(-81.6), 0.95, d.ink, 1);
  pen.dot(17.7, y(-82.1), 0.35, PAPER_FILL, 0.95);
  pen.hair(closed(oval(17, y(-81.6), 2.1, 2, 12)), 0.5, d.ink, 0.9);
}

export function heron(d: Draw): void {
  const bob = [0, -0.6, 0.3][d.f]!;
  body(d, bob);
  neckAndHead(d, bob);
}

/** The heron without its neck and head, for the strike: the neck is drawn from HERON_NECK in code. */
export function heronBody(d: Draw): void {
  body(d, 0);
}
