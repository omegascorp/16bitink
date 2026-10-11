import { bezier, cub, type Draw, edge, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * An Asian water monitor (Varanus salvator), side-on and facing right: a
 * long, low lizard on strong, sprawling legs with long curved claws, a
 * long neck carrying a long, flat-topped head with the nostril near the
 * snout tip, and a long, deep, flattened swimming tail with a keel along
 * its top. Dark grey-black, crossed by rows of pale yellow eye-spots that
 * become plain bands down the tail, a cream throat and belly. The forked
 * tongue flicks out as it tastes the air.
 */
const SKIN = '#45453d';
const DARK = '#24241f';
const SPOT = '#ead48a';
const BELLY = '#d8cd9c';
const LEG = '#4c4b42';
const TONGUE = '#6b5a78';
/** The head's tilt from level, radians (nose down). */
const HEAD_TILT = 0.1;

/** Width along the body, tail tip (0) to the nape (1). */
function girth(u: number): number {
  if (u < 0.5) return 1.4 + (u / 0.5) ** 1.1 * 9.6;
  if (u < 0.86) return 11 + Math.sin(((u - 0.5) / 0.36) * Math.PI) * 3.4;
  return 11 - ((u - 0.86) / 0.14) * 2.4;
}

/**
 * Strong, sprawling legs stepping in diagonal pairs: the hind knee forward,
 * the elbow back, thick wrists, and five toes, each with a long, hooked claw.
 */
function legs(d: Draw, spine: readonly Pt[], far: boolean): void {
  [0.52, 0.8].forEach((u, i) => {
    const at = spine[Math.round(u * (spine.length - 1))]!;
    const ph = -d.f * (TAU / 3) + i * Math.PI + (far ? Math.PI : 0);
    const step = Math.cos(ph) * 5;
    const lift = Math.max(0, Math.sin(ph)) * 3;
    const dir = i === 0 ? 1 : -1;
    const sink = far ? 1.5 : 0;
    const hip = pt(at.x + (far ? 3 : 0), at.y + 3 - sink);
    const knee = pt(hip.x + dir * 6 + step * 0.4, hip.y + 6 - lift);
    const foot = pt(hip.x - dir * 1 + step, d.g - 2 - lift - sink);
    limb(d, [hip, knee, foot], { widths: i === 0 ? [6, 4, 2.6] : [5.2, 3.6, 2.4], wash: LEG, far, line: 0.9 });
    // Five toes fanned forward, each ending in a dark, curved claw.
    for (const k of [0, 1, 2, 3, 4]) {
      const reach = 3 + (k === 2 || k === 3 ? 1.6 : k * 0.4);
      const tip = pt(foot.x + reach + (k - 2) * 0.7, d.g - lift * 0.4 - sink + (k === 0 ? -0.8 : 0));
      d.pen.stroke(bezier(foot, pt((foot.x + tip.x) / 2, tip.y - 0.6), tip, 4), far ? 0.6 : 0.9, d.ink, far ? 0.5 : 0.95, false);
      d.pen.hair(bezier(tip, pt(tip.x + 1.2, tip.y - 0.3), pt(tip.x + 1.6, tip.y + 0.6), 3), far ? 0.4 : 0.6, DARK, far ? 0.5 : 0.95);
    }
  });
}

/**
 * The forked tongue, flicking: right out on the first frame, half out on
 * the last, drawn in between. `m` is the mouth's tip.
 */
function tongue(d: Draw, m: Pt): void {
  const len = [9, 0, 5][d.f]!;
  if (len === 0) return;
  const wave = d.f === 0 ? 1 : -1;
  const fork = pt(m.x + len, m.y + 1.2 + wave * 0.6);
  d.pen.stroke(bezier(m, pt(m.x + len * 0.5, m.y + 1.6 - wave * 0.8), fork, 6), 1.3, TONGUE, 0.95, false);
  d.pen.hair(bezier(m, pt(m.x + len * 0.5, m.y + 1.6 - wave * 0.8), fork, 6), 0.45, d.ink, 0.9);
  for (const sgn of [-1, 1]) d.pen.stroke([fork, pt(fork.x + 2.8, fork.y + sgn * 1.5)], 0.8, d.ink, 0.95, false);
}

/**
 * The head, set on the nape at `n` and tilted by `ang`: long and narrow,
 * flat over the crown, tapering to a blunt snout with the nostril near
 * its tip; a long lip line, the eye under a heavy brow, a dark streak back
 * from it, the ear opening, and pale spots over the crown.
 */
function head(d: Draw, n: Pt, ang: number): void {
  const { pen } = d;
  const [c, s] = [Math.cos(ang), Math.sin(ang)];
  const P = (x: number, y: number): Pt => pt(n.x + x * c - y * s, n.y + x * s + y * c);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  const outline = map([
    ...cub(pt(-4, -4.6), pt(3, -6.4), pt(12, -5.6), pt(19, -3.4), 10),
    ...cub(pt(19, -3.4), pt(21.6, -2.6), pt(22, 0.2), pt(20, 0.8), 4).slice(1),
    ...cub(pt(20, 0.8), pt(14, 2), pt(6, 4.6), pt(-1, 5.4), 8).slice(1),
  ]);
  const shape = [...outline, P(-5, 5.4)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SKIN, 0.82);
  pen.clipped(shape, () => {
    // The pale lip and throat, dark streak behind the eye, pale spots on the crown.
    tint(d, map(oval(6, 4.6, 13, 2.6, 14)), BELLY, 0.85);
    pen.stroke(map([pt(9, -1.4), pt(3, -0.4), pt(-4, 0.6)]), 1.6, DARK, 0.7, false);
    for (const [sx, sy] of [[1, -4], [5, -4.6], [9.5, -4.4], [-2.5, -2.6], [14, -3.4]] as const) {
      const p = P(sx, sy);
      pen.dot(p.x, p.y, 0.6, SPOT, 0.85);
    }
    pen.stipple(shape, 50, () => 0.4, 0.3, DARK);
  });
  shade(d, shape, 0.3);
  pen.stroke(outline, 1.1, d.ink, 1, false);
  // Lip line, ear, eye and brow, nostril.
  pen.hair(map(bezier(pt(20, 0.4), pt(13, 1.6), pt(4, 2.4), 8)), 0.65, d.ink, 0.9);
  const ear = P(-2.4, 1);
  pen.fill(oval(ear.x, ear.y, 1, 1.5, 10), d.ink, 0.6);
  const e = P(8.6, -2.2);
  pen.fill(oval(e.x, e.y, 1.4, 1.2, 10), d.ink, 0.95);
  pen.dot(e.x + 0.45, e.y - 0.45, 0.4, PAPER_FILL, 0.95);
  pen.hair(map(bezier(pt(6.4, -3.4), pt(8.6, -4.8), pt(11, -3.4), 4)), 0.6, d.ink, 0.85);
  const nos = P(17.6, -2.2);
  pen.fill(oval(nos.x, nos.y, 0.7, 0.45, 8), d.ink, 0.85);
  tongue(d, P(21, 0.2));
}

/** Rows of pale eye-spots across the back and flank, turning to plain bands down the tail. */
function markings(d: Draw, body: ReturnType<typeof ribbon>, spine: readonly Pt[]): void {
  const { pen } = d;
  const n = spine.length;
  for (let k = 3; k < n - 4; k += 3) {
    const a = body.top[k]!;
    const b = body.bot[k]!;
    const m = spine[k]!;
    if (k < n * 0.48) {
      // A pale band across the tail.
      pen.stroke([pt(a.x - 0.6, a.y), pt(m.x, m.y), pt(b.x + 0.6, b.y)], Math.max(0.6, (b.y - a.y) * 0.16), SPOT, 0.7, false);
      continue;
    }
    // A transverse row of ringed spots: pale with dark centres.
    for (const t of [0.2, 0.45, 0.7]) {
      const p = pt(a.x + (b.x - a.x) * t + pen.jitter(0.6), a.y + (b.y - a.y) * t);
      pen.fill(oval(p.x, p.y, 1.2, 1, 8), SPOT, 0.85);
      pen.dot(p.x, p.y, 0.4, DARK, 0.7);
    }
  }
}

export function monitor(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-2, g - 1, 52, 3, 24), d.ink, 0.1);
  // The tail trailing on the sand, the body slung low between the legs, the long neck raising the head.
  const sway = [0, 1, -0.6][d.f]!;
  const spine = [
    ...cub(pt(-63, g - 3 + sway), pt(-48, g - 2), pt(-32, g - 9), pt(-18, g - 16), 28),
    ...cub(pt(-18, g - 16), pt(-4, g - 19), pt(10, g - 19), pt(20, g - 20), 18).slice(1),
    ...cub(pt(20, g - 20), pt(24, g - 21), pt(26, g - 26), pt(31, g - 27), 8).slice(1),
  ];
  const body = ribbon(spine, girth);
  const nape = spine[spine.length - 1]!;
  legs(d, spine, true);
  skin(d, body.shape, SKIN, 0.85);
  pen.clipped(body.shape, () => {
    // Cream belly and throat below the flank line.
    const flank = body.bot.map((p, i) => pt(p.x, (p.y * 2 + spine[i]!.y) / 3));
    pen.fill([...flank, ...[...body.bot].reverse()], BELLY, 0.7);
    tint(d, oval(-4, g - 22, 26, 3, 16), DARK, 0.35);
    markings(d, body, spine);
    // Small, bead-like scales.
    pen.stipple(body.shape, 220, (_, y) => (y < g - 17 ? 0.55 : 0.3), 0.35, DARK);
  });
  shade(d, body.shape, 0.4);
  // The keel along the top of the flattened tail: a low row of scales.
  for (let k = 2; k < 22; k++) {
    const a = body.top[k]!;
    const nx = body.top[k + 1]!;
    pen.hair([a, pt((a.x + nx.x) / 2, Math.min(a.y, nx.y) - 0.8), nx], 0.45, d.ink, 0.6);
  }
  // The skin folds of the neck.
  for (const k of [spine.length - 6, spine.length - 3]) pen.hair(bezier(body.top[k]!, pt(spine[k]!.x - 1.2, spine[k]!.y), body.bot[k]!, 5), 0.45, d.ink, 0.45);
  edge(d, body.shape, 1.15);
  // The head held level off the raised neck, nose a touch down.
  head(d, nape, HEAD_TILT);
  legs(d, spine, false);
}
