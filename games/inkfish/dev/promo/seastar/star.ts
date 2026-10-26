import { INK, Pen, pathOf } from '../../../src/art/pen';
import { add, mul, normals, type P3, project, type Pt, pt, ring, spline, sub } from './geom';

/**
 * The ochre sea star, humped over its mussel: a broad, plump disc and five
 * thick tapering arms wrapped down over the shell to the rock, orange washed
 * light to dark with ink hatching in the shade, and the net of pale knobbly
 * spines ochre stars have. The front of the arched disc shows its pale
 * underside with the mouth in the middle, where the stomach comes out.
 * Drawn in scene px (camera applied) at pool x `x`.
 */

const ORANGE = '#d9622a';
const ORANGE_LIGHT = '#f6a15c';
const ORANGE_DARK = '#7a2a10';
const SPINE = '#f4e6c8';
const SPINE_SHADOW = '#5a1e0b';
const TUBE_FOOT = '#f2d79a';
const ORAL = '#eea476';
const ORAL_DARK = '#a5532a';

/** Arm directions round the body (radians in the rock's plane, + towards the viewer), back first. */
const ARM_DIRS = [-Math.PI / 2 + 0.22, -0.5, 0.75, Math.PI - 0.75, Math.PI + 0.5] as const;
/** How much each arm bends round as it goes out (radians by the tip): starfish arms are never straight. */
const ARM_BENDS = [0.3, 0.15, -0.1, 0.1, -0.15] as const;
/** Which arms come forward round the mussel (drawn in front of it). */
export const FRONT_ARMS = [2, 3] as const;
const ARM_LEN = 370;
/** Half the arm's width at its root and at its tip: thick at the root (about 45% of the disc's width), tapering. */
const ARM_W = 56;
const ARM_TIP_W = 26;
export const BODY_R = 118;
/** The body sits a little behind the mussel (pool z), so the mussel peeks out in front of it. */
export const STAR_Z = -40;
const POINTS = 40;
export const HUMP = 290;
/** How far down the front of the arched disc its underside shows (scene px). */
const ORAL_DROP = 66;

/** The star's pose at a moment (scene.ts makes it). */
export interface StarPose {
  readonly x: number;
  /** The body's height above the rock. */
  readonly hump: number;
  /** How far the arm tips curl up, 0 .. 1.5. */
  readonly curl: number;
  /** A wiggle of the tips, -1 .. 1. */
  readonly wiggle: number;
  /** How hard the tube feet pull, 0 .. 1 (the front arms heave towards the viewer). */
  readonly strain: number;
  /** Lifted off the rock to glide, 0 .. 1. */
  readonly lift: number;
}

/** One arm's centre line in the pool, root (the disc's middle) to tip. */
function armLine(p: StarPose, i: number): P3[] {
  const dir = ARM_DIRS[i]!;
  const front = i === 2 || i === 3;
  return Array.from({ length: POINTS }, (_, k) => {
    const s = k / (POINTS - 1);
    const r = s * ARM_LEN * (i === 0 ? 0.92 : 1);
    const fall = s < 0.3 ? 0 : Math.min(1, (s - 0.3) / 0.62);
    const drape = fall * fall * (3 - 2 * fall);
    const tip = Math.max(0, (s - 0.72) / 0.28);
    const curl = (p.curl * 34 + p.wiggle * 12 * (i % 2 ? 1 : -1)) * tip * tip;
    // The front arms heave towards the viewer in the tug; the others brace away.
    const heave = p.strain * Math.sin(Math.PI * Math.min(1, s * 1.3)) * (front ? 22 : -10);
    // The back arm stays raised (it would hide behind the body if it drooped).
    const y = p.hump * (1 - drape * (i === 0 ? 0.85 : 1)) + curl * (i === 0 ? 1.5 : 1) + p.lift * 36 * s;
    const a = dir + ARM_BENDS[i]! * s * s;
    return { x: p.x + Math.cos(a) * (r + heave * 0.3), y, z: STAR_Z + Math.sin(a) * (r + heave) };
  });
}

interface ArmShape {
  readonly mid: Pt[];
  /** Edges on screen: towards the next arm round (+) and the one before (-). */
  readonly plus: Pt[];
  readonly minus: Pt[];
  readonly w: number[];
  /** How near the viewer it is, for drawing order. */
  readonly depth: number;
}

function armShape(p: StarPose, i: number): ArmShape {
  const line = armLine(p, i);
  const w = line.map((_, k) => {
    const s = k / (POINTS - 1);
    // Full width out past the disc's rim, then tapering to a blunt tip.
    const out = Math.max(0, (s - 0.4) / 0.6);
    return ARM_TIP_W + (ARM_W - ARM_TIP_W) * (1 - out) ** 1.2;
  });
  const mid = line.map(project);
  // Square to the arm on screen, so a foreshortened arm stays as thick as it is.
  const n = normals(mid);
  const plus = mid.map((q, k) => add(q, mul(n[k]!, w[k]!)));
  const minus = mid.map((q, k) => add(q, mul(n[k]!, -w[k]!)));
  return { mid, plus, minus, w, depth: Math.sin(ARM_DIRS[i]!) };
}

/** The arm's outline: out along one edge, round the blunt tip, back along the other. */
function armOutline(a: ArmShape): Pt[] {
  const tipDir = sub(a.mid[POINTS - 1]!, a.mid[POINTS - 2]!);
  const len = Math.hypot(tipDir.x, tipDir.y) || 1;
  const t = mul(tipDir, 1 / len);
  const end = a.mid[POINTS - 1]!;
  const side = sub(a.minus[POINTS - 1]!, end);
  const r = Math.hypot(side.x, side.y);
  // A round, blunt tip from one edge to the other.
  const cap = [1, 2, 3, 4, 5, 6, 7].map((k) => {
    const th = (k / 8) * Math.PI;
    return add(end, add(mul(side, Math.cos(th)), mul(t, r * Math.sin(th))));
  });
  return [...a.minus, ...cap, ...[...a.plus].reverse()];
}

/** The disc's top on screen (a plump dome), and its underside showing below its front edge. */
const discCentre = (p: StarPose): Pt => project({ x: p.x, y: p.hump + 24, z: STAR_Z });
const discRing = (p: StarPose): Pt[] => {
  const c = discCentre(p);
  return ring(c.x, c.y, BODY_R, BODY_R * 0.66, 60);
};
const oralRing = (p: StarPose): Pt[] => {
  const c = discCentre(p);
  return ring(c.x, c.y + ORAL_DROP, BODY_R * 0.8, BODY_R * 0.6, 48);
};

/** Where the mouth is: the middle of the underside, on screen. */
export const mouthOf = (p: StarPose): Pt => {
  const c = discCentre(p);
  return pt(c.x, c.y + ORAL_DROP + BODY_R * 0.42);
};

function inside(poly: readonly Pt[], q: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Strokes a closed ring only where it isn't inside any of `covers` (so arms leave the disc without a seam). */
function strokeUncovered(pen: Pen, ringPts: readonly Pt[], covers: readonly Pt[][], width: number, keep: (q: Pt) => boolean = () => true): void {
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 1) pen.stroke(run, width, INK, 0.95);
    run = [];
  };
  for (let i = 0; i <= ringPts.length; i++) {
    const q = ringPts[i % ringPts.length]!;
    if (keep(q) && !covers.some((c) => inside(c, q))) run.push(q);
    else flush();
  }
  flush();
}

/** Draws the whole star: its underside, the arms, the domed disc over their roots. `boil` picks the line-boil frame. */
export function drawStar(ctx: CanvasRenderingContext2D, p: StarPose, boil: number): void {
  const pen = new Pen(ctx, 401 + boil * 97, 1.1);
  const arms = ARM_DIRS.map((_, i) => armShape(p, i));
  const outlines = arms.map(armOutline);
  // Shadow on the rock.
  const foot = project({ x: p.x, y: 0, z: STAR_Z + 80 });
  const shade = ctx.createRadialGradient(foot.x, foot.y, 20, foot.x, foot.y, ARM_LEN * 1.1);
  shade.addColorStop(0, `rgba(2,4,6,${(0.55 * (1 - 0.4 * p.lift)).toFixed(3)})`);
  shade.addColorStop(1, 'rgba(2,4,6,0)');
  ctx.save();
  ctx.fillStyle = shade;
  ctx.translate(foot.x, foot.y);
  ctx.scale(1, 0.55);
  ctx.translate(-foot.x, -foot.y);
  ctx.fillRect(foot.x - ARM_LEN * 1.2, foot.y - ARM_LEN * 1.2, ARM_LEN * 2.4, ARM_LEN * 2.4);
  ctx.restore();

  const order = arms.map((a, i) => ({ a, i })).sort((u, v) => u.a.depth - v.a.depth);
  for (const { a, i } of order) drawArm(ctx, pen, a, outlines[i]!, i, p);
  drawUnderside(ctx, pen, p);

  // The disc: a plump dome over the arms' roots.
  const disc = discRing(p);
  const c = discCentre(p);
  pen.fill(disc, ORANGE, 1);
  pen.clipped(disc, () => {
    const g = ctx.createRadialGradient(c.x - 40, c.y - 45, 10, c.x, c.y, BODY_R * 1.15);
    g.addColorStop(0, 'rgba(255,205,145,0.75)');
    g.addColorStop(0.55, 'rgba(240,130,60,0.12)');
    g.addColorStop(1, 'rgba(95,28,8,0.55)');
    ctx.fillStyle = g;
    pathOf(ctx, disc);
    ctx.fill();
    // Hatching in the dome's shade, low and to the right.
    const shadeSide = ring(c.x + 50, c.y + 55, BODY_R * 0.95, BODY_R * 0.5, 30);
    pen.clipped(shadeSide, () => pen.hatch(disc, 9, -0.9, 1.3, { color: ORANGE_DARK, alpha: 0.55 }));
    paintDisc(pen, c);
  });
  // Its rim only between the arms: where an arm leaves it there's no line.
  strokeUncovered(pen, disc, outlines, 4.2);
}

/** The pale underside under the disc's front edge: grooves of tube feet running in to the mouth. */
function drawUnderside(ctx: CanvasRenderingContext2D, pen: Pen, p: StarPose): void {
  const oral = oralRing(p);
  const m = mouthOf(p);
  pen.fill(oral, ORAL, 1);
  pen.clipped(oral, () => {
    const g = ctx.createRadialGradient(m.x, m.y, 8, m.x, m.y, BODY_R);
    g.addColorStop(0, 'rgba(120,40,20,0.55)');
    g.addColorStop(0.35, 'rgba(238,164,118,0)');
    g.addColorStop(1, 'rgba(110,40,15,0.5)');
    ctx.fillStyle = g;
    pathOf(ctx, oral);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i - 2) * 0.62;
      const far = pt(m.x + Math.cos(a) * BODY_R * 1.1, m.y - Math.abs(Math.sin(a)) * 30 + Math.sin(a) * 60);
      pen.hair([m, far], 7, ORAL_DARK, 0.45);
      pen.hair([m, far], 2, '#f8d3a8', 0.7);
    }
  });
  pen.stroke([...oral, oral[0]!], 3, INK, 0.9);
  // The mouth: a dark ring with pale lips.
  pen.fill(ring(m.x, m.y, 34, 17, 20), '#3a120a', 1);
  pen.stroke([...ring(m.x, m.y, 36, 18, 20), pt(m.x + 36, m.y)], 4, '#f6c79a', 0.9, false);
  pen.stroke([...ring(m.x, m.y, 38, 20, 20), pt(m.x + 38, m.y)], 2, INK, 0.8, false);
}

/** One arm: a fat orange tube washed light along its top, hatched dark down its sides and towards the rock. */
function drawArm(ctx: CanvasRenderingContext2D, pen: Pen, a: ArmShape, shape: Pt[], i: number, p: StarPose): void {
  pen.fill(shape, '#fffaf0', 1);
  pen.fill(shape, ORANGE, 0.96);
  pen.clipped(shape, () => {
    const root = a.mid[Math.round(0.3 * (POINTS - 1))]!;
    const tip = a.mid[POINTS - 1]!;
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(255,190,120,0.3)');
    g.addColorStop(0.45, 'rgba(217,98,42,0)');
    g.addColorStop(1, `rgba(70,20,6,${(0.55 - 0.25 * p.lift).toFixed(3)})`);
    ctx.fillStyle = g;
    pathOf(ctx, shape);
    ctx.fill();
    paintArm(pen, a, i);
  });
  pen.stroke(shape, 4.2, INK, 0.95);
}

/** A band along the arm between offsets k0 and k1 (in half-widths), from `from` of its length. */
function band(a: ArmShape, n: readonly Pt[], k0: number, k1: number, from: number): Pt[] {
  const j0 = Math.round(from * (POINTS - 1));
  const one: Pt[] = [];
  const two: Pt[] = [];
  for (let j = j0; j < POINTS; j++) {
    one.push(add(a.mid[j]!, mul(n[j]!, a.w[j]! * k0 * 0.7)));
    two.push(add(a.mid[j]!, mul(n[j]!, a.w[j]! * k1 * 0.7)));
  }
  return [...one, ...two.reverse()];
}

/** One arm's roundness: dark hatched sides, a light ridge, and the spine net. */
function paintArm(pen: Pen, a: ArmShape, i: number): void {
  const n = normals(a.mid);
  const off = (k: number, j: number): Pt => add(a.mid[j]!, mul(n[j]!, a.w[j]! * k * 0.7));
  const lower = band(a, n, -1.5, -0.55, 0.2);
  const upper = band(a, n, 0.62, 1.5, 0.2);
  pen.fill(lower, ORANGE_DARK, 0.5);
  pen.fill(upper, ORANGE_DARK, 0.32);
  pen.hatch(lower, 8, 0.6 + i, 1.2, { color: '#3a1205', alpha: 0.45 });
  pen.fill(band(a, n, -0.3, 0.28, 0.25), ORANGE_LIGHT, 0.45);
  // The spine net: a knobbly row down the ridge and one each side, linked across into a mesh.
  let prev: Pt[] | null = null;
  for (let s = 0.3; s < 0.97; s += 0.068) {
    const j = Math.round(s * (POINTS - 1));
    const row = [-0.62, 0, 0.62].map((k, r) => off(k + 0.08 * Math.sin(s * 40 + r + i), j));
    const size = 4.5 + 6 * (1 - s);
    row.forEach((c, r) => {
      if (prev) pen.hair([prev[r]!, c], 2, SPINE, 0.4);
      if (r > 0) pen.hair([row[r - 1]!, c], 1.6, SPINE, 0.3);
      const big = size * (r === 1 ? 1.15 : 0.85);
      pen.dot(c.x + big * 0.35, c.y + big * 0.45, big, SPINE_SHADOW, 0.6);
      pen.dot(c.x, c.y, big, SPINE, 0.95);
    });
    prev = row;
  }
}

/** The dome's spine net: rings of knobs, the pale sieve plate off to one side. */
function paintDisc(pen: Pen, c: Pt): void {
  const rings: readonly (readonly [number, number, number])[] = [[0.72, 16, 9], [0.45, 11, 9.5], [0.2, 5, 9]];
  for (const [r, count, size] of rings) {
    const pts = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r * 3;
      return pt(c.x + Math.cos(a) * BODY_R * r, c.y + Math.sin(a) * BODY_R * r * 0.66);
    });
    pts.forEach((q, i) => pen.hair([q, pts[(i + 1) % pts.length]!], 1.8, SPINE, 0.35));
    for (const q of pts) {
      pen.dot(q.x + 3, q.y + 4, size, SPINE_SHADOW, 0.55);
      pen.dot(q.x, q.y, size, SPINE, 0.95);
    }
  }
  pen.dot(c.x, c.y, 10, SPINE, 0.95);
  // The madreporite: a small pale sieve plate.
  pen.dot(c.x + 52, c.y - 20, 13, '#f2c98f', 0.95);
  pen.circle(c.x + 52, c.y - 20, 13, 1.8, ORANGE_DARK);
}

/**
 * What's in front of the mussel: the two front arms and the disc with its
 * underside. The star is painted once to its own layer, behind the mussel,
 * then again clipped to this.
 */
export function frontMask(p: StarPose): Pt[][] {
  const arms = ARM_DIRS.map((_, i) => armShape(p, i));
  return [...FRONT_ARMS.map((i) => armOutline(arms[i]!)), discRing(p), oralRing(p)];
}

/** The front arms' outlines (the stomach passes behind them). */
export function frontArms(p: StarPose): Pt[][] {
  return FRONT_ARMS.map((i) => armOutline(armShape(p, i)));
}

export const TUBE_FEET = 9;

/**
 * The tube feet: rows of little pale tubes from the front arms' inner edges
 * to the shell, stretching as they pull. `to(i, j)` says where foot j of
 * front arm i holds on (null: not holding).
 */
export function drawTubeFeet(ctx: CanvasRenderingContext2D, p: StarPose, to: (arm: number, j: number) => Pt | null, boil: number): void {
  const pen = new Pen(ctx, 977 + boil * 31, 0.5);
  for (const i of FRONT_ARMS) {
    const a = armShape(p, i);
    for (let j = 0; j < TUBE_FEET; j++) {
      const target = to(i, j);
      if (!target) continue;
      // From the nearest point of the arm's edge.
      let from = a.plus[0]!;
      let best = Infinity;
      for (let k = Math.round(0.3 * (POINTS - 1)); k < POINTS; k++) {
        for (const e of [a.plus[k]!, a.minus[k]!]) {
          const d = Math.hypot(e.x - target.x, e.y - target.y);
          if (d < best) {
            best = d;
            from = pt(e.x * 0.85 + a.mid[k]!.x * 0.15, e.y * 0.85 + a.mid[k]!.y * 0.15);
          }
        }
      }
      if (best > 90) continue;
      const thin = 1 - 0.4 * p.strain;
      const bend = pt((from.x + target.x) / 2 + (j % 2 ? 5 : -5) * (1 - p.strain), (from.y + target.y) / 2 + 4);
      const path = spline([from, bend, target], 6);
      pen.stroke(path, 4.5 * thin + 1.5, '#4a2410', 0.35, false);
      pen.stroke(path, 3.4 * thin + 1, TUBE_FOOT, 0.8, false);
      pen.dot(target.x, target.y, 4.2, TUBE_FOOT, 0.9);
      pen.circle(target.x, target.y, 4.2, 1, '#6b4a1c');
    }
  }
}

/** A point along arm i's centre line, `s` of the way out (for the strain lines). */
export function armPoint(p: StarPose, i: number, s: number): Pt {
  return armShape(p, i).mid[Math.round(s * (POINTS - 1))]!;
}
