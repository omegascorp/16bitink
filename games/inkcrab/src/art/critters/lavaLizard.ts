import { bezier, cub, type Draw, edge, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A male Galápagos lava lizard (Microlophus), side-on and facing right: a
 * small, slim lizard up on splayed legs, head raised, grey-brown speckled
 * darker, a pale stripe down each side from the eye, a low crest of spiny
 * scales along the back, an orange-red flush at the throat and a long tail
 * tapering to a thread, banded towards the tip.
 */
const SKIN = '#8f7f69';
const DARK = '#4a3b30';
const STRIPE = '#e6dab8';
const BELLY = '#ddd1b2';
const THROAT = '#d8573a';
const LEG = '#8a7a64';

/** Width along the body, tail tip (0) to the nape (1). */
function girth(u: number): number {
  if (u < 0.62) return 0.7 + (u / 0.62) ** 1.5 * 7.3;
  return 8 + Math.sin(((u - 0.62) / 0.38) * Math.PI * 0.85) * 4;
}

/**
 * Splayed legs stepping in diagonal pairs: the hind knee cocked forward, the
 * elbow back, long thin toes fanned (back on the hind foot, forward on the front).
 */
function legs(d: Draw, spine: readonly Pt[], far: boolean): void {
  [0.6, 0.9].forEach((u, i) => {
    const at = spine[Math.round(u * (spine.length - 1))]!;
    const ph = -d.f * (TAU / 3) + i * Math.PI + (far ? Math.PI : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 2.6;
    const dir = i === 0 ? 1 : -1;
    const sink = far ? 1.5 : 0;
    const hip = pt(at.x + (far ? 2 : 0), at.y + 2.5 - sink);
    const knee = pt(hip.x + dir * 5 + step * 0.4, hip.y + 3.5 - lift);
    const foot = pt(hip.x - dir * 1.5 + step, d.g - 1.6 - lift - sink);
    limb(d, [hip, knee, foot], { widths: i === 0 ? [4.2, 2.8, 1.6] : [3.4, 2.4, 1.5], wash: LEG, far, line: 0.8 });
    // Four long thin toes, the hind foot's longest toe trailing.
    for (const k of [0, 1, 2, 3]) {
      const reach = i === 0 ? 3.4 + k * 1.5 : 3 + (k === 2 ? 1.2 : k * 0.6);
      const tip = pt(foot.x - dir * reach + (k - 1.5) * 0.9, d.g - lift * 0.4 - sink + (k === 0 ? -0.6 : 0));
      d.pen.stroke(bezier(foot, pt((foot.x + tip.x) / 2, tip.y - 0.4), tip, 4), far ? 0.45 : 0.65, d.ink, far ? 0.5 : 0.9, false);
    }
  });
}

/**
 * The head, set on the nape at `n` and tilted by `ang`: a blunt, rounded
 * wedge with a deep jowl, the red throat under it, eye under a scaly brow,
 * lip line, nostril and the ear opening at the back of the jaw.
 */
function head(d: Draw, n: Pt, ang: number): void {
  const { pen } = d;
  const [c, s] = [Math.cos(ang) * 1.1, Math.sin(ang) * 1.1];
  const P = (x: number, y: number): Pt => pt(n.x + x * c - y * s, n.y + x * s + y * c);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  // Crown and snout, then the jowl back to the neck; the back of the head stays open (no contour).
  const outline = map([
    ...cub(pt(-3, -4.4), pt(2, -6), pt(8, -5.4), pt(13, -2.4), 8),
    ...cub(pt(13, -2.4), pt(14.8, -1.4), pt(14.8, 0.6), pt(13.2, 1.2), 4).slice(1),
    ...cub(pt(13.2, 1.2), pt(9, 2.4), pt(5, 4.6), pt(-0.5, 5), 6).slice(1),
  ]);
  const shape = [...outline, P(-4, 4.4)];
  // Washed in register, so no paper shows where it joins the neck.
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN, 0.78);
  pen.clipped(shape, () => {
    tint(d, map(oval(2.5, 4.6, 7, 3, 12)), THROAT, 0.7);
    tint(d, map(oval(5, -4.6, 6, 1.6, 10)), DARK, 0.35);
    pen.stipple(shape, 40, () => 0.4, 0.3, DARK);
  });
  shade(d, shape, 0.32);
  pen.stroke(outline, 1.1, d.ink, 1, false);
  // Lip line, ear opening, eye with its brow, nostril, crown scales.
  pen.hair(map(bezier(pt(13, 0.6), pt(9, 1.6), pt(4.5, 1.8), 6)), 0.65, d.ink, 0.9);
  const ear = P(-0.6, 0.8);
  pen.fill(oval(ear.x, ear.y, 1, 1.4, 10), d.ink, 0.65);
  const e = P(6, -1.8);
  pen.fill(oval(e.x, e.y, 1.5, 1.3, 10), d.ink, 0.92);
  pen.dot(e.x + 0.5, e.y - 0.5, 0.45, PAPER_FILL, 0.95);
  pen.hair(map(bezier(pt(3.8, -3), pt(6, -4.3), pt(8.2, -3), 4)), 0.55, d.ink, 0.8);
  const nos = P(11.8, -1.2);
  pen.dot(nos.x, nos.y, 0.4, d.ink, 0.8);
  for (const x of [1, 9.5]) pen.hair(map([pt(x, -4.6), pt(x + 0.8, -4)]), 0.35, d.ink, 0.45);
}

export function lavaLizard(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-4, g - 1, 40, 3, 24), d.ink, 0.1);
  // The spine: a long tail trailing on the rock, the body raised on its legs, the neck lifting the head.
  const spine = [
    ...cub(pt(-58, g - 2.2), pt(-44, g - 3), pt(-28, g - 9), pt(-12, g - 11.5), 28),
    ...cub(pt(-12, g - 11.5), pt(0, g - 13.5), pt(12, g - 14), pt(22, g - 17), 16).slice(1),
  ];
  const body = ribbon(spine, girth);
  const nape = spine[spine.length - 1]!;
  legs(d, spine, true);
  skin(d, body.shape, SKIN, 0.78);
  pen.clipped(body.shape, () => {
    // A pale belly below the flank, the red of the throat running onto the chest.
    const flank = body.bot.map((p, i) => pt(p.x, (p.y + spine[i]!.y * 2) / 3));
    pen.fill([...flank, ...[...body.bot].reverse()], BELLY, 0.8);
    tint(d, oval(nape.x - 2, nape.y + 5, 7, 3, 12), THROAT, 0.55);
    // Dark mottling over the back, chevrons down the tail.
    for (let i = 0; i < 20; i++) {
      const k = 24 + Math.floor(pen.rng() * 19);
      const a = body.top[k]!;
      const m = spine[k]!;
      tint(d, oval((a.x + m.x) / 2 + pen.jitter(1.5), (a.y + m.y) / 2 + pen.jitter(1), 1 + pen.rng() * 1.4, 0.7 + pen.rng() * 0.8, 8), DARK, 0.45);
    }
    for (let k = 5; k < 26; k += 3) {
      const a = body.top[k]!;
      const b = body.bot[k]!;
      pen.stroke([pt(a.x - 0.4, a.y), pt(b.x + 0.6, b.y)], Math.max(0.6, (b.y - a.y) * 0.22), DARK, 0.55, false);
    }
    // The pale stripe from the nape down the flank to the hip.
    const stripe = body.top.slice(26).map((p, i) => pt(p.x, (p.y + spine[26 + i]!.y) / 2 + 0.6));
    pen.stroke(stripe, 1.3, STRIPE, 0.85, false);
    // Keeled scales: fine stipple.
    pen.stipple(body.shape, 160, (_, y) => (y < g - 13 ? 0.5 : 0.25), 0.35, DARK);
  });
  shade(d, body.shape, 0.38);
  // The low crest of spiny scales along the back, from the nape to the base of the tail.
  for (let k = 24; k < spine.length - 2; k++) {
    const a = body.top[k]!;
    const nx = body.top[k + 1]!;
    pen.hair([a, pt((a.x + nx.x) / 2 - 0.3, Math.min(a.y, nx.y) - 0.9), nx], 0.4, d.ink, 0.55);
  }
  edge(d, body.shape, 1.1);
  const prev = spine[spine.length - 4]!;
  head(d, nape, Math.atan2(nape.y - prev.y, nape.x - prev.x) + 0.3);
  legs(d, spine, false);
}
