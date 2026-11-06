import { Pen, type Pt } from '../../../../src/art/pen';
import { CRAB_SCALE, type ClawPose, type CrabPose } from '../story';
import { blob, bake, type Baked, drawBaked, flecks, inside, LIGHT, MOON_RIM, NIGHT_INK, seeded, soft, spline, trace } from './paint';

/**
 * The coconut crab, painted from above as it clambers along a branch: a broad
 * red-orange shield with its heavy tail tucked under behind, two great crusher
 * claws, long jointed legs arching high over the body, stalked eyes and long
 * antennae. Washes first, then flecks, then thin ink and a line of moonlight.
 * Shield and claw halves are baked (only their ink boils); legs and antennae
 * are drawn live from the pose (story.ts solves where the feet go).
 */

// Facing +x, y down: the crab's left is up the screen.
const HOT = '#ff9b4f';
const ORANGE = '#ee5f27';
const RED = '#bd2f21';
const MAROON = '#6c1a2b';
const DUSK = '#2b1030';
const PALE = '#ffd3a0';
const NAIL = '#22131f';

const half: readonly Pt[] = [
  { x: 172, y: 0 }, { x: 160, y: -20 }, { x: 138, y: -34 }, { x: 126, y: -84 }, { x: 92, y: -132 }, { x: 44, y: -168 },
  { x: -18, y: -188 }, { x: -84, y: -190 }, { x: -136, y: -162 }, { x: -158, y: -112 }, { x: -160, y: -56 },
];
const SHIELD: readonly Pt[] = spline([...half, { x: -146, y: 0 }, ...[...half].reverse().slice(0, -1).map((p) => ({ x: p.x, y: -p.y }))], 6, true);

/** The tail's hard plates, rear first, as it curls away under the body. */
const PLATES: readonly { readonly x: number; readonly hw: number; readonly len: number }[] = [
  { x: -218, hw: 96, len: 62 }, { x: -196, hw: 128, len: 64 }, { x: -170, hw: 142, len: 62 },
];

function plate(ctx: CanvasRenderingContext2D, pen: Pen, x: number, hw: number, len: number, i: number): void {
  const shape = spline([
    { x: x + len * 0.5, y: -hw }, { x: x - len * 0.25, y: -hw * 0.92 }, { x: x - len * 0.62, y: -hw * 0.52 }, { x: x - len * 0.72, y: 0 },
    { x: x - len * 0.62, y: hw * 0.52 }, { x: x - len * 0.25, y: hw * 0.92 }, { x: x + len * 0.5, y: hw },
  ], 6, true);
  const g = ctx.createLinearGradient(x + len * 0.5, 0, x - len * 0.7, 0);
  g.addColorStop(0, i < 2 ? RED : ORANGE);
  g.addColorStop(0.55, RED);
  g.addColorStop(1, MAROON);
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  inside(ctx, shape, () => {
    const rnd = seeded(40 + i);
    flecks(ctx, { x0: x - len, y0: -hw, x1: x + len, y1: hw }, 70, rnd, [PALE, '#ffa564', MAROON, '#3c1024'], 1, 7, 0.34);
    // Falling away into shadow as the tail curls under.
    const dark = ctx.createLinearGradient(0, -hw, 0, hw);
    dark.addColorStop(0, `${DUSK}10`);
    dark.addColorStop(0.5, `${DUSK}00`);
    dark.addColorStop(1, `${DUSK}e0`);
    ctx.fillStyle = dark;
    ctx.fillRect(x - len, -hw, len * 2, hw * 2);
    const rear = ctx.createLinearGradient(x, 0, x - len * 0.75, 0);
    rear.addColorStop(0, `${DUSK}00`);
    rear.addColorStop(1, `${DUSK}${i === 0 ? 'f0' : 'a0'}`);
    ctx.fillStyle = rear;
    ctx.fillRect(x - len, -hw, len * 2, hw * 2);
    soft(ctx, spline([{ x: x - len * 0.45, y: -hw * 0.82 }, { x: x - len * 0.62, y: -hw * 0.3 }, { x: x - len * 0.5, y: 0 }], 6), 12, MOON_RIM, 0.26);
  });
  pen.stroke([...shape, shape[0]!], 3.2, NIGHT_INK, 0.9, false);
}

function paintBody(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 7100 + f, 1.1);
  blob(ctx, -40, 34, 330, '#07040f', 0.75, 250);
  PLATES.forEach((p, i) => plate(ctx, pen, p.x, p.hw, p.len, i));

  const g = ctx.createRadialGradient(-20, -66, 14, 0, 0, 262);
  g.addColorStop(0, HOT);
  g.addColorStop(0.3, ORANGE);
  g.addColorStop(0.66, RED);
  g.addColorStop(1, MAROON);
  ctx.fillStyle = g;
  trace(ctx, SHIELD);
  ctx.fill();

  inside(ctx, SHIELD, () => {
    const rnd = seeded(77);
    // The swollen gill chambers either side of the heart.
    blob(ctx, -66, -92, 104, '#ff9d58', 0.5, 62, -0.1);
    blob(ctx, -66, 92, 104, '#a82620', 0.6, 62, 0.1);
    blob(ctx, 66, -44, 74, '#ffb372', 0.5, 42, -0.4);
    flecks(ctx, { x0: -190, y0: -165, x1: 190, y1: 165 }, 240, rnd, ['#8c2228', '#6c1a2b', '#4a1228'], 1.5, 15, 0.42);
    flecks(ctx, { x0: -190, y0: -165, x1: 190, y1: 165 }, 170, rnd, [PALE, '#ffb678', '#ffe6c4'], 1, 9, 0.5);
    // The grooves: a deep U behind the head, the heart between the gills.
    const cervical = spline([{ x: 120, y: -120 }, { x: 58, y: -92 }, { x: 16, y: -44 }, { x: 4, y: 0 }, { x: 16, y: 44 }, { x: 58, y: 92 }, { x: 120, y: 120 }], 8);
    soft(ctx, cervical, 26, '#32091f', 0.9);
    soft(ctx, cervical.map((p) => ({ x: p.x + 7, y: p.y })), 7, PALE, 0.26);
    const left = spline([{ x: 6, y: -34 }, { x: -60, y: -46 }, { x: -130, y: -36 }, { x: -176, y: -8 }], 8);
    const right = left.map((p) => ({ x: p.x, y: -p.y }));
    soft(ctx, left, 18, '#32091f', 0.72);
    soft(ctx, right, 18, '#32091f', 0.72);
    // Fine ridges across the brow.
    for (let i = 0; i < 16; i++) {
      const x = 44 + i * 9;
      const w = 118 - i * 5.5;
      pen.hair(spline([{ x, y: -w }, { x: x + 7, y: 0 }, { x, y: w }], 6), 1.6, '#4b1020', 0.36);
    }
    // Light from the moon, shadow turned from it.
    const shade = ctx.createLinearGradient(-90, -170, 70, 190);
    shade.addColorStop(0, `${DUSK}00`);
    shade.addColorStop(0.52, `${DUSK}00`);
    shade.addColorStop(1, `${DUSK}f2`);
    ctx.fillStyle = shade;
    ctx.fillRect(-200, -170, 400, 340);
    // Pen hatching down the shadowed side, stipple over the humps.
    for (let i = 0; i < 44; i++) {
      const x = -150 + i * 7.4;
      const y0 = 92 + 56 * Math.sin((i / 44) * Math.PI) + rnd() * 16;
      pen.hair([{ x, y: y0 }, { x: x - 12, y: y0 + 58 + rnd() * 34 }], 1.5, NIGHT_INK, 0.5);
    }
    pen.stipple(SHIELD, 1500, (x, y) => (Math.hypot(x + 40, y + 96) > 76 ? 0.42 : 0.12), 1.3, '#3a0d1f');
    const rim = spline([{ x: -156, y: -96 }, { x: -116, y: -164 }, { x: -46, y: -182 }, { x: 40, y: -160 }, { x: 96, y: -118 }], 8);
    soft(ctx, rim, 26, MOON_RIM, 0.36);
    soft(ctx, spline([{ x: -120, y: -118 }, { x: -60, y: -138 }, { x: 0, y: -122 }], 8), 16, '#ffe3c2', 0.34);
    soft(ctx, spline([{ x: 84, y: -46 }, { x: 118, y: -24 }, { x: 140, y: -6 }], 6), 12, '#ffe3c2', 0.42);
  });
  pen.stroke([...SHIELD, SHIELD[0]!], 3.4, NIGHT_INK, 0.95, false);
}

// ---------------------------------------------------------------- legs, drawn live

const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Hip in body coordinates (up the screen first), the leg's full reach, and which way its knee rises. */
export interface LegSpec {
  readonly hip: Pt;
  readonly reach: number;
  readonly width: number;
  readonly bend: 1 | -1;
}

/** A tapered jointed segment, shaded across its width towards the moon. */
function segment(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w0: number, w1: number, seed: number, boil: number, o: { tip?: boolean; dim: number; bands?: boolean }): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const n = { x: -dir.y, y: dir.x };
  const litSide = n.x * LIGHT.x + n.y * LIGHT.y >= 0 ? 1 : -1;
  const steps = 12;
  const halfAt = (u: number): number => {
    // Pinched at the joints, full along the shaft, a claw-tip to nothing.
    const shaft = o.tip ? 1 - u * u * 0.94 : 0.8 + 0.2 * Math.sin(Math.PI * u) ** 0.55;
    return (w0 + (w1 - w0) * u) * shaft * 0.5;
  };
  const edge = (side: number): Pt[] => Array.from({ length: steps + 1 }, (_, i) => add(add(a, dir, (i / steps) * len), n, side * halfAt(i / steps)));
  const cap = (at: Pt, r: number, out: number): Pt[] => Array.from({ length: 5 }, (_, i) => {
    const k = ((i + 1) / 6) * Math.PI;
    return add(add(at, n, Math.cos(k) * r * (out > 0 ? 1 : -1)), dir, out * Math.sin(k) * r * 0.8);
  });
  const shape = [...edge(1), ...cap(b, halfAt(1), 1), ...edge(-1).reverse(), ...cap(a, halfAt(0), -1)];
  const mid = lerpPt(a, b, 0.5);
  const hw = Math.max(w0, w1) * 0.62;
  const g = ctx.createLinearGradient(mid.x + n.x * hw * litSide, mid.y + n.y * hw * litSide, mid.x - n.x * hw * litSide, mid.y - n.y * hw * litSide);
  const tipped = o.tip === true;
  g.addColorStop(0, tipped ? '#7a4a4a' : HOT);
  g.addColorStop(0.3, tipped ? '#4a2430' : ORANGE);
  g.addColorStop(0.68, tipped ? NAIL : RED);
  g.addColorStop(1, tipped ? '#0e0814' : MAROON);
  ctx.fillStyle = g;
  trace(ctx, shape);
  ctx.fill();
  const rnd = seeded(seed);
  inside(ctx, shape, () => {
    const box = { x0: Math.min(a.x, b.x) - hw, y0: Math.min(a.y, b.y) - hw, x1: Math.max(a.x, b.x) + hw, y1: Math.max(a.y, b.y) + hw };
    const area = (box.x1 - box.x0) * (box.y1 - box.y0);
    flecks(ctx, box, Math.min(220, Math.round(area / 90)), rnd, ['#7a1c28', '#4a1228'], 1, 5, 0.42);
    flecks(ctx, box, Math.min(160, Math.round(area / 140)), rnd, [PALE, '#ffbd80'], 0.8, 3.6, 0.55);
    if (o.bands) {
      // Pale mottled rings near each joint.
      for (const u of [0.86, 0.14]) {
        const c = add(add(a, dir, u * len), n, 0);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(Math.atan2(dir.y, dir.x));
        const band = ctx.createLinearGradient(-len * 0.1, 0, len * 0.1, 0);
        band.addColorStop(0, `${PALE}00`);
        band.addColorStop(0.5, `${PALE}66`);
        band.addColorStop(1, `${PALE}00`);
        ctx.fillStyle = band;
        ctx.fillRect(-len * 0.1, -hw * 1.3, len * 0.2, hw * 2.6);
        ctx.restore();
      }
    }
    soft(ctx, [add(a, n, litSide * w0 * 0.34), add(b, n, litSide * w1 * 0.34)], Math.max(4, w0 * 0.2), MOON_RIM, 0.52);
    if (o.dim > 0) {
      ctx.fillStyle = `rgba(16,10,38,${o.dim})`;
      ctx.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    }
  });
  const pen = new Pen(ctx, seed + boil * 13, 0.7);
  pen.stroke([...shape, shape[0]!], Math.max(1.8, w0 * 0.075), NIGHT_INK, 0.92, false);
  // Bristles along the underside.
  if (!tipped && o.bands) {
    const under = -litSide;
    for (let i = 1; i < 14; i++) {
      const p = add(add(a, dir, (i / 14) * len), n, under * (w0 + (w1 - w0) * (i / 14)) * 0.5);
      pen.hair([p, add(add(p, n, under * (5 + rnd() * 8)), dir, 3 + rnd() * 5)], 1.1, NIGHT_INK, 0.7);
    }
  }
}

/** Two-bone reach from hip to foot; returns hip, knee, ankle-ish joints, foot. */
export function legJoints(hip: Pt, foot: Pt, reach: number, bend: number): readonly Pt[] {
  const up = reach * 0.47;
  const lo = reach * 0.53;
  const raw = Math.hypot(foot.x - hip.x, foot.y - hip.y) || 1;
  const d = Math.max(Math.abs(up - lo) + 2, Math.min(up + lo - 2, raw));
  const dir = { x: (foot.x - hip.x) / raw, y: (foot.y - hip.y) / raw };
  const n = { x: -dir.y * bend, y: dir.x * bend };
  const along = (up * up - lo * lo + d * d) / (2 * d);
  const high = Math.sqrt(Math.max(0, up * up - along * along));
  const knee = add(add(hip, dir, along), n, high);
  const end = add(hip, dir, Math.min(raw, d));
  const ankle = add(lerpPt(knee, end, 0.74), n, lo * 0.05);
  return [hip, lerpPt(hip, knee, 0.88), add(lerpPt(knee, ankle, 0.14), n, lo * 0.02), ankle, end];
}

export function drawLeg(ctx: CanvasRenderingContext2D, hip: Pt, foot: Pt, spec: LegSpec, id: number, boil: number, dim: number): void {
  const [h, k, c, p, f] = legJoints(hip, foot, spec.reach * CRAB_SCALE, spec.bend) as [Pt, Pt, Pt, Pt, Pt];
  const w = spec.width * CRAB_SCALE;
  segment(ctx, p, f, w * 0.5, w * 0.28, 900 + id * 5, boil, { tip: true, dim });
  segment(ctx, c, p, w * 0.72, w * 0.52, 901 + id * 5, boil, { dim, bands: true });
  segment(ctx, k, c, w * 0.86, w * 0.76, 902 + id * 5, boil, { dim });
  segment(ctx, h, k, w * 0.86, w, 903 + id * 5, boil, { dim, bands: true });
}

/** A long jointed whip: a thin tapered line with faint rings of pale. */
export function drawAntenna(ctx: CanvasRenderingContext2D, pts: readonly Pt[], boil: number, seed: number): void {
  const line = spline(pts, 10);
  const pen = new Pen(ctx, seed + boil * 5, 0.5);
  for (const [w, c, a] of [[8.5, NIGHT_INK, 0.9], [5.2, '#e8542a', 1], [1.8, '#ffc48c', 0.7]] as const) pen.stroke(line, w, c, a, false);
  for (let i = 3; i < line.length - 2; i += 3) {
    const p = line[i]!;
    pen.dot(p.x, p.y, 1.6, NIGHT_INK, 0.6);
  }
}

// ---------------------------------------------------------------- the claw

const PALM: readonly Pt[] = spline([
  { x: -6, y: -34 }, { x: 34, y: -70 }, { x: 96, y: -92 }, { x: 162, y: -94 }, { x: 212, y: -72 }, { x: 232, y: -46 },
  { x: 226, y: -18 }, { x: 268, y: -6 }, { x: 318, y: 2 }, { x: 362, y: 14 }, { x: 402, y: 38 },
  { x: 372, y: 56 }, { x: 320, y: 72 }, { x: 262, y: 88 }, { x: 188, y: 100 }, { x: 110, y: 96 }, { x: 44, y: 72 }, { x: -6, y: 38 },
], 6, true);
const DACTYL: readonly Pt[] = spline([
  { x: -22, y: -18 }, { x: 28, y: -46 }, { x: 90, y: -54 }, { x: 150, y: -44 }, { x: 204, y: -18 }, { x: 240, y: 14 }, { x: 256, y: 44 },
  { x: 218, y: 26 }, { x: 170, y: 14 }, { x: 116, y: 14 }, { x: 60, y: 20 }, { x: 10, y: 28 }, { x: -22, y: 14 },
], 6, true);
/** Where the movable finger hinges on the palm. */
const HINGE: Pt = { x: 214, y: -44 };
const OPEN_RAD = 0.72;

function tubercles(ctx: CanvasRenderingContext2D, rnd: () => number, pts: readonly Pt[], r0: number, r1: number): void {
  for (const p of pts) {
    const r = r0 + rnd() * (r1 - r0);
    blob(ctx, p.x + 1.5, p.y + 2, r * 1.6, '#2b0a1c', 0.6);
    ctx.fillStyle = '#ffc58e';
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.arc(p.x - r * 0.15, p.y - r * 0.2, r * 0.66, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function paintPalm(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 7300 + f, 1);
  const g = ctx.createLinearGradient(110, -96, 170, 104);
  g.addColorStop(0, HOT);
  g.addColorStop(0.26, ORANGE);
  g.addColorStop(0.62, RED);
  g.addColorStop(1, MAROON);
  ctx.fillStyle = g;
  trace(ctx, PALM);
  ctx.fill();
  inside(ctx, PALM, () => {
    const rnd = seeded(320);
    blob(ctx, 90, -40, 110, '#ffb678', 0.6, 40, 0);
    flecks(ctx, { x0: -10, y0: -100, x1: 410, y1: 104 }, 220, rnd, ['#7a1c28', '#4a1228'], 1.5, 12, 0.44);
    flecks(ctx, { x0: -10, y0: -100, x1: 410, y1: 104 }, 150, rnd, [PALE, '#ffe6c4'], 1, 7, 0.5);
    const lumps: Pt[] = [];
    for (let i = 0; i < 46; i++) lumps.push({ x: 26 + rnd() * 240, y: -80 + rnd() * 150 });
    tubercles(ctx, rnd, lumps, 3.5, 8.5);
    const dusk = ctx.createLinearGradient(120, -30, 150, 104);
    dusk.addColorStop(0, `${DUSK}00`);
    dusk.addColorStop(1, `${DUSK}d8`);
    ctx.fillStyle = dusk;
    ctx.fillRect(-10, -100, 430, 210);
    // The dark horn of the fingertip.
    const nail = ctx.createLinearGradient(262, 0, 392, 30);
    nail.addColorStop(0, `${NAIL}00`);
    nail.addColorStop(0.62, NAIL);
    nail.addColorStop(1, '#090508');
    ctx.fillStyle = nail;
    ctx.fillRect(250, -10, 170, 100);
    soft(ctx, spline([{ x: 20, y: -46 }, { x: 96, y: -82 }, { x: 180, y: -80 }], 8), 22, MOON_RIM, 0.5);
    soft(ctx, spline([{ x: 250, y: 2 }, { x: 320, y: 12 }, { x: 382, y: 34 }], 6), 9, MOON_RIM, 0.5);
  });
  // Blunt crushing teeth along the fixed finger.
  const teeth: Pt[] = Array.from({ length: 7 }, (_, i) => ({ x: 240 + i * 20, y: 0 + i * 2.6 }));
  tubercles(ctx, seeded(321), teeth, 6, 9);
  pen.stroke([...PALM, PALM[0]!], 3.6, NIGHT_INK, 0.96, false);
}

function paintDactyl(ctx: CanvasRenderingContext2D, f: number): void {
  const pen = new Pen(ctx, 7400 + f, 1);
  const g = ctx.createLinearGradient(100, -54, 110, 30);
  g.addColorStop(0, HOT);
  g.addColorStop(0.36, ORANGE);
  g.addColorStop(0.8, RED);
  g.addColorStop(1, MAROON);
  ctx.fillStyle = g;
  trace(ctx, DACTYL);
  ctx.fill();
  inside(ctx, DACTYL, () => {
    const rnd = seeded(322);
    flecks(ctx, { x0: -24, y0: -56, x1: 258, y1: 46 }, 140, rnd, ['#7a1c28', '#4a1228'], 1, 9, 0.44);
    flecks(ctx, { x0: -24, y0: -56, x1: 258, y1: 46 }, 100, rnd, [PALE, '#ffe6c4'], 1, 6, 0.5);
    const lumps: Pt[] = [];
    for (let i = 0; i < 16; i++) lumps.push({ x: 10 + rnd() * 170, y: -36 + rnd() * 50 });
    tubercles(ctx, rnd, lumps, 3, 6.5);
    const nail = ctx.createLinearGradient(130, 0, 244, 24);
    nail.addColorStop(0, `${NAIL}00`);
    nail.addColorStop(0.6, NAIL);
    nail.addColorStop(1, '#090508');
    ctx.fillStyle = nail;
    ctx.fillRect(120, -50, 150, 110);
    soft(ctx, spline([{ x: 20, y: -36 }, { x: 96, y: -46 }, { x: 170, y: -30 }, { x: 226, y: 4 }], 8), 12, MOON_RIM, 0.6);
  });
  tubercles(ctx, seeded(323), Array.from({ length: 6 }, (_, i) => ({ x: 44 + i * 25, y: 19 - i * 0.8 })), 5.5, 8);
  pen.stroke([...DACTYL, DACTYL[0]!], 3.2, NIGHT_INK, 0.96, false);
}

export interface CrabArt {
  readonly body: Baked;
  readonly palm: Baked;
  readonly dactyl: Baked;
}

const RES = 2;

export function makeCrabArt(boils: number): CrabArt {
  return {
    body: bake({ x: -420, y: -260, w: 660, h: 520 }, RES, boils, paintBody),
    palm: bake({ x: -30, y: -120, w: 460, h: 240 }, RES, boils, paintPalm),
    dactyl: bake({ x: -40, y: -70, w: 310, h: 130 }, RES, boils, paintDactyl),
  };
}

/** The legs: first walking pair, second pair (longest), and the short pair folded at the rear. Upper (left) side first. */
export const LEGS: readonly LegSpec[] = [
  { hip: { x: 96, y: -118 }, reach: 780, width: 66, bend: -1 },
  { hip: { x: 10, y: -170 }, reach: 840, width: 68, bend: 1 },
  { hip: { x: -96, y: -176 }, reach: 480, width: 52, bend: 1 },
  { hip: { x: 96, y: 118 }, reach: 780, width: 66, bend: 1 },
  { hip: { x: 10, y: 170 }, reach: 840, width: 68, bend: -1 },
  { hip: { x: -96, y: 176 }, reach: 480, width: 52, bend: -1 },
];

/** Claw shoulders on the body. */
export const SHOULDERS: readonly [Pt, Pt] = [{ x: 118, y: -104 }, { x: 118, y: 104 }];

const toWorld = (p: Pt, pose: CrabPose): Pt => {
  const [c, s] = [Math.cos(pose.heading) * CRAB_SCALE, Math.sin(pose.heading) * CRAB_SCALE];
  return { x: pose.x + p.x * c - p.y * s, y: pose.y + p.x * s + p.y * c };
};

/** The chela at a wrist: the palm, the movable finger above it, teeth inward. */
function chela(ctx: CanvasRenderingContext2D, art: CrabArt, wrist: Pt, c: ClawPose, scale: number, boil: number): void {
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(c.angle);
  ctx.scale(scale, scale * c.flip);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(-c.open * OPEN_RAD);
  drawBaked(ctx, art.dactyl, boil);
  ctx.restore();
  drawBaked(ctx, art.palm, boil);
  ctx.restore();
}

/** Shoulder to wrist: a thick arm, elbow outwards. */
function arm(ctx: CanvasRenderingContext2D, shoulder: Pt, wrist: Pt, width: number, bend: number, boil: number, id: number): void {
  const [h, k, , , f] = legJoints(shoulder, wrist, 330 * CRAB_SCALE, bend) as [Pt, Pt, Pt, Pt, Pt];
  const mid = lerpPt(k, f, 0.5);
  segment(ctx, mid, f, width * 0.92, width * 0.86, 500 + id, boil, { dim: 0 });
  segment(ctx, k, mid, width, width * 0.92, 503 + id, boil, { dim: 0 });
  segment(ctx, h, k, width * 0.82, width * 1.06, 506 + id, boil, { dim: 0, bands: true });
}

/** A whole claw, shoulder to fingertip. `side` 0 is the big left claw. */
export function drawClaw(ctx: CanvasRenderingContext2D, art: CrabArt, pose: CrabPose, side: 0 | 1, boil: number): void {
  const c = side === 0 ? pose.bigClaw : pose.smallClaw;
  const scale = (side === 0 ? 0.92 : 0.7) * CRAB_SCALE;
  arm(ctx, toWorld(SHOULDERS[side], pose), c.wrist, (side === 0 ? 86 : 70) * CRAB_SCALE, side === 0 ? -1 : 1, boil, side);
  chela(ctx, art, c.wrist, c, scale, boil);
}

/** Antennae, legs, body, eyes: everything but the claws. */
export function drawCrabBody(ctx: CanvasRenderingContext2D, art: CrabArt, pose: CrabPose, boil: number): void {
  LEGS.forEach((spec, i) => drawLeg(ctx, toWorld(spec.hip, pose), pose.feet[i]!, spec, i, boil, i < 3 ? 0.08 : 0));
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.heading);
  ctx.scale(CRAB_SCALE, CRAB_SCALE);
  drawBaked(ctx, art.body, boil);
  ctx.restore();
}

/** Eyes on stalks at the front of the shield, and the antennae: over the claws' shoulders. */
export function drawCrabFace(ctx: CanvasRenderingContext2D, pose: CrabPose, boil: number): void {
  pose.antennae.forEach((line, i) => drawAntenna(ctx, line, boil, 660 + i * 3));
  for (const side of [-1, 1]) {
    const base = toWorld({ x: 146, y: side * 20 }, pose);
    const eye = toWorld({ x: 226, y: side * 60 }, pose);
    segment(ctx, base, eye, 38, 26, 700 + side, boil, { dim: 0 });
    ctx.fillStyle = '#ffb06a';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = NIGHT_INK;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    const g = ctx.createRadialGradient(eye.x - 5, eye.y - 7, 1, eye.x, eye.y, 21);
    g.addColorStop(0, '#6d4f6e');
    g.addColorStop(0.45, '#20121e');
    g.addColorStop(1, '#070409');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(eye.x + 1, eye.y + 1, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.arc(eye.x - 7, eye.y - 8, 5.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
