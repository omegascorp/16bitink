import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, type Pen, type Pt } from '../../../src/art/pen';
import { createRng, type Rng } from '../../../src/logic/rng';
import { drawPrey } from './bambooArt';
import { bake, type Baked, blob, drawBaked, livePen, smoothClosed, smoothOpen } from './ink';
import { type PreyPose, preySpine, type SpineLay, type SpinePt } from './shape';
import { cycles, FRONT_ANCHOR, frontCamAt, shakeAt } from './story';
import { carpet, drawEye, type EyeLook, LIP, MOUTH, PALE, PALER, SADDLE, TAN, tassel } from './wobbArt';

/**
 * The hook's view: low on the reef, at the wobbegong's eye level, looking
 * into its face. Its broad flat head fills the frame, the huge wide mouth
 * gaping (dark inside, rows of fangs), a beard of tassels round the lips, the
 * small eyes up on top, its flat body and fins spreading behind; the bamboo
 * shark's back half curling up out of the mouth towards us, in profile. All
 * in px as frame 1 shows it (the front camera zooms and sinks it).
 */

/** The mouth's corners, and where the bamboo shark comes out. */
export const CORNER_L = { x: 120, y: 1000 } as const;
export const CORNER_R = { x: 945, y: 985 } as const;
export const EXIT = { x: 500, y: 985 } as const;
/** px per mm of the bamboo shark, and how it leaves the mouth: up and a little right, curling over to the right. */
export const PREY_SCALE = 1.8;
export const FRONT_LAY: SpineLay = { start: -1.5, curl: 1.15 };
const EYES: readonly { readonly at: Pt; readonly r: Pt }[] = [
  { at: { x: 285, y: 745 }, r: { x: 30, y: 18 } },
  { at: { x: 815, y: 725 }, r: { x: 27, y: 16 } },
];

const mid = (x: number): number => (x - CORNER_L.x) / (CORNER_R.x - CORNER_L.x);
const cornerY = (u: number): number => CORNER_L.y + (CORNER_R.y - CORNER_L.y) * u;
/** The upper lip at x. */
export const upperLipAt = (x: number): number => {
  const u = Math.max(0, Math.min(1, mid(x)));
  return cornerY(u) - 155 * Math.sin(Math.PI * u) ** 0.75;
};
/** The lower lip at x, the jaw dropped by the gape (0 .. 1). */
export const lowerLipAt = (x: number, gape: number): number => {
  const u = Math.max(0, Math.min(1, mid(x)));
  return cornerY(u) + (92 + 50 * gape) * Math.sin(Math.PI * u) ** 0.85;
};
const lipLine = (f: (x: number) => number, n = 40): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = CORNER_L.x + ((CORNER_R.x - CORNER_L.x) * i) / n;
    return { x, y: f(x) };
  });

/** The head's top (its outline over the upper lip), the body behind it, the fins lying on the sand. */
const HEAD: readonly Pt[] = smoothClosed([
  CORNER_L, { x: 62, y: 965 }, { x: 52, y: 880 }, { x: 120, y: 772 }, { x: 255, y: 690 }, { x: 420, y: 645 }, { x: 600, y: 630 }, { x: 790, y: 646 },
  { x: 945, y: 705 }, { x: 1032, y: 800 }, { x: 1062, y: 905 }, { x: 1020, y: 975 }, CORNER_R,
  ...lipLine(upperLipAt, 12).reverse().slice(1, -1),
], 3);
/** Its flat body going away behind the head, up and to the left, to a shark's tail. */
const BODY: readonly Pt[] = smoothClosed([
  { x: 700, y: 650 }, { x: 520, y: 588 }, { x: 360, y: 548 }, { x: 225, y: 520 }, { x: 120, y: 500 }, { x: 60, y: 478 }, { x: -10, y: 448 }, { x: -40, y: 452 },
  { x: 10, y: 494 }, { x: -30, y: 530 }, { x: 0, y: 534 }, { x: 80, y: 528 }, { x: 160, y: 568 }, { x: 260, y: 625 }, { x: 340, y: 690 }, { x: 520, y: 710 },
], 3);
const FINS: readonly (readonly Pt[])[] = [
  smoothClosed([{ x: 120, y: 950 }, { x: 20, y: 975 }, { x: -70, y: 1040 }, { x: -60, y: 1125 }, { x: 40, y: 1150 }, { x: 150, y: 1110 }, { x: 200, y: 1040 }], 3),
  smoothClosed([{ x: 960, y: 950 }, { x: 1070, y: 975 }, { x: 1160, y: 1045 }, { x: 1150, y: 1125 }, { x: 1040, y: 1150 }, { x: 940, y: 1100 }, { x: 905, y: 1030 }], 3),
];
const DORSALS: readonly (readonly Pt[])[] = [
  smoothOpen([{ x: 336, y: 560 }, { x: 306, y: 505 }, { x: 246, y: 466 }, { x: 258, y: 498 }, { x: 252, y: 534 }], 4),
  smoothOpen([{ x: 196, y: 526 }, { x: 174, y: 488 }, { x: 122, y: 458 }, { x: 134, y: 484 }, { x: 130, y: 510 }], 4),
];

export interface FrontArt {
  readonly back: HTMLCanvasElement;
  readonly body: Baked;
}

// ---------------------------------------------------------------- baked

/** The reef behind, seen low across the bottom: soft and dark, a haze of coral on the horizon, sand coming towards us. */
function makeBack(): HTMLCanvasElement {
  const X0 = -500;
  const Y0 = -1000;
  const W = 2080;
  const H = 3500;
  const res = 0.5;
  const { canvas, ctx } = makeCanvas(W * res, H * res);
  ctx.scale(res, res);
  ctx.translate(-X0, -Y0);
  const water = ctx.createLinearGradient(0, Y0, 0, 460);
  water.addColorStop(0, '#04141c');
  water.addColorStop(1, '#2a5a60');
  ctx.fillStyle = water;
  ctx.fillRect(X0, Y0, W, 460 - Y0);
  const sand = ctx.createLinearGradient(0, 430, 0, 1600);
  sand.addColorStop(0, '#5f7f78');
  sand.addColorStop(0.35, '#8e8f74');
  sand.addColorStop(1, '#b8a47a');
  ctx.fillStyle = sand;
  ctx.fillRect(X0, 430, W, Y0 + H - 430);
  const rng = createRng(4242);
  const pen = livePen(ctx, 5, 0, 3);
  // Coral heads along the horizon and nearer at the sides, getting bigger as they come closer.
  for (let i = 0; i < 70; i++) {
    const d = rng();
    const y = 430 + d * d * 700;
    const x = X0 + rng() * W;
    const r = 30 + d * 160 + rng() * 40;
    const hue = ['#4e6d6a', '#6e6a5a', '#6a5f78', '#5c7a66'][Math.floor(rng() * 4)]!;
    pen.fill(blob(rng, x, y - r * 0.4, r * 1.2, r * 0.7, 0.3, 10), hue, 0.5 + d * 0.4);
    pen.fill(blob(rng, x - r * 0.2, y - r * 0.6, r * 0.6, r * 0.3, 0.3, 8), '#c9d6c8', 0.12);
  }
  // Rubble towards us, and shafts of light from above.
  for (let i = 0; i < 260; i++) {
    const d = rng();
    const y = 700 + d * 1400;
    pen.fill(blob(rng, X0 + rng() * W, y, 6 + d * 30, 3 + d * 14, 0.3, 7), rng() < 0.5 ? '#8a7d62' : '#cbb994', 0.6);
  }
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const x = -200 + i * 260 + rng() * 80;
    const g = ctx.createLinearGradient(x, Y0, x - 300, 900);
    g.addColorStop(0, 'rgba(170,220,215,0.16)');
    g.addColorStop(1, 'rgba(170,220,215,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 50, Y0);
    ctx.lineTo(x + 60, Y0);
    ctx.lineTo(x - 180, 900);
    ctx.lineTo(x - 420, 900);
    ctx.closePath();
    ctx.fill();
  }
  // Soft: it's far behind the subject.
  const { canvas: soft, ctx: sctx } = makeCanvas(canvas.width, canvas.height);
  sctx.filter = 'blur(5px)';
  sctx.drawImage(canvas, 0, 0);
  Object.assign(soft, { x0: X0, y0: Y0, res });
  return soft;
}

function mottle(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng, region: readonly Pt[], cell: number, light: number): void {
  pen.fill(region, PAPER_FILL, 1);
  pen.fill(region, TAN, 1);
  carpet(pen, rng, region, cell);
  const xs = region.map((p) => p.x);
  const ys = region.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(region, () => {
    // Dark saddles and pale patches: big soft blotches over the net.
    for (let i = 0; i < 26; i++) {
      const r = 30 + rng() * 70;
      pen.fill(blob(rng, x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0), r * 1.3, r, 0.35, 9, rng() * 3), rng() < 0.55 ? SADDLE : PALER, 0.16);
    }
    // Lit from above: the far, upper part brighter, the edges falling away dark.
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(255,240,205,${(0.25 * light).toFixed(3)})`);
    g.addColorStop(1, 'rgba(40,25,10,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save();
    ctx.strokeStyle = SADDLE;
    ctx.lineJoin = 'round';
    for (const [w, a] of [[60, 0.16], [24, 0.2]] as const) {
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      region.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  });
  pen.stroke([...region, region[0]!], 3.2, INK, 1);
}

function paintBody(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng): void {
  // Its shadow on the sand under the head and fins.
  ctx.save();
  ctx.filter = 'blur(18px)';
  pen.fill(ellipse(540, 1150, 620, 70, 30), '#0a0806', 0.55);
  ctx.restore();
  mottle(pen, ctx, rng, BODY, 15, 0.6);
  for (const d of DORSALS) {
    pen.fill(d, TAN, 1);
    pen.hatch(d, 5, 1.1, 0.8, { color: SADDLE, alpha: 0.35 });
    pen.stroke([...d, d[0]!], 2.4, INK, 1);
  }
  for (const f of FINS) {
    mottle(pen, ctx, rng, f, 17, 0.4);
    const root = f[0]!;
    for (let i = 3; i < f.length; i += 3) pen.hair([root, f[i]!], 1.1, SADDLE, 0.3);
  }
  mottle(pen, ctx, rng, HEAD, 17, 1);
  // The snout's front: a darker face falling into shade above the lip, and the brows over the eyes.
  pen.clipped(HEAD, () => {
    const face = [...lipLine((x) => upperLipAt(x) - 70, 20), ...lipLine(upperLipAt, 20).reverse()];
    ctx.save();
    ctx.filter = 'blur(10px)';
    pen.fill(face, SADDLE, 0.35);
    ctx.restore();
  });
  for (const e of EYES) {
    pen.fill(ellipse(e.at.x, e.at.y - 6, e.r.x * 2.1, e.r.y * 2.4, 20), SADDLE, 0.22);
    pen.fill(ellipse(e.at.x - 6, e.at.y - 18, e.r.x * 1.6, e.r.y * 1.2, 20), PALER, 0.3);
    pen.hair(smoothOpen([{ x: e.at.x - e.r.x * 1.7, y: e.at.y + 2 }, { x: e.at.x, y: e.at.y - e.r.y * 2 }, { x: e.at.x + e.r.x * 1.7, y: e.at.y }], 5), 2, INK, 0.7);
  }
}

export function makeFrontArt(): FrontArt {
  return { back: makeBack(), body: bake({ x0: -120, y0: 400, x1: 1200, y1: 1240, res: 1.35 }, 77, 1.1, paintBody) };
}

// ---------------------------------------------------------------- live

/** A fang from `base` pointing along `dir`, `len` long. */
function fang(pen: Pen, base: Pt, dir: Pt, len: number, w: number, shade: number): void {
  const n = { x: -dir.y, y: dir.x };
  const tip = { x: base.x + dir.x * len + n.x * len * 0.12, y: base.y + dir.y * len + n.y * len * 0.12 };
  const shape = smoothOpen([{ x: base.x - n.x * w, y: base.y - n.y * w }, { x: base.x + dir.x * len * 0.55 - n.x * w * 0.55, y: base.y + dir.y * len * 0.55 - n.y * w * 0.55 }, tip,
    { x: base.x + dir.x * len * 0.5 + n.x * w * 0.7, y: base.y + dir.y * len * 0.5 + n.y * w * 0.7 }, { x: base.x + n.x * w, y: base.y + n.y * w }], 3);
  pen.fill(shape, '#f3ead2', 1);
  pen.fill(shape.slice(Math.floor(shape.length / 2)), '#b9a888', 0.4 + shade);
  pen.hair([...shape, shape[0]!], 1.4, INK, 0.9);
}

/** A row of fangs along a lip: longest in front, pointing into the mouth. */
function fangs(pen: Pen, lip: (x: number) => number, down: 1 | -1, inset: number, scale: number, shade: number): void {
  for (let i = 0; i <= 18; i++) {
    const u = 0.07 + (0.86 * i) / 18;
    const x = CORNER_L.x + (CORNER_R.x - CORNER_L.x) * u;
    const len = (30 + 52 * Math.sin(Math.PI * u) ** 1.5) * scale * (0.85 + 0.3 * Math.abs(Math.sin(i * 2.3)));
    const lean = (u - 0.5) * -0.5 * down;
    const dir = { x: Math.sin(lean), y: down * Math.cos(lean) };
    fang(pen, { x, y: lip(x) + down * inset }, dir, len, 8 * scale, shade);
  }
}

/** The chin under the lower lip: mottled skin, dropped with the jaw. */
function drawChin(pen: Pen, gape: number): void {
  const lower = lipLine((x) => lowerLipAt(x, gape), 30);
  const chin = [...lower, ...lipLine((x) => lowerLipAt(x, gape) + 40 + 45 * Math.sin(Math.PI * mid(x)), 30).reverse()];
  pen.fill(chin, PAPER_FILL, 1);
  pen.fill(chin, TAN, 1);
  const rng = createRng(919);
  pen.clipped(chin, () => {
    for (let i = 0; i < 70; i++) {
      const x = CORNER_L.x + rng() * (CORNER_R.x - CORNER_L.x);
      const y = lowerLipAt(x, gape) + rng() * 90;
      pen.fill(ellipse(x, y, 7 + rng() * 9, 5 + rng() * 6, 8), rng() < 0.6 ? PALE : SADDLE, rng() < 0.6 ? 0.7 : 0.3);
    }
    pen.fill(lower.map((p) => ({ x: p.x, y: p.y + 60 })).concat(lower.map((p) => ({ x: p.x, y: p.y + 140 })).reverse()), SADDLE, 0.35);
  });
  pen.stroke(chin.slice(lower.length), 2.6, INK, 1, false);
}

/** The bamboo shark's spine in the front view (mm from the lips; drawn PREY_SCALE px a mm from EXIT). */
export const frontSpine = (pose: PreyPose): SpinePt[] => preySpine(pose, 0, 10, FRONT_LAY);

export function drawFront(ctx: CanvasRenderingContext2D, art: FrontArt, t: number, pose: PreyPose, gape: number, look: EyeLook, shag: number, boil: number): void {
  const cam = frontCamAt(t);
  const jolt = shakeAt(t);
  const back = art.back as HTMLCanvasElement & { x0: number; y0: number; res: number };
  ctx.save();
  ctx.translate(FRONT_ANCHOR.x + jolt.x, FRONT_ANCHOR.y + cam.sink + jolt.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-FRONT_ANCHOR.x, -FRONT_ANCHOR.y);
  // The reef behind moves less as we rise: it's further off.
  ctx.save();
  ctx.translate(0, -cam.sink * 0.45 / cam.zoom);
  ctx.drawImage(back, back.x0, back.y0, back.width / back.res, back.height / back.res);
  ctx.restore();
  drawBaked(ctx, art.body, boil);

  const pen = livePen(ctx, 101, boil, 0.9);
  const upper = lipLine(upperLipAt, 40);
  const lower = lipLine((x) => lowerLipAt(x, gape), 40);
  const mouth = [...upper, ...lower.reverse()];
  // Inside the mouth: dark, gums along the lips, the throat deepest.
  pen.fill(mouth, MOUTH, 1);
  pen.clipped(mouth, () => {
    pen.stroke(upper, 30, '#5a2420', 0.75, false);
    pen.stroke(lipLine((x) => lowerLipAt(x, gape), 40), 30, '#5a2420', 0.75, false);
  });
  fangs(pen, upperLipAt, 1, 26, 0.7, 0.3);
  fangs(pen, upperLipAt, 1, 8, 1, 0);
  // The fringe over the upper lip, hanging down: under the bamboo shark, which comes out over it.
  for (let i = 0; i <= 22; i++) {
    const u = i / 22;
    const x = CORNER_L.x + (CORNER_R.x - CORNER_L.x) * u;
    const sway = 0.15 * Math.sin(cycles(6, t) + i * 0.9) + shag * 0.3 * Math.sin(cycles(30, t) + i);
    tassel(pen, { x, y: upperLipAt(x) - 6 }, { x: (u - 0.5) * 0.9, y: 1 }, (30 + 14 * Math.abs(Math.sin(i * 2.1))) * (1 + 0.4 * shag), sway, 7, i * 5);
  }
  // The bamboo shark, curling up out of the mouth towards us.
  ctx.save();
  ctx.translate(EXIT.x, EXIT.y);
  ctx.scale(PREY_SCALE, PREY_SCALE);
  drawPrey(ctx, frontSpine(pose), pose.inside, boil);
  ctx.restore();
  // The throat swallowing its base in shadow.
  pen.clipped(mouth, () => {
    const g = ctx.createRadialGradient(EXIT.x - 20, EXIT.y + 60, 10, EXIT.x - 20, EXIT.y + 60, 260);
    g.addColorStop(0, 'rgba(8,3,2,0.95)');
    g.addColorStop(1, 'rgba(8,3,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(EXIT.x - 300, EXIT.y - 260, 600, 560);
  });
  drawChin(pen, gape);
  fangs(pen, (x) => lowerLipAt(x, gape), -1, 8, 0.85, 0.1);
  // The lips, stretched taut round it: a pale rim on each.
  pen.stroke(upper, 7, LIP, 0.95, false);
  pen.stroke(upper, 2.6, INK, 1, false);
  const lowerRim = lipLine((x) => lowerLipAt(x, gape), 40);
  pen.stroke(lowerRim, 7, LIP, 0.95, false);
  pen.stroke(lowerRim, 2.6, INK, 1, false);
  // The beard: tassels hanging from the chin and round the corners of the mouth, and the fringe up the sides of the head.
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const x = CORNER_L.x + (CORNER_R.x - CORNER_L.x) * u;
    const sway = 0.18 * Math.sin(cycles(7, t) + i * 1.3) + shag * 0.3 * Math.sin(cycles(30, t) + i * 1.7);
    tassel(pen, { x, y: lowerLipAt(x, gape) + 30 + 40 * Math.sin(Math.PI * u) }, { x: (u - 0.5) * 1.2, y: 1 }, (44 + 22 * Math.abs(Math.sin(i * 1.7))) * (1 + 0.5 * shag), sway, 8, i * 11 + 3);
  }
  for (const [from, to, side] of [[{ x: 125, y: 770 }, { x: 55, y: 960 }, -1], [{ x: 950, y: 705 }, { x: 1055, y: 940 }, 1]] as const) {
    for (let i = 0; i <= 7; i++) {
      const f = i / 7;
      const at = { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
      const sway = 0.2 * Math.sin(cycles(6, t) + i * 1.1 + side);
      tassel(pen, at, { x: side, y: 0.3 }, (40 + 16 * Math.abs(Math.sin(i * 2.7))) * (1 + 0.5 * shag), sway, 8, i * 17 + (side > 0 ? 50 : 0));
    }
  }
  for (const e of EYES) drawEye(pen, e.at, e.r, look);
  ctx.restore();
}

/** The front view's frame-1 subject on screen at t: the mouth's corners and the tail tip (for the tests). */
export function frontLandmarks(t: number, pose: PreyPose): { readonly left: Pt; readonly right: Pt; readonly tip: Pt } {
  const c = frontCamAt(t);
  const on = (p: Pt): Pt => ({ x: FRONT_ANCHOR.x + (p.x - FRONT_ANCHOR.x) * c.zoom, y: FRONT_ANCHOR.y + (p.y - FRONT_ANCHOR.y) * c.zoom + c.sink });
  const spine = frontSpine(pose);
  const tip = spine[spine.length - 1]!;
  return { left: on(CORNER_L), right: on(CORNER_R), tip: on({ x: EXIT.x + tip.x * PREY_SCALE, y: EXIT.y + tip.y * PREY_SCALE }) };
}

