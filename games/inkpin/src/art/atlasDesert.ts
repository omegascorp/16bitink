import { blob, type Rng, trace } from './atlasWash';
import { INK } from './palette';
import type { Pen, Pt } from './pen';
import { SAND, SAND_DARK, SAND_LIGHT } from './tomb';
import { mix, rgba } from './wash';

/**
 * The desert's landforms for the Ink Atlas: dunes with sharp crests and
 * shaded slip faces, wind-combed sand, and flat-topped mesas of red
 * sandstone over their scree. The wind blows from the left.
 */

const PAGE = '#efe3c3';
export const MESA = '#cf9466';
const MESA_LIGHT = '#ecc89c';
const MESA_DARK = '#9a6444';
export const SANDS = ['#e3c991', '#dcb070', '#e6bd84', '#ecd29c', '#d6a76a'] as const;

/**
 * A dune: a soft mound with a sharp crest, long and gentle on the windward
 * left, a steep slip face on the right shaded and hatched, and a foot that
 * melts into the sand. Sometimes a smaller one shoulders in behind.
 */
export function dune(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: Rng): void {
  const peak = { x: x + w * (0.2 + rng() * 0.2), y: y - h };
  const foot = { l: { x: x - w, y }, r: { x: x + w * 0.85, y } };
  // Windward: a long concave rise; lee: a short steep fall.
  const crest: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    crest.push({ x: foot.l.x + (peak.x - foot.l.x) * t, y: y - h * Math.pow(Math.sin((t * Math.PI) / 2), 1.6) });
  }
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    crest.push({ x: peak.x + (foot.r.x - peak.x) * t, y: peak.y + h * Math.pow(t, 0.75) });
  }
  // Where the slip face meets the ground in front, curving back under the crest.
  const toe = { x: peak.x - w * 0.05, y: y + 1 };
  const bend = { x: peak.x + w * 0.02, y: y - h * 0.35 };
  const body = [...crest, { x: x, y: y + 3 }];
  const g = ctx.createLinearGradient(0, y - h, 0, y + 3);
  g.addColorStop(0, rgba(mix(SAND_LIGHT, '#ffffff', 0.35), 0.95));
  g.addColorStop(0.55, rgba(SAND_LIGHT, 0.7));
  g.addColorStop(1, rgba(SAND, 0.05));
  ctx.fillStyle = g;
  trace(ctx, body);
  ctx.fill();
  const lee = [peak, ...crest.slice(13), toe, bend];
  const sg = ctx.createLinearGradient(peak.x, peak.y, foot.r.x, y);
  sg.addColorStop(0, rgba(mix(SAND_DARK, '#8a5a3a', 0.35), 0.75));
  sg.addColorStop(1, rgba(SAND_DARK, 0.35));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(peak.x, peak.y);
  for (const p of crest.slice(13)) ctx.lineTo(p.x, p.y);
  ctx.lineTo(toe.x, toe.y);
  ctx.quadraticCurveTo(bend.x, bend.y, peak.x, peak.y);
  ctx.fill();
  pen.hatch(lee, 2.6, 1.3, 0.7, { color: mix(SAND_DARK, '#6a4a2a', 0.45), alpha: 0.5 });
  pen.hair(crest.slice(2, 16), 1.1, INK, 0.62);
  // Wind ripples on the windward slope, following its curve.
  for (let k = 0; k < 3; k++) {
    const i = 3 + k * 2 + Math.floor(rng() * 2);
    const p = crest[i]!;
    const dy = (y - p.y) * (0.3 + k * 0.15);
    pen.hair([{ x: p.x - 10, y: p.y + dy + 2 }, { x: p.x + 4, y: p.y + dy - 1 }, { x: p.x + 16, y: p.y + dy + 1 }], 0.7, SAND_DARK, 0.55);
  }
}

/** Sand combed by the wind: long, faint, wavering parallel lines in a ragged patch. */
export function rippleField(pen: Pen, x: number, y: number, w: number, h: number, rng: Rng): void {
  const rows = Math.max(4, Math.round(h / 6));
  const phase = rng() * 6;
  for (let k = 0; k < rows; k++) {
    const t = (k + 0.5) / rows;
    const yy = y - h + 2 * h * t;
    const half = w * Math.sqrt(1 - (2 * t - 1) ** 2) * (0.7 + rng() * 0.3);
    if (half < 10) continue;
    const pts: Pt[] = [];
    for (let u = -half; u <= half; u += 10) pts.push({ x: x + u, y: yy + Math.sin(u / 22 + phase + k * 0.4) * 2.4 });
    if (pts.length > 1) pen.hair(pts, 0.8, SAND_DARK, 0.4 + rng() * 0.2);
  }
}

/**
 * A mesa: an irregular flat top lit pale, sheer banded cliffs under it
 * hatched on the shaded side, and a fan of scree spreading to the sand.
 */
export function mesa(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: Rng): void {
  const d = w * 0.22;
  const topY = y - h;
  const top = blob(rng, x, topY, w * 0.8, d, 10, 0.35);
  const lx = Math.min(...top.map((p) => p.x));
  const rx = Math.max(...top.map((p) => p.x));
  const cliffFoot = topY + h * 0.62;
  const front = top.filter((p) => p.y >= topY - 1).sort((a, b) => a.x - b.x);
  // Sheer cliff, then the scree apron, wider still.
  const left = [{ x: lx, y: topY }, { x: lx - w * 0.06, y: cliffFoot }, { x: lx - w * 0.38, y }];
  const right = [{ x: rx + w * 0.5, y }, { x: rx + w * 0.1, y: cliffFoot }, { x: rx, y: topY }];
  const hill = [...left, { x, y: y + 4 }, ...right, ...[...front].reverse()];
  ctx.fillStyle = rgba('#6a4028', 0.15);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.45, y + 3, w * 1.3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(lx, 0, rx + w * 0.3, 0);
  g.addColorStop(0, mix(MESA, PAGE, 0.25));
  g.addColorStop(0.5, MESA);
  g.addColorStop(1, mix(MESA_DARK, MESA, 0.2));
  ctx.fillStyle = g;
  trace(ctx, hill);
  ctx.fill();
  // The scree apron, paler and dotted.
  const apron = [{ x: lx - w * 0.06, y: cliffFoot }, { x: lx - w * 0.38, y }, { x: rx + w * 0.5, y }, { x: rx + w * 0.1, y: cliffFoot }];
  pen.fill(apron, mix(MESA_LIGHT, SAND, 0.4), 0.55);
  for (let k = 0; k < 16; k++) {
    const t = rng();
    const u = rng();
    pen.dot(lx - w * 0.3 + t * (rx - lx + w * 0.75), cliffFoot + u * (y - cliffFoot), 0.7 + rng() * 1.2, MESA_DARK, 0.6);
  }
  // Broken strata along the cliff.
  for (let k = 1; k < 3; k++) {
    const yy = topY + d * 0.5 + ((cliffFoot - topY - d * 0.5) * k) / 3;
    const a0 = lx + rng() * w * 0.2;
    const a1 = a0 + w * (0.5 + rng() * 0.5);
    pen.hair([{ x: a0, y: yy + rng() * 2 }, { x: a1, y: yy + 1 + rng() * 2 }], 0.8, MESA_DARK, 0.6);
  }
  pen.hatch([{ x: x + w * 0.2, y: topY + d * 0.4 }, { x: rx, y: topY }, { x: rx + w * 0.1, y: cliffFoot }, { x: x + w * 0.25, y: cliffFoot }], 2.4, Math.PI / 2 - 0.08, 0.7, { color: MESA_DARK, alpha: 0.7 });
  for (let k = 0; k < 3; k++) {
    const gx = lx + w * (0.15 + k * 0.3) + rng() * 6;
    pen.hair([{ x: gx, y: topY + d * 0.8 }, { x: gx - 1, y: cliffFoot - 2 }], 0.7, MESA_DARK, 0.5);
  }
  const tg = ctx.createLinearGradient(lx, topY - d, rx, topY + d);
  tg.addColorStop(0, mix(MESA_LIGHT, '#ffffff', 0.25));
  tg.addColorStop(1, mix(MESA_LIGHT, MESA, 0.3));
  ctx.fillStyle = tg;
  trace(ctx, top);
  ctx.fill();
  pen.hair([...top, top[0]!], 1.1, INK, 0.75);
  pen.hair(left.slice(0, 2), 1.1, INK, 0.75);
  pen.hair(right.slice(1), 1.1, INK, 0.75);
}
