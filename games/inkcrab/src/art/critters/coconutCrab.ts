import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, setae, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A coconut crab (Birgus latro), the biggest crab on land, side-on and
 * facing right: a hermit crab that has outgrown shells altogether. A heavy,
 * deep, armoured body, its gill chambers swollen at the back; the soft,
 * segmented abdomen tucked under it, hardened into plates; great unequal
 * claws, the left the bigger, strong enough to crack a coconut; thick
 * walking legs with dark, spined tips, the last pair small and tucked. It
 * hunts by smell, flicking its short forked antennules, the long antennae
 * swept forward. Deep blue-violet over the back and claws, going to
 * orange-red on the legs, abdomen and underside.
 */
const SHELL = '#5b5799';
const DEEP = '#312c5c';
const RUST = '#c4613f';
const WARM = '#e4a072';
const LEG = '#ad472b';
const TIP = '#1f1b30';

/** Hip x and foot x for the near legs, front first; the last is the small tucked leg. */
const LEGS: readonly (readonly [number, number, number])[] = [[8, 40, 1], [0, 22, 1], [-9, -26, 0.95], [-16, -40, 0.75]];

/**
 * A thick walking leg: up to a high knee, down to the wrist, and a long,
 * dark, curved tip with a row of spines, planted on its point.
 */
function legs(d: Draw, bottom: number, far: boolean): void {
  LEGS.forEach(([hx, fx, s], i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3.5;
    const lift = Math.max(0, Math.sin(ph)) * 4 * s;
    const sink = far ? 2.5 : 0;
    const hip = pt(hx + (far ? -3 : 0), bottom - 3 - sink);
    const foot = pt(fx + step + (far ? -4 : 0), d.g - lift * 0.4 - sink);
    const reach = foot.x - hip.x;
    const dir = Math.sign(reach);
    // Out from the hip nearly level to the knee, then the long shin down to the wrist.
    const knee = pt(hip.x + reach * 0.5, bottom - 9 * s - lift);
    const wrist = pt(hip.x + reach * 0.78, d.g - 13 * s - lift * 0.7 - sink * 0.3);
    const ankle = pt(hip.x + reach * 0.9, d.g - 8 * s - lift * 0.6 - sink * 0.3);
    limb(d, [hip, knee, wrist, ankle], { widths: [6.4 * s, 5.6 * s, 4.6 * s, 3.8 * s], wash: LEG, band: TIP, hairs: far ? 0 : 3, far });
    // The dactyl: dark, curved, ending in a point on the sand, spined along its underside.
    const tip = pt(foot.x + dir * 2, foot.y);
    const dactyl = tube(bezier(ankle, pt(ankle.x + dir * 3 * s, ankle.y + 3), tip, 8), 3.8 * s, 0.5);
    d.pen.fill(dactyl, PAPER_FILL, 1);
    d.pen.fill(dactyl, TIP, far ? 0.6 : 0.8);
    if (!far) setae(d, ankle, tip, 3, 1.6, dir > 0 ? 1 : -1, 0.8);
    d.pen.stroke(closed(dactyl), far ? 0.7 : 0.95, d.ink, far ? 0.55 : 1, false);
    if (!far) {
      // Pale spots on the leg segments.
      for (const t of [0.35, 0.7]) d.pen.dot(hip.x + (knee.x - hip.x) * t, hip.y + (knee.y - hip.y) * t - 1, 0.9 * s, WARM, 0.85);
    }
  });
}

/**
 * A great cheliped, `s` its size: a thick arm, a knobbed wrist and a heavy
 * palm studded with tubercles, the fingers short, curved and dark, with
 * crushing teeth.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(9, 2.4), 8 * s, 7 * s);
  const wrist = oval(x + 11.5 * s, y + 2 * s, 4.8 * s, 4.6 * s, 14);
  const palm = [
    ...cub(P(13, 1), P(13, -7.6), P(22, -9), P(31, -6.6), 12),
    ...cub(P(31, -6.6), P(36, -5), P(37, 2), P(33, 5), 8).slice(1),
    ...cub(P(33, 5), P(27, 9.4), P(17, 10), P(13, 1), 10).slice(1),
  ];
  const fixed = tube(bezier(P(32, 3), P(38, 5), P(41, 9), 8), 5.6 * s, 1.2 * s);
  const moving = tube(bezier(P(33, -4), P(41, -3), P(42.5, 7.6), 8), 5.2 * s, 1.2 * s);
  for (const part of [arm, wrist, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.85 : 0.8);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 41 * s, y + 6 * s, 5 * s, 6 * s, 10), TIP, far ? 0.6 : 0.85));
  if (!far) {
    // Rust under the palm, tubercles all over it, the crushing teeth between the fingers.
    pen.clipped(palm, () => tint(d, oval(x + 25 * s, y + 9 * s, 13 * s, 4 * s, 12), RUST, 0.55));
    pen.clipped(arm, () => tint(d, oval(x + 5 * s, y + 4 * s, 8 * s, 3 * s, 12), RUST, 0.5));
    for (let i = 0; i < 22; i++) {
      const gx = x + (15 + pen.rng() * 19) * s;
      const gy = y + (-6 + pen.rng() * 12) * s;
      pen.dot(gx + 0.35, gy + 0.4, 0.65 * s, d.ink, 0.45);
      pen.dot(gx - 0.1, gy - 0.1, 0.38 * s, PAPER_FILL, 0.7);
    }
    for (let k = 0; k < 3; k++) pen.dot(x + (36 + k * 1.6) * s, y + (3.6 + k * 1.4) * s, 0.8 * s, PAPER_FILL, 0.85);
    shade(d, palm, 0.45, true);
    glint(d, cub(P(16, -4), P(19, -7), P(24, -7.6), P(29, -6.4), 6), 1.2, 0.55);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.75 : 1.15, d.ink, far ? 0.55 : 1, false);
}

/** The abdomen curled under the back of the body: hard, rounded plates, rust-red and bristly. */
function abdomen(d: Draw, bottom: number): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(-18, bottom - 10), pt(-30, bottom - 14), pt(-42, bottom - 8), pt(-41, bottom + 3), 12),
    ...cub(pt(-41, bottom + 3), pt(-40, bottom + 12), pt(-28, bottom + 15), pt(-18, bottom + 9), 10).slice(1),
  ];
  skin(d, shape, RUST, 0.8);
  pen.clipped(shape, () => {
    tint(d, oval(-32, bottom - 6, 10, 4, 12), DEEP, 0.3);
    // The plates (tergites), each a curved band across the curl.
    for (const k of [0, 1, 2, 3]) {
      const a = -0.4 + k * 0.62;
      const c = pt(-26, bottom + 1);
      pen.hair(bezier(pt(c.x + Math.cos(a + Math.PI) * 6, c.y + Math.sin(a + Math.PI) * 6), pt(c.x + Math.cos(a + Math.PI) * 11 - 1, c.y + Math.sin(a + Math.PI) * 11), pt(c.x + Math.cos(a + Math.PI) * 17, c.y + Math.sin(a + Math.PI) * 17), 6), 0.8, d.ink, 0.6);
    }
    pen.stipple(shape, 50, () => 0.6, 0.4, DEEP);
  });
  shade(d, shape, 0.45, true);
  // Bristles standing out along the curl.
  for (let i = 4; i < shape.length - 4; i += 2) {
    const p = shape[i]!;
    pen.hair([p, pt(p.x - 1.4, p.y + 0.9)], 0.45, d.ink, 0.65);
  }
  edge(d, shape, 1.1);
}

export function coconutCrab(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(0, g - 1, 50, 3.2, 24), d.ink, 0.11);
  const bob = [0, -0.8, 0.4][d.f]!;
  const top = g - 50 + bob;
  const bottom = g - 25 + bob;
  legs(d, bottom, true);
  claw(d, 14, bottom - 8, 0.8, true);
  // The far antenna, swept forward behind the near one.
  const sniff = [0, 1, -0.6][d.f]!;
  pen.stroke(cub(pt(21, top + 11), pt(30, top - 2), pt(42, top - 12), pt(57, top - 10), 14), 0.8, d.ink, 0.55, false);
  abdomen(d, bottom);
  // Deep and heavy: the gill chambers swollen behind, the head lower and narrower in front, a short spike of a rostrum.
  const shape = [
    ...cub(pt(-22, bottom), pt(-31, bottom - 4), pt(-30, top + 4), pt(-18, top + 0.5), 10),
    ...cub(pt(-18, top + 0.5), pt(-6, top - 2.4), pt(6, top - 0.6), pt(10, top + 4), 10).slice(1),
    ...cub(pt(10, top + 4), pt(14, top + 6), pt(19, top + 7), pt(23, top + 9), 6).slice(1),
    pt(26, top + 9.8),
    pt(23.4, top + 11.6),
    ...cub(pt(23.4, top + 11.6), pt(25, top + 16), pt(24, bottom - 4), pt(20, bottom), 8).slice(1),
    ...cub(pt(20, bottom), pt(6, bottom + 3), pt(-10, bottom + 3), pt(-22, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.85);
  const groove = cub(pt(9, top + 4), pt(8, top + 12), pt(10, top + 18), pt(14, bottom - 1), 8);
  pen.clipped(shape, () => {
    // Darker over the crown, rust-red along the lower edge and the underside.
    tint(d, oval(-8, top + 3, 18, 6, 16), DEEP, 0.45);
    tint(d, [pt(-34, bottom - 7), pt(30, bottom - 7), pt(30, g), pt(-34, g)], RUST, 0.6);
    // The ridged gill chambers: fine wavy lines across the swollen back.
    for (let k = 0; k < 5; k++) {
      const y = top + 5 + k * 3.4;
      pen.hair(cub(pt(-27 + k * 0.6, y), pt(-16, y - 1.6), pt(-6, y + 1.2), pt(5, y - 0.4), 8), 0.5, d.ink, 0.45);
    }
    pen.stipple(shape, 120, (_, y) => (y < top + 12 ? 0.7 : 0.4), 0.45, DEEP);
  });
  shade(d, shape, 0.45, true);
  glint(d, cub(pt(-22, top + 4), pt(-16, top + 0.6), pt(-8, top - 0.6), pt(0, top + 0.4), 8), 1.3, 0.55);
  // The groove behind the head, and the hatched underside.
  pen.hair(groove, 0.8, d.ink, 0.6);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 4), pt(30, bottom - 4), pt(30, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.45 }));
  edge(d, shape, 1.4);
  // A short eyestalk under the rostrum, the dark eye at its end.
  const eyeBase = pt(22, top + 13);
  const stalk = capsule(eyeBase, pt(26.4, top + 10.4), 3, 3.2);
  skin(d, stalk, WARM, 0.8);
  edge(d, stalk, 0.8);
  pen.dot(26.6, top + 10.2, 2.4, d.ink, 0.95);
  pen.dot(27.3, top + 9.4, 0.75, PAPER_FILL, 0.95);
  // The forked antennules, flicking as it smells the air.
  for (const k of [0, 1]) {
    const base = pt(24.5 + k, top + 15 + k);
    const tipA = pt(base.x + 7 + k * 1.6, base.y - 8 - sniff * 2.4 + k * 1.6);
    pen.stroke(bezier(base, pt(base.x + 3, base.y - 2), tipA, 6), 1, d.ink, k ? 0.6 : 0.95, false);
    pen.hair([tipA, pt(tipA.x + 2.6, tipA.y - 0.4 + sniff)], 0.7, d.ink, k ? 0.55 : 0.9);
    pen.hair([tipA, pt(tipA.x + 1.8, tipA.y + 1.6 + sniff * 0.4)], 0.6, d.ink, k ? 0.5 : 0.85);
  }
  // The near antenna: long, ringed at its stout base, swept forward and up.
  const ant = cub(pt(24, top + 13), pt(32, top + 2), pt(44, top - 6), pt(60, top - 2 + sniff), 16);
  pen.stroke(ant.slice(0, 5), 2.2, RUST, 0.85, false);
  pen.stroke(ant, 0.9, d.ink, 0.95, false);
  legs(d, bottom, false);
  claw(d, 14, bottom - 2, 1.05, false);
}
