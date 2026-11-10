import { type Pt } from '../../../../src/art/pen';
import { resample, spline } from '../../kraken/whale';
import { fillShape, inkLine, seeded, unitPx, within } from '../../pelican/art/ink';
import { dab, path, smoothLoop, softLine } from '../../seal/art/paint';

/**
 * The osprey's legs and feet, gripping what it carries, as an osprey's are:
 * short, thick, bare legs, pale bluish grey and rough with small scales,
 * coming down from under the body below short white feathered "trousers";
 * each foot two toes forward and two back (the outer toe turned round),
 * wrapped round the carried body: on the near side the toes curl down its
 * flank, their long, strongly curved black talons hooked into the skin, which
 * darkens where they press; on the far side only the knuckles show over the
 * back before the toes go round behind it.
 *
 * Own units of the osprey (osprey.ts), y down.
 */

export interface OspreyToe {
  /** From the ankle to the root of the talon. */
  readonly path: readonly Pt[];
  /** Round the far side: only what shows above `back` is seen, and no talon. */
  readonly far: boolean;
  /** Thickness at its root. */
  readonly w: number;
}

export interface OspreyFoot {
  readonly ankle: Pt;
  readonly toes: readonly OspreyToe[];
  /** The top line of what it holds, under and either side of the foot, left to right. */
  readonly back: readonly Pt[];
}

/** One leg's colours: near (in the light) or far (in the body's shadow). */
interface LegInk {
  readonly light: string;
  readonly mid: string;
  readonly dark: string;
}
const NEAR_INK: LegInk = { light: '#d3dce4', mid: '#a3afbd', dark: '#68768a' };
const FAR_INK: LegInk = { light: '#b9c3ce', mid: '#8c99a9', dark: '#566377' };
const TALON = '#121116';

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const unit = (d: Pt): Pt => {
  const l = Math.hypot(d.x, d.y) || 1;
  return { x: d.x / l, y: d.y / l };
};
/** A tapered outline along `line`, `width(u)` across at u (0 .. 1 along it). */
function outline(line: readonly Pt[], width: (u: number) => number): { readonly shape: Pt[]; readonly left: Pt[]; readonly right: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((p, i) => {
    const d = unit(sub(line[Math.min(line.length - 1, i + 1)]!, line[Math.max(0, i - 1)]!));
    const w = width(i / (line.length - 1)) / 2;
    left.push({ x: p.x - d.y * w, y: p.y + d.x * w });
    right.push({ x: p.x + d.y * w, y: p.y - d.x * w });
  });
  return { shape: [...left, ...[...right].reverse()], left, right };
}

/** Clips to above (`above`) or below the held body's top line. */
function clipToBack(ctx: CanvasRenderingContext2D, back: readonly Pt[], above: boolean): void {
  const a = back[0]!;
  const b = back[back.length - 1]!;
  const far = above ? -400 : 400;
  path(ctx, [...back, { x: b.x + 60, y: b.y }, { x: b.x + 60, y: b.y + far }, { x: a.x - 60, y: a.y + far }, { x: a.x - 60, y: a.y }]);
  ctx.clip();
}

// ---------------------------------------------------------------- the leg

/** The bare shank from under the trousers to the ankle: thick, pale blue-grey, rough with small scales. */
function paintShank(ctx: CanvasRenderingContext2D, hip: Pt, ankle: Pt, ink: LegInk, boil: number): void {
  const d = unit(sub(ankle, hip));
  const top = { x: hip.x + d.x * 8, y: hip.y + d.y * 8 };
  const line = resample([top, ankle], 10);
  const { shape, left, right } = outline(line, (u) => 15 - 2.5 * u);
  const n = { x: -d.y, y: d.x };
  const g = ctx.createLinearGradient(ankle.x + n.x * 8, ankle.y + n.y * 8, ankle.x - n.x * 8, ankle.y - n.y * 8);
  g.addColorStop(0, ink.dark);
  g.addColorStop(0.45, ink.mid);
  g.addColorStop(0.7, ink.light);
  g.addColorStop(1, ink.mid);
  fillShape(ctx, shape, g);
  const px = unitPx(ctx);
  within(ctx, shape, () => {
    // Small rough scales, a netted skin: irregular, overlapping, each with a lit top.
    const rng = seeded(ink === NEAR_INK ? 41 : 43);
    ctx.lineWidth = 0.7 * px;
    for (let row = 0; row < 16; row++) {
      const u = (row + rng() * 0.5) / 15.5;
      const c = { x: top.x + (ankle.x - top.x) * u, y: top.y + (ankle.y - top.y) * u };
      for (let j = -3; j <= 3; j++) {
        const s = j * 2.6 + (row % 2) * 1.3 + (rng() - 0.5) * 1.2;
        const q = { x: c.x + n.x * s + d.x * (rng() - 0.5), y: c.y + n.y * s + d.y * (rng() - 0.5) };
        const r = 1.1 + rng() * 0.7;
        dab(ctx, q.x - n.x * 0.5 - d.x * 0.4, q.y - n.y * 0.5 - d.y * 0.4, r * 1.1, '240,244,250', 0.4);
        ctx.strokeStyle = `rgba(36,42,58,${0.22 + rng() * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, r * 1.2, r, Math.atan2(d.y, d.x) + rng(), 0.2 * Math.PI, 1.6 * Math.PI);
        ctx.stroke();
      }
    }
    softLine(ctx, line.map((p) => ({ x: p.x - n.x * 4, y: p.y - n.y * 4 })), 3, '#f2f6f9', 0.5, 3);
  });
  inkLine(ctx, left, 1.3, 0.75, boil);
  inkLine(ctx, right, 1.3, 0.75, boil);
}

/** The ankle, where the toes spread: a thick joint, the same skin. */
function paintAnkle(ctx: CanvasRenderingContext2D, ankle: Pt, ink: LegInk): void {
  const knob = smoothLoop([
    { x: ankle.x - 9, y: ankle.y - 2 }, { x: ankle.x - 3, y: ankle.y - 7 }, { x: ankle.x + 5, y: ankle.y - 6 },
    { x: ankle.x + 9, y: ankle.y + 1 }, { x: ankle.x + 3, y: ankle.y + 6 }, { x: ankle.x - 5, y: ankle.y + 5 },
  ], 4);
  const g = ctx.createLinearGradient(ankle.x, ankle.y - 7, ankle.x, ankle.y + 6);
  g.addColorStop(0, ink.light);
  g.addColorStop(1, ink.mid);
  fillShape(ctx, knob, g);
}

// ---------------------------------------------------------------- toes and talons

/** The toe's line, resampled, and its width along it (knuckled pads, thinning to the talon). */
function toeShape(toe: OspreyToe): { readonly line: Pt[]; readonly width: (u: number) => number } {
  const line = resample(spline(toe.path, 6), 18);
  const width = (u: number): number => toe.w * (1 - 0.3 * u) * (0.9 + 0.2 * Math.sin(Math.min(1, u * 1.08) * Math.PI * 3) ** 2);
  return { line, width };
}

/** Which way the toe turns as it curls (+1 clockwise on screen). */
function curlOf(line: readonly Pt[]): number {
  const a = sub(line[2]!, line[0]!);
  const b = sub(line[line.length - 1]!, line[line.length - 3]!);
  return Math.sign(a.x * b.y - a.y * b.x) || 1;
}

/** The talon's outline: a long black hook going on round the curl from the toe's end. */
function talonShape(line: readonly Pt[], w: number, curl: number): { readonly shape: Pt[]; readonly spine: Pt[] } {
  const end = line[line.length - 1]!;
  let dir = Math.atan2(end.y - line[line.length - 2]!.y, end.x - line[line.length - 2]!.x);
  const len = w * 2.0;
  const n = 12;
  const spine: Pt[] = [{ x: end.x - Math.cos(dir) * w * 0.25, y: end.y - Math.sin(dir) * w * 0.25 }];
  for (let i = 1; i <= n; i++) {
    dir += (curl * 1.35) / n;
    const p = spine[spine.length - 1]!;
    spine.push({ x: p.x + (Math.cos(dir) * len) / n, y: p.y + (Math.sin(dir) * len) / n });
  }
  return { shape: outline(spine, (u) => w * 0.78 * (1 - u) ** 0.8 + 0.4).shape, spine };
}

/** Where a talon presses in: a dark pit and a little shadow round it, on the held body's skin. */
function paintDent(ctx: CanvasRenderingContext2D, at: Pt): void {
  dab(ctx, at.x, at.y, 6, '20,22,32', 0.55);
  dab(ctx, at.x, at.y, 2.6, '10,8,12', 0.9);
}

/** A near toe: thick, knuckled, scaled across the top, its talon hooked into the skin. */
function paintToe(ctx: CanvasRenderingContext2D, toe: OspreyToe, ink: LegInk, boil: number): void {
  const { line, width } = toeShape(toe);
  const { shape, left, right } = outline(line, width);
  const mid = line[Math.floor(line.length / 2)]!;
  const g = ctx.createLinearGradient(line[0]!.x, line[0]!.y, mid.x, mid.y + toe.w);
  g.addColorStop(0, ink.light);
  g.addColorStop(1, ink.mid);
  fillShape(ctx, shape, g);
  const px = unitPx(ctx);
  within(ctx, shape, () => {
    // The shadowed underside where it presses on the skin, the light along its top.
    const shadeSide = left.reduce((s, p, i) => s + p.y - right[i]!.y, 0) > 0 ? left : right;
    const lightSide = shadeSide === left ? right : left;
    softLine(ctx, shadeSide, toe.w * 0.7, ink.dark, 0.8, 4);
    softLine(ctx, lightSide.map((p, i) => ({ x: (p.x * 2 + line[i]!.x) / 3, y: (p.y * 2 + line[i]!.y) / 3 })), toe.w * 0.3, '#f4f7fa', 0.55, 3);
    // Broad scales across the top of the toe, a deep crease at each knuckle, the rough sole on the skin.
    for (let i = 1; i < line.length - 1; i++) {
      const p = line[i]!;
      const d = unit(sub(line[i + 1]!, line[i - 1]!));
      const w = width(i / (line.length - 1)) / 2;
      const crease = i % 6 === 0;
      if (i % 2 && !crease) continue;
      inkLine(ctx, [{ x: p.x - d.y * w, y: p.y + d.x * w }, { x: p.x + d.x * 1.4, y: p.y + d.y * 1.4 }, { x: p.x + d.y * w, y: p.y - d.x * w }], crease ? 1.1 : 0.6, crease ? 0.6 : 0.28, boil);
      if (crease) softLine(ctx, [{ x: p.x - d.y * w, y: p.y + d.x * w }, { x: p.x + d.y * w, y: p.y - d.x * w }], 2.4, ink.dark, 0.45, 2);
    }
    const rng = seeded(Math.round(line[0]!.x * 7 + line[0]!.y * 3));
    for (let i = 2; i < shadeSide.length - 1; i++) {
      const p = shadeSide[i]!;
      dab(ctx, p.x + (rng() - 0.5), p.y + (rng() - 0.5), 1.6, '40,46,62', 0.5);
    }
  });
  inkLine(ctx, left, 1.2, 0.75, boil);
  inkLine(ctx, right, 1.2, 0.75, boil);
  // The talon, hooking in: its point sunk in a dark pit.
  const { shape: hook, spine } = talonShape(line, toe.w, curlOf(line));
  const tip = spine[spine.length - 1]!;
  paintDent(ctx, tip);
  const tg = ctx.createLinearGradient(spine[0]!.x, spine[0]!.y, tip.x, tip.y);
  tg.addColorStop(0, '#2a2830');
  tg.addColorStop(1, TALON);
  fillShape(ctx, hook, tg);
  softLine(ctx, spine.slice(1, 8).map((p, i) => ({ x: p.x - 1.2 + i * 0.05, y: p.y - 1.4 })), 1.6 * px, '#9a9cab', 0.7, 2);
  inkLine(ctx, hook, 0.9, 0.9, boil, true, TALON);
}

/** A far toe: only its knuckles show above the back before it goes round behind. */
function paintFarToe(ctx: CanvasRenderingContext2D, toe: OspreyToe, back: readonly Pt[], ink: LegInk, boil: number): void {
  const { line, width } = toeShape(toe);
  const { shape, left, right } = outline(line, width);
  ctx.save();
  clipToBack(ctx, back, true);
  fillShape(ctx, shape, ink.dark);
  within(ctx, shape, () => softLine(ctx, line.map((p) => ({ x: p.x, y: p.y - toe.w * 0.25 })), toe.w * 0.4, ink.mid, 0.7, 3));
  inkLine(ctx, left, 1.1, 0.7, boil);
  inkLine(ctx, right, 1.1, 0.7, boil);
  ctx.restore();
}

/** The press of the near toes on the skin under them: a soft contact shadow, below the back line only. */
function paintPress(ctx: CanvasRenderingContext2D, foot: OspreyFoot): void {
  ctx.save();
  clipToBack(ctx, foot.back, false);
  for (const toe of foot.toes) {
    if (toe.far) continue;
    const { line } = toeShape(toe);
    softLine(ctx, line.map((p) => ({ x: p.x + 1, y: p.y + 2.5 })), toe.w * 1.6, '#141a26', 0.42, 6);
  }
  dab(ctx, foot.ankle.x, foot.ankle.y + 6, 16, '20,26,38', 0.35);
  ctx.restore();
}

// ---------------------------------------------------------------- the whole leg

/** One leg, hip to talons, gripping (drawn over what it holds, under the trousers and body). */
export function paintLegAndFoot(ctx: CanvasRenderingContext2D, hip: Pt, foot: OspreyFoot, far: boolean, boil: number): void {
  const ink = far ? FAR_INK : NEAR_INK;
  paintPress(ctx, foot);
  for (const toe of foot.toes) if (toe.far) paintFarToe(ctx, toe, foot.back, FAR_INK, boil);
  paintShank(ctx, hip, foot.ankle, ink, boil);
  paintAnkle(ctx, foot.ankle, ink);
  for (const toe of foot.toes) if (!toe.far) paintToe(ctx, toe, ink, boil);
}

/** The short white feathered "trousers" over the top of the leg, coming out from under the belly. */
export function paintTrousers(ctx: CanvasRenderingContext2D, hip: Pt, ankle: Pt, far: boolean, boil: number): void {
  const d = unit(sub(ankle, hip));
  const n = { x: -d.y, y: d.x };
  const at = (along: number, across: number): Pt => ({ x: hip.x + d.x * along + n.x * across, y: hip.y + d.y * along + n.y * across });
  // Feather tips round the cuff, ragged.
  const shape = smoothLoop([
    at(-14, -15), at(-14, 15), at(6, 15), at(16, 12), at(22, 9), at(19, 4), at(25, 1), at(20, -4), at(23, -9), at(14, -13), at(4, -15),
  ], 4);
  const g = ctx.createLinearGradient(hip.x, hip.y - 4, at(24, 0).x, at(24, 0).y);
  g.addColorStop(0, far ? '#dcdad6' : '#f7f5f0');
  g.addColorStop(0.7, far ? '#c5c4c6' : '#e7e5e2');
  g.addColorStop(1, far ? '#a9abb5' : '#c6c8d2');
  fillShape(ctx, shape, g);
  within(ctx, shape, () => {
    for (let i = -3; i <= 3; i++) softLine(ctx, [at(-6, i * 4), at(22, i * 3.4)], 1.4, '#8f93a4', 0.3, 2);
    dab(ctx, at(20, 0).x, at(20, 0).y, 12, '120,124,150', 0.3);
  });
  inkLine(ctx, shape.slice(Math.floor(shape.length * 0.22), Math.floor(shape.length * 0.95)), 1.1, 0.55, boil);
}
