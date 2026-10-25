import { INK, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp } from '../short';
import { drawMouth, FISH_MOUTH } from './mouth';
import type { FishPose } from './story';

/**
 * The sheepshead, painted big: a deep, silvery body with five or six black
 * bars (the "convict" stripes), a steep sheep-like forehead, strong dorsal
 * spines, a gold eye and, on its snout, the human-looking front teeth
 * (mouth.ts). Facing left, in body px: the snout's front at x ≈ -40, the
 * tail at x ≈ 1600, the back at y ≈ -590 and the belly at y ≈ 480.
 */

type P = readonly [number, number];

/** Catmull-Rom through points, sampled. */
function smoothPath(points: readonly P[], closed: boolean, steps = 5): Pt[] {
  const n = points.length;
  const at = (i: number): P => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: Pt[] = [];
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const c = (a: number, b: number, c2: number, d: number): number =>
        0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  if (!closed) out.push({ x: points[n - 1]![0], y: points[n - 1]![1] });
  return out;
}

const BODY: readonly P[] = [
  [-156, -56], [-126, -150], [-50, -272], [44, -392], [156, -484], [290, -548], [430, -586], [600, -594], [800, -556], [1000, -470], [1180, -342],
  [1310, -205], [1388, -128], [1404, -30], [1388, 72], [1300, 172], [1150, 300], [960, 420], [740, 482], [520, 472], [330, 402],
  [180, 300], [60, 220], [-40, 160], [-112, 104], [-150, 36],
];
const BODY_PATH = smoothPath(BODY, true);

/** Where the mouth's middle sits in body px: the pose's x, y is this point. */
export const MOUTH: Pt = { x: -70, y: 10 };
export const EYE = { x: 190, y: -268, r: 58 } as const;

const TAIL: readonly P[] = [[1372, -118], [1470, -230], [1590, -350], [1560, -190], [1508, -30], [1560, 130], [1600, 300], [1470, 170], [1372, 66]];
const PECTORAL: readonly P[] = [[400, 96], [500, 70], [640, 120], [760, 210], [640, 196], [500, 178], [410, 150]];
const PELVIC: readonly P[] = [[470, 452], [560, 470], [560, 600], [520, 640], [470, 520]];
const ANAL: readonly P[] = [[980, 410], [1040, 520], [1130, 500], [1240, 380], [1250, 250], [1180, 300]];

/** The dorsal fin: tall spines from the nape back, then the soft part to the tail. */
const DORSAL_BASE = smoothPath([[420, -578], [600, -592], [800, -556], [1000, -470], [1180, -342], [1260, -270]], false, 4);
const spineHeight = (u: number): number => (u < 0.62 ? lerp(150, 215, Math.min(1, u * 4)) * lerp(1, 0.7, u / 0.62) : lerp(150, 110, (u - 0.62) / 0.38));

/** The bars: their middle at y = 0, how wide, and their lean (x per y). */
const BARS = [
  { x: 322, w: 66 }, { x: 528, w: 84 }, { x: 742, w: 86 }, { x: 952, w: 84 }, { x: 1146, w: 74 }, { x: 1318, w: 54 },
] as const;

/** Scales: little arcs in rows, fixed for every frame. */
const SCALES = (() => {
  const out: { x: number; y: number }[] = [];
  for (let row = 0; row < 26; row++) {
    for (let col = 0; col < 34; col++) out.push({ x: 300 + col * 36 + (row % 2) * 18, y: -600 + row * 42 });
  }
  return out;
})();

const SPECKS = (() => {
  const rng = createRng(611);
  return Array.from({ length: 70 }, () => ({ x: -20 + rng() * 400, y: -360 + rng() * 520, r: 1.5 + rng() * 2.5 }));
})();

export interface FishLook {
  readonly boil: number;
  /** Screen px per body px, so lines stay a steady width on screen. */
  readonly zoom: number;
}

/** A body point to world px for a pose. */
export function fishPoint(pose: FishPose, p: Pt): Pt {
  const sx = pose.scale * (1 - pose.squash);
  const sy = pose.scale * (1 + pose.squash * 0.7);
  const x = (p.x - MOUTH.x) * sx;
  const y = (p.y - MOUTH.y) * sy;
  const c = Math.cos(pose.tilt);
  const s = Math.sin(pose.tilt);
  return { x: pose.x + x * c - y * s, y: pose.y + x * s + y * c };
}

/** Sets up ctx so that body px draw at the pose. */
export function enterFish(ctx: CanvasRenderingContext2D, pose: FishPose): void {
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.scale * (1 - pose.squash), pose.scale * (1 + pose.squash * 0.7));
  ctx.translate(-MOUTH.x, -MOUTH.y);
}

const mix = (a: readonly number[], b: readonly number[], k: number): string =>
  `rgb(${a.map((v, i) => Math.round(lerp(v, b[i]!, k))).join(',')})`;

function drawFin(pen: Pen, pts: readonly P[], rays: number, mono: number, from: Pt, alpha = 0.92): void {
  const path = smoothPath(pts, true, 4);
  const { ctx } = pen;
  const ys = path.map((p) => p.y);
  const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, mix([92, 98, 96], [70, 70, 70], mono));
  g.addColorStop(1, mix([58, 62, 64], [40, 40, 40], mono));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  pathOf(ctx, path);
  ctx.fill();
  ctx.restore();
  pen.clipped(path, () => {
    for (let i = 0; i < rays; i++) {
      const tip = path[Math.round((i / Math.max(1, rays - 1)) * (path.length * 0.55))]!;
      pen.hair([from, tip], 1.6, '#c9cec6', 0.35);
    }
  });
  pen.closed(path, 3.2, INK);
}

function drawDorsal(pen: Pen, mono: number): void {
  const { ctx } = pen;
  const n = DORSAL_BASE.length;
  const tips = DORSAL_BASE.map((p, i) => {
    const u = i / (n - 1);
    const h = spineHeight(u);
    return { x: p.x + h * 0.42, y: p.y - h };
  });
  // The membrane, scalloped between the spines.
  const membrane: Pt[] = [];
  tips.forEach((tip, i) => {
    membrane.push(tip);
    const next = tips[i + 1];
    if (next) membrane.push({ x: (tip.x + next.x) / 2 + 6, y: (tip.y + next.y) / 2 + 34 });
  });
  const shape = [...DORSAL_BASE.map((p) => ({ x: p.x, y: p.y + 30 })).reverse(), ...membrane];
  const g = ctx.createLinearGradient(0, -820, 0, -460);
  g.addColorStop(0, mix([80, 88, 86], [60, 60, 60], mono));
  g.addColorStop(1, mix([44, 48, 50], [30, 30, 30], mono));
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = g;
  pathOf(ctx, shape);
  ctx.fill();
  ctx.restore();
  // The spines, stout and pale-edged.
  DORSAL_BASE.forEach((p, i) => {
    pen.stroke([p, tips[i]!], i < n * 0.62 ? 4.2 : 2.4, INK, 0.95, false);
    pen.hair([{ x: p.x - 4, y: p.y - 10 }, { x: tips[i]!.x - 4, y: tips[i]!.y + 12 }], 1.4, '#d8ddd4', 0.4);
  });
  pen.stroke(membrane, 2.6, INK, 0.9);
}

/** The bars: dark, a little ragged, lit up on "stripes" and pure black in the mugshot. */
function drawBars(pen: Pen, pose: FishPose): void {
  const { ctx } = pen;
  BARS.forEach((b, i) => {
    const glow = pose.barGlow[i] ?? 0;
    const pts: Pt[] = [];
    for (let y = -720; y <= 620; y += 40) pts.push({ x: b.x - b.w / 2 + y * -0.08 + 7 * Math.sin(y * 0.031 + i), y });
    for (let y = 620; y >= -720; y -= 40) pts.push({ x: b.x + b.w / 2 + y * -0.08 + 7 * Math.sin(y * 0.027 + i * 2), y });
    const k = Math.max(pose.convict, glow);
    ctx.save();
    ctx.globalAlpha = lerp(0.8, 1, k);
    ctx.fillStyle = mix([34, 36, 38], [14, 14, 16], k);
    pathOf(ctx, pts);
    ctx.fill();
    ctx.restore();
    // A soft feathered edge: hatching on each side.
    pen.hatch(pts, 9, 1.35, 1.2, { color: '#1d1e20', alpha: 0.35 });
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 * glow;
      ctx.strokeStyle = '#f5c84a';
      ctx.lineWidth = 6;
      pathOf(ctx, pts);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawEye(pen: Pen, pose: FishPose): void {
  const { ctx } = pen;
  const { x, y, r } = EYE;
  // The socket: a darker ring of skin.
  pen.fill(ellipse(x, y, r * 1.28, r * 1.22), pose.convict > 0.5 ? '#8c8c88' : '#7e857c', 0.6);
  // Iris and pupil.
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
  g.addColorStop(0, pose.convict > 0.5 ? '#e8e8e4' : '#f2dc8a');
  g.addColorStop(0.7, pose.convict > 0.5 ? '#bdbdb8' : '#cfa944');
  g.addColorStop(1, pose.convict > 0.5 ? '#77776f' : '#8a6a22');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const pr = r * lerp(0.56, 0.3, pose.wide);
  const px = x + pose.lookX * (r - pr) * 0.8;
  const py = y + pose.lookY * (r - pr) * 0.8;
  if (pose.happy <= 0.5) {
    pen.fill(ellipse(px, py, pr, pr), '#0b0b0d', 1);
    pen.dot(px - pr * 0.35, py - pr * 0.4, pr * 0.28, '#ffffff', 0.9);
    pen.dot(px + pr * 0.4, py + pr * 0.3, pr * 0.1, '#ffffff', 0.6);
  }
  // The lid: skin down over the top of the eye, or shut in a happy curve.
  if (pose.happy > 0.5) {
    // Shut happily: all lid, an upturned arch of a lash line.
    pen.fill(ellipse(x, y, r + 3, r + 3), pose.convict > 0.5 ? '#c9c9c4' : '#9aa49a', 1);
    const arch = Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI + (i / 10) * Math.PI;
      return { x: x + Math.cos(a) * r * 0.8, y: y + 10 + Math.sin(a) * r * 0.5 };
    });
    pen.stroke(arch, 5, INK);
    for (const i of [2, 5, 8]) pen.hair([arch[i]!, { x: arch[i]!.x + (i - 5) * 3, y: arch[i]!.y - 18 }], 2.6, INK, 0.85);
  }
  const lid = pose.happy > 0.5 ? 0 : pose.lid;
  if (lid > 0.01) {
    const edgeY = y - r + 2 * r * lid;
    const top = Array.from({ length: 17 }, (_, i) => {
      const a = Math.PI + (i / 16) * Math.PI;
      return { x: x + Math.cos(a) * (r + 3), y: y + Math.sin(a) * (r + 3) };
    });
    const sag = r * 0.15;
    const edge = Array.from({ length: 9 }, (_, i) => {
      const u = i / 8;
      const ex = x + r + 3 - u * (2 * r + 6);
      const cut = Math.sqrt(Math.max(0, 1 - ((ex - x) / (r + 3)) ** 2));
      return { x: ex, y: Math.min(y + (r + 3) * cut, edgeY + sag * Math.sin(Math.PI * u)) };
    });
    const shape = [...top, ...edge];
    pen.clipped(ellipse(x, y, r + 4, r + 4), () => pen.fill(shape, pose.convict > 0.5 ? '#c9c9c4' : '#9aa49a', 1));
    pen.stroke(edge, 3.6, INK);
  }
  pen.circle(x, y, r, 3.4, INK);
  // The brow: a fold of skin above the eye that carries the mood.
  const b = pose.brow;
  const front = { x: x - r * 1.05, y: y - r * 1.25 - (b < 0 ? -b * 22 : -b * 14) };
  const back = { x: x + r * 1.0, y: y - r * 1.3 + (b < 0 ? b * 4 : -b * 2) };
  pen.stroke([front, { x, y: y - r * 1.45 - (b < 0 ? -b * 16 : -b * 4) }, back], 4.2, INK, 0.9);
}

const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * rx, y: cy + Math.sin((i / n) * Math.PI * 2) * ry }));

/** Draws the sheepshead at its pose; ctx is in world px. */
export function drawSheepshead(ctx: CanvasRenderingContext2D, pose: FishPose, look: FishLook): void {
  const pen = new Pen(ctx, 7100 + look.boil * 131, 1.4 / Math.sqrt(look.zoom));
  const mono = pose.convict;
  ctx.save();
  enterFish(ctx, pose);

  // Fins behind the body.
  drawDorsal(pen, mono);
  drawFin(pen, TAIL, 9, mono, { x: 1380, y: -26 });
  drawFin(pen, ANAL, 6, mono, { x: 1000, y: 380 });
  drawFin(pen, PELVIC, 4, mono, { x: 470, y: 452 });

  // The body: a silvery wash, darker along the back, pale on the belly.
  const ys = BODY_PATH.map((p) => p.y);
  const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, mix([112, 122, 112], [205, 205, 200], mono));
  g.addColorStop(0.35, mix([176, 184, 174], [236, 236, 232], mono));
  g.addColorStop(0.7, mix([214, 216, 204], [246, 246, 242], mono));
  g.addColorStop(1, mix([236, 232, 216], [250, 250, 248], mono));
  ctx.save();
  ctx.fillStyle = g;
  pathOf(ctx, BODY_PATH);
  ctx.fill();
  ctx.restore();

  pen.clipped(BODY_PATH, () => {
    // A warm brassy cast on the head and shoulder, as on the real fish.
    if (mono < 1) {
      const warm = ctx.createRadialGradient(260, -200, 20, 260, -200, 420);
      warm.addColorStop(0, `rgba(196,170,110,${(0.32 * (1 - mono)).toFixed(3)})`);
      warm.addColorStop(1, 'rgba(196,170,110,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(-100, -700, 900, 1300);
    }
    // The forehead darker, a shadow under the eye and round the snout: modelling for the big close-ups.
    const brow = ctx.createLinearGradient(0, -560, 120, -120);
    brow.addColorStop(0, `rgba(40,52,44,${(0.45 * (1 - mono)).toFixed(3)})`);
    brow.addColorStop(1, 'rgba(40,52,44,0)');
    ctx.fillStyle = brow;
    ctx.fillRect(-200, -700, 700, 700);
    const cheek = ctx.createRadialGradient(150, -40, 30, 150, -40, 260);
    cheek.addColorStop(0, `rgba(60,70,60,${(0.2 * (1 - mono)).toFixed(3)})`);
    cheek.addColorStop(1, 'rgba(60,70,60,0)');
    ctx.fillStyle = cheek;
    ctx.fillRect(-150, -320, 600, 560);
    pen.hatch(smoothPath([[-160, -80], [-60, -300], [120, -480], [300, -560], [300, -420], [100, -330], [-40, -160]], true, 2), 11, 0.9, 1.2, { alpha: 0.22 });
    drawBars(pen, pose);
    // Scales: rows of little arcs over the body behind the gill.
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (const s of SCALES) {
      ctx.moveTo(s.x - 16, s.y);
      ctx.quadraticCurveTo(s.x, s.y + 16, s.x + 16, s.y);
    }
    ctx.stroke();
    ctx.restore();
    // Shade: hatching along the back, stipple under the belly.
    pen.hatch(smoothPath([[0, -700], [1500, -700], [1500, -380], [800, -420], [300, -330], [0, -200]], true, 2), 13, 0.5, 1.3, { alpha: 0.25 });
    pen.stipple(smoothPath([[100, 260], [700, 380], [1300, 120], [1300, 600], [100, 600]], true, 2), 900, (_, y) => Math.min(1, (y - 200) / 260), 1.4);
    // A sheen along the flank.
    pen.hair(smoothPath([[400, -120], [700, -150], [1000, -120], [1300, -60]], false, 4), 16, '#ffffff', 0.12);
    // The lateral line, following the back.
    pen.hair(smoothPath([[330, -400], [600, -450], [900, -380], [1150, -240], [1390, -60]], false, 5), 2, INK, 0.45);
    // The cheek: speckles and a shadow under the eye.
    for (const s of SPECKS) pen.dot(s.x, s.y, s.r, INK, 0.18);
  });

  // The gill cover and the cheek line.
  pen.stroke(smoothPath([[330, -440], [396, -260], [404, -60], [364, 120], [296, 262]], false, 5), 3.6, INK);
  pen.hair(smoothPath([[262, -372], [292, -160], [272, 60], [222, 196]], false, 5), 2.2, INK, 0.6);
  // Nostrils.
  pen.dot(70, -250, 6, INK, 0.85);
  pen.dot(96, -264, 5, INK, 0.7);

  pen.closed(BODY_PATH, 5, INK);
  drawFin(pen, PECTORAL, 7, mono, { x: 405, y: 120 }, 0.85);
  drawEye(pen, pose);

  // The mouth, on the snout, facing us.
  ctx.save();
  ctx.translate(MOUTH.x, MOUTH.y);
  drawMouth(pen, pose, { ...FISH_MOUTH, mono });
  ctx.restore();
  ctx.restore();
}
