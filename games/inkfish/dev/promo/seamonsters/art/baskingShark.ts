import { ellipse, INK, PAPER, type Pen } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../../foodchain/kit';
import { boilOf, paint, penFor, type Pt, range, rot as turn, spline, trace } from '../../swallowyou/art/ink';

/**
 * The basking shark, side on, in the game's pen and ink painted with wash
 * and shading: a grey-brown back over a paler belly, the long conical snout
 * overhanging a huge mouth, five gill slits that almost ring the head, the
 * tall triangular first dorsal, a crescent tail and a small eye. Feeding, the
 * lower jaw drops into a gaping tunnel (rings of white gill rakers inside)
 * and the slits flare open.
 *
 * It also rots, for the 1977 Zuiyo Maru "plesiosaur": the jaw drops away,
 * the head and gill flesh fall off leaving the small braincase on a long thin
 * neck of spine, the pectoral and pelvic fins turn into four "flippers", the
 * lower tail lobe goes so the tail is a long thin "tail", and the skin turns
 * pale, ragged and stringy. At rot = 1 the silhouette reads as a plesiosaur,
 * pale grey-pink, fibres hanging (no blood, no guts).
 *
 * Local px: the snout's tip at x = 0, facing right, the tail tip at
 * x = -LEN, y down, the body's middle line at y = 0.
 */

const LEN = 1000;

export interface BaskingSharkPose {
  /** Mouth, 0 shut .. 1 the open feeding tunnel, gills flared. */
  readonly gape?: number;
  /** Tail-beat phase, radians. */
  readonly tail?: number;
  /** 0 a live shark .. 1 the rotted "pseudo-plesiosaur" carcass. */
  readonly rot?: number;
}

/** Body height (fins included) over length, for laying it out beside "you". */
export const BASKING_SHARK_HEIGHT = 0.39;

// ---------------------------------------------------------------- palettes

interface Palette {
  readonly back: string;
  readonly top: string;
  readonly flank: string;
  readonly side: string;
  readonly belly: string;
}

/** Grey-brown, the belly paler. */
const LIVE: Palette = { back: '#2e2c29', top: '#45423c', flank: '#69655b', side: '#9a9384', belly: '#d4cdbd' };
/** The carcass: pale grey-pink, bleached. */
const DEAD: Palette = { back: '#a38e88', top: '#b9a49c', flank: '#cdbab1', side: '#ddcfc5', belly: '#ebe2d8' };
const FIBRE = '#f1e8de';
const SHEEN = '#e6ebe8';

// ---------------------------------------------------------------- small helpers

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const lerpPt = (a: Pt, b: Pt, k: number): Pt => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const smooth = (a: number, b: number, v: number): number => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

function mix(a: string, b: string, k: number): string {
  const ch = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(lerp(ch(a, i), ch(b, i), clamp01(k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const paletteOf = (k: number): Palette => ({
  back: mix(LIVE.back, DEAD.back, k), top: mix(LIVE.top, DEAD.top, k), flank: mix(LIVE.flank, DEAD.flank, k),
  side: mix(LIVE.side, DEAD.side, k), belly: mix(LIVE.belly, DEAD.belly, k),
});

/** y on a line (x running backwards from the snout) at x. */
function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return line[line.length - 1]!.y;
}

const quad = (a: Pt, c: Pt, b: Pt, n: number): Pt[] =>
  range(n, (u) => ({ x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y }));

/** A soft line in one pass (no beads where the pen's segments overlap): sheen, lining, streaks. */
function soft(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, color: string, alpha: number): void {
  if (alpha <= 0.005 || pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trace(ctx, pts, false);
  ctx.stroke();
  ctx.restore();
}

/** An ellipse turned so its long axis (`major`) runs along angle `tilt`. */
function ring(c: Pt, major: number, minor: number, tilt: number, n = 28): Pt[] {
  const d = { x: Math.cos(tilt), y: Math.sin(tilt) };
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: c.x + d.x * Math.cos(a) * major - d.y * Math.sin(a) * minor, y: c.y + d.y * Math.cos(a) * major + d.x * Math.sin(a) * minor };
  });
}

// ---------------------------------------------------------------- shape (local px)

/** The live shark's back, snout tip to tail stock: the long conical snout, the high shoulders. */
const LIVE_TOP: readonly Pt[] = spline([
  { x: 0, y: 0 }, { x: -12, y: -9 }, { x: -35, y: -24 }, { x: -70, y: -40 }, { x: -120, y: -56 }, { x: -180, y: -68 }, { x: -260, y: -80 },
  { x: -340, y: -88 }, { x: -420, y: -90 }, { x: -500, y: -85 }, { x: -580, y: -74 }, { x: -660, y: -58 }, { x: -740, y: -40 },
  { x: -800, y: -27 }, { x: -845, y: -18 }, { x: -890, y: -15 },
], 6);

/** Its underside: under the snout, the upper lip back to the corner of the mouth, the throat, the belly. */
const LIVE_BOTTOM: readonly Pt[] = spline([
  { x: 0, y: 0 }, { x: -10, y: 7 }, { x: -26, y: 13 }, { x: -44, y: 17 }, { x: -86, y: 20 }, { x: -124, y: 25 }, { x: -150, y: 32 }, { x: -158, y: 45 },
  { x: -172, y: 58 }, { x: -198, y: 66 }, { x: -240, y: 73 }, { x: -300, y: 81 }, { x: -380, y: 86 }, { x: -460, y: 84 }, { x: -540, y: 76 },
  { x: -620, y: 62 }, { x: -700, y: 45 }, { x: -770, y: 31 }, { x: -830, y: 20 }, { x: -890, y: 15 },
], 6);

/** The carcass: a small braincase with its pointed rostrum, the thin neck of spine, the bulky torso, the tail. */
const DEAD_TOP: readonly Pt[] = spline([
  { x: 0, y: 1 }, { x: -10, y: -6 }, { x: -25, y: -14 }, { x: -45, y: -19 }, { x: -62, y: -17 }, { x: -80, y: -12 }, { x: -100, y: -10 },
  { x: -150, y: -10 }, { x: -200, y: -12 }, { x: -250, y: -16 }, { x: -290, y: -24 }, { x: -330, y: -42 }, { x: -370, y: -62 },
  { x: -420, y: -78 }, { x: -480, y: -86 }, { x: -550, y: -85 }, { x: -620, y: -74 }, { x: -680, y: -56 }, { x: -730, y: -38 },
  { x: -790, y: -25 }, { x: -850, y: -18 }, { x: -890, y: -15 },
], 6);

const DEAD_BOTTOM: readonly Pt[] = spline([
  { x: 0, y: 1 }, { x: -10, y: 8 }, { x: -28, y: 14 }, { x: -50, y: 16 }, { x: -70, y: 14 }, { x: -88, y: 11 }, { x: -110, y: 10 },
  { x: -160, y: 11 }, { x: -210, y: 13 }, { x: -260, y: 19 }, { x: -300, y: 30 }, { x: -340, y: 52 }, { x: -390, y: 76 },
  { x: -450, y: 90 }, { x: -520, y: 94 }, { x: -590, y: 88 }, { x: -650, y: 72 }, { x: -700, y: 52 }, { x: -750, y: 34 },
  { x: -810, y: 22 }, { x: -890, y: 16 },
], 6);

/** The body hands over to the tail here (the tail is drawn behind and runs forward under it). */
const X_END = -872;
/** The x stations the outline is sampled at (closer round the pointed snout). */
const XS: readonly number[] = (() => {
  const out: number[] = [];
  for (let x = 0; x > X_END; x -= x > -40 ? 2.5 : 7) out.push(x);
  out.push(X_END);
  return out;
})();

/** The lower jaw (shut): the lower lip front to hinge, its back edge along the throat crease, the chin back to front. */
const HINGE: Pt = { x: -150, y: 33 };
const GAPE_MAX = 1.1;
const LOWER_LIP: readonly Pt[] = spline([{ x: -44, y: 18.5 }, { x: -86, y: 21.5 }, { x: -124, y: 26.5 }, { x: -150, y: 33.5 }], 5);
const CHIN: readonly Pt[] = spline([{ x: -44, y: 18.5 }, { x: -50, y: 28 }, { x: -64, y: 39 }, { x: -88, y: 50 }, { x: -120, y: 57 }, { x: -150, y: 60 }, { x: -172, y: 61 }], 5);
const JAW: readonly Pt[] = [...LOWER_LIP, { x: -160, y: 45 }, ...[...CHIN].reverse()];

/** The five gill slits, front to back. */
const GILLS: readonly number[] = [-180, -207, -234, -261, -288];

// ---------------------------------------------------------------- the stage of the pose

interface Stage {
  /** Effective gape (nothing once the jaw has fallen away). */
  readonly gape: number;
  /** How far each part has rotted, 0 .. 1: the jaw falling away, head and gills to neck, torso, tail, fins to flippers, skin, fibres. */
  readonly jaw: number;
  readonly head: number;
  readonly torso: number;
  readonly tail: number;
  readonly fin: number;
  readonly skin: number;
  readonly fibre: number;
  /** Tail-beat phase and how hard (a carcass doesn't swim). */
  readonly phase: number;
  readonly swim: number;
  readonly t: number;
}

function stageOf(pose: BaskingSharkPose, t: number): Stage {
  const r = clamp01(pose.rot ?? 0);
  const jaw = smooth(0, 0.42, r);
  return {
    gape: clamp01(pose.gape ?? 0) * (1 - jaw), jaw,
    head: smooth(0.08, 0.68, r), torso: smooth(0.2, 1, r), tail: smooth(0.3, 0.85, r), fin: smooth(0.18, 0.9, r),
    skin: smooth(0, 0.9, r), fibre: smooth(0.22, 1, r), phase: pose.tail ?? 0, swim: 1 - smooth(0, 0.35, r), t,
  };
}

/** How far the outline at x has gone from shark to carcass (the head, torso and tail rot at their own pace). */
function morphK(x: number, s: Stage): number {
  const head = smooth(-360, -280, x);
  const tail = 1 - smooth(-780, -700, x);
  return head * s.head + tail * s.tail + (1 - head - tail) * s.torso;
}

/** The gill region swelling as the slits flare. */
const gillBump = (x: number): number => (x < -150 && x > -315 ? Math.sin((Math.PI * (x + 150)) / -165) : 0);
/** On the carcass the heavy torso and tail sink a little, so the thin neck rises to the braincase. */
const sagAt = (x: number, s: Stage): number => 16 * s.head * (1 - smooth(-340, -40, x));
/** The tail's sweep: nothing ahead of the hips, growing to the tip. */
function bendAt(x: number, s: Stage): number {
  const b = clamp01((-x - 520) / 480);
  return 14 * s.swim * b * b * Math.sin(s.phase - 3 * b);
}
/** Torn, ragged skin on the carcass: how far the edge is eaten in at x (fixed, not boiling). */
function tearAt(x: number, side: 'top' | 'bottom'): number {
  const amp = x > -70 ? 0 : x > -330 ? 3.5 : x > -700 ? 5.5 : 3;
  const o = side === 'top' ? 0 : 2.1;
  return amp * (0.5 + 0.5 * Math.sin(x * 0.19 + o) * Math.sin(x * 0.053 + 1.3 + o));
}

/** The outline's y at x, before the tail beat. */
function bodyY(x: number, s: Stage, side: 'top' | 'bottom', ragged = true): number {
  const top = side === 'top';
  const k = morphK(x, s);
  const shape = lerp(edgeAt(top ? LIVE_TOP : LIVE_BOTTOM, x), edgeAt(top ? DEAD_TOP : DEAD_BOTTOM, x), k);
  const flare = gillBump(x) * s.gape * (top ? -6 : 22);
  const tear = ragged ? tearAt(x, side) * s.fibre : 0;
  return shape + flare + (top ? tear : -tear) + sagAt(x, s);
}

const edgeY = (x: number, s: Stage, side: 'top' | 'bottom', ragged = true): number => bodyY(x, s, side, ragged) + bendAt(x, s);
const flex = (p: Pt, s: Stage): Pt => ({ x: p.x, y: p.y + bendAt(p.x, s) });

interface Edges {
  readonly top: readonly Pt[];
  readonly bottom: readonly Pt[];
}

const edgesOf = (s: Stage, ragged = true): Edges => ({
  top: XS.map((x) => ({ x, y: edgeY(x, s, 'top', ragged) })),
  bottom: XS.map((x) => ({ x, y: edgeY(x, s, 'bottom', ragged) })),
});

// ---------------------------------------------------------------- fins

type Widths = (u: number) => readonly [number, number];

/** A shark's pectoral: broad root, convex leading edge, concave trailing edge, a pointed tip. */
const PECTORAL_W: Widths = (u) => [22 * (1 - u) ** 0.55, 30 * (1 - u) ** 1.7];
const PELVIC_W: Widths = (u) => [13 * (1 - u) ** 0.6, 19 * (1 - u) ** 1.4];
/** The carcass's "flipper": narrow at the root, widest a third of the way out, a long taper to a rounded tip. */
const FLIPPER_W: Widths = (u) => {
  const round = Math.sqrt(Math.max(0, 1 - u ** 3));
  return [round * (12 + 10 * Math.sin(Math.PI * Math.min(1, u * 1.4))), round * (11 + 12 * Math.sin(Math.PI * u))];
};

interface FinPlan {
  /** Where along the belly it roots, shark → carcass; its angle (radians, screen), length and tip curl, shark → carcass. */
  readonly at: readonly [number, number];
  readonly angle: readonly [number, number];
  readonly len: readonly [number, number];
  readonly curl: readonly [number, number];
  readonly widths: Widths;
  readonly flipper: number;
}

const PECTORAL: FinPlan = { at: [-300, -388], angle: [Math.PI - 1.0, Math.PI - 0.92], len: [140, 186], curl: [-14, -30], widths: PECTORAL_W, flipper: 1 };
const PELVIC: FinPlan = { at: [-612, -628], angle: [Math.PI - 0.8, Math.PI - 0.78], len: [60, 160], curl: [-6, -26], widths: PELVIC_W, flipper: 0.92 };

interface Fin {
  readonly outline: Pt[];
  readonly lead: Pt[];
  readonly trail: Pt[];
  readonly root: Pt;
  readonly tip: Pt;
}

/** A fin from its root along `angle`; the leading edge on the forward side. `far` = the fin on the far side, a little higher and further forward. */
function finOf(plan: FinPlan, s: Stage, far: boolean, ragged = true): Fin {
  const k = s.fin;
  const x = lerp(plan.at[0], plan.at[1], k) + (far ? lerp(18, 30, k) : 0);
  const root = { x, y: edgeY(x, s, 'bottom', ragged) - 12 - (far ? lerp(10, 18, k) : 0) };
  // The far one shows past the near: on the carcass splayed out flatter, as a plesiosaur's are drawn.
  const angle = lerp(plan.angle[0], plan.angle[1], k) + (far ? lerp(0.16, -0.42, k) : 0);
  const len = lerp(plan.len[0], plan.len[1], k) * (far ? 0.94 : 1);
  const curl = lerp(plan.curl[0], plan.curl[1], k);
  const d = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = { x: d.y, y: -d.x };
  const at = (u: number, lead: boolean): Pt => {
    const [ls, ts] = plan.widths(u);
    const [lf, tf] = FLIPPER_W(u);
    const w = lead ? lerp(ls, lf * plan.flipper, k) : -lerp(ts, tf * plan.flipper, k);
    const c = curl * u * u;
    const p = { x: root.x + d.x * len * u + n.x * (w + c), y: root.y + d.y * len * u + n.y * (w + c) };
    return { x: p.x, y: p.y + bendAt(p.x, s) - bendAt(root.x, s) };
  };
  const lead = range(16, (u) => at(u, true));
  const trail = range(16, (u) => at(1 - u, false));
  return { outline: [...lead, ...trail.slice(1)], lead, trail, root, tip: at(1, true) };
}

function dorsalOf(s: Stage): Pt[] {
  const h = 1 - 0.95 * s.tail;
  const y = (x: number): number => bodyY(x, s, 'top', false);
  const front = { x: -398, y: y(-398) + 8 };
  const apex = { x: lerp(-468, -500, h), y: y(-460) - 120 * h };
  const rearTip = { x: -524, y: y(-524) - 14 * h };
  const rearBase = { x: -536, y: y(-536) + 8 };
  const leadMid = { x: (front.x + apex.x) / 2 + 10 * h, y: (front.y + apex.y) / 2 - 10 * h };
  const trailMid = { x: (apex.x + rearTip.x) / 2 + 9 * h, y: (apex.y + rearTip.y) / 2 + 4 * h };
  return [...spline([front, leadMid, apex], 5), ...spline([apex, trailMid, rearTip], 5).slice(1), rearBase].map((p) => flex(p, s));
}

/** The small second dorsal (side -1) and the anal fin (side 1) beneath it; they rot away. */
function smallFinOf(s: Stage, side: 1 | -1): Pt[] | null {
  const h = 1 - s.tail;
  if (h < 0.04) return null;
  const edge = side < 0 ? 'top' : 'bottom';
  const x0 = side < 0 ? -722 : -738;
  const y = (x: number): number => bodyY(x, s, edge, false);
  const front = { x: x0, y: y(x0) - side * 6 };
  const apex = { x: x0 - 36, y: y(x0 - 30) + side * 34 * h };
  const rearTip = { x: x0 - 50, y: y(x0 - 50) + side * 6 * h };
  const rearBase = { x: x0 - 56, y: y(x0 - 56) - side * 6 };
  return [...spline([front, { x: (front.x + apex.x) / 2 + 4, y: (front.y + apex.y) / 2 + side * 4 * h }, apex], 4), rearTip, rearBase].map((p) => flex(p, s));
}

interface Tail {
  /** The whole shape, its root run forward under the tail stock; and the free edge alone (the lobes), for the outline. */
  readonly shape: Pt[];
  readonly edge: Pt[];
}

/** The crescent tail (upper lobe the bigger), or on the carcass a long thin tail with the lower lobe rotted off. */
function tailOf(s: Stage): Tail {
  const P = (a: Pt, b: Pt): Pt => lerpPt(a, b, s.tail);
  const tip = P({ x: -1000, y: -138 }, { x: -1000, y: 6 });
  const fork = P({ x: -934, y: -4 }, { x: -924, y: 13 });
  const low = P({ x: -976, y: 96 }, { x: -906, y: 17 });
  // The root runs forward under the tail stock along the body's own edges, so no step shows where they meet.
  const stock = XS.filter((x) => x <= -800);
  const top = stock.map((x) => ({ x, y: bodyY(x, s, 'top', false) }));
  const bottom = stock.map((x) => ({ x, y: bodyY(x, s, 'bottom', false) }));
  // The lobes are laid out unsagged, then sunk with the carcass.
  const sag = sagAt(X_END, s);
  const start = { x: X_END, y: top[top.length - 1]!.y - sag };
  const end = { x: X_END, y: bottom[bottom.length - 1]!.y - sag };
  const fin = [
    ...quad(start, P({ x: -912, y: -92 }, { x: -915, y: -8 }), tip, 12).slice(1),
    ...quad(tip, P({ x: -946, y: -60 }, { x: -962, y: 11 }), fork, 8).slice(1),
    ...quad(fork, P({ x: -942, y: 50 }, { x: -914, y: 16 }), low, 7).slice(1),
    ...quad(low, P({ x: -905, y: 72 }, { x: -880, y: 18 }), end, 9).slice(1, -1),
  ].map((p) => flex({ x: p.x, y: p.y + sag }, s));
  return { shape: [...top.map((p) => flex(p, s)), ...fin, ...[...bottom].reverse().map((p) => flex(p, s))], edge: fin };
}

// ---------------------------------------------------------------- the mouth

interface Opening {
  readonly shape: Pt[];
  readonly upper: Pt[];
  readonly lower: Pt[];
  readonly rim: Pt[];
  readonly farLip: Pt[];
  readonly centre: Pt;
  readonly deep: Pt;
  readonly h: number;
  readonly tilt: number;
}

/** The open mouth: the upper lip, the dropped lower lip, and the far lip bulging forward (turned a little toward us, so the tunnel reads as a hoop). */
function openingOf(s: Stage): Opening {
  const a = s.gape * GAPE_MAX;
  const upper = range(10, (u) => {
    const x = lerp(-44, HINGE.x, u);
    return { x, y: bodyY(x, s, 'bottom', false) };
  });
  const lower = LOWER_LIP.map((p) => turn(p, a, HINGE));
  const top = upper[0]!;
  const bottom = lower[0]!;
  const h = Math.hypot(bottom.x - top.x, bottom.y - top.y);
  const mid = lerpPt(top, bottom, 0.5);
  const ax = { x: (top.x - bottom.x) / (h || 1), y: (top.y - bottom.y) / (h || 1) };
  const fwd = { x: -ax.y, y: ax.x };
  const reach = h * 0.46;
  const rim = range(18, (u) => {
    const a = Math.PI * u;
    return { x: mid.x - ax.x * (h / 2) * Math.cos(a) + fwd.x * reach * Math.sin(a), y: mid.y - ax.y * (h / 2) * Math.cos(a) + fwd.y * reach * Math.sin(a) };
  });
  const centre = { x: mid.x + fwd.x * h * 0.14, y: mid.y + fwd.y * h * 0.14 };
  const deep = lerpPt(centre, { x: HINGE.x + 20, y: HINGE.y + h * 0.28 }, 0.7);
  const inner = rim.map((p, i) => {
    const d = Math.hypot(centre.x - p.x, centre.y - p.y) || 1;
    const th = h * 0.08 * Math.sin((Math.PI * i) / (rim.length - 1)) ** 0.7;
    return { x: p.x + ((centre.x - p.x) / d) * th, y: p.y + ((centre.y - p.y) / d) * th };
  });
  return {
    shape: [...upper, ...[...lower].reverse().slice(1), ...rim.slice(1, -1)],
    upper, lower, rim, farLip: [...rim, ...[...inner].reverse()], centre, deep, h, tilt: Math.atan2(bottom.y - top.y, bottom.x - top.x),
  };
}

/** Inside the tunnel: pale lining at the lips darkening into the throat, the gill arches in rings bristling with white rakers. */
function drawMouthInside(ctx: CanvasRenderingContext2D, pen: Pen, op: Opening, scale: number): void {
  ctx.save();
  trace(ctx, op.shape);
  ctx.clip();
  const g = ctx.createRadialGradient(op.deep.x, op.deep.y, 1, op.deep.x, op.deep.y, op.h * 0.95);
  g.addColorStop(0, '#050506');
  g.addColorStop(0.3, '#1c1819');
  g.addColorStop(0.6, '#4b3f40');
  g.addColorStop(0.85, '#8c7774');
  g.addColorStop(1, '#b7a19b');
  ctx.fillStyle = g;
  ctx.fillRect(-320, -120, 520, 460);
  const hair = Math.max(0.7, 0.8 / scale);
  for (let j = 4; j >= 0; j--) {
    const u = j / 4;
    const c = lerpPt(op.centre, op.deep, 0.08 + 0.78 * u);
    const major = op.h * 0.5 * (1 - 0.66 * u);
    const minor = major * (0.62 - 0.12 * u);
    const arch = ring(c, major, minor, op.tilt);
    const band = mix('#ebe5d8', '#4a4244', u * 0.9);
    pen.stroke([...arch, arch[0]!], op.h * 0.05 * (1 - 0.5 * u), band, 0.92, false);
    // Rakers: fine combs pointing in toward the throat.
    arch.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        const q = lerpPt(arch[i]!, arch[(i + 1) % arch.length]!, k / 2);
        const to = lerpPt(q, c, 0.16 + 0.04 * Math.sin(i * 2.3 + k));
        pen.hair([q, to], hair, mix('#fbf8f0', '#6d6466', u * 0.85), 0.75 * (1 - 0.5 * u));
      }
      if (i === 0) pen.hair(ring(c, major * 1.07, minor * 1.07, op.tilt), hair * 1.4, INK, 0.45 * (1 - 0.4 * u));
    });
  }
  // The lining just inside the lips, and the bands of tiny teeth.
  for (const [lip, dy] of [[op.upper, 7], [op.lower, -7]] as const) {
    soft(pen.ctx, lip.map((p) => ({ x: p.x, y: p.y + dy })), op.h * 0.06, '#c4aea7', 0.45);
    for (let i = 1; i < lip.length - 1; i++) pen.dot(lip[i]!.x, lip[i]!.y + dy * 0.5, Math.max(0.6, op.h * 0.008), '#efe8da', 0.55);
  }
  ctx.restore();
}

function drawFarLip(pen: Pen, op: Opening, p: Palette, ink: number): void {
  pen.fill(op.farLip, p.top, 1);
  soft(pen.ctx, op.farLip.slice(op.rim.length + 2, -2), Math.max(1.5, op.h * 0.025), '#c4aea7', 0.75);
  soft(pen.ctx, op.rim.slice(3, -3).map((q) => ({ x: q.x - 2, y: q.y - 1 })), ink * 0.6, SHEEN, 0.3);
  pen.stroke(op.rim, ink, INK, 1, false);
}

/** Skin stretched between the dropped jaw and the throat, so no gap opens under the corner of the mouth. */
function drawThroat(ctx: CanvasRenderingContext2D, pen: Pen, s: Stage, e: Edges, p: Palette, ink: number): void {
  const a = s.gape * GAPE_MAX;
  const chin = CHIN.map((q) => turn(q, a, HINGE));
  const from = Math.floor(chin.length * 0.4);
  const belly = e.bottom.filter((q) => q.x <= HINGE.x && q.x >= -330);
  const last = belly[belly.length - 1]!;
  const jawMid = chin[from]!;
  const sag = { x: lerp(last.x, jawMid.x, 0.45), y: Math.max(last.y, jawMid.y) + 10 * s.gape };
  const lowerEdge = spline([last, sag, jawMid], 6);
  const skin = [...belly, ...lowerEdge.slice(1), ...chin.slice(from + 1), HINGE];
  paint(ctx, pen, skin, { from: { x: -220, y: 30 }, to: { x: -220, y: sag.y + 10 }, stops: [p.flank, p.side, p.belly, p.side], ink: 0, hatch: 7, hatchAlpha: 0.18, mottle: 0.6, seed: 83 });
  // Pleats of stretched skin fanning back from the corner of the mouth.
  pen.clipped(skin, () => {
    for (let k = 1; k < 7; k++) {
      const q = lowerEdge[Math.round((k / 7) * (lowerEdge.length - 1))]!;
      pen.hair(spline([{ x: HINGE.x - 4, y: HINGE.y + 10 }, lerpPt({ x: HINGE.x - 4, y: HINGE.y + 10 }, q, 0.5), q], 4), ink * 0.45, INK, 0.3 * s.gape);
    }
  });
  pen.stroke(lowerEdge, ink, INK, 1, true);
}

function drawJaw(ctx: CanvasRenderingContext2D, pen: Pen, s: Stage, p: Palette, ink: number): void {
  if (s.jaw >= 0.999) return;
  ctx.save();
  ctx.globalAlpha *= (1 - s.jaw) ** 1.3;
  // Falling away as it rots: dropping and turning.
  ctx.translate(-20 * s.jaw, 150 * s.jaw * s.jaw);
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(s.gape * GAPE_MAX + 0.7 * s.jaw);
  ctx.translate(-HINGE.x, -HINGE.y);
  paint(ctx, pen, JAW, { from: { x: -100, y: 18 }, to: { x: -100, y: 62 }, stops: [p.flank, p.side, p.belly], ink: 0, hatch: 7, hatchAlpha: 0.2, mottle: 0.6, seed: 61 });
  soft(pen.ctx, LOWER_LIP.slice(1, -1).map((q) => ({ x: q.x, y: q.y + 4 })), ink * 0.7, SHEEN, 0.3);
  pen.stroke(LOWER_LIP, ink, INK, 1, false);
  pen.stroke(CHIN, ink, INK, 1, true);
  ctx.restore();
}

// ---------------------------------------------------------------- the body

/** Strokes a contour except where a fin rises from it (the x ranges in `gaps`). */
function strokeRuns(pen: Pen, line: readonly Pt[], gaps: readonly (readonly [number, number])[], width: number): void {
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 1) pen.stroke(run, width, INK, 1, true);
    run = [];
  };
  for (const p of line) {
    if (gaps.some(([a, b]) => p.x <= a && p.x >= b)) flush();
    else run.push(p);
  }
  flush();
}

/** Five long slits almost ringing the head; feeding, they gape open, the flaps between them bulging. */
function drawGills(pen: Pen, s: Stage, ink: number): void {
  const fade = 1 - s.head;
  if (fade <= 0.01) return;
  const g = s.gape;
  GILLS.forEach((x0, i) => {
    const slit = range(12, (f) => {
      const x = x0 - 9 * Math.sin(Math.PI * f) + 16 * f * f;
      const top = edgeY(x, s, 'top');
      const bottom = edgeY(x, s, 'bottom');
      return { x, y: top + (bottom - top) * (0.06 + 0.9 * f) * (1 - 0.35 * s.head) };
    });
    const open = slit.map((p, k) => ({ x: p.x - (2.5 + 12 * g) * Math.sin((Math.PI * k) / 12) ** 0.6, y: p.y }));
    const gap = [...slit, ...[...open].reverse()];
    pen.fill(gap, '#231d1f', 0.85 * fade);
    // Gill filaments deep in the open slit: dusky, soft.
    if (g > 0.05) pen.clipped(gap, () => {
      for (let k = 1; k < 24; k++) {
        const a = lerpPt(slit[0]!, slit[12]!, k / 24);
        pen.hair([{ x: a.x + 2, y: a.y }, { x: a.x - 16 * g, y: a.y + 2 }], 1.2, '#7c5f5d', 0.5 * g * fade);
      }
    });
    // The flap behind each slit catches the light; its free edge is inked.
    soft(pen.ctx, open.map((p) => ({ x: p.x - 4 - 3 * g, y: p.y })), ink * (0.6 + 0.6 * g), SHEEN, (0.1 + 0.14 * g) * fade);
    pen.fill([...open, ...[...open].reverse().map((p) => ({ x: p.x - 9 - 6 * g, y: p.y }))], '#0f0d0c', 0.12 * fade);
    pen.stroke(slit, ink * (0.8 + 0.25 * g), INK, fade, false);
    if (g > 0.05) pen.hair(open, ink * 0.6, INK, 0.7 * g * fade);
    if (i === 0) pen.hair(slit.map((p) => ({ x: p.x + 6, y: p.y })), ink * 0.5, INK, 0.18 * fade);
  });
}

function drawSkin(pen: Pen, s: Stage, e: Edges, ink: number, scale: number): void {
  const live = 1 - s.skin;
  const hair = Math.max(0.7, 0.9 / scale);
  const flankAt = (x: number, f: number): Pt => ({ x, y: lerp(edgeY(x, s, 'top'), edgeY(x, s, 'bottom'), f) });
  // The light from above along the back.
  for (let k = 1; k <= 2; k++) soft(pen.ctx, e.top.filter((p) => p.x < -30 && p.x > -820).map((p) => ({ x: p.x, y: p.y + 4 + k * 7 })), ink * (1.3 - k * 0.35), SHEEN, (0.32 - k * 0.1) * live);
  // The lateral line.
  soft(pen.ctx, range(30, (u) => flankAt(lerp(-320, -860, u), 0.4 + 0.08 * u)), hair, INK, 0.3 * (1 - s.fibre));
  // The keel along each side of the tail stock.
  soft(pen.ctx, range(8, (u) => flankAt(lerp(-790, X_END, u), 0.5)), hair * 1.6, SHEEN, 0.25 * live);
  pen.hair(range(8, (u) => flankAt(lerp(-790, X_END, u), 0.56)), hair, INK, 0.45 * live);
  // Shagreen: a fine grain of dots, thicker toward the shadowed belly.
  const outline = [...e.top, ...[...e.bottom].reverse()];
  pen.stipple(outline, 1500, (_x, y) => 0.04 + 0.32 * clamp01((y + 20) / 110), Math.max(0.45, 0.75 / scale), s.skin > 0.5 ? '#7a6661' : '#24211e');
  if (s.fibre > 0.01) {
    // Stringy, fibrous flesh: pale streaks running along the body.
    for (let j = 0; j < 18; j++) {
      const f = (j + 0.5) / 18;
      const line = range(40, (u) => {
        const p = flankAt(lerp(-70, -770 - ((j * 37) % 90), u), f);
        return { x: p.x, y: p.y + Math.sin(u * 37 + j * 1.9) * 2.5 };
      });
      soft(pen.ctx, line, hair * (1 + (j % 3) * 0.5), j % 2 ? FIBRE : '#8f7a75', (j % 2 ? 0.4 : 0.2) * s.fibre);
    }
  }
  if (s.head > 0.01) {
    // The bared spine of the "neck": joints between the vertebrae.
    for (let x = -90; x > -330; x -= 15) {
      const top = edgeY(x, s, 'top');
      const bottom = edgeY(x, s, 'bottom');
      pen.hair([{ x, y: top + 2 }, { x: x - 2, y: (top + bottom) / 2 }, { x, y: bottom - 2 }], hair * 1.2, '#7d6964', 0.45 * s.head);
    }
  }
}

function drawBody(ctx: CanvasRenderingContext2D, pen: Pen, s: Stage, e: Edges, p: Palette, ink: number, scale: number): void {
  const outline = [...e.top, ...[...e.bottom].reverse()];
  paint(ctx, pen, outline, { from: { x: -420, y: -92 }, to: { x: -420, y: 88 }, stops: [p.back, p.top, p.flank, p.side, p.belly], ink: 0, hatch: 9, hatchAlpha: 0.2 * (1 - 0.4 * s.skin), mottle: 1, seed: 71 });
  pen.clipped(outline, () => {
    // The tail stock darkens into the tail.
    const g = ctx.createLinearGradient(-770, 0, X_END + 4, 0);
    g.addColorStop(0, `${p.top}00`);
    g.addColorStop(1, `${p.top}ff`);
    ctx.fillStyle = g;
    ctx.fillRect(-770, -70, X_END - 10 + 770, 140);
    // The long snout turns away from the light.
    const n = ctx.createLinearGradient(-60, 0, 0, 0);
    n.addColorStop(0, 'rgba(14,12,10,0)');
    n.addColorStop(1, `rgba(14,12,10,${(0.3 * (1 - s.head)).toFixed(3)})`);
    ctx.fillStyle = n;
    ctx.fillRect(-60, -60, 64, 100);
    drawGills(pen, s, ink);
    drawSkin(pen, s, e, ink, scale);
  });
  const gaps: [number, number][] = [[-402, -532]];
  if (s.tail < 0.85) gaps.push([-724, -774]);
  strokeRuns(pen, e.top, gaps, ink);
  strokeRuns(pen, e.bottom, s.tail < 0.85 ? [[-740, -790]] : [], ink);
  // The vertebrae of the bared neck poke up along its top.
  if (s.head > 0.3) {
    const a = (s.head - 0.3) / 0.7;
    for (let x = -96; x > -320; x -= 15) {
      const y = edgeY(x, s, 'top');
      const bump = ellipse(x - 7, y + 1, 6, 4 * a, 10).filter((q) => q.y <= y + 1);
      pen.fill(ellipse(x - 7, y + 1, 6, 4 * a, 10), p.side, a);
      pen.hair(bump, ink * 0.5, INK, 0.8 * a);
    }
  }
}

function drawFin(ctx: CanvasRenderingContext2D, pen: Pen, fin: Fin, p: Palette, ink: number, seed: number, far: boolean): void {
  const stops = far ? [p.back, p.back, p.top] : [p.top, p.flank, p.back];
  paint(ctx, pen, fin.outline, { from: fin.root, to: fin.tip, stops, ink: 0, hatch: 0, mottle: 0.7, seed });
  // Fine lines from the root (rays, or on the carcass the fibres of the flipper).
  pen.clipped(fin.outline, () => {
    for (let k = 1; k < 8; k++) {
      const q = fin.trail[Math.round((k / 8) * (fin.trail.length - 1))]!;
      pen.hair([fin.root, lerpPt(fin.root, q, 0.5), q], ink * 0.35, INK, 0.25);
    }
  });
  pen.stroke([...fin.lead, ...fin.trail.slice(1)], ink * 0.9, INK, 1, true);
}

function drawPaintedFin(ctx: CanvasRenderingContext2D, pen: Pen, shape: readonly Pt[], from: Pt, to: Pt, p: Palette, ink: number, seed: number): void {
  paint(ctx, pen, shape, { from, to, stops: [p.top, p.back], ink: 0, hatch: 0, mottle: 0.7, seed });
  pen.stroke(shape.slice(0, -1), ink, INK, 1, true);
}

/** The small eye with its glint, just above the front of the mouth; on the carcass, the empty orbit in the braincase. */
function drawEye(pen: Pen, s: Stage, ink: number): void {
  const e = { x: lerp(-64, -42, s.head), y: lerp(-6, -2, s.head) + sagAt(-50, s) * s.head * 0.3 };
  const r = 7.5;
  pen.fill(ellipse(e.x, e.y, r * 1.9, r * 1.5, 16), '#0e0c0b', 0.25);
  pen.fill(ellipse(e.x, e.y, r, r * 0.85, 14), mix('#cbc4b1', '#5a4b48', s.head), 1);
  pen.dot(e.x + r * 0.15, e.y + r * 0.05, r * lerp(0.62, 0.8, s.head), INK);
  pen.dot(e.x + r * 0.35, e.y - r * 0.28, r * 0.24, PAPER, 0.95 * (1 - s.head));
  pen.stroke(spline([{ x: e.x - r * 1.8, y: e.y - r * 0.1 }, { x: e.x, y: e.y - r * 1.35 }, { x: e.x + r * 1.7, y: e.y - r * 0.3 }], 5), ink * 0.8, INK, 1, false);
  // The nostril under the snout.
  pen.fill(ellipse(-24, 8, 4, 2.2, 8), INK, 0.7 * (1 - s.head));
}

// ---------------------------------------------------------------- rot: the falling flesh and the fibres

interface Strand {
  /** Where along the carcass, 0 behind the braincase .. 1 the tail; how long; which way it hangs; from the back or the belly. */
  readonly u: number;
  readonly len: number;
  readonly lean: number;
  readonly top: boolean;
}

/** Fibres hang in clumps (where the flesh tore), longest under the neck and the front of the torso. */
const STRANDS: readonly Strand[] = (() => {
  const rng = createRng(7741);
  const out: Strand[] = [];
  for (let c = 0; c < 17; c++) {
    const at = 0.02 + (c / 17) * 0.86 + rng() * 0.04;
    const top = c % 5 === 2;
    const n = top ? 2 : 2 + Math.floor(rng() * 3);
    const len = 0.5 + rng() * 0.7;
    for (let i = 0; i < n; i++) out.push({ u: at + (rng() - 0.5) * 0.025, len: len * (0.55 + rng() * 0.6), lean: -0.6 + rng() * 0.9, top });
  }
  return out;
})();

/** One fibre hanging from `root`, drifting a little in the water, pale with a fine inked side. */
function strand(pen: Pen, root: Pt, len: number, lean: number, drift: number, w: number, alpha: number): void {
  const mid = { x: root.x + lean * len * 0.25 + drift * 0.4, y: root.y + len * 0.5 };
  const end = { x: root.x + lean * len * 0.55 + drift, y: root.y + len };
  const pts = spline([root, mid, end], 5);
  soft(pen.ctx, pts, w * 1.9, FIBRE, 0.9 * alpha);
  pen.hair(pts.slice(1).map((q) => ({ x: q.x + w, y: q.y })), w * 0.6, INK, 0.45 * alpha);
}

function drawFibres(pen: Pen, s: Stage, e: Edges, fins: readonly Fin[], scale: number): void {
  if (s.fibre < 0.01) return;
  const w = Math.max(0.8, 1 / scale);
  STRANDS.forEach((f, i) => {
    const x = lerp(-80, -840, f.u);
    const reach = (x > -420 ? 60 : 40) * f.len * s.fibre;
    const drift = Math.sin(s.t * 1.1 + i * 1.7) * 3 * s.fibre;
    const edge = f.top ? e.top : e.bottom;
    const root = edge[Math.max(0, Math.min(edge.length - 1, XS.findIndex((v) => v <= x)))]!;
    if (f.top) strand(pen, { x: root.x, y: root.y + 2 }, reach * 0.35, f.lean - 0.7, drift, w, s.fibre * 0.9);
    else strand(pen, { x: root.x, y: root.y - 3 }, reach, f.lean, drift, w, s.fibre);
  });
  // Frayed trailing edges on the flippers.
  fins.forEach((fin, j) => {
    for (let k = 3; k < fin.trail.length - 2; k += 3) {
      strand(pen, fin.trail[k]!, 22 * s.fibre * (0.5 + 0.5 * Math.abs(Math.sin(k * 1.3 + j))), -0.4, Math.sin(s.t + k + j) * 2 * s.fibre, w * 0.8, s.fibre);
    }
  });
}

// ---------------------------------------------------------------- drawing

/** The whole shark (or carcass) in its local frame (call inside a transform; `scale` = screen px per local px, for line widths). */
function drawLocal(ctx: CanvasRenderingContext2D, s: Stage, boil: number, scale: number): void {
  const pen = penFor(ctx, 6113, boil, Math.max(0.6, 1.3 / scale));
  const ink = Math.max(2.4, 2.2 / scale);
  const p = paletteOf(s.skin);
  const e = edgesOf(s);
  const farFins = [finOf(PELVIC, s, true), finOf(PECTORAL, s, true)];
  const nearFins = [finOf(PELVIC, s, false), finOf(PECTORAL, s, false)];
  const dark = paletteOf(s.skin * 0.85);
  const shade: Palette = { ...dark, back: mix(dark.back, '#000000', 0.25), top: mix(dark.top, '#000000', 0.2) };

  // The far fins, darker, behind the body; the midline fins and the tail.
  farFins.forEach((f, i) => drawFin(ctx, pen, f, shade, ink, 91 + i, true));
  const dorsal = dorsalOf(s);
  drawPaintedFin(ctx, pen, dorsal, dorsal[0]!, dorsal[Math.floor(dorsal.length / 2)]!, p, ink, 93);
  for (const side of [-1, 1] as const) {
    const fin = smallFinOf(s, side);
    if (fin) drawPaintedFin(ctx, pen, fin, fin[0]!, fin[Math.floor(fin.length / 2)]!, p, ink, 95 + side);
  }
  const tail = tailOf(s).shape;
  paint(ctx, pen, tail, { from: { x: -920, y: -140 }, to: { x: -920, y: 100 }, stops: [p.back, p.top, p.flank], ink, hatch: 0, mottle: 0.8, seed: 97 });

  const op = s.gape > 0.01 ? openingOf(s) : null;
  if (op) {
    drawMouthInside(ctx, pen, op, scale);
    drawThroat(ctx, pen, s, e, p, ink);
  }
  drawJaw(ctx, pen, s, p, ink);
  drawBody(ctx, pen, s, e, p, ink, scale);
  if (op) drawFarLip(pen, op, p, ink);
  nearFins.forEach((f, i) => drawFin(ctx, pen, f, p, ink, 98 + i, false));
  drawEye(pen, s, ink);
  drawFibres(pen, s, e, [...farFins, ...nearFins], scale);
}

const enter = (ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1): number => {
  const scale = length / LEN;
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  return scale;
};

export async function prepare(): Promise<void> {}

/**
 * Draws the basking shark with its snout tip at (x, y) in screen px, `length`
 * snout to tail tip, facing right (1) or left (-1), at `t` seconds (the line
 * boil, the fibres drifting).
 */
export function drawBaskingShark(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, pose: BaskingSharkPose = {}): void {
  ctx.save();
  const scale = enter(ctx, x, y, length, facing);
  drawLocal(ctx, stageOf(pose, t), boilOf(t), scale);
  ctx.restore();
}

/** The middle of the mouth in screen px, for a pose drawn by drawBaskingShark (where plankton streams in). */
export function baskingSharkMouth(x: number, y: number, length: number, facing: 1 | -1, gape = 0): Pt {
  const s = length / LEN;
  const stage = stageOf({ gape }, 0);
  const local = stage.gape > 0.01 ? openingOf(stage).centre : { x: -60, y: 20 };
  return { x: x + facing * local.x * s, y: y + local.y * s };
}

/**
 * A clean dashed plesiosaur silhouette (small head, long neck, bulky body,
 * four flippers, tail) over the fully rotted carcass, same placement as
 * drawBaskingShark: the "what people saw" overlay at the end of the morph.
 */
export function drawPlesiosaurOutline(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, alpha: number): void {
  if (alpha <= 0) return;
  const s = stageOf({ rot: 1 }, 0);
  const e = edgesOf(s, false);
  const body = [...e.top, ...tailOf(s).edge, ...[...e.bottom].reverse()];
  const parts = [body, ...[PECTORAL, PELVIC].flatMap((plan) => [finOf(plan, s, false, false).outline, finOf(plan, s, true, false).outline])];
  ctx.save();
  const scale = enter(ctx, x, y, length, facing);
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // A faint paper wash inside, so the shape reads over the carcass.
  ctx.fillStyle = PAPER;
  ctx.globalAlpha = alpha * 0.14;
  for (const part of parts) {
    trace(ctx, part);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  // Each part's outline, minus where the other parts cover it: the outline of the whole.
  parts.forEach((part, i) => {
    ctx.save();
    parts.forEach((other, j) => {
      if (j === i) return;
      ctx.beginPath();
      ctx.rect(-1200, -600, 1400, 1200);
      other.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.clip('evenodd');
    });
    // Line and dash in screen px, lighter when drawn small.
    const px = Math.min(3, Math.max(1.8, length / 320));
    const w = px / scale;
    ctx.setLineDash([(px * 5.5) / scale, (px * 3.4) / scale]);
    trace(ctx, part);
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = w * 2.4;
    ctx.globalAlpha = alpha * 0.7;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = w;
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- kit preview

/** Green, plankton-rich temperate water, light from above, motes drifting. */
function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7fa99a');
  g.addColorStop(0.5, '#4f8580');
  g.addColorStop(1, '#2b5a66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(236,246,222,0.45)';
  for (let i = 0; i < 220; i++) {
    const px = ((i * 0.6180339 + Math.sin(i) * 0.1) % 1) * w;
    const py = ((((i * 0.3819 + t * 0.01 * (1 + (i % 3))) % 1) + 1) % 1) * h;
    ctx.fillRect(px, py, 1.5 + (i % 3), 1.5 + (i % 3));
  }
}

/** The rot morph in the kit's 10 s loop: shark, 3 s to carcass, hold (the outline shows), 3 s back. */
function rotAt(t: number): number {
  const u = ((t % 10) + 10) % 10;
  return u < 6 ? smooth(1, 4, u) : 1 - smooth(6, 9, u);
}

export const KIT: KitEntry = {
  name: 'baskingShark',
  draw(ctx, w, h, t) {
    drawWater(ctx, w, h, t);
    const gape = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 5);
    const tail = t * 2.2;
    const len = Math.min(w * 0.44, h * 1.1);
    // Left: feeding, the mouth working; below it a big crop of the head (the close-up beat).
    drawBaskingShark(ctx, w * 0.47, h * 0.3, len, 1, t, { gape, tail });
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h * 0.52, w * 0.5, h * 0.48);
    ctx.clip();
    drawBaskingShark(ctx, w * 0.48, h * 0.7, len * 2.6, 1, t, { gape, tail });
    ctx.restore();
    // Right: the rot morph into the "plesiosaur", the dashed outline over it at the end.
    const rot = rotAt(t);
    const u = ((t % 10) + 10) % 10;
    const outline = smooth(4, 4.5, u) * (1 - smooth(5.6, 6, u));
    drawBaskingShark(ctx, w * 0.97, h * 0.34, len, 1, t, { rot, tail });
    drawPlesiosaurOutline(ctx, w * 0.97, h * 0.34, len, 1, outline);
    // Small (250 px): the morph, and a feeding shark swimming the other way.
    drawBaskingShark(ctx, w * 0.84, h * 0.8, 250, 1, t, { rot, tail });
    drawPlesiosaurOutline(ctx, w * 0.84, h * 0.8, 250, 1, outline);
    drawBaskingShark(ctx, w * 0.6, h * 0.66, 250, -1, t, { gape, tail });
  },
};
