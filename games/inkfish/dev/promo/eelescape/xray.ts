import { ellipse, makeCanvas, pathOf, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { lerp, VIDEO } from '../short';
import { alongTrack, lerpPt, smoothCurve, trackAt, tube } from './geom';
import { eelProfile } from './eelArt';
import { drawJapan, drawScientists, drawTimer } from './labels';
import {
  bonesAt, cycles, dramaAt, eelGlowAt, pathAt, scanAt, scientistsAt, stomachAt, throbAt, trembleAt, wrap, XCAM_AT, xCamAt, xEelAt,
} from './story';
import { drawVignette, drawWater, glow, mixRgb, type Rgb, wash } from './water';
import { SPINE_FROM, SPINE_TO, STOMACH, VERTEBRAE, X_BODY, X_EEL_HALF, X_EEL_LEN, X_EYE, X_EYE_R, X_GILL_S, X_TRACK } from './xshape';

/**
 * The X-ray: blue-black, the dark sleeper whole as a glowing skeleton in a
 * faint outline of its body, and the eel a bright white line curled in its
 * stomach. Then in to the stomach (pulsing red-orange with a heartbeat),
 * and the eel reversing, tail first, along a dotted path up the gullet and
 * out of the gill slit.
 */

const COOL: readonly [Rgb, Rgb, Rgb] = [[10, 26, 46], [4, 11, 24], [1, 3, 9]];
const NERVY: readonly [Rgb, Rgb, Rgb] = [[54, 18, 12], [24, 7, 6], [6, 2, 2]];
const DRAMA: readonly [Rgb, Rgb, Rgb] = [[44, 12, 58], [18, 5, 30], [4, 1, 9]];

const BONE = '#d6ebff';
const BOX = { x0: 60, y0: 560, w: 1000, h: 420 } as const;
const RES = 2;

/** The skeleton, glowing: a blurred copy under sharp lines, baked per boil frame. */
export function makeSkeleton(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const sharp = makeCanvas(BOX.w * RES, BOX.h * RES);
    sharp.ctx.scale(RES, RES);
    sharp.ctx.translate(-BOX.x0, -BOX.y0);
    drawBones(new Pen(sharp.ctx, 3301 + f * 977, 0.6));
    const out = makeCanvas(BOX.w * RES, BOX.h * RES);
    out.ctx.filter = 'blur(9px)';
    out.ctx.globalAlpha = 0.9;
    out.ctx.drawImage(sharp.canvas, 0, 0);
    out.ctx.filter = 'none';
    out.ctx.globalAlpha = 1;
    out.ctx.globalCompositeOperation = 'lighter';
    out.ctx.drawImage(sharp.canvas, 0, 0);
    return out.canvas;
  });
}

const spineY = (x: number): number => {
  const f = (x - SPINE_FROM.x) / (SPINE_TO.x - SPINE_FROM.x);
  return SPINE_FROM.y + (SPINE_TO.y - SPINE_FROM.y) * Math.max(0, f) ** 1.2;
};
/** The body's outline's top and bottom at x. */
function edgesAt(x: number): { readonly top: number; readonly bottom: number } {
  const ys: number[] = [];
  for (let i = 0; i < X_BODY.length; i++) {
    const a = X_BODY[i]!;
    const b = X_BODY[(i + 1) % X_BODY.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    ys.push(a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x));
  }
  return ys.length ? { top: Math.min(...ys), bottom: Math.max(...ys) } : { top: 0, bottom: 0 };
}

function rays(pen: Pen, base: readonly Pt[], tips: readonly Pt[], w: number): void {
  pen.fill([...base, ...[...tips].reverse()], '#7fb6ea', 0.1);
  pen.hair(tips, 1, '#9fd0ff', 0.4);
  base.forEach((b, i) => pen.hair([b, lerpPt(b, tips[i]!, 0.5), tips[i]!], w, BONE, 0.7));
}

function drawBones(pen: Pen): void {
  // The body's soft outline.
  pen.fill(X_BODY, '#5d9ad8', 0.14);
  pen.stroke([...X_BODY, X_BODY[0]!], 2.2, '#8fc4f4', 0.55, false);
  // Skull, jaws and the gill cover's bones.
  const curves: readonly (readonly Pt[])[] = [
    [{ x: 112, y: 766 }, { x: 150, y: 714 }, { x: 225, y: 684 }, { x: 300, y: 682 }, { x: 345, y: 712 }, { x: 352, y: 738 }],
    [{ x: 150, y: 770 }, { x: 240, y: 762 }, { x: 345, y: 744 }],
    [{ x: 102, y: 770 }, { x: 150, y: 778 }, { x: 205, y: 790 }],
    [{ x: 96, y: 786 }, { x: 140, y: 800 }, { x: 190, y: 806 }, { x: 228, y: 794 }],
    [{ x: 130, y: 762 }, { x: 175, y: 776 }, { x: 214, y: 792 }],
    [{ x: 300, y: 688 }, { x: 336, y: 730 }, { x: 345, y: 790 }, { x: 330, y: 846 }],
    [{ x: 258, y: 702 }, { x: 282, y: 768 }, { x: 276, y: 820 }, { x: 246, y: 846 }],
    [{ x: 366, y: 690 }, { x: 372, y: 780 }, { x: 350, y: 862 }],
  ];
  for (const c of curves) pen.stroke(smoothCurve(c, 6), 3, BONE, 0.9, false);
  for (const y of [858, 866, 872]) pen.hair(smoothCurve([{ x: 225, y: y - 22 }, { x: 270, y }, { x: 320, y: y - 6 }], 5), 1.4, BONE, 0.6);
  // Gill arches.
  for (let i = 0; i < 4; i++) pen.hair(smoothCurve([{ x: 280 + i * 12, y: 726 }, { x: 268 + i * 12, y: 778 }, { x: 288 + i * 12, y: 824 }], 5), 1.6, BONE, 0.45);
  pen.stroke([...ellipse(X_EYE.x, X_EYE.y, X_EYE_R, X_EYE_R, 20), ellipse(X_EYE.x, X_EYE.y, X_EYE_R, X_EYE_R, 20)[0]!], 2.6, BONE, 0.85, false);
  pen.fill(ellipse(X_EYE.x, X_EYE.y, X_EYE_R * 0.55, X_EYE_R * 0.55, 14), BONE, 0.35);
  // The backbone, the spines above and below it, and the ribs.
  const step = (SPINE_TO.x - SPINE_FROM.x) / VERTEBRAE;
  for (let i = 0; i < VERTEBRAE; i++) {
    const f = i / (VERTEBRAE - 1);
    const x = SPINE_FROM.x + step * (i + 0.5);
    const y = spineY(x);
    const h = 21 - 8 * f;
    pen.fill(ellipse(x, y, step * 0.4, h / 2, 12), BONE, 0.32);
    pen.stroke([...ellipse(x, y, step * 0.4, h / 2, 12), ellipse(x, y, step * 0.4, h / 2, 12)[0]!], 1.6, BONE, 0.9, false);
    const e = edgesAt(x);
    const up = (y - e.top) * 0.82;
    pen.hair([{ x, y: y - h / 2 }, { x: x + up * 0.35, y: y - h / 2 - up * 0.92 }], 1.5, BONE, 0.75);
    const down = (e.bottom - y) * 0.82;
    if (i >= 11) pen.hair([{ x, y: y + h / 2 }, { x: x + down * 0.4, y: y + h / 2 + down * 0.9 }], 1.5, BONE, 0.75);
    else if (i > 0) pen.hair(smoothCurve([{ x, y: y + h / 2 }, { x: x + 14, y: y + down * 0.5 }, { x: x + 34, y: e.bottom - 14 }], 5), 1.5, BONE, 0.7);
  }
  // Fins.
  const fin = (from: number, to: number, n: number, len: number, top: boolean, rake: number): void => {
    const base = Array.from({ length: n }, (_, i) => {
      const x = from + ((to - from) * i) / (n - 1);
      const e = edgesAt(x);
      return { x, y: top ? e.top + 4 : e.bottom - 4 };
    });
    rays(pen, base, base.map((b, i) => {
      const l = len * Math.sin(Math.PI * Math.min(1, 0.2 + (i / (n - 1)) * 0.85)) ** 0.5;
      return { x: b.x + l * rake, y: b.y + (top ? -l : l) };
    }), 1.5);
  };
  fin(425, 520, 6, 62, true, 0.45);
  fin(575, 775, 11, 48, true, 0.5);
  fin(605, 780, 9, 44, false, 0.5);
  const tail = { x: 905, y: 765 };
  rays(pen, Array.from({ length: 15 }, () => tail), Array.from({ length: 15 }, (_, i) => {
    const a = -0.62 + (i / 14) * 1.24;
    return { x: tail.x + Math.cos(a) * 112, y: tail.y + Math.sin(a) * 92 };
  }), 1.5);
  const pec = { x: 372, y: 790 };
  rays(pen, Array.from({ length: 11 }, () => pec), Array.from({ length: 11 }, (_, i) => {
    const a = -0.45 + (i / 10) * 0.9;
    return { x: pec.x + Math.cos(a) * 100, y: pec.y + Math.sin(a) * 60 };
  }), 1.2);
  const pel = { x: 330, y: 852 };
  rays(pen, Array.from({ length: 5 }, () => pel), Array.from({ length: 5 }, (_, i) => ({ x: pel.x + 40 + i * 10, y: pel.y + 42 - i * 5 })), 1.2);
}

// ---------------------------------------------------------------- live parts

/** The eel: a bright white line with a glow, a darker dot of an eye at its head. */
function drawXEel(ctx: CanvasRenderingContext2D, spine: readonly Pt[], brightness: number): void {
  const body = tube(spine, (f) => X_EEL_HALF * eelProfile(f));
  ctx.save();
  ctx.shadowColor = `rgba(220,245,255,${0.9 * brightness})`;
  ctx.shadowBlur = 26 + 20 * brightness;
  pathOf(ctx, [...body.left, ...[...body.right].reverse()]);
  ctx.fillStyle = '#f6fcff';
  ctx.fill();
  ctx.restore();
  const eye = lerpPt(spine[1]!, body.left[1]!, 0.4);
  ctx.fillStyle = '#27445e';
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** The dotted way out, from the eel's tail to just past the gill slit, a chevron at its end. */
function drawPath(ctx: CanvasRenderingContext2D, from: number, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const to = X_GILL_S + 70;
  ctx.save();
  ctx.shadowColor = 'rgba(255,140,230,0.9)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd6f4';
  const march = (t * 40) % 16;
  for (let s = from + 10 + march; s < to; s += 16) {
    const { p } = trackAt(X_TRACK, s);
    ctx.globalAlpha = amount * Math.min(1, (to - s) / 30);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const { p, dir } = trackAt(X_TRACK, to);
  ctx.globalAlpha = amount;
  ctx.strokeStyle = '#ffd6f4';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const n = { x: -dir.y, y: dir.x };
  ctx.moveTo(p.x - dir.x * 18 + n.x * 14, p.y - dir.y * 18 + n.y * 14);
  ctx.lineTo(p.x, p.y);
  ctx.lineTo(p.x - dir.x * 18 - n.x * 14, p.y - dir.y * 18 - n.y * 14);
  ctx.stroke();
  ctx.restore();
}

function drawStomach(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const nerve = stomachAt(u);
  const throb = throbAt(u);
  const k = 1 + 0.06 * throb * nerve;
  ctx.save();
  ctx.translate(STOMACH.x, STOMACH.y);
  ctx.scale(k, k);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, STOMACH.rx);
  const warm = nerve * (0.35 + 0.45 * throb);
  g.addColorStop(0, `rgba(${Math.round(lerp(120, 255, nerve))},${Math.round(lerp(180, 120, nerve))},${Math.round(lerp(240, 60, nerve))},${(0.16 + warm).toFixed(3)})`);
  g.addColorStop(1, `rgba(${Math.round(lerp(80, 200, nerve))},${Math.round(lerp(140, 60, nerve))},${Math.round(lerp(220, 30, nerve))},0.02)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, STOMACH.rx, STOMACH.ry, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -cycles(6, t) * 4;
  ctx.strokeStyle = nerve > 0.5 ? `rgba(255,170,120,${0.5 + 0.3 * throb})` : 'rgba(170,215,255,0.45)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

/** Fine scan lines over the whole X-ray, like a monitor. */
function drawScanLines(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(150,200,255,0.035)';
  for (let y = 0; y < VIDEO.height; y += 6) ctx.fillRect(0, y, VIDEO.width, 2);
  ctx.restore();
}

/** The scan bar: a bright cyan line with a soft trail. */
export function drawScanBar(ctx: CanvasRenderingContext2D, y: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 160, 0, y);
  g.addColorStop(0, 'rgba(120,230,255,0)');
  g.addColorStop(1, `rgba(120,230,255,${(0.28 * alpha).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 160, VIDEO.width, 160);
  ctx.shadowColor = 'rgba(140,240,255,1)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(225,250,255,${alpha})`;
  ctx.fillRect(0, y - 3, VIDEO.width, 6);
  ctx.restore();
}

export function drawXray(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, skeleton: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const u = wrap(t);
  const nerve = stomachAt(u);
  const drama = dramaAt(u);
  const tone = (i: 0 | 1 | 2): Rgb => mixRgb(mixRgb(COOL[i], NERVY[i], nerve * (1 - drama)), DRAMA[i], drama);
  drawWater(ctx, sheet, tone(0), tone(1), tone(2));
  wash(ctx, 'multiply', '#0a1a30', 0.5);
  drawScanLines(ctx);
  const cam = xCamAt(u);
  const shake = trembleAt(u);
  ctx.save();
  ctx.translate(XCAM_AT.x + shake.x, XCAM_AT.y + shake.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  drawStomach(ctx, t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8 + 0.2 * bonesAt(u) - 0.25 * nerve;
  ctx.drawImage(skeleton[boil % skeleton.length]!, BOX.x0, BOX.y0, BOX.w, BOX.h);
  if (bonesAt(u) > 0.01) {
    ctx.globalAlpha = 0.5 * bonesAt(u);
    ctx.drawImage(skeleton[boil % skeleton.length]!, BOX.x0, BOX.y0, BOX.w, BOX.h);
  }
  ctx.restore();
  const tail = xEelAt(u);
  drawPath(ctx, tail, pathAt(u), t);
  const moving = tail > X_EEL_LEN + 1;
  const spine = alongTrack(X_TRACK, tail - X_EEL_LEN, tail, 48, (s, f) => (moving ? 3.5 * f * Math.sin(s / 14 + cycles(50, t)) : 1.2 * Math.sin(f * 9 + cycles(12, t))));
  // Head first in the spine.
  drawXEel(ctx, spine, 0.4 + 0.6 * eelGlowAt(u));
  const tailTip = trackAt(X_TRACK, tail).p;
  ctx.restore();
  const tipScreen = { x: XCAM_AT.x + (tailTip.x - cam.x) * cam.zoom, y: XCAM_AT.y + (tailTip.y - cam.y) * cam.zoom };
  glow(ctx, tipScreen.x, tipScreen.y, 160, '255,170,235', 0.45 * drama);
  wash(ctx, 'screen', '#ff6a2a', 0.12 * nerve * throbAt(u) * (1 - drama));
  // The scan sweeping on "X-rayed".
  const scan = scanAt(u);
  if (scan !== null) drawScanBar(ctx, lerp(240, 1360, scan), Math.sin(Math.PI * scan) ** 0.4);
  drawVignette(ctx, 0.7, '0,2,8');
  drawScientists(ctx, scientistsAt(u), t, boil);
  drawJapan(ctx, t, boil);
  drawTimer(ctx, t, boil);
}
