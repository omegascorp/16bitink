import type { Pt } from '../../../../src/art/pen';
import { flecks, seeded, spline } from '../../crabbird/art/paint';
import { band, curve, dab, fillShape, inkLine, softLine, taper, teardrop, turn, within } from './ink';

/**
 * A juvenile night heron, painted to the bar of InkFish's pelican and great
 * white: stocky and short-necked, brown all over with white teardrop spots on
 * the wing coverts, a streaky brown-and-white breast and neck, a darker crown,
 * a thick dark dagger bill with a yellowish base, a big orange-yellow eye with
 * a catchlight and yellowish legs. Layered washes, flecks, then thin ink.
 *
 * Local units: facing right (+x forward), y down, feet on the ground at 0,0;
 * about 270 long without the bill and 300 tall hunched. The head has its own
 * frame (story.ts poses it): its middle at 0,0, the bill along +x.
 */
export interface HeronHead {
  /** Head middle, in the body's local units. */
  readonly x: number;
  readonly y: number;
  /** Which way the bill points, local radians (0 = straight ahead). */
  readonly a: number;
  /** 0 calm .. 1 eyes wide. */
  readonly alarm: number;
  /** 0 shut .. 1 squawking. */
  readonly gape: number;
  /** 0 open .. 1 screwed shut (the poked eye). */
  readonly wince: number;
}

export interface HeronWings {
  /** 0 folded .. 1 open. */
  readonly open: number;
  /** The near wing's angle when open, local radians (-PI/2 straight up). */
  readonly angle: number;
  /** The far wing's angle. */
  readonly far: number;
}

export interface HeronPose {
  readonly x: number;
  readonly y: number;
  /** Screen px per local unit. */
  readonly k: number;
  /** 1 faces right, -1 left. */
  readonly face: number;
  /** Body tilt, radians, about the hips. */
  readonly lean: number;
  readonly head: HeronHead;
  readonly wings: HeronWings;
  /** 0 standing .. 1 legs trailing in flight. */
  readonly tuck: number;
  /** Walking phase, radians (0 = both feet down). */
  readonly step: number;
  readonly walk: number;
  /** False leaves the legs out (the close-up, where they'd be below the frame). */
  readonly legs?: boolean;
  readonly alpha?: number;
}

// Colours of a first-year bird.
const BROWN = '#7b5a3e';
const BROWN_LIT = '#b08a62';
const UMBER = '#4a3324';
const DARK = '#2e2019';
const BUFF = '#e9d9b8';
const WHITE = '#fbf6ea';
const STREAK = '#7a5636';
const CROWN = '#4b3626';
const BILL = '#2c2a2e';
const BILL_LIT = '#6b6a70';
const BILL_BASE = '#d8c25a';
const LORE = '#c9c27a';
const LEG = '#cdbb52';
const LEG_DARK = '#8d7d2c';

// ---------------------------------------------------------------- body

const BODY: readonly Pt[] = spline([
  { x: 96, y: -178 }, { x: 106, y: -146 }, { x: 96, y: -116 }, { x: 68, y: -94 }, { x: 22, y: -84 }, { x: -30, y: -90 }, { x: -82, y: -108 },
  { x: -124, y: -126 }, { x: -158, y: -138 }, { x: -160, y: -150 }, { x: -130, y: -162 }, { x: -92, y: -192 }, { x: -30, y: -214 }, { x: 30, y: -218 }, { x: 74, y: -204 },
], 6, true);

export const NECK_BASE: Pt = { x: 72, y: -186 };
/** The head is painted this much bigger than the body's units: a night heron's big head. */
export const HEAD_SCALE = 1.3;
const PIVOT: Pt = { x: 10, y: -100 };
const HIPS: readonly Pt[] = [{ x: 4, y: -96 }, { x: 30, y: -96 }];

function paintBody(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createLinearGradient(0, -220, 20, -84);
  g.addColorStop(0, BROWN);
  g.addColorStop(0.45, '#9a7853');
  g.addColorStop(0.7, BUFF);
  g.addColorStop(1, '#bfae92');
  fillShape(ctx, BODY, g);
  within(ctx, BODY, () => {
    // The streaky breast: long brown streaks on white, following the round of the body.
    const rnd = seeded(211);
    for (let i = 0; i < 60; i++) {
      const x = 14 + rnd() * 90;
      const y = -176 + rnd() * 84;
      const len = 8 + rnd() * 12;
      // Each streak a soft brown dash, leaning with the curve of the breast.
      const lean = (x - 60) * 0.06;
      softLine(ctx, [{ x, y }, { x: x + lean - 1.5, y: y + len }], 4 + rnd() * 4, STREAK, 0.28 + rnd() * 0.3, 4);
    }
    dab(ctx, 74, -140, 40, '255,250,236', 0.5);
    dab(ctx, -20, -90, 80, '70,50,40', 0.35, 0.5);
    dab(ctx, 30, -210, 70, '215,180,130', 0.35, 0.5);
    flecks(ctx, { x0: -160, y0: -220, x1: 100, y1: -90 }, 120, rnd, [UMBER, BUFF, '#8c6a48'], 0.8, 3.5, 0.35);
    softLine(ctx, [{ x: 100, y: -170 }, { x: 104, y: -140 }, { x: 92, y: -110 }], 16, '#5a3e2c', 0.25);
  });
  inkLine(ctx, BODY, 2, 0.85, boil, true);
  // A few belly feathers at the edge.
  for (let i = 0; i < 5; i++) inkLine(ctx, curve({ x: 60 - i * 22, y: -94 + i * 1.5 }, { x: 52 - i * 22, y: -86 }, { x: 44 - i * 22, y: -92 + i }, 4), 1, 0.4, boil);
}

// ---------------------------------------------------------------- wings

const FOLDED: readonly Pt[] = spline([
  { x: 80, y: -188 }, { x: 40, y: -210 }, { x: -20, y: -210 }, { x: -76, y: -192 }, { x: -122, y: -166 }, { x: -170, y: -140 }, { x: -178, y: -132 },
  { x: -150, y: -128 }, { x: -100, y: -130 }, { x: -40, y: -134 }, { x: 10, y: -144 }, { x: 54, y: -160 }, { x: 78, y: -176 },
], 6, true);

/** White teardrop spots on the coverts, as on a first-year night heron, in rows. */
function spots(ctx: CanvasRenderingContext2D, rows: readonly { readonly from: Pt; readonly to: Pt; readonly n: number; readonly r: number }[], angle: number, boil: number): void {
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const u = (i + 0.5) / row.n;
      const at = { x: row.from.x + (row.to.x - row.from.x) * u, y: row.from.y + (row.to.y - row.from.y) * u };
      const drop = teardrop(at, row.r, angle, 2.1);
      fillShape(ctx, drop, WHITE, 0.95);
      inkLine(ctx, drop, 0.8, 0.35, boil, true, UMBER);
    }
  }
}

function paintFolded(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createLinearGradient(0, -212, 0, -128);
  g.addColorStop(0, BROWN_LIT);
  g.addColorStop(0.4, BROWN);
  g.addColorStop(1, UMBER);
  fillShape(ctx, FOLDED, g);
  within(ctx, FOLDED, () => {
    // Long flight feathers at the back, darker, each with a pale tip.
    for (let i = 0; i < 6; i++) {
      const y = -150 + i * 4;
      const line = [{ x: -40 - i * 6, y: y - 6 }, { x: -110, y: y + 1 }, { x: -176 + i * 4, y: -134 + i * 1.4 }];
      softLine(ctx, line, 10, DARK, 0.4, 3);
      inkLine(ctx, line, 0.9, 0.45, boil);
    }
    dab(ctx, -168, -136, 10, '233,217,184', 0.8);
    dab(ctx, 0, -206, 80, '200,160,110', 0.4, 0.4);
    flecks(ctx, { x0: -170, y0: -212, x1: 80, y1: -128 }, 90, seeded(41), [DARK, BROWN_LIT], 0.8, 3, 0.35);
    // Coverts: rows of scalloped feathers, each tipped with a white teardrop.
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 8 - row; i++) {
        const x = 56 - i * 24 - row * 14;
        const y = -194 + row * 13 + i * 3.4;
        inkLine(ctx, curve({ x: x + 10, y: y - 6 }, { x: x - 2, y: y + 8 }, { x: x - 14, y: y - 2 }, 5), 1, 0.45, boil, false, UMBER);
      }
    }
  });
  spots(ctx, [
    { from: { x: 50, y: -184 }, to: { x: -110, y: -164 }, n: 8, r: 4.6 },
    { from: { x: 30, y: -170 }, to: { x: -120, y: -150 }, n: 8, r: 4.2 },
    { from: { x: 6, y: -156 }, to: { x: -100, y: -140 }, n: 6, r: 3.8 },
    { from: { x: 52, y: -200 }, to: { x: -60, y: -190 }, n: 6, r: 3.4 },
  ], Math.PI * 0.05, boil);
  inkLine(ctx, FOLDED, 1.7, 0.85, boil, true);
}

/** The open wing in its own frame: the shoulder at 0,0, the wing along +x, the trailing edge towards +y. */
const OPEN_EDGE: readonly Pt[] = spline([
  { x: 0, y: -10 }, { x: 60, y: -18 }, { x: 116, y: -20 }, { x: 186, y: -10 }, { x: 246, y: 6 }, { x: 258, y: 22 },
  { x: 244, y: 44 }, { x: 214, y: 70 }, { x: 170, y: 90 }, { x: 110, y: 98 }, { x: 50, y: 92 }, { x: 10, y: 60 },
], 6, true);

function paintOpenWing(ctx: CanvasRenderingContext2D, boil: number, far: boolean): void {
  // Flight feathers fanned from the hand and the arm, dark brown with pale tips.
  const feathers: readonly [Pt, Pt][] = [
    ...Array.from({ length: 8 }, (_, i): [Pt, Pt] => {
      const u = i / 7;
      return [{ x: 150 + 30 * (1 - u), y: 0 }, { x: 258 - 40 * u - 30 * u * u, y: 22 + 62 * u }];
    }),
    ...Array.from({ length: 8 }, (_, i): [Pt, Pt] => {
      const u = i / 7;
      return [{ x: 140 - 120 * u, y: 10 }, { x: 170 - 136 * u, y: 92 + 4 * Math.sin(u * Math.PI) - 20 * u * u }];
    }),
  ];
  fillShape(ctx, OPEN_EDGE, far ? '#3b2a20' : DARK);
  within(ctx, OPEN_EDGE, () => {
    feathers.forEach(([root, tip], i) => {
      const { shape } = band([root, { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 }, tip], 26, 16);
      const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
      g.addColorStop(0, far ? '#5a4230' : BROWN);
      g.addColorStop(0.8, far ? '#3a2a20' : UMBER);
      g.addColorStop(1, far ? '#8a7860' : BUFF);
      fillShape(ctx, shape, g);
      inkLine(ctx, shape, 0.9, 0.5, boil + i, true, DARK);
    });
    // Coverts over the roots: brown, in rows, each with its white teardrop.
    const cov = ctx.createLinearGradient(0, -20, 0, 60);
    cov.addColorStop(0, far ? '#6b5038' : BROWN_LIT);
    cov.addColorStop(1, far ? '#4a3626' : BROWN);
    fillShape(ctx, spline([{ x: 0, y: -12 }, { x: 116, y: -22 }, { x: 196, y: -8 }, { x: 170, y: 24 }, { x: 110, y: 44 }, { x: 40, y: 50 }, { x: 4, y: 30 }], 6, true), cov);
    flecks(ctx, { x0: 0, y0: -20, x1: 200, y1: 50 }, 80, seeded(far ? 52 : 51), [DARK, BUFF], 0.8, 3, 0.35);
  });
  if (!far) {
    spots(ctx, [
      { from: { x: 20, y: 4 }, to: { x: 170, y: 2 }, n: 9, r: 5 },
      { from: { x: 20, y: 22 }, to: { x: 150, y: 20 }, n: 8, r: 4.6 },
      { from: { x: 30, y: 38 }, to: { x: 120, y: 38 }, n: 6, r: 4 },
    ], Math.PI * 0.5, boil);
  }
  inkLine(ctx, OPEN_EDGE, 1.7, far ? 0.6 : 0.85, boil, true);
}

/** One wing, folded or open about the shoulder. */
function paintWing(ctx: CanvasRenderingContext2D, w: HeronWings, far: boolean, boil: number): void {
  if (w.open < 0.02) {
    if (!far) paintFolded(ctx, boil);
    return;
  }
  ctx.save();
  ctx.translate(36, -204);
  ctx.rotate(far ? w.far : w.angle);
  // Mirrored, so the trailing edge falls back towards the tail whichever way the wing points.
  ctx.scale(0.4 + 0.6 * w.open, -(0.55 + 0.45 * w.open));
  paintOpenWing(ctx, boil, far);
  ctx.restore();
}

// ---------------------------------------------------------------- legs

function paintLeg(ctx: CanvasRenderingContext2D, hip: Pt, p: HeronPose, i: number, boil: number): void {
  const ph = p.step + i * Math.PI;
  const lift = Math.max(0, Math.sin(ph)) * p.walk;
  const stand = { x: hip.x + 4 + 20 * Math.cos(ph) * p.walk, y: -lift * 20 };
  // Trailing in flight: the legs swing back under the tail.
  const trail = { x: hip.x - 200, y: -118 + i * 8 };
  const foot = { x: stand.x + (trail.x - stand.x) * p.tuck, y: stand.y + (trail.y - stand.y) * p.tuck };
  const heel = { x: (hip.x + foot.x) / 2 - 10 * (1 - p.tuck), y: (hip.y + foot.y) / 2 - 2 };
  const far = i === 0;
  const tone = far ? LEG_DARK : LEG;
  const line = spline([hip, heel, foot], 5);
  const { shape } = band(line, far ? 13 : 15, far ? 8 : 9);
  const g = ctx.createLinearGradient(heel.x - 8, 0, heel.x + 8, 0);
  g.addColorStop(0, far ? '#6d6024' : LEG_DARK);
  g.addColorStop(0.5, tone);
  g.addColorStop(1, far ? '#a5953c' : '#e8da86');
  fillShape(ctx, shape, g);
  inkLine(ctx, shape, 1.2, far ? 0.5 : 0.8, boil, true);
  // Scales down the shank.
  for (let k = 1; k < 5; k++) {
    const q = { x: heel.x + (foot.x - heel.x) * (k / 5), y: heel.y + (foot.y - heel.y) * (k / 5) };
    inkLine(ctx, [{ x: q.x - 4, y: q.y }, { x: q.x + 4, y: q.y + 1 }], 0.8, 0.4, boil);
  }
  // Long toes, three forward and one back, curled when lifted.
  const curl = Math.min(1, lift / 8 + p.tuck);
  const dir = p.tuck > 0.5 ? -1 : 1;
  for (const [reach, drop] of [[46, 2], [38, 6], [-20, 0]] as const) {
    const tip = { x: foot.x + reach * dir * (1 - 0.6 * curl), y: foot.y + drop + 14 * curl };
    const toe = curve(foot, { x: (foot.x + tip.x) / 2, y: foot.y - 2 }, tip, 6);
    softLine(ctx, toe, 7, tone, 1, 2);
    inkLine(ctx, toe, 1.1, far ? 0.5 : 0.8, boil);
  }
}

// ---------------------------------------------------------------- neck

function paintNeck(ctx: CanvasRenderingContext2D, base: Pt, h: HeronHead, boil: number): void {
  const attach = turn({ x: h.x - 12 * HEAD_SCALE, y: h.y + 18 * HEAD_SCALE }, { x: h.x, y: h.y }, h.a);
  // Starts well inside the body, so the breast's edge overlaps its root.
  const root = { x: base.x - 26, y: base.y + 30 };
  const mid = { x: (root.x + attach.x) / 2 + 12, y: (root.y + attach.y) / 2 + 4 };
  const line = curve(root, mid, attach, 14);
  const { shape, left, right } = band(line, 104, 58);
  const g = ctx.createLinearGradient(root.x - 40, 0, root.x + 60, 0);
  g.addColorStop(0, '#9b7956');
  g.addColorStop(0.45, BUFF);
  g.addColorStop(1, WHITE);
  fillShape(ctx, shape, g);
  within(ctx, shape, () => {
    const rnd = seeded(97);
    for (let i = 0; i < 34; i++) {
      const p = line[Math.floor(rnd() * (line.length - 1))]!;
      const off = (rnd() - 0.3) * 60;
      softLine(ctx, [{ x: p.x + off, y: p.y - 8 }, { x: p.x + off - 2, y: p.y + 10 }], 5 + rnd() * 3, STREAK, 0.3 + rnd() * 0.3, 4);
    }
    softLine(ctx, left, 28, '#6e5038', 0.4);
  });
  inkLine(ctx, left.slice(1, -2), 1.6, 0.8, boil);
  inkLine(ctx, right.slice(3, -2), 1.6, 0.8, boil);
}

// ---------------------------------------------------------------- head

const HEAD: readonly Pt[] = spline([
  { x: -40, y: 6 }, { x: -38, y: -14 }, { x: -24, y: -31 }, { x: -2, y: -35 }, { x: 18, y: -30 }, { x: 30, y: -22 }, { x: 34, y: 2 }, { x: 28, y: 22 }, { x: 4, y: 30 }, { x: -24, y: 26 },
], 5, true);
const CAP: readonly Pt[] = spline([{ x: -36, y: -2 }, { x: -32, y: -20 }, { x: -18, y: -33 }, { x: 0, y: -37 }, { x: 20, y: -31 }, { x: 31, y: -18 }, { x: 14, y: -16 }, { x: -10, y: -14 }, { x: -30, y: -6 }], 5, true);
export const EYE: Pt = { x: 10, y: -6 };
const BILL_ROOT = 22;
export const BILL_TIP = 112;
const UPPER: readonly Pt[] = spline([
  { x: 14, y: -21 }, { x: 50, y: -16 }, { x: 84, y: -9 }, { x: 104, y: -2 }, { x: BILL_TIP, y: 3 }, { x: 100, y: 4 }, { x: 70, y: 4 }, { x: 40, y: 4 }, { x: 20, y: 6 },
], 4, true);
const LOWER: readonly Pt[] = spline([
  { x: 18, y: 4 }, { x: 50, y: 4 }, { x: 84, y: 4 }, { x: 104, y: 4 }, { x: BILL_TIP - 3, y: 5 }, { x: 96, y: 9 }, { x: 70, y: 13 }, { x: 40, y: 16 }, { x: 16, y: 18 },
], 4, true);
const HINGE: Pt = { x: 18, y: 4 };

/** How thick the bill is (top to bottom, local units) a share `u` of the way from root to tip. */
export const billHalfAt = (u: number): number => 19 * (1 - u) + 2 * u;

function paintEye(ctx: CanvasRenderingContext2D, h: HeronHead, boil: number): void {
  const { x, y } = EYE;
  const r = 9.6 * (1 + 0.18 * h.alarm);
  // The bare yellowish lore between eye and bill.
  fillShape(ctx, spline([{ x: x + 4, y: y - 9 }, { x: BILL_ROOT + 4, y: -14 }, { x: BILL_ROOT + 4, y: 2 }, { x: x + 6, y: y + 8 }], 4, true), LORE, 0.85);
  ctx.save();
  ctx.fillStyle = '#e6d9a8';
  ctx.beginPath();
  ctx.arc(x, y, r + 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (h.wince > 0.5) {
    ctx.restore();
    // Screwed shut: two creased lids.
    inkLine(ctx, curve({ x: x - r - 1, y: y - 1 }, { x, y: y + 4 }, { x: x + r + 1, y: y - 2 }, 6), 2.4, 1, boil);
    inkLine(ctx, curve({ x: x - r, y: y - 5 }, { x, y: y - 1 }, { x: x + r, y: y - 6 }, 6), 1.4, 0.7, boil);
    return;
  }
  const iris = ctx.createRadialGradient(x - 1.5, y - 1.5, 0.6, x, y, r);
  iris.addColorStop(0, '#ffd56a');
  iris.addColorStop(0.55, '#f2a73a');
  iris.addColorStop(0.9, '#c9701c');
  iris.addColorStop(1, '#7d3d10');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // The pupil shrinks to a pin in alarm.
  ctx.fillStyle = '#0b0807';
  ctx.beginPath();
  ctx.arc(x + 0.8, y + 0.2, r * (0.46 - 0.18 * h.alarm), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.38, Math.max(0.9, r * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * 0.35, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  inkLine(ctx, Array.from({ length: 21 }, (_, i) => ({ x: x + Math.cos((i / 20) * Math.PI * 2) * r, y: y + Math.sin((i / 20) * Math.PI * 2) * r })), 1.4, 0.9, boil);
  // A heavy brow over a calm eye; lifted high in alarm.
  const lift = 4 * h.alarm;
  inkLine(ctx, curve({ x: x - r - 3, y: y - r * 0.4 - lift }, { x, y: y - r - 4 - 2 * lift }, { x: x + r + 3, y: y - r * 0.7 - lift }, 6), 1.6 + 0.6 * h.alarm, 0.85, boil);
}

function paintHead(ctx: CanvasRenderingContext2D, h: HeronHead, boil: number): void {
  const g = ctx.createLinearGradient(0, -36, 0, 30);
  g.addColorStop(0, '#8c6a48');
  g.addColorStop(0.5, '#a78560');
  g.addColorStop(1, BUFF);
  fillShape(ctx, HEAD, g);
  within(ctx, HEAD, () => {
    const cap = ctx.createLinearGradient(0, -37, 0, -12);
    cap.addColorStop(0, CROWN);
    cap.addColorStop(1, '#6e5038');
    fillShape(ctx, CAP, cap);
    // Fine pale streaks over the brown, as on a first-year bird.
    const rnd = seeded(133);
    for (let i = 0; i < 34; i++) {
      const x = -32 + rnd() * 60;
      const y = -28 + rnd() * 50;
      softLine(ctx, [{ x, y }, { x: x - 6, y: y + 3 }], 2, '#f4e6c8', 0.55, 2);
    }
    // Pale chin and cheek, a warm shadow behind.
    dab(ctx, 10, 22, 22, '251,246,234', 0.85, 0.7);
    dab(ctx, -26, 6, 26, '60,40,28', 0.35);
    dab(ctx, 0, -28, 22, '210,180,140', 0.35);
  });
  inkLine(ctx, HEAD, 1.8, 0.85, boil, true);
  paintEye(ctx, h, boil);
}

function paintBill(ctx: CanvasRenderingContext2D, h: HeronHead, boil: number): void {
  // The lower mandible, yellowish at the base, swung open about the hinge.
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(0.32 * h.gape);
  ctx.translate(-HINGE.x, -HINGE.y);
  const lg = ctx.createLinearGradient(BILL_ROOT, 0, BILL_TIP, 0);
  lg.addColorStop(0, BILL_BASE);
  lg.addColorStop(0.22, '#b9a848');
  lg.addColorStop(0.45, '#4a4636');
  lg.addColorStop(1, BILL);
  fillShape(ctx, LOWER, lg);
  inkLine(ctx, LOWER, 1.5, 0.85, boil, true);
  ctx.restore();
  if (h.gape > 0.05) {
    const mouth = [{ x: HINGE.x + 2, y: 4 }, { x: 60, y: 4 }, turn({ x: 60, y: 6 }, HINGE, 0.32 * h.gape)];
    fillShape(ctx, mouth, '#c4605a');
  }
  const ug = ctx.createLinearGradient(0, -16, 0, 6);
  ug.addColorStop(0, BILL_LIT);
  ug.addColorStop(0.35, BILL);
  ug.addColorStop(1, '#141316');
  fillShape(ctx, UPPER, ug);
  within(ctx, UPPER, () => {
    softLine(ctx, [{ x: 26, y: -12 }, { x: 70, y: -10 }, { x: 104, y: -2 }], 3.4, '#a9a8b0', 0.55);
    // Yellowish where it meets the face.
    const base = ctx.createLinearGradient(BILL_ROOT - 4, 0, BILL_ROOT + 22, 0);
    base.addColorStop(0, `${BILL_BASE}dd`);
    base.addColorStop(1, `${BILL_BASE}00`);
    ctx.fillStyle = base;
    ctx.fillRect(BILL_ROOT - 6, -20, 30, 30);
  });
  inkLine(ctx, UPPER, 1.6, 0.9, boil, true);
  // Nostril and the line of the gape.
  inkLine(ctx, [{ x: 36, y: -8 }, { x: 46, y: -7 }], 1.2, 0.7, boil);
  inkLine(ctx, [{ x: BILL_ROOT - 2, y: 5 }, { x: 70, y: 4.5 }, { x: 100, y: 4 }], 1.1, 0.7, boil);
}

/** The head and bill alone, in the head's frame (for close-ups and for the strike). */
export function paintHeronHead(ctx: CanvasRenderingContext2D, h: HeronHead, boil: number): void {
  paintHead(ctx, h, boil);
  paintBill(ctx, h, boil);
}

// ---------------------------------------------------------------- the whole bird

export function drawHeron(ctx: CanvasRenderingContext2D, p: HeronPose, boil: number, withHead = true): void {
  const alpha = p.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(p.x, p.y);
  ctx.scale(p.face * p.k, p.k);
  if (p.tuck < 0.5) dab(ctx, 10, 2, 120, '40,46,40', 0.22, 0.2);
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(p.lean);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  paintWing(ctx, p.wings, true, boil);
  ctx.restore();
  const hips = HIPS.map((hp) => turn(hp, PIVOT, p.lean));
  if (p.legs !== false) paintLeg(ctx, hips[0]!, p, 0, boil);
  if (withHead) paintNeck(ctx, turn(NECK_BASE, PIVOT, p.lean), p.head, boil);
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(p.lean);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  paintBody(ctx, boil);
  ctx.restore();
  if (p.legs !== false) paintLeg(ctx, hips[1]!, p, 1, boil);
  if (withHead) {
    ctx.save();
    ctx.translate(p.head.x, p.head.y);
    ctx.rotate(p.head.a);
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    paintHeronHead(ctx, p.head, boil);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(p.lean);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  paintWing(ctx, p.wings, false, boil);
  ctx.restore();
  ctx.restore();
}

/** A point given in the head's frame (as paintHeronHead draws it), in world px. */
export function headToWorld(p: HeronPose, q: Pt): Pt {
  const h = turn({ x: p.head.x + q.x * HEAD_SCALE, y: p.head.y + q.y * HEAD_SCALE }, { x: p.head.x, y: p.head.y }, p.head.a);
  return { x: p.x + h.x * p.face * p.k, y: p.y + h.y * p.k };
}

/** The neck base, in world px. */
export function neckBaseWorld(p: HeronPose): Pt {
  const n = turn(NECK_BASE, PIVOT, p.lean);
  return { x: p.x + n.x * p.face * p.k, y: p.y + n.y * p.k };
}

/** The world angle the bill points, for a pose. */
export const billAngle = (p: HeronPose): number => (p.face > 0 ? p.head.a : Math.PI - p.head.a);
