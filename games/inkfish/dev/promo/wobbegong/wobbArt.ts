import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import type { Rng } from '../../../src/logic/rng';
import { arc, bake, type Baked, blob, cellsIn, drawBaked, inside, livePen, shrink, smoothClosed } from './ink';
import {
  BODY, BODY_LEN, DORSALS, EYE_R, EYES, FINS, FRINGE, frontAt, gapeOutline, halfWidthAt, JAW_HALF, jawEdgeAt, jawOutline, type PreyPose, preyHalfWidth, SPIRACLES,
} from './shape';
import { cycles } from './story';

/**
 * The tasselled wobbegong in the game's pen and ink, painted rather than
 * doodled: a warm tan wash over paper, a dense net of dark lines between
 * pale cells (its carpet pattern), darker saddles across its back, its edges
 * shaded and stippled, big rounded fins with rays. Baked once per boil frame
 * in two layers (the head sharper, for the close-ups). The live parts go on
 * top each frame: the bulge of the swallowed shark, the dropped lower jaw
 * and the dark of the mouth, the stretched lip, the fringe of tassels round
 * the head (they sway, and fluff up on "shaggy"), and the eyes.
 */

export const TAN = '#b58c55';
export const PALE = '#d6b981';
export const PALER = '#e6cf9c';
export const NET = '#8a6a44';
export const SADDLE = '#3a2714';
export const TASSEL_DARK = '#7a5a34';
export const LIP = '#e3b48c';
export const MOUTH = '#1e0e0a';

const HEAD_BOX = { x0: -480, y0: -40, x1: 480, y1: 520, res: 2.2 } as const;
const BODY_BOX = { x0: -480, y0: 420, x1: 480, y1: 1450, res: 1.15 } as const;

export interface WobbArt {
  readonly head: Baked;
  readonly body: Baked;
  /** Its outline filled dark, softened, for the shadow it throws on the reef. */
  readonly shadow: { readonly canvas: HTMLCanvasElement; readonly x0: number; readonly y0: number; readonly res: number };
}

// ---------------------------------------------------------------- baked

/**
 * The carpet: a net of dark lines round pale cells (Voronoi, so they share
 * their edges like real reticulation), the cells' tones varied, some with
 * a pale spot or a dark freckle.
 */
export function carpet(pen: Pen, rng: Rng, region: readonly Pt[], cell: number): void {
  const xs = region.map((p) => p.x);
  const ys = region.map((p) => p.y);
  const cells = cellsIn(rng, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), cell);
  pen.clipped(region, () => {
    for (const c of cells) {
      const pick = rng();
      const spot = rng();
      const dx = (rng() - 0.5) * cell * 0.3;
      const dy = (rng() - 0.5) * cell * 0.3;
      if (!inside(region, c.at) && !c.poly.some((v) => inside(region, v))) continue;
      const shape = smoothClosed(shrink(c.poly, c.at, cell * 0.085), 2);
      pen.fill(shape, pick < 0.25 ? PALER : pick < 0.85 ? PALE : TAN, 0.62);
      if (spot < 0.12) pen.dot(c.at.x + dx, c.at.y + dy, cell * 0.14, PALER, 0.85);
      else if (spot > 0.94) pen.dot(c.at.x + dx, c.at.y + dy, cell * 0.08, NET, 0.7);
    }
  });
}

/** Darker saddles across the back, blotches between them, pale patches: wash over the net, not line. */
function saddles(pen: Pen, rng: Rng): void {
  pen.clipped(BODY, () => {
    for (const y of [290, 520, 760, 980, 1160, 1320]) {
      const w = halfWidthAt(y) + 40;
      for (let k = 0; k < 7; k++) {
        const x = -w + (2 * w * (k + rng() * 0.6)) / 6.6;
        const r = 40 + rng() * 50;
        pen.fill(blob(rng, x, y + (rng() - 0.5) * 60, r * 1.2, r, 0.35, 9, rng() * 3), SADDLE, 0.16 + rng() * 0.1);
      }
    }
    for (let i = 0; i < 60; i++) {
      const y = 40 + rng() * 1350;
      const x = (rng() - 0.5) * 2 * halfWidthAt(y);
      const r = 18 + rng() * 40;
      pen.fill(blob(rng, x, y, r, r * (0.6 + rng() * 0.4), 0.4, 8, rng() * 3), rng() < 0.5 ? PALER : SADDLE, 0.14);
    }
  });
}

/** Shading: the edges falling away into the dark, the far (right) side stippled and hatched, a light down the spine. */
function shade(pen: Pen, ctx: CanvasRenderingContext2D, region: readonly Pt[], light: Pt): void {
  pen.clipped(region, () => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = SADDLE;
    for (const [w, a] of [[90, 0.16], [44, 0.18], [16, 0.22]] as const) {
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      region.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    pen.stipple(region, 2600, (x) => Math.max(0, Math.min(1, (x - light.x) / 420)) * 0.8, 1.3, SADDLE);
  });
}

function drawFin(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng, raw: readonly Pt[]): void {
  const fin = smoothClosed(raw, 4);
  pen.fill(fin, PAPER_FILL, 1);
  pen.fill(fin, TAN, 0.95);
  carpet(pen, rng, fin, 15);
  // A darker margin round the fin's edge, and rays from its root.
  pen.clipped(fin, () => {
    ctx.save();
    ctx.strokeStyle = SADDLE;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 26;
    ctx.beginPath();
    fin.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    const root = raw[0]!;
    const end = raw[raw.length - 1]!;
    for (let i = 1; i < raw.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const from = { x: root.x + (end.x - root.x) * (0.2 + 0.3 * k), y: root.y + (end.y - root.y) * (0.2 + 0.3 * k) };
        const to = raw[i]!;
        pen.hair([from, { x: (from.x + to.x) / 2 + rng() * 6, y: (from.y + to.y) / 2 }, to], 0.9, SADDLE, 0.22);
      }
    }
  });
  pen.stroke([...fin, fin[0]!], 2.6, INK, 1);
}

function drawDorsal(pen: Pen, from: number, to: number, lean: number): void {
  const top = from + (to - from) * 0.62;
  const fin: Pt[] = [{ x: -6, y: from }, { x: lean * 0.6, y: from + (to - from) * 0.25 }, { x: lean, y: top }, { x: lean * 0.7, y: to - 10 }, { x: 4, y: to }];
  const shape = smoothClosed(fin, 3);
  // Its shadow on the back, then the fin.
  pen.fill(shape.map((p) => ({ x: p.x * 1.5 + 10, y: p.y + 16 })), SADDLE, 0.3);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, TAN, 0.85);
  pen.fill(shape.filter((_, i) => i % 2 === 0).map((p) => ({ x: p.x * 0.6, y: p.y })), PALE, 0.6);
  pen.hatch(shape, 5, 1.2, 0.8, { color: SADDLE, alpha: 0.35 });
  pen.stroke([...shape, shape[0]!], 2.2, INK, 1);
}

function drawWobbegong(pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng): void {
  for (const f of FINS) drawFin(pen, ctx, rng, f);
  const body = smoothClosed(BODY, 3);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, NET, 0.92);
  carpet(pen, rng, body, 13);
  saddles(pen, rng);
  // A soft light down the middle of the head and back.
  pen.clipped(body, () => {
    const spine = Array.from({ length: 30 }, (_, i) => ({ x: -18 + 6 * Math.sin(i), y: 40 + (i / 29) * (BODY_LEN - 120) }));
    for (const [w, a] of [[230, 0.08], [120, 0.1]] as const) {
      pen.ctx.save();
      pen.ctx.globalAlpha = a;
      pen.ctx.strokeStyle = PALER;
      pen.ctx.lineWidth = w;
      pen.ctx.lineCap = 'round';
      pen.ctx.beginPath();
      spine.forEach((p, i) => (i ? pen.ctx.lineTo(p.x, p.y) : pen.ctx.moveTo(p.x, p.y)));
      pen.ctx.stroke();
      pen.ctx.restore();
    }
  });
  shade(pen, ctx, body, { x: -120, y: 0 });
  // The head: a paler snout, brows over the eyes, the spiracles.
  pen.clipped(body, () => {
    pen.fill(smoothClosed([{ x: -200, y: -10 }, { x: 200, y: -10 }, { x: 150, y: 70 }, { x: 0, y: 95 }, { x: -150, y: 70 }], 3), PALER, 0.18);
    for (const e of EYES) {
      const k = Math.sign(e.x);
      pen.fill(ellipse(e.x + k * 4, e.y - 6, EYE_R.x * 1.9, EYE_R.y * 2.1, 18), SADDLE, 0.22);
      pen.hair(arc(e.x, e.y + 4, EYE_R.x * 1.7, EYE_R.y * 1.9, Math.PI * 1.05, Math.PI * 1.95, 10), 1.6, INK, 0.55);
    }
    for (const s of SPIRACLES) {
      pen.fill(ellipse(s.x, s.y, 13, 8, 12), MOUTH, 0.8);
      pen.hair(arc(s.x, s.y, 15, 10, Math.PI, Math.PI * 2, 8), 1.2, INK, 0.7);
    }
  });
  for (const d of DORSALS) drawDorsal(pen, d.from, d.to, d.lean);
  pen.stroke([...body, body[0]!], 3.2, INK, 1);
}

function makeShadow(): WobbArt['shadow'] {
  const res = 0.35;
  const x0 = -560;
  const y0 = -120;
  const { canvas, ctx } = makeCanvas(Math.ceil(1120 * res), Math.ceil(1660 * res));
  ctx.filter = 'blur(6px)';
  ctx.scale(res, res);
  ctx.translate(-x0, -y0);
  ctx.fillStyle = '#0b0a08';
  for (const shape of [BODY, ...FINS]) {
    const s = smoothClosed(shape, 3);
    ctx.beginPath();
    s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  return { canvas, x0, y0, res };
}

export function makeWobbArt(): WobbArt {
  const head = bake(HEAD_BOX, 401, 0.9, drawWobbegong);
  // The head layer fades out over its last 90 mm, onto the body layer's same picture.
  for (const c of head.frames) {
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, c.height - 90 * HEAD_BOX.res, 0, c.height);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return { head, body: bake(BODY_BOX, 401, 0.9, drawWobbegong), shadow: makeShadow() };
}

/** The shadow it throws, offset `off` mm. */
export function drawWobbShadow(ctx: CanvasRenderingContext2D, art: WobbArt, off: Pt, alpha: number): void {
  const s = art.shadow;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, s.x0 + off.x, s.y0 + off.y, s.canvas.width / s.res, s.canvas.height / s.res);
  ctx.restore();
}

export function drawWobbBody(ctx: CanvasRenderingContext2D, art: WobbArt, boil: number): void {
  drawBaked(ctx, art.body, boil);
  drawBaked(ctx, art.head, boil);
}

// ---------------------------------------------------------------- live

/** The swallowed shark pushing the skin of its throat up: a raised, lighter ridge, shaded down its sides. */
export function drawBulge(ctx: CanvasRenderingContext2D, prey: PreyPose, boil: number): void {
  const pen = livePen(ctx, 7, boil, 0.8);
  const y1 = prey.inside;
  const side = (k: 1 | -1): Pt[] => Array.from({ length: 14 }, (_, i) => {
    const y = 30 + ((y1 - 30) * i) / 13;
    return { x: k * (preyHalfWidth(y1 - y) * 1.15 + 6), y };
  });
  const ridge = [...side(-1), ...side(1).reverse()];
  pen.fill(ridge, PALER, 0.16);
  pen.hair(side(1), 1.4, SADDLE, 0.45);
  pen.hair(side(-1), 1.1, SADDLE, 0.25);
}

/** The pattern's bright ripple running down its back on "carpet". */
export function drawRipple(ctx: CanvasRenderingContext2D, at: number, strength: number): void {
  if (strength <= 0.01) return;
  const y = at * BODY_LEN;
  ctx.save();
  ctx.beginPath();
  const body = smoothClosed(BODY, 2);
  body.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, y - 170, 0, y + 170);
  g.addColorStop(0, 'rgba(255,236,180,0)');
  g.addColorStop(0.5, `rgba(255,236,180,${(0.55 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(-500, y - 170, 1000, 340);
  ctx.restore();
}

/** One tassel: a stalk of skin from `at` along `dir` that forks into leafy lobes, `len` long, swaying `sway` radians. */
export function tassel(pen: Pen, at: Pt, dir: Pt, len: number, sway: number, width: number, seed: number): void {
  const a = Math.atan2(dir.y, dir.x) + sway;
  const u = { x: Math.cos(a), y: Math.sin(a) };
  const v = { x: -u.y, y: u.x };
  const along = (d: number, s: number): Pt => ({ x: at.x + u.x * d + v.x * s, y: at.y + u.y * d + v.y * s });
  const bend = sway * 0.3 * len;
  const fork = along(len * 0.42, bend * 0.3);
  pen.fill([along(-5, -width), along(len * 0.42, -width * 0.45 + bend * 0.3), along(len * 0.42, width * 0.45 + bend * 0.3), along(-5, width)], TASSEL_DARK, 1);
  const spread = 0.55 + 0.2 * Math.sin(seed);
  for (const k of [-1, 0, 1] as const) {
    const b = a + k * spread + sway * 0.4;
    const l = len * (k === 0 ? 0.62 : 0.46 + 0.08 * Math.sin(seed * 3 + k));
    const end = { x: fork.x + Math.cos(b) * l, y: fork.y + Math.sin(b) * l };
    const mid = { x: (fork.x + end.x) / 2, y: (fork.y + end.y) / 2 };
    pen.stroke([fork, mid, end], width * 0.6, TASSEL_DARK, 1, false);
    // A leaf at the tip and a smaller one halfway, each lit on one side.
    for (const [p, r] of [[end, 0.2], [mid, 0.12]] as const) {
      const lx = r * len;
      const leaf = ellipse(0, 0, lx * 1.15, lx * 0.34, 10).map((q) => ({ x: p.x + q.x * Math.cos(b) - q.y * Math.sin(b) + (r < 0.15 ? -Math.sin(b) * k * lx * 0.6 : 0), y: p.y + q.x * Math.sin(b) + q.y * Math.cos(b) + (r < 0.15 ? Math.cos(b) * k * lx * 0.6 : 0) }));
      pen.fill(leaf, (seed + k) % 3 === 0 ? PALE : TAN, 1);
      pen.fill(leaf.slice(2, 7), PALER, 0.5);
      pen.hair([...leaf, leaf[0]!], 0.9, INK, 0.5);
    }
  }
  pen.hair([along(-5, -width), fork], 0.9, INK, 0.6);
}

/** The fringe of tassels round the head, swaying; `shag` 0 .. 1 fluffs them out. */
export function drawFringe(ctx: CanvasRenderingContext2D, t: number, shag: number, boil: number): void {
  const pen = livePen(ctx, 23, boil, 0.6);
  // A short inner row under the long outer one.
  FRINGE.forEach((f, i) => {
    const sway = 0.2 * Math.sin(cycles(6, t) + i * 1.1 + 2) + shag * 0.3 * Math.sin(cycles(30, t) + i * 1.7);
    const at = { x: f.at.x - f.out.x * 10 + f.out.y * 8, y: f.at.y - f.out.y * 10 - f.out.x * 8 };
    tassel(pen, at, f.out, f.len * 0.62 * (1 + 0.4 * shag), sway, 5, f.seed + 5);
  });
  FRINGE.forEach((f, i) => {
    const sway = 0.16 * Math.sin(cycles(6, t) + i * 0.7) + shag * 0.32 * Math.sin(cycles(30, t) + i * 1.3);
    tassel(pen, f.at, f.out, f.len * (1 + 0.55 * shag), sway, 6.5, f.seed);
  });
}

/** The lower jaw dropped open in front of the head, its own little fringe, and the dark of the mouth. */
export function drawJaw(ctx: CanvasRenderingContext2D, gape: number, t: number, shag: number, boil: number): void {
  const pen = livePen(ctx, 31, boil, 0.6);
  const jaw = jawOutline(gape);
  pen.fill(jaw, PAPER_FILL, 1);
  pen.fill(jaw, TAN, 0.95);
  pen.fill(jaw.slice(0, 25).map((p) => ({ x: p.x * 0.9, y: p.y + 6 })), PALE, 0.4);
  pen.stroke(jaw.slice(0, 25), 2.4, INK, 1, false);
  const mouth = gapeOutline(gape);
  pen.fill(mouth, MOUTH, 0.96);
  // Down into the throat: a deeper dark in the middle.
  pen.fill(mouth.map((p) => ({ x: p.x * 0.7, y: p.y * 0.75 + 4 })), '#000000', 0.5);
  for (let i = 0; i < 9; i++) {
    const x = -JAW_HALF * 0.85 + (1.7 * JAW_HALF * i) / 8;
    const edge = jawEdgeAt(x, gape);
    const out = { x: x / JAW_HALF * 0.5, y: -1 };
    tassel(pen, { x, y: edge + 4 }, out, (24 + 8 * Math.abs(Math.sin(i * 1.9))) * (1 + 0.5 * shag), 0.2 * Math.sin(cycles(7, t) + i), 5, i * 7);
  }
}

/** The upper lip stretched over the bamboo shark: a pale rim along the front of the head. */
export function drawLip(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = livePen(ctx, 37, boil, 0.5);
  const rim = Array.from({ length: 21 }, (_, i) => {
    const x = -JAW_HALF * 1.05 + (2.1 * JAW_HALF * i) / 20;
    return { x, y: frontAt(x) + 2 };
  });
  const inner = [...rim].reverse().map((p) => ({ x: p.x, y: p.y + 14 * (1 - (p.x / (JAW_HALF * 1.05)) ** 2) }));
  pen.fill([...rim, ...inner], LIP, 0.85);
  pen.hair(inner, 1.2, SADDLE, 0.5);
  pen.stroke(rim, 2.6, INK, 1, false);
}

export interface EyeLook {
  readonly lid: number;
  readonly lx: number;
  readonly ly: number;
  readonly smug: number;
}

/** Its two eyes: a gold iris, a slit pupil looking where it looks, an upper lid closing down and a lower one pushing up when smug. */
/** One eye at `e`, radii `r`: a gold iris, a slit pupil looking where it looks, an upper lid closing down and a lower one pushing up when smug. */
export function drawEye(pen: Pen, e: Pt, r: Pt, look: EyeLook, skin = TAN): void {
  const { x: rx, y: ry } = r;
  const ball = ellipse(e.x, e.y, rx, ry, 28);
  pen.fill(ellipse(e.x, e.y + 3, rx + 6, ry + 6, 24), MOUTH, 0.8);
  pen.fill(ball, '#d9b04a', 1);
  pen.clipped(ball, () => {
    pen.fill(ellipse(e.x - rx * 0.25, e.y - ry * 0.3, rx * 0.8, ry * 0.6, 18), '#f3d77c', 0.6);
    const px = e.x + look.lx * rx * 0.42;
    const py = e.y + look.ly * ry * 0.35;
    pen.fill(ellipse(px, py, rx * 0.2, ry * 0.85, 16), '#140a06', 1);
    pen.dot(px - rx * 0.25, py - ry * 0.35, Math.max(2, rx * 0.12), '#fff8e0', 0.9);
    // The lids: skin coming down from above and up from below.
    const top = e.y - ry - 4 + (2 * ry + 4) * look.lid;
    const lid = [{ x: e.x - rx - 8, y: e.y - ry - 12 }, { x: e.x + rx + 8, y: e.y - ry - 12 }, ...arc(e.x, top - ry * 0.25, rx + 8, ry * 0.5, 0, Math.PI, 12)];
    if (look.lid > 0.02) {
      pen.fill(lid, skin, 1);
      pen.hair(arc(e.x, top - ry * 0.25, rx + 2, ry * 0.5, 0.15, Math.PI - 0.15, 10), 2.2, INK, 0.95);
    }
    if (look.smug > 0.02) {
      const bottom = e.y + ry + 4 - ry * 0.75 * look.smug;
      pen.fill([{ x: e.x - rx - 8, y: e.y + ry + 12 }, { x: e.x + rx + 8, y: e.y + ry + 12 }, ...arc(e.x, bottom + ry * 0.3, rx + 8, ry * 0.45, 0, -Math.PI, 12).reverse()], skin, 1);
      pen.hair(arc(e.x, bottom + ry * 0.3, rx + 2, ry * 0.45, -0.2, -Math.PI + 0.2, 10), 1.4, INK, 0.8);
    }
  });
  pen.stroke([...ball, ball[0]!], 2, INK, 1);
}

/** Its two eyes, seen from above. */
export function drawEyes(ctx: CanvasRenderingContext2D, look: EyeLook, boil: number): void {
  const pen = livePen(ctx, 43, boil, 0.35);
  for (const e of EYES) drawEye(pen, e, EYE_R, look);
}

/** The sigh: bubbles welling up out of a spiracle, swelling as they rise towards us, 0 .. 1 through it. */
export function drawSigh(ctx: CanvasRenderingContext2D, u: number, boil: number): void {
  if (u < 0) return;
  const pen = livePen(ctx, 53, boil, 0.4);
  const from = SPIRACLES[1]!;
  for (let i = 0; i < 6; i++) {
    const k = u * 1.6 - i * 0.12;
    if (k <= 0 || k >= 1) continue;
    const r = 8 + 26 * k;
    const x = from.x + 30 + 150 * k + 14 * Math.sin(i * 2.1 + k * 5);
    const y = from.y + 20 - 40 * k + i * 8;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    pen.fill(ellipse(x, y, r, r, 16), '#dff4ff', 0.35);
    pen.hair([...ellipse(x, y, r, r, 16), { x: x + r, y }], 1.6, '#f4fbff', 0.9);
    pen.dot(x - r * 0.35, y - r * 0.35, r * 0.18, '#ffffff', 0.9);
    ctx.restore();
  }
}

