import { bezier, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A herring gull striding over the rocks, side-on and facing right: a
 * white head and breast, a pale grey back and folded wings, black wing tips
 * with white spots crossing over a short white tail, a heavy yellow bill
 * with a red spot near the tip, a pale, hard eye, and pink legs on webbed feet.
 */
const WHITE = '#f6f3ea';
const GREY = '#a3afbb';
const SHADE = '#c9cdd0';
const BLACK = '#26262c';
const BILL = '#ecc43c';
const SPOT = '#d0402c';
const LEG = '#e2a296';
const IRIS = '#efe08a';

/** One leg: feathered thigh, backward-bent heel, long pink shank, a webbed foot. */
function leg(d: Draw, hipX: number, ph: number, bob: number, far: boolean): void {
  const { pen } = d;
  const g = d.g;
  const step = Math.cos(ph) * 7.5;
  const lift = Math.max(0, Math.sin(ph)) * 5;
  const foot = pt(hipX + step + 1, g - lift - (far ? 1.5 : 0));
  const heel = pt(hipX + step * 0.3 - 3, g - 13 - lift * 0.6 - (far ? 1 : 0));
  const hip = pt(hipX, g - 25 + bob);
  limb(d, [hip, heel, foot], { widths: [far ? 4 : 4.6, far ? 3 : 3.4, far ? 2.6 : 3], wash: LEG, far, line: 0.85 });
  if (!far) {
    for (let k = 1; k < 5; k++) {
      const p = pt(heel.x + ((foot.x - heel.x) * k) / 5, heel.y + ((foot.y - heel.y) * k) / 5);
      pen.hair([pt(p.x - 0.7, p.y), pt(p.x + 0.9, p.y + 0.3)], 0.4, d.ink, 0.35);
    }
  }
  // Three toes forward joined by a web, a stub of a hind toe; folded while lifted.
  const lifted = lift > 1.5;
  const toes = lifted
    ? [pt(foot.x + 4.5, foot.y + 3.5), pt(foot.x + 6.5, foot.y + 2.2)]
    : [pt(foot.x + 9, foot.y + 0.4), pt(foot.x + 7, foot.y - 1.6)];
  const web: Pt[] = [foot, toes[0]!, toes[1]!];
  pen.fill(web, LEG, far ? 0.6 : 0.85);
  if (far) pen.fill(web, d.ink, 0.12);
  for (const t of toes) pen.stroke([foot, t], far ? 0.8 : 1, d.ink, far ? 0.55 : 1, false);
  pen.hair([toes[0]!, pt((toes[0]!.x + toes[1]!.x) / 2 - 1, (toes[0]!.y + toes[1]!.y) / 2), toes[1]!], 0.6, d.ink, far ? 0.4 : 0.8);
  pen.stroke([foot, pt(foot.x - 2.2, foot.y - 0.6)], 0.8, d.ink, far ? 0.5 : 0.9, false);
}

export function gull(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(1, g - 1, 26, 3, 24), d.ink, 0.1);
  const ph = -d.f * (TAU / 3);
  const bob = [0, -0.9, 0.5][d.f]!;
  const y = (v: number): number => g + v + bob;
  leg(d, 0, ph + Math.PI, bob, true);
  // The short, square white tail under the crossed wing tips.
  const tail = [pt(-16, y(-40)), pt(-31, y(-37.5)), pt(-32, y(-33.5)), pt(-16, y(-31))];
  skin(d, tail, WHITE, 0.8);
  shade(d, tail, 0.3);
  edge(d, tail, 1);
  // Head, neck and body in one: a round head, a deep white breast, the belly tucked up.
  const body: Pt[] = [
    ...cub(pt(25, y(-58.5)), pt(23, y(-65)), pt(14, y(-66.5)), pt(9, y(-61)), 10),
    ...cub(pt(9, y(-61)), pt(5, y(-55)), pt(-6, y(-50)), pt(-18, y(-42)), 12).slice(1),
    ...cub(pt(-18, y(-42)), pt(-22, y(-38.5)), pt(-22, y(-34)), pt(-16, y(-31)), 6).slice(1),
    ...cub(pt(-16, y(-31)), pt(-8, y(-24)), pt(8, y(-23)), pt(14, y(-32)), 12).slice(1),
    ...cub(pt(14, y(-32)), pt(18, y(-40)), pt(17, y(-49)), pt(24, y(-53)), 10).slice(1),
    pt(26, y(-55.5)),
  ];
  skin(d, body, WHITE, 0.85);
  pen.clipped(body, () => {
    // Cool shadow under the breast and belly, faint winter streaks on the crown and nape.
    tint(d, oval(2, y(-26), 18, 7, 16), SHADE, 0.55);
    for (let i = 0; i < 12; i++) {
      const sx = 8 + pen.rng() * 12;
      const sy = y(-63) + pen.rng() * 9;
      pen.hair([pt(sx, sy), pt(sx - 1.6, sy + 0.5)], 0.4, GREY, 0.7);
    }
  });
  shade(d, body, 0.32);
  edge(d, body, 1.2);
  // The folded wing: grey mantle and coverts, a white trailing edge, then the long black primaries.
  const wing: Pt[] = [
    ...cub(pt(10, y(-50)), pt(-2, y(-52)), pt(-18, y(-44)), pt(-30, y(-38)), 12),
    ...cub(pt(-30, y(-38)), pt(-20, y(-33)), pt(-4, y(-30)), pt(6, y(-34)), 12).slice(1),
    ...cub(pt(6, y(-34)), pt(12, y(-38)), pt(14, y(-46)), pt(10, y(-50)), 6).slice(1),
  ];
  const tips: Pt[] = [pt(-18, y(-43.5)), pt(-34, y(-37.5)), pt(-44, y(-34)), pt(-45, y(-32.5)), pt(-40, y(-32)), pt(-24, y(-32.6)), pt(-14, y(-33.5))];
  skin(d, tips, BLACK, 0.92);
  tint(d, tips, BLACK, 0.55);
  // White spots (mirrors) at the ends of the primaries.
  for (const [sx, sy] of [[-41.5, -33.2], [-35, -34.6], [-29, -35.4]] as const) {
    pen.fill(oval(sx, y(sy), 1.8, 0.95, 10), PAPER_FILL, 0.95);
  }
  pen.clipped(tips, () => {
    for (const k of [0, 1]) pen.hair([pt(-16, y(-38 + k * 2.4)), pt(-38 + k * 4, y(-34 + k * 0.8))], 0.5, PAPER_FILL, 0.35);
  });
  edge(d, tips, 1);
  skin(d, wing, GREY, 0.8);
  pen.clipped(wing, () => {
    // Rows of covert scallops, the white tertial crescent, the white trailing edge.
    for (const [cx, cy, n] of [[4, -46, 4], [-1, -41, 5]] as const) {
      for (let k = 0; k < n; k++) pen.hair(bezier(pt(cx - k * 4.4 + 2, y(cy - 1.4)), pt(cx - k * 4.4, y(cy + 1.6)), pt(cx - k * 4.4 - 2, y(cy - 1)), 4), 0.5, d.ink, 0.35);
    }
    pen.stroke(cub(pt(4, y(-33.5)), pt(-6, y(-31)), pt(-18, y(-33)), pt(-29, y(-37.6)), 10), 1.8, PAPER_FILL, 0.9, false);
    pen.stroke(bezier(pt(-6, y(-48)), pt(-16, y(-44)), pt(-22, y(-38)), 6), 1.2, PAPER_FILL, 0.6, false);
  });
  shade(d, wing, 0.32);
  edge(d, wing, 1.1);
  // The bill: heavy, yellow, with a hooked tip and the angle (gonys) on the lower mandible marked red.
  const bill: Pt[] = [
    ...cub(pt(24.5, y(-60.5)), pt(30, y(-61)), pt(36, y(-60.5)), pt(40, y(-58.5)), 10),
    pt(41, y(-56.4)),
    pt(39.6, y(-55.8)),
    ...cub(pt(38.4, y(-55.6)), pt(37, y(-53.4)), pt(35.6, y(-53.2)), pt(34.6, y(-54.4)), 4),
    ...cub(pt(34.6, y(-54.4)), pt(31, y(-55.2)), pt(28, y(-55.4)), pt(25.6, y(-55.4)), 6).slice(1),
  ];
  skin(d, bill, BILL, 0.9);
  pen.clipped(bill, () => pen.fill(oval(36.4, y(-54.6), 1.9, 1.4, 10), SPOT, 0.9));
  pen.hair(bezier(pt(26, y(-57.8)), pt(33, y(-57.4)), pt(39.4, y(-56.6)), 6), 0.65, d.ink, 0.9);
  pen.hair([pt(29, y(-59.4)), pt(31.5, y(-59.2))], 0.6, d.ink, 0.8);
  edge(d, bill, 1);
  // The eye: a pale yellow iris round a small pupil, an orange-red eye ring: the gull's hard stare.
  pen.fill(oval(18.5, y(-60), 2.4, 2.2, 12), '#e0703a', 0.8);
  pen.fill(oval(18.5, y(-60), 1.7, 1.6, 12), IRIS, 1);
  pen.dot(18.7, y(-60), 0.75, d.ink, 1);
  pen.hair(closed(oval(18.5, y(-60), 2.4, 2.2, 12)), 0.55, d.ink, 0.9);
  pen.hair(bezier(pt(15.6, y(-61.6)), pt(18.5, y(-63.4)), pt(21.4, y(-61.4)), 5), 0.6, d.ink, 0.7);
  leg(d, -3, ph, bob, false);
}
