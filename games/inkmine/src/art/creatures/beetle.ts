import { capsule, cub, oval, pt, setae, type Draw } from '../kit';
import { dab, gleam, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * The dew beetle (a walker, harmless, inked in blue): Talus's answer to the
 * Namib Desert's fog-basking beetles. On Earth, Stenocara and Onymacris
 * stand on dune crests at dawn, backs to the fog, and drink the water that
 * condenses on their backs: the tips of the bumps on their wing cases are
 * bare and wettable, so droplets grow there, while the troughs between are
 * waxy and shed them, so the drops roll down to the mouth. Talus has no fog
 * left, so the dew beetle drinks the night frost instead. It walks on long
 * thin legs, holding its body high off the hot ground (as the Namib's stilt
 * beetles do, for the cooler air a few millimetres up), a domed, ridged,
 * bumpy back, pale with a waxy bloom in the troughs and beaded with water on
 * the bumps. In a dust storm it pulls its legs and head in under its shell
 * and sits flat. Seen from the side, walking right; origin at the middle of
 * its underside on the ground (y = 0).
 */
export const BEETLE_ART = { w: 36, h: 24, ox: 18, oy: 22 } as const;
export type BeetlePose = 'walk' | 'tucked';

const SHELL = '#3b364c';
const SHELL_LIT = '#6a6582';
const BLOOM = '#d8dde8';
const LEG = '#3a3446';
const HEAD = '#29252f';
const EYE = '#151219';
const DROP = '#e8f1fb';
const FROST = '#f6fbff';

/** The wing cases' outline over a belly at `y`: a high round dome, the shoulder at the front, sloping steeply down at the rear. */
function elytraShape(y: number): Pt[] {
  return [
    ...cub(pt(-10.5, y - 0.8), pt(-11.2, y - 7.6), pt(-5, y - 11.4), pt(0, y - 11.2), 12),
    ...cub(pt(0, y - 11.2), pt(4.4, y - 11), pt(7.6, y - 7.8), pt(7.4, y - 1.6), 10).slice(1),
    ...cub(pt(7.4, y - 1.6), pt(3, y + 0.6), pt(-6, y + 0.6), pt(-10.5, y - 0.8), 10).slice(1, -1),
  ];
}

/** The ridges along the wing cases, following the dome: `k` 0 at the top to 1 at the edge, as a line from rear to front. */
function ridge(y: number, k: number): Pt[] {
  const lift = 11.2 * (1 - k) + 1.4 * k;
  const rear = -10.2 + k * 0.6;
  const front = 7 - k * 0.3;
  return cub(pt(rear + k * 0.4, y - 1.2 - (1 - k) * 0.8), pt(rear + 0.4, y - lift * 0.82), pt(front - 2, y - lift * 0.92), pt(front, y - 2 - (1 - k) * 2.4), 14);
}

/** A bead of water on a bump: a clear drop, the sky in it, a bright glint upper left, its shadow crescent lower right. */
function bead(d: Draw, c: Pt, r: number): void {
  d.pen.fill(oval(c.x + r * 0.25, c.y + r * 0.45, r, r * 0.55, 10), SHADOW, 0.25);
  paint(d, oval(c.x, c.y, r, r * 0.92, 12), DROP, { alpha: 0.75, shadow: 0.35, hatch: 0, line: 0.35, lineAlpha: 0.7, gloss: true });
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.35, Math.max(0.25, r * 0.3), PAPER_FILL, 1);
  d.pen.hair([pt(c.x - r * 0.4, c.y + r * 0.55), pt(c.x + r * 0.5, c.y + r * 0.4)], 0.25, PAPER_FILL, 0.6);
}

/** Frost on a bump: a few tiny crystals, white feathers of ice. */
function frost(d: Draw, c: Pt, r: number): void {
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI + 0.3;
    d.pen.hair([pt(c.x - Math.cos(a) * r, c.y - Math.sin(a) * r), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)], 0.28, FROST, 0.95);
  }
  d.pen.dot(c.x, c.y, r * 0.35, FROST, 0.95);
}

/**
 * The wing cases: dark and lit from the upper left, the waxy bloom pale in
 * the troughs, dark glossy bumps in rows along the ridges, and water beaded
 * and frost caught on the highest bumps.
 */
function elytra(d: Draw, y: number): void {
  const shape = elytraShape(y);
  paint(d, shape, SHELL, { alpha: 1, shadow: 0.6, hatch: 0.2, line: 0.8 });
  const ks = [0.08, 0.3, 0.52, 0.74];
  d.pen.clipped(shape, () => {
    // The bloom: a pale waxy wash in the troughs between the ridges, strongest where the light falls.
    for (let i = 0; i < ks.length; i++) {
      const a = ridge(y, ks[i]!);
      const b = ridge(y, Math.min(0.98, ks[i]! + 0.2));
      dab(d, [...a, ...[...b].reverse()], BLOOM, 0.72 - i * 0.1, 0.5);
    }
    dab(d, oval(-2.5, y - 9.4, 7.5, 3.4, 14), BLOOM, 0.4, 1.8);
  });
  // The ridges, and the bumps along them: each a little dark dome with a glossy point.
  ks.forEach((k, i) => {
    const line = ridge(y, k);
    d.pen.hair(line, 0.4, mix(SHELL, SHADOW, 0.4), 0.75);
    for (let j = 2 + (i % 2); j < line.length - 1; j += 3) {
      if ((i * 7 + j * 3) % 5 === 0) continue;
      const p = line[j]!;
      d.pen.fill(oval(p.x, p.y, 0.6, 0.5, 8), mix(SHELL, SHADOW, 0.3), 1);
      d.pen.dot(p.x - 0.18, p.y - 0.18, 0.2, mix(SHELL_LIT, PAPER_FILL, 0.6), 0.9);
    }
  });
  const top = ridge(y, 0.08);
  for (const [j, r] of [[4, 0.9], [8, 1.15], [11, 0.75]] as const) bead(d, pt(top[j]!.x, top[j]!.y - 0.7), r);
  bead(d, pt(ridge(y, 0.3)[6]!.x, ridge(y, 0.3)[6]!.y - 0.5), 0.6);
  frost(d, pt(top[6]!.x, top[6]!.y - 0.6), 0.75);
  frost(d, pt(ridge(y, 0.3)[10]!.x, ridge(y, 0.3)[10]!.y - 0.4), 0.6);
  gleam(d, cub(pt(-9.4, y - 4), pt(-8.8, y - 8.4), pt(-5.4, y - 10.6), pt(-1.6, y - 10.9), 8), 0.6, 0.4);
}

/** The pronotum, the shield over its thorax, and the head under its front edge; `tucked` pulls the head in. */
function front(d: Draw, y: number, tucked: boolean): void {
  if (!tucked) {
    const head = oval(11.8, y - 3.2, 2.5, 2.1, 14);
    paint(d, head, HEAD, { alpha: 1, shadow: 0.55, hatch: 0, line: 0.6, gloss: true });
    d.pen.stipple(head, 10, () => 0.7, 0.18, mix(SHELL_LIT, PAPER_FILL, 0.3));
    paint(d, oval(12.6, y - 3.7, 1, 1.1, 10), EYE, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.3, gloss: true });
    d.pen.dot(12.35, y - 4.05, 0.28, PAPER_FILL, 0.9);
    // The mandibles and a palp, down at the front.
    d.pen.stroke([pt(13.8, y - 2.4), pt(14.8, y - 1.8), pt(14.5, y - 1.1)], 0.55, d.ink, 0.85, false);
    d.pen.hair([pt(13.2, y - 1.6), pt(13.8, y - 0.6), pt(14.4, y - 0.4)], 0.35, d.ink, 0.75);
  }
  const shield = [...cub(pt(6.6, y - 1.2), pt(6.4, y - 7), pt(9.6, y - 7.4), pt(11, y - 4.2), 10), ...cub(pt(11, y - 4.2), pt(11.2, y - 2.6), pt(9.6, y - 1.2), pt(6.6, y - 1.2), 6).slice(1, -1)];
  const at = tucked ? shield.map((p) => pt(p.x - 0.8, p.y + 0.6)) : shield;
  paint(d, at, SHELL, { alpha: 1, shadow: 0.55, hatch: 0.15, line: 0.7, gloss: true });
  d.pen.stipple(at, 18, () => 0.7, 0.2, mix(SHELL_LIT, PAPER_FILL, 0.3));
  gleam(d, [pt(7.6, y - 5.4), pt(8.6, y - 6.4), pt(9.8, y - 6)], 0.45, 0.6);
}

/** An antenna, beaded (eleven segments, as a darkling beetle's), from the head forward and up; `tucked`, laid back along the side. */
function antenna(d: Draw, y: number, f: number, tucked: boolean, far = false): void {
  const rise = far ? 2.6 : 0;
  const pts = tucked
    ? cub(pt(9.6, y - 1.6), pt(8, y - 0.8), pt(5, y - 0.4), pt(3.2, y - 0.6), 10)
    : cub(pt(13, y - 4.8), pt(14.6, y - 5.4 - f * 0.2 - rise * 0.3), pt(15.8, y - 5.6 - rise * 0.8), pt(17 - rise * 0.4, y - 6.4 - rise + f * 0.25), 10);
  d.pen.hair(pts, 0.32, far ? mix(LEG, SHADOW, 0.45) : LEG, 0.95);
  // Its segments, swelling a little to a club at the tip.
  pts.forEach((p, i) => {
    if (i < 2) return;
    d.pen.dot(p.x, p.y, 0.2 + (i > 7 ? 0.1 : 0), far ? mix(LEG, SHADOW, 0.45) : LEG, 1);
  });
}

/**
 * A leg from the body at `base`, up to the knee and down to the foot:
 * femur, the long thin tibia with spurs along it, and the tarsus, its
 * segments laid along the ground with a hooked claw. `far` legs are behind
 * the body, darker.
 */
function leg(d: Draw, base: Pt, knee: Pt, foot: Pt, dir: 1 | -1, far: boolean): void {
  const color = far ? mix(LEG, SHADOW, 0.45) : LEG;
  paint(d, capsule(base, knee, 1.2, 0.9), color, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.4, gloss: true });
  paint(d, capsule(knee, foot, 0.75, 0.55), color, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.35, gloss: true });
  setae(d, knee, foot, 3, 0.7, dir, 0.6);
  const t1 = pt(foot.x + dir * 1.2, foot.y + 0.05);
  const t2 = pt(foot.x + dir * 2.3, foot.y);
  d.pen.stroke([foot, t1, t2], 0.5, color, 1, false);
  for (const p of [t1, t2]) d.pen.dot(p.x, p.y - 0.05, 0.26, color, 1);
  d.pen.hair([t2, pt(t2.x + dir * 0.5, t2.y - 0.5)], 0.3, d.ink, 0.8);
  if (!far) gleam(d, [lerpPt(base, knee, 0.2), lerpPt(base, knee, 0.7)], 0.3, 0.5);
}

const lerpPt = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** Each leg's anchor, knee and foot when standing: front legs reaching forward, the middle ones down, the hind ones back. */
const LEGS: readonly { base: Pt; knee: Pt; foot: Pt; dir: 1 | -1 }[] = [
  { base: pt(5, -7), knee: pt(8.4, -9.4), foot: pt(12.2, 0), dir: 1 },
  { base: pt(1, -7), knee: pt(2, -10.8), foot: pt(4.4, 0), dir: 1 },
  { base: pt(-2.6, -7), knee: pt(-8.2, -10.8), foot: pt(-11.6, 0), dir: -1 },
];

/**
 * The tripod gait, as insects walk: front and hind legs of one side with
 * the middle leg of the other swing together while the other three hold
 * the ground. Over the three steps each foot swings forward lifted, then
 * pushes back on the ground; `side` 0 near, 1 far.
 */
function footing(i: number, side: number, f: number): { dx: number; lift: number } {
  const tripod = (i + side) % 2;
  const p = (f / 3 + tripod * 0.5) % 1;
  if (p < 0.4) return { dx: -1.4 + (p / 0.4) * 2.8, lift: 1.8 * Math.sin((p / 0.4) * Math.PI) + 0.6 };
  return { dx: 1.4 - ((p - 0.4) / 0.6) * 2.8, lift: 0 };
}

function legsAt(d: Draw, side: number, f: number, bob: number): void {
  LEGS.forEach((l, i) => {
    const { dx, lift } = footing(i, side, f);
    // The far legs a little further on and their feet a little higher, as the far side is seen from just above.
    const off = side ? 2.2 : 0;
    const up = side ? 1 : 0;
    const base = pt(l.base.x + off, l.base.y + bob - up);
    const knee = pt(l.knee.x + off + dx * 0.5, l.knee.y + bob - lift * 0.5 - up);
    const foot = pt(l.foot.x + off + dx, -lift - up);
    leg(d, base, knee, foot, l.dir, side === 1);
  });
}

/** Walking right on long legs, body held high: the tripod gait over `d.f`, the body bobbing a little. */
function walking(d: Draw): void {
  const f = d.f;
  const bob = [0, -0.3, -0.1][f]!;
  const y = -6.8 + bob;
  legsAt(d, 1, f, bob);
  antenna(d, y, (f + 1) % 3, false, true);
  // The underside between the legs: the abdomen's plates, just showing under the wing cases.
  paint(d, oval(-1.5, y + 0.1, 8.6, 1.6, 16), mix(LEG, SHADOW, 0.3), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.45 });
  elytra(d, y);
  legsAt(d, 0, f, bob);
  front(d, y, false);
  antenna(d, y, f, false);
}

/** Tucked against a dust storm: sat flat, legs folded under the shell with only the feet showing, head drawn in, antennae laid back. */
function tucked(d: Draw): void {
  const y = -1.2;
  for (const x of [-7.4, -1.6, 4.4]) {
    d.pen.stroke([pt(x, -0.4), pt(x + 1.6, -0.2), pt(x + 2.6, 0)], 0.8, LEG, 1, false);
    d.pen.dot(x + 2.6, -0.1, 0.4, LEG, 1);
  }
  elytra(d, y);
  front(d, y, true);
  antenna(d, y, 0, true);
}

/** The dew beetle facing right: `walk` with `d.f` as the step of its tripod gait, or `tucked` flat under its shell. */
export function drawBeetle(d: Draw, pose: BeetlePose): void {
  dab(d, oval(0, 0.3, pose === 'tucked' ? 12 : 14, 1.4, 18), SHADOW, 0.16, 1);
  if (pose === 'tucked') tucked(d);
  else walking(d);
}
