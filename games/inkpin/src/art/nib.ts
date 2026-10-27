import { createRng } from '../logic/rng';
import { ART_RES, BANDANA, BLOT_INK, FUR, FUR_DARK, FUR_LIGHT, GOLD, GOLD_DARK, GOLD_LIGHT, INK, LEATHER, SACK, VEST, WOOD_DARK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Nib, the raccoon ruin explorer: red headband, olive field vest with a
 * strap across it, a leather backpack and a lamp. Drawn side-on facing
 * right with the head turned a little towards us so both eyes show.
 * (0, 0) is the middle of Nib's collision circle; the feet stand at y = 24.
 * The backpack and the lamp are separate drawings, so they can fly off when
 * a level fails.
 */

/** The frame is centred on Nib horizontally, so flipping it mirrors Nib in place. */
export const NIB_FRAME = { w: 128, h: 116, ox: 64, oy: 66 } as const;

export type NibPose = 'stand' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'swim' | 'cheer' | 'shock';
/** What a failed level leaves on Nib's face and fur. */
export type NibMark = 'none' | 'soot' | 'ink' | 'tears' | 'dizzy';

export interface NibLook {
  readonly pose: NibPose;
  readonly mark: NibMark;
  readonly boil: number;
}

export function paintNib(look: NibLook): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(NIB_FRAME.w * ART_RES, NIB_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(NIB_FRAME.ox, NIB_FRAME.oy);
  const pen = new Pen(ctx, 101 + look.boil * 17, 0.55);
  const shock = look.pose === 'shock';
  const swim = look.pose === 'swim';
  const cheer = look.pose === 'cheer';
  // A startled raccoon jumps: everything sits a little higher, tail bristling.
  const lift = shock ? -6 : cheer ? -3 : 0;
  if (!swim && !shock) paintShadow(ctx, lift);
  ctx.translate(0, lift);
  paintTail(pen, ctx, shock, look.mark === 'soot');
  if (!swim) paintLegs(pen, look.pose);
  paintBody(pen, ctx);
  paintVest(pen, ctx);
  paintArm(pen, look.pose, 'back');
  // Raised arms go up behind the head, waving; otherwise the front arm is in front of the body.
  const up = shock || cheer;
  if (up) paintArm(pen, look.pose, 'front');
  paintHead(pen, ctx, look);
  if (!up) paintArm(pen, look.pose, 'front');
  if (swim) paintRipples(pen);
  paintMark(pen, ctx, look.mark, look.boil);
  return canvas;
}

function tube(path: readonly Pt[], radius: (t: number) => number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.min(path.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const r = radius(i / (path.length - 1));
    left.push({ x: path[i]!.x + nx * r, y: path[i]!.y + ny * r });
    right.push({ x: path[i]!.x - nx * r, y: path[i]!.y - ny * r });
  }
  return [...left, ...right.reverse()];
}

function paintTail(pen: Pen, ctx: CanvasRenderingContext2D, bristle: boolean, soot: boolean): void {
  const path: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    // Curls up and back from the rump; straight up when startled.
    const ang = bristle ? Math.PI * (1.05 + 0.4 * t) : Math.PI * (0.95 + 0.32 * t);
    const reach = 4 + t * 30;
    path.push({ x: -18 + Math.cos(ang) * reach, y: 8 + Math.sin(ang) * reach });
  }
  const fat = bristle ? 1.12 : 1;
  const shape = tube(path, (t) => (6 + Math.sin(t * Math.PI) * 5) * fat * (t > 0.9 ? 1 - (t - 0.9) * 4 : 1));
  const tailBase = soot ? mix(FUR, '#3a3638', 0.45) : FUR;
  const mid = path[7]!;
  washed(ctx, shape, tailBase, mid.x, mid.y, 18);
  pen.clipped(shape, () => {
    // Dark rings across the tail.
    for (const t of [0.22, 0.46, 0.7, 0.92]) {
      const p = path[Math.round(t * 14)]!;
      const q = path[Math.min(14, Math.round(t * 14) + 1)]!;
      const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
      ctx.strokeStyle = FUR_DARK;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16);
      ctx.lineTo(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16);
      ctx.stroke();
    }
  });
  pen.stroke([...shape, shape[0]!], 1.8, INK, 0.95);
  // Fur along the tail's outer edge.
  for (let i = 3; i < 14; i += 2) {
    const p = shape[i]!;
    const q = shape[i + 1]!;
    pen.hair([p, { x: (p.x + q.x) / 2 - (q.y - p.y) * 0.5, y: (p.y + q.y) / 2 + (q.x - p.x) * 0.5 }], 0.8, INK, 0.5);
  }
  if (bristle) {
    // Fur on end.
    for (let i = 2; i < 14; i += 2) {
      const p = path[i]!;
      pen.hair([p, { x: p.x - 6, y: p.y - 5 + (i % 4) }], 1, INK, 0.7);
    }
  }
}

function paintLegs(pen: Pen, pose: NibPose): void {
  const step = pose.startsWith('walk') ? Number(pose.slice(4)) : -1;
  const swing = step < 0 ? [0, 0, 0, 0] : [[4, -3, -4, 3], [1, 2, -1, -2], [-4, 3, 4, -3], [-1, -2, 1, 2]][step]!;
  const lift = step < 0 ? [0, 0, 0, 0] : [[0, 2, 0, 2], [2, 0, 2, 0], [0, 2, 0, 2], [2, 0, 2, 0]][step]!;
  const xs = [-17, -9, 6, 13];
  const shock = pose === 'shock';
  xs.forEach((x, i) => {
    const foot = { x: x + swing[i]! + (shock ? (i < 2 ? -3 : 3) : 0), y: 24 - lift[i]! - (shock ? 4 : 0) };
    const leg = [{ x: x - 3.5, y: 12 }, { x: x + 3.5, y: 12 }, { x: foot.x + 3, y: foot.y - 2 }, { x: foot.x + 4, y: foot.y }, { x: foot.x - 3, y: foot.y }, { x: foot.x - 3.5, y: foot.y - 2 }];
    pen.fill(leg, i === 0 || i === 2 ? mix(FUR_DARK, '#000000', 0.15) : FUR_DARK, 1);
    pen.stroke([...leg, leg[0]!], 1.3, INK, 0.9, false);
  });
}

/** Fills a shape with a watercolour wash: light where the light comes from (top left), deeper away from it. */
function washed(ctx: CanvasRenderingContext2D, shape: readonly Pt[], base: string, cx: number, cy: number, r: number): void {
  const g = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.55, r * 0.1, cx, cy, r * 1.25);
  g.addColorStop(0, mix(base, '#ffffff', 0.32));
  g.addColorStop(0.6, base);
  g.addColorStop(1, mix(base, '#2a2833', 0.32));
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

/** An ellipse whose edge is tufted with fur between angles a0 and a1 (radians, clockwise from +x). */
function furryEllipse(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, tuft: number): Pt[] {
  const pts: Pt[] = [];
  const n = 44;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const inside = a0 < a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;
    const k = inside ? (i % 2 === 0 ? 1 + tuft : 1 - tuft * 0.3) : 1;
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return pts;
}

/** Short fur strokes following a curve's direction, for texture along a contour. */
function furStrokes(pen: Pen, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, count: number, color: string): void {
  for (let i = 0; i < count; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / count;
    const x = cx + Math.cos(a) * rx * 0.86;
    const y = cy + Math.sin(a) * ry * 0.86;
    const tx = -Math.sin(a);
    const ty = Math.cos(a);
    pen.hair([{ x, y }, { x: x + tx * 3 + Math.cos(a) * 1.5, y: y + ty * 3 + Math.sin(a) * 1.5 }], 0.8, color, 0.5);
  }
}

/** A soft shadow on the ground under Nib's feet. */
function paintShadow(ctx: CanvasRenderingContext2D, lift: number): void {
  const g = ctx.createRadialGradient(0, 24 - lift, 0, 0, 24 - lift, 26);
  g.addColorStop(0, 'rgba(40,32,24,0.32)');
  g.addColorStop(1, 'rgba(40,32,24,0)');
  ctx.save();
  ctx.translate(0, 24 - lift);
  ctx.scale(1, 0.22);
  ctx.translate(0, -(24 - lift));
  ctx.fillStyle = g;
  ctx.fillRect(-30, -2 - lift, 60, 52);
  ctx.restore();
}

/** The olive field vest over the shoulders and chest, a pocket, and the pack's strap across it. */
function paintVest(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const body = ellipse(-3, 6, 20, 14, 28);
  const vest = [{ x: -12, y: -9 }, { x: 10, y: -8 }, { x: 18, y: 2 }, { x: 15, y: 13 }, { x: 6, y: 15 }, { x: -2, y: 9 }, { x: -8, y: 2 }];
  pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -9, 0, 15);
    g.addColorStop(0, mix(VEST, '#ffffff', 0.2));
    g.addColorStop(1, mix(VEST, '#1f2418', 0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    vest.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    pen.stroke([...vest.slice(2), vest[0]!], 1.2, INK, 0.85, false);
    // A pocket with a flap, and stitching.
    const pocket = [{ x: 6, y: 3 }, { x: 13, y: 3 }, { x: 13, y: 10 }, { x: 6, y: 10 }];
    pen.fill(pocket, mix(VEST, '#1f2418', 0.2), 1);
    pen.stroke([...pocket, pocket[0]!], 0.8, INK, 0.7, false);
    pen.hair([{ x: 6, y: 5 }, { x: 13, y: 5 }], 0.7, INK, 0.6);
    for (let x = -9; x < 9; x += 2.4) pen.dot(x, -6.5 + (x + 9) * 0.05, 0.35, mix(VEST, '#ffffff', 0.5));
    // The backpack strap, from the far shoulder down across the chest.
    pen.stroke([{ x: 13, y: -6 }, { x: 4, y: 4 }, { x: -6, y: 14 }], 2.6, LEATHER, 1, false);
    pen.hair([{ x: 13, y: -6 }, { x: -6, y: 14 }], 0.6, INK, 0.5);
    pen.fill(ellipse(5, 3, 2.2, 2.2, 10), GOLD, 1);
  });
}

function paintBody(pen: Pen, ctx: CanvasRenderingContext2D): void {
  // Fur tufts along the belly, smooth along the back.
  const body = furryEllipse(-3, 6, 20, 14, 0.9, 2.3, 0.03);
  washed(ctx, body, FUR, -3, 6, 20);
  pen.clipped(body, () => {
    // The pale belly, then shade under it and a soft light along the back.
    washed(ctx, ellipse(4, 14, 13, 7, 22), FUR_LIGHT, 4, 12, 13);
    pen.hatch(body, 3, 0.9, 0.6, { color: INK, alpha: 0.22, onlyBelow: 14 });
    ctx.fillStyle = rgba('#ffffff', 0.2);
    ctx.beginPath();
    ctx.ellipse(-7, -2, 12, 4, -0.15, 0, Math.PI * 2);
    ctx.fill();
  });
  furStrokes(pen, -3, 6, 20, 14, 3.4, 5.6, 9, FUR_DARK);
  pen.stroke([...body, body[0]!], 1.8, INK, 0.95);
}

/** Arms: the front one carries the lantern; both fly up in shock or in a cheer. */
function paintArm(pen: Pen, pose: NibPose, side: 'front' | 'back'): void {
  const up = pose === 'shock' || pose === 'cheer';
  const swim = pose === 'swim';
  const shoulder = side === 'front' ? { x: 12, y: 2 } : { x: 6, y: 0 };
  let paw: Pt;
  if (up) paw = side === 'front' ? { x: 36, y: -24 } : { x: -10, y: -26 };
  else if (swim) paw = side === 'front' ? { x: 28, y: 6 } : { x: 18, y: 10 };
  else paw = side === 'front' ? { x: 24, y: 9 } : { x: 17, y: 12 };
  const color = side === 'back' ? mix(FUR_DARK, '#000000', 0.2) : FUR_DARK;
  pen.stroke([shoulder, { x: (shoulder.x + paw.x) / 2 + 1, y: (shoulder.y + paw.y) / 2 + (up ? 0 : 2) }, paw], 5.5, color, 1, false);
  pen.dot(paw.x, paw.y, 3.6, color);
  if (up) {
    // Little splayed fingers.
    for (const a of [-0.6, 0, 0.6]) pen.hair([paw, { x: paw.x + Math.sin(a) * 6, y: paw.y - Math.cos(a) * 6 }], 1.6, color, 1);
  }
}

function paintHead(pen: Pen, ctx: CanvasRenderingContext2D, look: NibLook): void {
  const big = look.pose === 'shock';
  const cx = 14;
  const cy = -11;
  // Ears.
  for (const [ex, ey, tilt] of [[5, -24, -0.35], [21, -25, 0.3]] as const) {
    const lift = big ? -4 : 0;
    const ear = [{ x: ex - 6, y: ey + 7 }, { x: ex + Math.sin(tilt) * 6, y: ey - 5 + lift }, { x: ex + 6, y: ey + 7 }];
    pen.fill(ear, FUR, 1);
    pen.fill([{ x: ex - 3, y: ey + 6 }, { x: ex + Math.sin(tilt) * 4, y: ey - 1 + lift }, { x: ex + 3, y: ey + 6 }], FUR_DARK, 1);
    pen.stroke([...ear, ear[0]!], 1.5, INK, 0.95, false);
  }
  // The ruff: raccoons' white cheek fluff sticks out below and behind the face.
  const ruff = furryEllipse(cx - 1, cy + 5, 15, 9, 0.6, 2.9, 0.1);
  washed(ctx, ruff, FUR_LIGHT, cx - 1, cy + 5, 14);
  pen.stroke([...ruff, ruff[0]!], 1.3, INK, 0.8, false);
  const head = [...ellipse(cx, cy, 14, 12.5, 26)];
  washed(ctx, head, FUR, cx, cy, 14);
  pen.clipped(head, () => {
    // White cheeks and brow.
    washed(ctx, ellipse(cx + 1, cy + 7, 12, 6, 18), FUR_LIGHT, cx + 1, cy + 7, 12);
    pen.fill(ellipse(cx + 3, cy - 7, 9, 3, 14), FUR_LIGHT, 0.95);
    // A dark stripe down the forehead, as on a real raccoon.
    pen.fill([{ x: cx + 0, y: cy - 13 }, { x: cx + 3, y: cy - 13 }, { x: cx + 2.5, y: cy - 3 }, { x: cx + 0.8, y: cy - 3 }], FUR_DARK, 0.75);
  });
  // Snout.
  const snout = ellipse(cx + 12, cy + 4, 8, 5.5, 18);
  washed(ctx, snout, FUR_LIGHT, cx + 12, cy + 4, 8);
  pen.stroke([...snout, snout[0]!], 1.4, INK, 0.9, false);
  pen.stroke([...head, head[0]!], 1.8, INK, 0.95);
  // The bandit mask across both eyes, darkest round the eyes.
  for (const [mx, mrx, mry] of [[cx - 4, 6.8, 5], [cx + 6, 6.2, 4.8]] as const) {
    const g = ctx.createRadialGradient(mx, cy - 1, 1, mx, cy - 1, mrx);
    g.addColorStop(0, '#24222a');
    g.addColorStop(1, FUR_DARK);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(mx, cy - 1, mrx, mry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.fill([{ x: cx - 4, y: cy - 3 }, { x: cx + 6, y: cy - 3 }, { x: cx + 6, y: cy + 2 }, { x: cx - 4, y: cy + 2 }], FUR_DARK, 1);
  paintBandana(pen, ctx, cx, cy, head, look);
  pen.dot(cx + 19.5, cy + 3, 2.8, '#1a1a1e');
  pen.dot(cx + 18.8, cy + 2.2, 0.8, '#ffffff', 0.8);
  if (big) paintBigEyes(pen, cx, cy, look);
  else paintEyes(pen, cx, cy, look.pose === 'cheer');
  paintMouth(pen, cx, cy, look);
}

/** The red explorer's headband across the brow, knotted at the back with two tails. */
function paintBandana(pen: Pen, ctx: CanvasRenderingContext2D, cx: number, cy: number, head: readonly Pt[], look: NibLook): void {
  const band: Pt[] = [];
  for (let t = 0; t <= 1.0001; t += 0.1) band.push({ x: cx - 15 + t * 29, y: cy - 7.5 - Math.sin(t * Math.PI) * 2.2 });
  pen.clipped(head, () => {
    ctx.strokeStyle = BANDANA;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    band.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = mix(BANDANA, '#ffffff', 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    band.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y - 1.2) : ctx.lineTo(p.x, p.y - 1.2)));
    ctx.stroke();
  });
  pen.hair(band.map((p) => ({ x: p.x, y: p.y + 2 })), 0.7, INK, 0.6);
  // The knot and its tails, streaming back (wilder when startled).
  const kx = cx - 13;
  const ky = cy - 6;
  const wild = look.pose === 'shock' ? 1.6 : 1;
  const flap = Math.sin(look.boil * 2.1) * 1.5;
  for (const [dy, len] of [[-1, 11], [2, 9]] as const) {
    const tail = [{ x: kx, y: ky }, { x: kx - len * 0.5, y: ky + dy * wild + flap * 0.5 }, { x: kx - len, y: ky + dy * 2.2 * wild + flap }];
    pen.stroke(tail, 2.6, BANDANA, 1, false);
    pen.hair(tail, 0.6, INK, 0.6);
  }
  pen.dot(kx, ky, 2.4, mix(BANDANA, '#000000', 0.2));
}

function paintEyes(pen: Pen, cx: number, cy: number, happy: boolean): void {
  for (const ex of [cx - 4, cx + 6]) {
    if (happy) {
      // Closed, smiling eyes.
      pen.stroke([{ x: ex - 3, y: cy }, { x: ex, y: cy - 2.5 }, { x: ex + 3, y: cy }], 1.4, '#ffffff', 1, false);
      continue;
    }
    pen.dot(ex + 0.5, cy - 0.5, 2.6, '#ffffff');
    pen.dot(ex + 1.2, cy - 0.3, 1.7, '#141418');
    pen.dot(ex + 1.7, cy - 1, 0.6, '#ffffff');
  }
}

/** The silly face: eyes far too big for the head, pupils shrunk to dots and pointing different ways. */
function paintBigEyes(pen: Pen, cx: number, cy: number, look: NibLook): void {
  const rng = createRng(500 + look.boil * 13);
  const dizzy = look.mark === 'dizzy';
  const eyes = [{ x: cx - 5, y: cy - 3, r: 7.5 }, { x: cx + 8, y: cy - 4, r: 8.5 }];
  for (const [i, e] of eyes.entries()) {
    const ball = ellipse(e.x, e.y, e.r, e.r * 1.08, 20);
    pen.fill(ball, '#ffffff', 1);
    pen.stroke([...ball, ball[0]!], 1.5, INK, 1, false);
    if (dizzy) {
      // Spirals.
      const sp: Pt[] = [];
      for (let a = 0; a < Math.PI * 5; a += 0.4) sp.push({ x: e.x + Math.cos(a + look.boil) * a * 0.42, y: e.y + Math.sin(a + look.boil) * a * 0.42 });
      pen.hair(sp, 1.1, INK, 1);
      continue;
    }
    // Pupils: tiny, and not quite looking the same way.
    const px = e.x + (i === 0 ? -1.5 : 2) + (rng() - 0.5) * 2;
    const py = e.y + (i === 0 ? 1.5 : -1) + (rng() - 0.5) * 2;
    pen.dot(px, py, 2.1, '#141418');
    pen.dot(px + 0.7, py - 0.7, 0.6, '#ffffff');
  }
  // Brows shot up.
  pen.stroke([{ x: cx - 11, y: cy - 13 }, { x: cx - 5, y: cy - 16 }, { x: cx, y: cy - 13 }], 1.6, INK, 1, false);
  pen.stroke([{ x: cx + 3, y: cy - 15 }, { x: cx + 9, y: cy - 18 }, { x: cx + 15, y: cy - 15 }], 1.6, INK, 1, false);
  // Sweat drops flying off.
  for (const [dx, dy] of [[-16, -16], [24, -20]] as const) {
    const drop = [{ x: cx + dx, y: cy + dy - 4 }, { x: cx + dx + 2.5, y: cy + dy + 1 }, { x: cx + dx, y: cy + dy + 3 }, { x: cx + dx - 2.5, y: cy + dy + 1 }];
    pen.fill(drop, '#bcd8f0', 1);
    pen.stroke([...drop, drop[0]!], 1, INK, 0.8, false);
  }
}

function paintMouth(pen: Pen, cx: number, cy: number, look: NibLook): void {
  const mx = cx + 14;
  const my = cy + 9;
  if (look.pose === 'shock') {
    if (look.mark === 'tears') {
      // A wobbly, quivering frown.
      pen.stroke([{ x: mx - 6, y: my + 2 }, { x: mx - 3, y: my - 1 }, { x: mx, y: my + 1 }, { x: mx + 3, y: my - 1 }, { x: mx + 5, y: my + 2 }], 1.4, INK, 1, false);
      return;
    }
    // A big "O", with the tongue out when inked.
    const o = ellipse(mx - 1, my + 2, 3.6, 4.6, 14);
    pen.fill(o, '#5a2430', 1);
    pen.stroke([...o, o[0]!], 1.3, INK, 1, false);
    if (look.mark === 'ink') {
      const tongue = [{ x: mx - 3, y: my + 4 }, { x: mx + 2, y: my + 4 }, { x: mx + 1.5, y: my + 10 }, { x: mx - 2, y: my + 10 }];
      pen.fill(tongue, '#e58a9a', 1);
      pen.stroke([...tongue, tongue[0]!], 1, INK, 0.9, false);
    }
    return;
  }
  if (look.pose === 'cheer') {
    const smile = [{ x: mx - 6, y: my - 1 }, { x: mx + 4, y: my - 1 }, { x: mx, y: my + 5 }, { x: mx - 4, y: my + 4 }];
    pen.fill(smile, '#5a2430', 1);
    pen.stroke([...smile, smile[0]!], 1.2, INK, 1, false);
    return;
  }
  pen.hair([{ x: mx - 5, y: my }, { x: mx - 2, y: my + 2 }, { x: mx + 2, y: my + 1 }], 1.2, INK, 0.9);
}

function paintRipples(pen: Pen): void {
  for (const [y, w] of [[18, 34], [23, 26]] as const) pen.hair([{ x: -w, y }, { x: -w / 2, y: y - 2 }, { x: 0, y }, { x: w / 2, y: y - 2 }, { x: w, y }], 1.3, '#3f6aa8', 0.8);
}

function paintMark(pen: Pen, ctx: CanvasRenderingContext2D, mark: NibMark, boil: number): void {
  const rng = createRng(900 + boil);
  if (mark === 'soot') {
    // Smudges of soot and a few curls of smoke.
    for (let i = 0; i < 9; i++) {
      const x = -24 + rng() * 52;
      const y = -26 + rng() * 44;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6 + rng() * 6);
      g.addColorStop(0, 'rgba(40,36,38,0.55)');
      g.addColorStop(1, 'rgba(40,36,38,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 12, y - 12, 24, 24);
    }
    for (const sx of [-30, -4, 22]) {
      const curl: Pt[] = [];
      for (let t = 0; t <= 1; t += 0.1) curl.push({ x: sx + Math.sin(t * 9 + boil) * 4, y: -34 - t * 20 });
      pen.hair(curl, 1.4, '#6b6670', 0.7);
    }
  } else if (mark === 'ink') {
    // Splats of Blot ink, with drips.
    for (const [x, y, r] of [[18, -18, 6], [-6, 4, 7], [26, -2, 4], [-28, -8, 5]] as const) {
      const splat: Pt[] = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rr = r * (i % 2 === 0 ? 1 + rng() * 0.6 : 0.65);
        splat.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      pen.fill(splat, BLOT_INK, 0.92);
      pen.stroke([{ x, y: y + r * 0.6 }, { x: x + 0.5, y: y + r * 0.6 + 5 + rng() * 5 }], 2.2, BLOT_INK, 0.9, false);
      pen.dot(x - r * 0.3, y - r * 0.3, r * 0.22, '#ffffff', 0.4);
    }
  } else if (mark === 'tears') {
    // Two streams of tears.
    for (const ex of [9, 21]) {
      const stream = [{ x: ex, y: -8 }, { x: ex + 2, y: 0 }, { x: ex + 1, y: 8 }];
      pen.stroke(stream, 3, '#9cc6ea', 0.9, false);
      pen.dot(ex + 1, 10, 2.2, '#9cc6ea', 0.9);
    }
  }
}

/** Nib's leather backpack, with a coil of rope on top and a coin peeking from under the flap. Centred on (0, 0). */
export function paintSack(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(44 * ART_RES, 44 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(22, 24);
  const pen = new Pen(ctx, 61, 0.5);
  const pack = [{ x: -11, y: -9 }, { x: 11, y: -9 }, { x: 13, y: 12 }, { x: -13, y: 12 }];
  const g = ctx.createLinearGradient(-13, -9, 13, 12);
  g.addColorStop(0, mix(LEATHER, '#ffffff', 0.2));
  g.addColorStop(1, mix(LEATHER, '#1e120a', 0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  pack.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Side pocket and seams.
  pen.fill([{ x: -12, y: 3 }, { x: -6, y: 3 }, { x: -6, y: 11 }, { x: -12.6, y: 11 }], mix(LEATHER, '#1e120a', 0.25), 1);
  pen.hair([{ x: -9, y: -8 }, { x: -10.5, y: 11 }], 0.6, INK, 0.4);
  // A coin peeking out under the flap.
  pen.dot(4, -8, 3.4, GOLD);
  pen.circle(4, -8, 3.4, 0.9, GOLD_DARK);
  // The flap with a brass buckle.
  const flap = [{ x: -12, y: -10 }, { x: 12, y: -10 }, { x: 11, y: 0 }, { x: 0, y: 3 }, { x: -11, y: 0 }];
  pen.fill(flap, mix(LEATHER, '#1e120a', 0.2), 1);
  pen.stroke([...flap, flap[0]!], 1.2, INK, 0.9, false);
  pen.fill([{ x: -2, y: -1 }, { x: 2, y: -1 }, { x: 2, y: 4 }, { x: -2, y: 4 }], GOLD, 1);
  pen.stroke([{ x: -2, y: -1 }, { x: 2, y: -1 }, { x: 2, y: 4 }, { x: -2, y: 4 }, { x: -2, y: -1 }], 0.8, GOLD_DARK, 1, false);
  pen.stroke([...pack, pack[0]!], 1.5, INK, 0.95, false);
  // A coil of rope strapped on top.
  for (let k = 0; k < 3; k++) {
    const coil = ellipse(0, -13 + k * 0.6, 12 - k, 3.6, 18);
    pen.stroke([...coil, coil[0]!], 2, SACK, 1, false);
    pen.stroke([...coil, coil[0]!], 0.6, WOOD_DARK, 0.7, false);
  }
  return canvas;
}

/** Nib's lantern, hanging from its ring at (0, -10). */
export function paintLantern(lit: boolean): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(36 * ART_RES, 40 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(18, 20);
  const pen = new Pen(ctx, 71, 0.4);
  if (lit) {
    const g = ctx.createRadialGradient(0, 2, 0, 0, 2, 17);
    g.addColorStop(0, rgba(GOLD_LIGHT, 0.75));
    g.addColorStop(1, rgba(GOLD_LIGHT, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-18, -16, 36, 36);
  }
  pen.circle(0, -11, 2.6, 1.3, INK);
  const glass = [{ x: -5, y: -6 }, { x: 5, y: -6 }, { x: 6, y: 8 }, { x: -6, y: 8 }];
  pen.fill(glass, lit ? GOLD_LIGHT : '#d7d2c4', 1);
  if (lit) pen.dot(0, 2, 2.6, GOLD, 0.9);
  pen.stroke([...glass, glass[0]!], 1.4, INK, 1, false);
  pen.fill([{ x: -6, y: -9 }, { x: 6, y: -9 }, { x: 5, y: -6 }, { x: -5, y: -6 }], WOOD_DARK, 1);
  pen.fill([{ x: -7, y: 8 }, { x: 7, y: 8 }, { x: 7, y: 11 }, { x: -7, y: 11 }], WOOD_DARK, 1);
  pen.hair([{ x: 0, y: -6 }, { x: 0, y: 8 }], 0.9, INK, 0.7);
  return canvas;
}

/** Where the sack and lantern sit on Nib (facing right), relative to Nib's centre, by pose. */
export function propOffsets(pose: NibPose): { sack: Pt; lantern: Pt } {
  if (pose === 'swim') return { sack: { x: -13, y: -4 }, lantern: { x: 30, y: 10 } };
  if (pose === 'cheer') return { sack: { x: -14, y: -9 }, lantern: { x: 38, y: -20 } };
  return { sack: { x: -14, y: -6 }, lantern: { x: 25, y: 19 } };
}
