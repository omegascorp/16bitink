import type { Pt } from './pen';
import { add, bezier, capsule, closed, cub, type Draw, edge, eyeDot, lerp, mottle, oval, pt, ribbon, skin, TAU, tube } from './kit';
import { PAPER_FILL } from './palette';

/**
 * The hermit crab, after InkFish's: jointed legs, a big right claw with dark
 * fingertips, eyes on long stalks and two-tone antennae. It is drawn in two
 * layers around the shell: far legs and claw behind it, everything else in
 * front. Facing right, in the shared frame (see frame.ts).
 */
const BODY = '#d27a3a';
const TIP = '#7a3a1a';
/** The naked crab's soft parts, under red ink. */
const SOFT = '#eaa79a';

const limbAlpha = (far: boolean): number => (far ? 0.62 : 0.4);

/** Foot offset for leg `i` in the current pose: alternate legs swing in opposite phase. */
function gait(d: Draw, i: number, stride: number, lift: number): Pt {
  const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + i * 0.45;
  return pt(Math.cos(ph) * stride, -Math.max(0, Math.sin(ph)) * lift);
}

/** A jointed limb: one tapered capsule per segment, outlined, proximal segments on top. */
function limb(d: Draw, pts: readonly Pt[], w: readonly number[], wash: string, far: boolean): void {
  for (let i = pts.length - 2; i >= 0; i--) {
    const seg = capsule(pts[i]!, pts[i + 1]!, w[i]!, w[i + 1]!);
    d.pen.fill(seg, PAPER_FILL, 1);
    d.pen.fill(seg, i === pts.length - 2 ? TIP : wash, i === pts.length - 2 ? 0.55 : limbAlpha(far));
    d.pen.stroke(closed(seg), far ? 0.7 : 0.95, d.ink, far ? 0.7 : 1, false);
  }
}

const xf = (pts: readonly Pt[], ox: number, oy: number, s: number): Pt[] => pts.map((p) => pt(ox + p.x * s, oy + p.y * s));

/** A claw (cheliped) from the body forward; `open` lifts the moving finger. */
function claw(d: Draw, ox: number, oy: number, s: number, wash: string, open: number, far: boolean): void {
  const L = (pts: readonly Pt[]): Pt[] => xf(pts.map((p) => pt(p.x - 34, p.y)), ox + 34 * s, oy, s);
  limb(d, L([pt(34, 8), pt(50, 6), pt(60, -2)]), [9 * s, 8 * s, 8 * s], wash, far);
  const palm = L(oval(76, -6, 16, 10.5, 20));
  const fixed = tube(L(cub(pt(86, -1), pt(94, 1), pt(100, 0), pt(106, -5), 8)), 7 * s, 1.2 * s);
  const moving = tube(L(cub(pt(84, -13), pt(94, -16 - open), pt(101, -12 - open), pt(105, -7 - open * 1.4), 8)), 7 * s, 1.2 * s);
  for (const part of [fixed, moving, palm]) {
    d.pen.fill(part, PAPER_FILL, 1);
    d.pen.fill(part, wash, limbAlpha(far) + 0.08);
  }
  for (const f of [fixed, moving]) d.pen.clipped(f, () => d.pen.fill(L(oval(104, -6 - open * 0.6, 7, 9, 12)), TIP, far ? 0.45 : 0.75));
  if (!far) {
    d.pen.hatch(palm, 2.8, 0.1, 0.5, { onlyBelow: oy - 4 * s, color: d.ink, alpha: 0.5 });
    // Granular bumps on the palm.
    for (let i = 0; i < 7; i++) {
      const p = L([pt(66 + d.pen.rng() * 20, -12 + d.pen.rng() * 8)])[0]!;
      d.pen.dot(p.x, p.y, 0.8 * s, d.ink, 0.6);
    }
  }
  for (const part of [fixed, moving, palm]) d.pen.stroke(closed(part), far ? 0.7 : 1.1, d.ink, far ? 0.7 : 1, false);
}

function legs(d: Draw, far: boolean, wash: string): void {
  [0, 1].forEach((i) => {
    const s = gait(d, i + (far ? 1 : 0), 5, 5);
    const hip = far ? pt(22 + i * 6, 14) : pt(24 + i * 6, 20);
    const foot = pt((far ? 68 : 84) - i * 26 + s.x, d.g - (far ? 3 : 0) + s.y);
    const knee = pt(hip.x + (foot.x - hip.x) * 0.55, hip.y - 12);
    const ankle = pt(hip.x + (foot.x - hip.x) * 0.9, hip.y + (d.g - hip.y) * 0.5);
    limb(d, [hip, knee, ankle, foot], [7, 6, 4.4, 1], wash, far);
    // Pale joint bands.
    if (!far) for (const p of [knee, ankle]) d.pen.dot(p.x, p.y, 1.4, PAPER_FILL, 0.8);
  });
}

const OPEN = [1, 4, 2] as const;

/** Far legs and the small claw: drawn before the shell. */
export function drawCrabBack(d: Draw, naked = false): void {
  const wash = naked ? SOFT : BODY;
  legs(d, true, wash);
  claw(d, 4, 2, 0.65, wash, (OPEN[d.f] ?? 1) * 0.6, true);
}

/** Head, eyes, antennae, near legs and the big claw: drawn over the shell. */
export function drawCrabFront(d: Draw, naked = false): void {
  const { pen, f } = d;
  const wash = naked ? SOFT : BODY;
  const shield = oval(30, 8, 11, 9, 16);
  skin(d, shield, wash, 0.6);
  mottle(d, shield, 60, -2, 14, TIP);
  edge(d, shield, 1.1);
  for (const [x, lean] of [[30, -2], [34, 3]] as const) {
    pen.stroke([pt(x, 2), pt(x + lean + 2, -16)], 2.6, d.ink, 1, false);
    eyeDot(d, x + lean + 2, -19, 3.2);
  }
  const sway = [0, 3, -2][f]!;
  pen.stroke(cub(pt(38, 4), pt(64, -18), pt(84, -38 + sway), pt(100, -28 + sway), 12), 0.9, naked ? d.ink : BODY, 1, false);
  pen.stroke(cub(pt(38, 4), pt(62, -8), pt(86, -14), pt(104, -4 - sway), 12), 0.7, d.ink, 0.8, false);
  legs(d, false, wash);
  claw(d, -10, 14, 1.05, wash, OPEN[f] ?? 1, false);
}

/** The soft abdomen a shell normally hides: a pale coil curling back where the shell would be. */
export function drawAbdomen(d: Draw): void {
  // A shrinking spiral from the back of the head, turning down, back and up into a curl.
  const spine: Pt[] = [];
  for (let i = 0; i <= 36; i++) {
    const th = 0.25 + (i / 36) * Math.PI * 2.1;
    const r = 30 * Math.exp(-0.2 * th);
    spine.push(pt(-8 + Math.cos(th) * r * 1.3, 8 + Math.sin(th) * r));
  }
  const { top, bot, shape } = ribbon(spine, (u) => 24 * (1 - u * 0.72) + 3);
  skin(d, shape, SOFT, 0.75);
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 380, () => 0.4, 0.5, d.ink);
    for (let i = 3; i < 34; i += 4) d.pen.hair(bezier(top[i]!, add(lerp(top[i]!, bot[i]!, 0.5), pt(1.5, 0)), bot[i]!, 6), 0.6, d.ink, 0.55);
  });
  edge(d, shape, 1.4);
}
