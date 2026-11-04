import { blob, boiled, type Pt, ink, LINE } from './draw';
import { facing, norm, paintGrid, type Pose3, type Shade, toScreen, type V3, viewer } from './mesh3d';
import { bodyGrid, columnOf, DORSAL, EYE_X, type Fin, pectoral, skinAt, SMALL_FINS, TAIL, TIP_X } from './swordfishModel';

/**
 * The swordfish (Xiphias gladius), painted in washes over a real 3D form: a long
 * flat sword about a third of the length, a deep muscular body, blue-black back
 * over a silver belly, the tall crescent dorsal, the deep crescent tail, a big
 * dark eye with a gold ring and a catchlight, thin interior ink and a firm
 * outline. Placed by the point of its sword, so it can be pinned to the sub.
 */

export interface SwordfishLook {
  /** Flex of the body, about -1 .. 1. */
  readonly bend: number;
  /** Tail swing, radians. */
  readonly tail: number;
  /** Eyes wide with alarm, 0 .. 1. */
  readonly wide?: number;
  /** Eye turned to squint at the sword stuck in front of it, 0 .. 1. */
  readonly cross?: number;
  /** Eyelid dropped over the eye (dazed), 0 .. 1. */
  readonly lid?: number;
}

export interface FishPlaced {
  /** Where the pinned point of the sword lands on screen. */
  readonly tip: Pt;
  /** Length in px at the fish's own depth (100 own units). */
  readonly len: number;
  readonly a: number;
  readonly yaw: number;
  readonly roll: number;
  readonly persp: number;
  /** The sword is hidden forward of this x (it's in the seam). */
  readonly cut?: number;
  /** The water colour far parts fade into. */
  readonly fog?: readonly [number, number, number];
  readonly fogMax?: number;
  /** Towards the light, view space. */
  readonly light?: V3;
}

/** The model point pinned to `tip`. */
export const PIN_X = 46.5;

const BODY = bodyGrid();
const NEAR_FINS: readonly [Fin, Fin] = [pectoral(-1), pectoral(1)];

/** The fish's 3D pose: its pinned sword point on `p.tip`. */
export function fishPose(p: FishPlaced): Pose3 {
  const bare: Pose3 = { x: 0, y: 0, k: p.len / 100, a: p.a, yaw: p.yaw, roll: p.roll, persp: p.persp };
  const at = toScreen(bare, viewer(bare)({ x: PIN_X, y: 0, z: 0 }));
  return { ...bare, x: p.tip.x - at.x, y: p.tip.y - at.y };
}

/** Where a point of the fish lands on screen. */
export const onFish = (pose: Pose3, m: V3): Pt => toScreen(pose, viewer(pose)(m));

const bender = (look: SwordfishLook) => (m: V3): V3 => {
  const u = Math.max(0, (10 - m.x) / 52);
  const b = look.bend * u * u;
  return { x: m.x, y: m.y + 9 * b, z: m.z + 7 * b };
};

function swinger(look: SwordfishLook, bend: (m: V3) => V3): (m: V3) => V3 {
  const [c, s] = [Math.cos(look.tail), Math.sin(look.tail)];
  return (m) => {
    const [dx, dy] = [m.x + 40, m.y];
    return bend({ x: -40 + dx * c - dy * s, y: dx * s + dy * c, z: m.z - dx * Math.sin(look.tail) * 0.8 });
  };
}

function drawEye(ctx: CanvasRenderingContext2D, look: SwordfishLook, lw: number): void {
  const wide = look.wide ?? 0;
  const r = 1 + 0.14 * wide;
  blob(ctx, 0, 0, r * 1.8, r * 1.7, 0, '3,8,20', 0.65);
  ctx.fillStyle = '#0c1018';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.09, 0, Math.PI * 2);
  ctx.fill();
  const [ox, oy] = [(look.cross ?? 0) * 0.34 * r, (look.cross ?? 0) * 0.1 * r];
  const iris = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
  iris.addColorStop(0, '#e2c56c');
  iris.addColorStop(0.5, '#9a7730');
  iris.addColorStop(1, '#2a1f10');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#03050a';
  ctx.beginPath();
  ctx.arc(ox * 1.4, oy * 1.4, r * (0.5 + 0.1 * wide), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.34, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(205,235,255,0.5)';
  ctx.beginPath();
  ctx.arc(r * 0.34, r * 0.36, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.09, 0, Math.PI * 2);
  ctx.stroke();
  const lid = look.lid ?? 0;
  if (lid > 0.02) {
    const edge = -r * 1.1 + r * 2.1 * lid;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#16335a';
    ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 1.3 + edge);
    ctx.restore();
    ink(ctx, [{ x: -r * 1.1, y: edge }, { x: r * 1.1, y: edge }], lw);
  }
}

/** Is a spot of the skin on the side turned to the eye? */
function visible(pose: Pose3, view: (m: V3) => V3, warp: (m: V3) => V3, x: number, th: number): boolean {
  const c = view(warp(skinAt(x, th)));
  const a = view(warp(skinAt(x - 0.4, th)));
  const b = view(warp(skinAt(x, th + 0.05)));
  const [ux, uy, uz, vx, vy, vz] = [a.x - c.x, a.y - c.y, a.z - c.z, b.x - c.x, b.y - c.y, b.z - c.z];
  // Backward along the body, crossed with round the ring, is the outward normal.
  return facing(pose, c, { x: vy * uz - vz * uy, y: vz * ux - vx * uz, z: vx * uy - vy * ux });
}

/** The eye painted onto the skin at a flank, turned with the head. */
function eyeOnFlank(ctx: CanvasRenderingContext2D, pose: Pose3, warp: (m: V3) => V3, side: 1 | -1, look: SwordfishLook, boil: number): void {
  const view = viewer(pose);
  const th = side < 0 ? Math.PI + 0.42 : -0.42;
  if (!visible(pose, view, warp, EYE_X, th)) return;
  const screen = (m: V3): Pt => toScreen(pose, view(warp(m)));
  const c = skinAt(EYE_X, th);
  const R = 2.75;
  const o = screen(c);
  const fore = norm({ x: 1, y: skinAt(EYE_X + 0.5, th).y - c.y, z: skinAt(EYE_X + 0.5, th).z - c.z });
  const round = norm({ x: 0, y: skinAt(EYE_X, th + 0.05).y - c.y, z: skinAt(EYE_X, th + 0.05).z - c.z });
  const add = (d: V3): V3 => ({ x: c.x + d.x * R, y: c.y + d.y * R, z: c.z + d.z * R });
  const [px, py] = [screen(add(fore)), screen(add(round))];
  ctx.save();
  ctx.transform(px.x - o.x, px.y - o.y, py.x - o.x, py.y - o.y, o.x, o.y);
  drawEye(ctx, look, 0.1);
  ctx.restore();
  // The heavy brow over it, a thin ridge of ink.
  const brow = [0.9, 0.4, -0.2, -0.75].map((u) => screen(skinAt(EYE_X + u * R * 1.2, th + (side < 0 ? 0.42 - u * u * 0.14 : -0.42 + u * u * 0.14))));
  ink(ctx, boiled(brow, boil, 0.7, 2), 3, LINE, 0.75);
}

/** Thin interior ink, following the skin: the gill cover, the mouth, the line along the flank. */
function inkOn(ctx: CanvasRenderingContext2D, pose: Pose3, warp: (m: V3) => V3, spots: readonly (readonly [number, number])[], width: number, colour: string, alpha: number, boil: number): void {
  const view = viewer(pose);
  const shown = spots.filter(([x, th]) => visible(pose, view, warp, x, th)).map(([x, th]) => toScreen(pose, view(warp(skinAt(x, th)))));
  if (shown.length > 1) ink(ctx, boiled(shown, boil, 0.5, 5), width, colour, alpha);
}

function drawDetails(ctx: CanvasRenderingContext2D, pose: Pose3, warp: (m: V3) => V3, side: 1 | -1, boil: number): void {
  const px = Math.max(1.6, pose.k * 0.14);
  const flank = (th: number): number => (side < 0 ? Math.PI - th : th);
  const steps = (n: number, f: (u: number) => readonly [number, number]): (readonly [number, number])[] => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
  // The gill cover's curved edge, with a pale line of light behind it.
  const gill = steps(14, (u) => [7.4 - 3.4 * Math.sin(u * Math.PI) + 2.4 * u, flank(-1 + 2.1 * u)]);
  inkOn(ctx, pose, warp, gill, px * 1.1, '#050c1c', 0.75, boil);
  inkOn(ctx, pose, warp, gill.map(([x, th]) => [x - 0.5, th]), px * 0.8, '#dcebf5', 0.3, boil);
  // The mouth, low on the head, running back from under the sword; no teeth.
  const mouth = steps(10, (u) => [22 - 9.5 * u, flank(0.92 - 0.34 * u)]);
  inkOn(ctx, pose, warp, mouth, px * 1.05, '#060a14', 0.9, boil + 1);
  inkOn(ctx, pose, warp, steps(8, (u) => [12 - 3 * u, flank(0.58 + 0.28 * u)]), px * 0.8, '#060a14', 0.45, boil);
  // The sword's flat: a low ridge down its middle, a hard ink edge on the side that faces us.
  inkOn(ctx, pose, warp, steps(10, (u) => [46 - 22 * u, -Math.PI / 2]), px * 0.7, '#0a1524', 0.55, boil);
  inkOn(ctx, pose, warp, steps(10, (u) => [46 - 22 * u, -Math.PI / 2 + 0.2]), px * 0.6, '#9fb9cf', 0.5, boil);
  // The line down the flank and the keel on the tail's root.
  inkOn(ctx, pose, warp, steps(20, (u) => [4 - 40 * u, flank(-0.2 + 0.06 * Math.sin(u * 9))]), px * 0.55, '#081528', 0.4, boil);
  inkOn(ctx, pose, warp, steps(6, (u) => [-35 - 7 * u, flank(0)]), px * 1.5, '#070f20', 0.75, boil);
}

function finRays(ctx: CanvasRenderingContext2D, pose: Pose3, f: Fin, warp: (m: V3) => V3, count: number): void {
  const view = viewer(pose);
  const { nu, nv, at } = f.grid;
  const row = nv + 1;
  for (let i = 1; i <= count; i++) {
    const v = Math.round((i / (count + 1)) * nv);
    const pts = Array.from({ length: 7 }, (_, j) => toScreen(pose, view(warp(at[Math.round((j / 6) * nu * 0.92) * row + v]!))));
    ink(ctx, pts, Math.max(1, pose.k * 0.09), '#050c1c', 0.32);
  }
}

const DEEP_LIGHT: V3 = norm({ x: 0.08, y: -0.6, z: -0.8 });

/** The fish: fins and body painted far to near. */
export function drawSwordfish(ctx: CanvasRenderingContext2D, p: FishPlaced, look: SwordfishLook, boil: number): void {
  const pose = fishPose(p);
  const shade: Shade = { light: p.light ?? DEEP_LIGHT, ambient: 0.62, diffuse: 0.74, fog: p.fog ?? [14, 62, 104], fogMax: p.fogMax ?? 0.32 };
  const bend = bender(look);
  const swing = swinger(look, bend);
  const view = viewer(pose);
  const outline = Math.max(2, pose.k * 0.16);
  const depthOf = (f: Fin): number => {
    const m = f.grid.at[Math.floor(f.grid.at.length / 2)]!;
    return view(f.swing ? swing(m) : bend(m)).z;
  };
  const fins = [...TAIL, ...SMALL_FINS, DORSAL, ...NEAR_FINS];
  const bodyDepth = view(bend({ x: -6, y: 0, z: 0 })).z;
  const paintFin = (f: Fin, i: number): void => {
    const warp = f.swing ? swing : bend;
    paintGrid(ctx, pose, f.grid, warp, shade, outline * 0.8);
    finRays(ctx, pose, f, warp, i < 2 ? 7 : f === DORSAL ? 10 : 5);
  };
  fins.forEach((f, i) => { if (depthOf(f) >= bodyDepth - 0.01) paintFin(f, i); });
  const side: 1 | -1 = view({ x: 0, y: 0, z: 1 }).z > 0 ? -1 : 1;
  paintGrid(ctx, pose, BODY, bend, shade, outline, columnOf(p.cut ?? TIP_X));
  drawDetails(ctx, pose, bend, side, boil);
  fins.forEach((f, i) => { if (depthOf(f) < bodyDepth - 0.01) paintFin(f, i); });
  eyeOnFlank(ctx, pose, bend, side, look, boil);
}
