import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A raven walking the dunes, side-on and facing right: a big, deep,
 * arched beak with bristles over its base, a shaggy throat, glossy black
 * with a blue sheen, wings folded over a long wedge tail, and stout,
 * scaled legs in a strut.
 */
const BLACK = '#2b2c35';
const WING = '#23242c';
const SHEEN = '#5a7cc0';
const LEG = '#1c1c22';

/** One leg: thigh under the feathers, a backward-bent heel, scaled shank, three toes forward and one back. */
function leg(d: Draw, hipX: number, ph: number, far: boolean): void {
  const { pen } = d;
  const g = d.g;
  const step = Math.cos(ph) * 7;
  const lift = Math.max(0, Math.sin(ph)) * 4.5;
  const foot = pt(hipX + step, g - lift - (far ? 1.5 : 0));
  const heel = pt(hipX + step * 0.25 - 4, g - 13 - lift * 0.6 - (far ? 1 : 0));
  const hip = pt(hipX, g - 24);
  // Feathered thigh, then the bare, scaled shank.
  limb(d, [hip, heel], { widths: [far ? 6 : 7, 3.4], wash: '#1c1c22', far, line: 0.9 });
  limb(d, [heel, foot], { widths: [far ? 2.4 : 2.8, far ? 2 : 2.4], wash: LEG, far, line: 0.85 });
  // Black, not grey: deepen the wash down the middle of each segment.
  pen.fill(capsule(hip, heel, far ? 4.6 : 5.6, 2.4), LEG, 0.7);
  pen.fill(capsule(heel, foot, far ? 1.6 : 2, far ? 1.3 : 1.6), LEG, 0.7);
  if (!far) {
    // Scutes down the front of the shank.
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const p = pt(heel.x + (foot.x - heel.x) * t, heel.y + (foot.y - heel.y) * t);
      pen.hair([pt(p.x - 0.6, p.y), pt(p.x + 1, p.y + 0.4)], 0.45, PAPER_FILL, 0.5);
    }
  }
  feet(d, foot, lift > 1.5, far);
}

/** Toes: reach along the sand and how far in front of the line they splay (forward toes long, the hind toe short). */
const TOES = [[-7, 0], [9.5, 0.9], [12, 0]] as const;

/**
 * A raven's foot: three long, scaled toes spread forward along the sand and
 * one behind, each ending in a dark hooked claw. Lifted, they bunch and
 * curl under.
 */
function feet(d: Draw, foot: Pt, lifted: boolean, far: boolean): void {
  const { pen } = d;
  for (const [reach, splay] of TOES) {
    const dir = Math.sign(reach);
    const len = lifted ? reach * 0.55 : reach;
    const drop = lifted ? 2.6 : 0;
    // A knuckled arch: up off the sand mid-toe, down to the tip.
    const knuckle = pt(foot.x + len * 0.5, foot.y - (lifted ? 0 : 0.9) + splay * 0.5 + drop * 0.4);
    const tip = pt(foot.x + len, foot.y + splay + drop);
    limb(d, [foot, knuckle, tip], { widths: far ? [2, 1.6, 1.1] : [2.6, 2, 1.3], wash: LEG, far, line: 0.8 });
    pen.fill(capsule(foot, tip, far ? 0.9 : 1.1, 0.6), LEG, 0.6);
    // The claw: a short dark hook bending down into the sand.
    const claw = lifted ? pt(tip.x - dir * 0.4, tip.y + 1.6) : pt(tip.x + dir * 1.9, tip.y + 0.8);
    pen.stroke(bezier(tip, pt(tip.x + dir * 1.3, tip.y - 0.1), claw, 4), far ? 0.8 : 1.1, d.ink, far ? 0.55 : 1, false);
  }
  // Pad under the toes' meeting point.
  pen.fill(oval(foot.x, foot.y - 0.2, far ? 1.6 : 2, far ? 1.2 : 1.5, 10), LEG, 0.9);
}

export function raven(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(0, g - 1, 26, 3, 24), d.ink, 0.1);
  // A strut: the legs swing in opposite phase; the body bobs with them.
  const ph = -d.f * (TAU / 3);
  const bob = [0, -0.8, 0.4][d.f]!;
  leg(d, 1, ph + Math.PI, true);
  const y = (v: number): number => g + v + bob;
  // The long, wedge-shaped tail, its feathers ending in a fan of points.
  const tail = [pt(-17, y(-37)), pt(-35, y(-31)), pt(-41, y(-28.5)), pt(-44, y(-26.5)), pt(-42, y(-24.5)), pt(-38, y(-23.5)), pt(-17, y(-26))];
  skin(d, tail, WING, 0.9);
  tint(d, tail, WING, 0.6);
  pen.clipped(tail, () => {
    for (const k of [0, 1, 2]) pen.hair([pt(-18, y(-33 + k * 2.5)), pt(-40 + k, y(-28 + k * 1.2))], 0.5, PAPER_FILL, 0.3);
  });
  edge(d, tail, 1.1);
  // Body, neck and head in one silhouette, beak base at the front.
  const body: Pt[] = [
    ...cub(pt(25, y(-60.5)), pt(22, y(-66)), pt(12, y(-65)), pt(9, y(-57)), 10),
    ...cub(pt(9, y(-57)), pt(5, y(-49)), pt(-10, y(-46)), pt(-24, y(-36)), 12).slice(1),
    ...cub(pt(-24, y(-36)), pt(-28, y(-32)), pt(-26, y(-28)), pt(-20, y(-27)), 6).slice(1),
    ...cub(pt(-20, y(-27)), pt(-12, y(-20)), pt(4, y(-20)), pt(11, y(-29)), 12).slice(1),
    ...cub(pt(11, y(-29)), pt(16, y(-36)), pt(18, y(-46)), pt(26, y(-51)), 10).slice(1),
    pt(27, y(-54)),
  ];
  skin(d, body, BLACK, 0.92);
  // On a black bird the off-register wash leaves only a narrow grey rim of light.
  tint(d, body, BLACK, 0.6);
  pen.clipped(body, () => {
    // Blue sheen over the head and back where the light falls.
    tint(d, oval(15, y(-60), 8, 4, 16), SHEEN, 0.45);
    tint(d, oval(-6, y(-46), 16, 4, 16), SHEEN, 0.35);
    pen.hair(cub(pt(10, y(-60)), pt(14, y(-64)), pt(20, y(-64)), pt(23, y(-62)), 8), 1, PAPER_FILL, 0.45);
    // Feather texture on the breast: small soft scallops.
    for (let i = 0; i < 22; i++) {
      const fx = -10 + pen.rng() * 24;
      const fy = y(-44) + pen.rng() * 20;
      pen.hair(bezier(pt(fx - 1.4, fy), pt(fx, fy + 1.1), pt(fx + 1.4, fy), 3), 0.45, PAPER_FILL, 0.22);
    }
  });
  shade(d, body, 0.4);
  edge(d, body, 1.3);
  // Shaggy throat hackles, pointed and ragged.
  const throat = cub(pt(12, y(-31)), pt(16, y(-38)), pt(18, y(-46)), pt(25, y(-51)), 9);
  for (let i = 1; i < throat.length - 1; i++) {
    const p = throat[i]!;
    const len = 3 + (i % 3) * 1.2 + pen.rng();
    pen.stroke([pt(p.x - 1.5, p.y - 1), pt(p.x + len * 0.55, p.y + len * 0.8)], 0.9, d.ink, 0.9, false);
    pen.hair([pt(p.x - 2.5, p.y - 2), pt(p.x + 0.5, p.y + 2.6)], 0.5, PAPER_FILL, 0.3);
  }
  // The folded wing over the flank, primaries reaching onto the tail.
  const wing = [
    ...cub(pt(8, y(-48)), pt(-4, y(-50)), pt(-20, y(-41)), pt(-37, y(-30)), 14),
    ...cub(pt(-37, y(-30)), pt(-24, y(-28)), pt(-6, y(-27)), pt(5, y(-33)), 12).slice(1),
    ...cub(pt(5, y(-33)), pt(11, y(-37)), pt(12, y(-44)), pt(8, y(-48)), 6).slice(1),
  ];
  skin(d, wing, WING, 0.93);
  tint(d, wing, WING, 0.6);
  pen.clipped(wing, () => {
    tint(d, oval(-6, y(-44), 14, 3.5, 16), SHEEN, 0.4);
    // Coverts: rows of overlapping scallops; then the long primaries.
    for (const [cx, cy, n] of [[2, -43, 4], [-4, -38, 5]] as const) {
      for (let k = 0; k < n; k++) pen.hair(bezier(pt(cx - k * 4.5 + 2, y(cy - 1.5)), pt(cx - k * 4.5, y(cy + 1.8)), pt(cx - k * 4.5 - 2.2, y(cy - 1)), 4), 0.55, PAPER_FILL, 0.35);
    }
    for (const k of [0, 1, 2, 3]) pen.hair(cub(pt(-6, y(-33 + k * 1.5)), pt(-16, y(-35 + k * 1.6)), pt(-26, y(-32 + k)), pt(-36, y(-30.5 + k * 0.2)), 10), 0.55, PAPER_FILL, 0.35);
  });
  shade(d, wing, 0.35);
  edge(d, wing, 1.1);
  // The beak: deep and arched along the top, a slight hook.
  const beak = [
    ...cub(pt(24.5, y(-61.5)), pt(32, y(-63.5)), pt(41, y(-60)), pt(45, y(-54)), 12),
    pt(43, y(-54.4)),
    ...cub(pt(42, y(-53.6)), pt(37, y(-51.5)), pt(31, y(-51.5)), pt(26.5, y(-52.8)), 8),
  ];
  skin(d, beak, '#2a2a31', 0.92);
  tint(d, beak, '#2a2a31', 0.6);
  glint(d, bezier(pt(28, y(-61)), pt(35, y(-61.5)), pt(40, y(-58.5)), 6), 0.9, 0.55);
  pen.hair(bezier(pt(27, y(-56.5)), pt(35, y(-55.5)), pt(43, y(-54.6)), 6), 0.7, d.ink, 0.9);
  edge(d, beak, 1.1);
  // Bristles lying forward over the nostrils.
  for (let k = 0; k < 5; k++) pen.hair([pt(22.5 + k * 0.6, y(-61 + k * 0.9)), pt(30 + k * 0.4, y(-60 + k * 0.6))], 0.55, d.ink, 0.85);
  // Eye: dark, with a sharp glint.
  pen.dot(18.5, y(-59), 1.9, d.ink, 1);
  pen.dot(19.1, y(-59.7), 0.6, PAPER_FILL, 0.95);
  pen.hair(closed(oval(18.5, y(-59), 2.6, 2.3, 10)), 0.45, PAPER_FILL, 0.35);
  leg(d, -2, ph, false);
}
