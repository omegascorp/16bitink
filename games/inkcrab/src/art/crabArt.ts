import type { Pt } from './pen';
import { capsule, closed, cub, type Draw, edge, eyeDot, mottle, oval, pt, ribbon, setae, shade, skin, TAU, tube } from './kit';
import { PAPER_FILL } from './palette';

/**
 * The hermit crab, after InkFish's: jointed legs, a big right claw with dark
 * fingertips, eyes on long stalks and two-tone antennae. It is drawn in two
 * layers around the shell: far legs and claw behind it, everything else in
 * front. Facing right, in the shared frame (see frame.ts). The player's
 * soft tail is never drawn: it always stays inside a shell, even when moving
 * house. A rival turned out of its shell shows it (see drawCrabBack).
 */
/** A hermit crab's colours: its body, the dark tips of its legs and claws, and its soft parts when it's out of a shell. */
export interface CrabColors {
  readonly body: string;
  readonly tip: string;
  readonly soft: string;
}

/** The player: orange, soft pink when exposed mid-swap (under red ink). */
export const PLAYER_COLORS: CrabColors = { body: '#d27a3a', tip: '#7a3a1a', soft: '#eaa79a' };
/** Rival hermit crabs: Florida's purple pinchers, so they never read as you. */
export const RIVAL_COLORS: CrabColors = { body: '#8a5a9e', tip: '#3d2347', soft: '#cdb0d8' };

const limbAlpha = (far: boolean): number => (far ? 0.62 : 0.4);

/** Foot offset for leg `i` in the current pose: alternate legs swing in opposite phase. */
function gait(d: Draw, i: number, stride: number, lift: number): Pt {
  const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + i * 0.45;
  return pt(Math.cos(ph) * stride, -Math.max(0, Math.sin(ph)) * lift);
}

/**
 * A jointed limb: one tapered capsule per segment, outlined, proximal
 * segments on top. Near limbs get a shadow line along their underside and
 * fine hairs, so they read as real jointed legs.
 */
function limb(d: Draw, pts: readonly Pt[], w: readonly number[], wash: string, far: boolean, tip: string): void {
  for (let i = pts.length - 2; i >= 0; i--) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = capsule(a, b, w[i]!, w[i + 1]!);
    d.pen.fill(seg, PAPER_FILL, 1);
    d.pen.fill(seg, i === pts.length - 2 ? tip : wash, i === pts.length - 2 ? 0.55 : limbAlpha(far));
    if (!far && w[i]! > 3) {
      // Shadow along the underside: a fine line just inside the lower edge.
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / l;
      const ny = (b.x - a.x) / l;
      const s = ny > 0 ? 1 : -1;
      const off = (r: number): number => r * 0.28 * s;
      d.pen.hair([pt(a.x + nx * off(w[i]!), a.y + ny * off(w[i]!)), pt(b.x + nx * off(w[i + 1]!), b.y + ny * off(w[i + 1]!))], 0.5, d.ink, 0.45);
      setae(d, a, b, 3, w[i]! * 0.55, s > 0 ? 1 : -1, 0.6);
    }
    d.pen.stroke(closed(seg), far ? 0.7 : 0.95, d.ink, far ? 0.7 : 1, false);
  }
}

const xf = (pts: readonly Pt[], ox: number, oy: number, s: number): Pt[] => pts.map((p) => pt(ox + p.x * s, oy + p.y * s));

/** A claw (cheliped) from the body forward; `open` lifts the moving finger. */
function claw(d: Draw, ox: number, oy: number, s: number, wash: string, open: number, far: boolean, tip: string): void {
  const L = (pts: readonly Pt[]): Pt[] => xf(pts.map((p) => pt(p.x - 34, p.y)), ox + 34 * s, oy, s);
  limb(d, L([pt(34, 8), pt(50, 6), pt(60, -2)]), [9 * s, 8 * s, 8 * s], wash, far, tip);
  const palm = L(oval(76, -6, 16, 10.5, 20));
  const fixed = tube(L(cub(pt(86, -1), pt(94, 1), pt(100, 0), pt(106, -5), 8)), 7 * s, 1.2 * s);
  const moving = tube(L(cub(pt(84, -13), pt(94, -16 - open), pt(101, -12 - open), pt(105, -7 - open * 1.4), 8)), 7 * s, 1.2 * s);
  for (const part of [fixed, moving, palm]) {
    d.pen.fill(part, PAPER_FILL, 1);
    d.pen.fill(part, wash, limbAlpha(far) + 0.08);
  }
  for (const f of [fixed, moving]) d.pen.clipped(f, () => d.pen.fill(L(oval(104, -6 - open * 0.6, 7, 9, 12)), tip, far ? 0.45 : 0.75));
  if (!far) {
    shade(d, palm, 0.5);
    // Granular bumps on the palm, each a tiny ring with its own shadow.
    for (let i = 0; i < 14; i++) {
      const p = L([pt(64 + d.pen.rng() * 24, -14 + d.pen.rng() * 14)])[0]!;
      d.pen.dot(p.x + 0.4 * s, p.y + 0.5 * s, 0.75 * s, d.ink, 0.5);
      d.pen.dot(p.x, p.y, 0.45 * s, PAPER_FILL, 0.8);
    }
    // Teeth along the cutting edges of both fingers.
    for (let i = 0; i < 6; i++) {
      const t = 88 + i * 2.8;
      const lo = L([pt(t, -2 + i * 0.1), pt(t + 1.2, -4.2)]);
      const hi = L([pt(t - 1, -11 - open * 0.6 + i * 0.4), pt(t + 0.2, -8.8 - open * 0.6 + i * 0.4)]);
      d.pen.hair(lo, 0.55, d.ink, 0.8);
      d.pen.hair(hi, 0.55, d.ink, 0.8);
    }
    // Hairs along the top of the palm.
    setae(d, L([pt(64, -15)])[0]!, L([pt(88, -16)])[0]!, 6, 2.6 * s, -1, 0.6);
  }
  for (const part of [fixed, moving, palm]) d.pen.stroke(closed(part), far ? 0.7 : 1.1, d.ink, far ? 0.7 : 1, false);
}

function legs(d: Draw, far: boolean, wash: string, tip: string): void {
  [0, 1].forEach((i) => {
    const s = gait(d, i + (far ? 1 : 0), 5, 5);
    const hip = far ? pt(22 + i * 6, 14) : pt(24 + i * 6, 20);
    const foot = pt((far ? 68 : 84) - i * 26 + s.x, d.g - (far ? 3 : 0) + s.y);
    const knee = pt(hip.x + (foot.x - hip.x) * 0.55, hip.y - 12);
    const ankle = pt(hip.x + (foot.x - hip.x) * 0.9, hip.y + (d.g - hip.y) * 0.5);
    limb(d, [hip, knee, ankle, foot], [7, 6, 4.4, 1], wash, far, tip);
    // Pale joint bands.
    if (!far) for (const p of [knee, ankle]) d.pen.dot(p.x, p.y, 1.4, PAPER_FILL, 0.8);
  });
}

/**
 * The soft abdomen of a hermit crab out of its shell: coiled into the
 * spiral of the shell it lived in, a round, fleshy whorl about as big as
 * the rest of it, resting on the sand behind its legs. A groove winds in
 * from the outer turn to a raised knob at the middle; the skin is finely
 * granular, the same colour as its soft legs.
 */
const COIL = { x: -1, y: 27, r: 19 } as const;

function abdomen(d: Draw, colors: CrabColors): void {
  const bob = [0, 0.6, -0.4][d.f]!;
  const c = pt(COIL.x, COIL.y + bob);
  const R = COIL.r;
  // Where it leaves the back of the head shield and runs into the top of the coil.
  const neck = ribbon(cub(pt(24, 8), pt(19, 6), pt(15, 9), pt(c.x + R * 0.45, c.y - R * 0.72), 10), (u) => 15 + u * 3).shape;
  skin(d, neck, colors.soft, 0.75);
  mottle(d, neck, 30, 2, 18, colors.tip);
  edge(d, neck, 1);
  const whorl = oval(c.x, c.y, R, R * 0.96, 28);
  skin(d, whorl, colors.soft, 0.75);
  mottle(d, whorl, 150, c.y - R, c.y + R, colors.tip);
  shade(d, whorl, 0.45, true);
  // The groove between the outer turn and the inner one, winding in anticlockwise from the top right.
  const groove = Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const a = -Math.PI / 3 - t * Math.PI * 2.1;
    const r = R * (0.86 - 0.5 * t);
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.96);
  });
  d.pen.stroke(groove, 1.1, d.ink, 0.85, false);
  // A soft shadow just inside the groove, so the outer turn reads as rolling over the inner.
  d.pen.stroke(groove.map((p) => pt(c.x + (p.x - c.x) * 0.9, c.y + (p.y - c.y) * 0.9)), 2.2, d.ink, 0.12, false);
  const knob = oval(c.x - R * 0.12, c.y - R * 0.04, R * 0.3, R * 0.27, 16);
  skin(d, knob, colors.soft, 0.85);
  shade(d, knob, 0.35);
  edge(d, knob, 0.9);
  edge(d, whorl, 1.2);
}

const OPEN = [1, 4, 2] as const;

/** Far legs and the small claw: drawn before the shell. `tail`: out of a shell for good, its soft abdomen shows too. */
export function drawCrabBack(d: Draw, naked = false, colors: CrabColors = PLAYER_COLORS, tail = false): void {
  const wash = naked ? colors.soft : colors.body;
  legs(d, true, wash, colors.tip);
  claw(d, 4, 2, 0.65, wash, (OPEN[d.f] ?? 1) * 0.6, true, colors.tip);
  if (tail) abdomen(d, colors);
}

/** Head, eyes, antennae, near legs and the big claw: drawn over the shell. */
export function drawCrabFront(d: Draw, naked = false, colors: CrabColors = PLAYER_COLORS): void {
  const { pen, f } = d;
  const wash = naked ? colors.soft : colors.body;
  const shield = oval(30, 8, 11, 9, 16);
  skin(d, shield, wash, 0.6);
  mottle(d, shield, 60, -2, 14, colors.tip);
  shade(d, shield, 0.45);
  // The groove across the shield, and its front edge's little rostrum.
  pen.hair(cub(pt(22, 6), pt(27, 2), pt(33, 2), pt(38, 6), 10), 0.6, d.ink, 0.7);
  edge(d, shield, 1.1);
  for (const [x, lean] of [[30, -2], [34, 3]] as const) {
    pen.stroke([pt(x, 2), pt(x + lean + 2, -16)], 2.6, d.ink, 1, false);
    // Pale rings along the stalk.
    for (const t of [0.35, 0.65]) pen.dot(x + (lean + 2) * t, 2 - 18 * t, 0.7, PAPER_FILL, 0.85);
    eyeDot(d, x + lean + 2, -19, 3.2);
  }
  const sway = [0, 3, -2][f]!;
  pen.stroke(cub(pt(38, 4), pt(64, -18), pt(84, -38 + sway), pt(100, -28 + sway), 12), 0.9, naked ? d.ink : colors.body, 1, false);
  pen.stroke(cub(pt(38, 4), pt(62, -8), pt(86, -14), pt(104, -4 - sway), 12), 0.7, d.ink, 0.8, false);
  legs(d, false, wash, colors.tip);
  claw(d, -10, 14, 1.05, wash, OPEN[f] ?? 1, false, colors.tip);
}
