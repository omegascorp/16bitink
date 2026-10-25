import { Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT } from '../captions';
import { VIDEO } from '../short';
import { TEXT } from './script';

/**
 * The secret-weapon scare: a blueprint pinned up under a red alarm light,
 * a shadowy mystery device drawn in chalk-white lines (a torpedo-like body
 * with a round cutter at its nose, dimension lines, notes), a big "?" over
 * it and a red "SECRET" stamp. Screen px.
 */

const PAPER = '#173a6a';
const GRID = 'rgba(150,190,240,0.16)';
const LINE = '#e8f1ff';
const SHADOW = 'rgba(4,12,30,0.75)';
const STAMP = '#d8322b';

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** Part of a polyline: its first `u` of the way along. */
function partOf(pts: readonly Pt[], u: number): Pt[] {
  if (u >= 1) return [...pts];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = lens.reduce((s, l) => s + l, 0) * u;
  const out = [pts[0]!];
  for (let i = 0; i < lens.length; i++) {
    if (left >= lens[i]!) {
      out.push(pts[i + 1]!);
      left -= lens[i]!;
      continue;
    }
    const k = left / lens[i]!;
    out.push({ x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * k, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * k });
    break;
  }
  return out;
}

const CY = 880;
/** The device: a long body, its nose a round cutter, fins at the back. */
const BODY: readonly Pt[] = [
  ...range(10, (u) => ({ x: 330 + 70 * Math.cos(-Math.PI / 2 - u * Math.PI), y: CY + 70 * Math.sin(-Math.PI / 2 - u * Math.PI) })),
  { x: 760, y: CY + 70 }, { x: 860, y: CY + 30 }, { x: 860, y: CY - 30 }, { x: 760, y: CY - 70 }, { x: 330, y: CY - 70 },
];
const FINS: readonly (readonly Pt[])[] = [
  [{ x: 760, y: CY - 70 }, { x: 860, y: CY - 150 }, { x: 900, y: CY - 150 }, { x: 860, y: CY - 30 }],
  [{ x: 760, y: CY + 70 }, { x: 860, y: CY + 150 }, { x: 900, y: CY + 150 }, { x: 860, y: CY + 30 }],
];
const CUTTER: readonly Pt[] = range(24, (u) => ({ x: 236 + 34 * Math.cos(Math.PI * 2 * u), y: CY + 96 * Math.sin(Math.PI * 2 * u) }));
const TEETH: readonly (readonly Pt[])[] = Array.from({ length: 9 }, (_, i) => {
  const a = -Math.PI / 2 + ((i + 0.5) / 9) * Math.PI * 2;
  return [{ x: 236 + 34 * Math.cos(a), y: CY + 96 * Math.sin(a) }, { x: 236 + 48 * Math.cos(a + 0.2), y: CY + 118 * Math.sin(a + 0.2) }];
});

export interface BlueprintLook {
  readonly sketch: number;
  readonly question: number;
  readonly stamp: { readonly scale: number; readonly alpha: number };
  readonly alarm: number;
}

export function drawBlueprint(ctx: CanvasRenderingContext2D, look: BlueprintLook, boil: number, t: number): void {
  const pen = new Pen(ctx, 2209 + boil * 151, 1.4);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Paper grain and the grid.
  const rng = createRng(19);
  ctx.fillStyle = 'rgba(200,220,255,0.05)';
  for (let i = 0; i < 400; i++) ctx.fillRect(rng() * VIDEO.width, rng() * VIDEO.height, 2 + rng() * 6, 1 + rng() * 2);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 2;
  for (let x = 20; x < VIDEO.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIDEO.height);
    ctx.stroke();
  }
  for (let y = 20; y < VIDEO.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIDEO.width, y);
    ctx.stroke();
  }
  // The device's shadowy fill, then its lines drawing themselves.
  const s = look.sketch;
  ctx.save();
  ctx.globalAlpha = s;
  pen.fill(BODY, SHADOW, 1);
  for (const f of FINS) pen.fill(f, SHADOW, 1);
  pen.fill(CUTTER, SHADOW, 1);
  ctx.restore();
  pen.stroke(partOf([...BODY, BODY[0]!], s), 4.2, LINE, 0.95, true);
  for (const f of FINS) pen.stroke(partOf(f, s), 3.4, LINE, 0.9, true);
  pen.stroke(partOf(CUTTER, s), 3.4, LINE, 0.9, true);
  if (s > 0.6) for (const tooth of TEETH) pen.stroke([...tooth], 3, LINE, 0.9, false);
  // Dimension lines and scribbled notes.
  if (s > 0.3) {
    const a = Math.min(1, (s - 0.3) / 0.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.setLineDash([14, 10]);
    pen.hair([{ x: 200, y: CY + 185 }, { x: 900, y: CY + 185 }], 2.4, LINE, 0.8);
    pen.hair([{ x: 200, y: CY + 165 }, { x: 200, y: CY + 205 }], 2.4, LINE, 0.8);
    pen.hair([{ x: 900, y: CY + 165 }, { x: 900, y: CY + 205 }], 2.4, LINE, 0.8);
    pen.hair([{ x: 140, y: CY - 96 }, { x: 140, y: CY + 96 }], 2.4, LINE, 0.8);
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) pen.hair(range(6, (u) => ({ x: 770 + u * 230, y: 440 + i * 30 + Math.sin(u * 9 + i) * 4 })), 2, LINE, 0.55);
    for (let i = 0; i < 3; i++) pen.hair(range(6, (u) => ({ x: 80 + u * 230, y: 440 + i * 30 + Math.sin(u * 7 + i) * 4 })), 2, LINE, 0.55);
    ctx.restore();
  }
  // The big "?".
  if (look.question > 0) {
    const wob = 0.06 * Math.sin(t * 7);
    ctx.save();
    ctx.translate(560, CY + 20);
    ctx.rotate(wob);
    ctx.scale(look.question, look.question);
    ctx.font = `700 380px ${CAPTION_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 30;
    ctx.strokeText('?', 0, 0);
    ctx.fillStyle = LINE;
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }
  drawStamp(ctx, look.stamp.scale, look.stamp.alpha);
  drawAlarm(ctx, look.alarm, t);
}

/** "SECRET" in a red box, slammed on at a slant. */
function drawStamp(ctx: CanvasRenderingContext2D, scale: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(TEXT.stamp.x, TEXT.stamp.y);
  ctx.rotate(-0.12);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha * 0.92;
  ctx.strokeStyle = STAMP;
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.strokeRect(-TEXT.stamp.halfW, -TEXT.stamp.halfH, TEXT.stamp.halfW * 2, TEXT.stamp.halfH * 2);
  ctx.font = `700 132px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = STAMP;
  ctx.fillText('SECRET', 0, 2);
  // Gaps in the ink, as a rubber stamp leaves.
  const rng = createRng(5);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(-250 + rng() * 500, -78 + rng() * 150, 2 + rng() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The red alarm light at the top, its beam sweeping, the whole picture washed red as it flashes. */
export function drawAlarm(ctx: CanvasRenderingContext2D, pulse: number, t: number): void {
  const x = 540;
  const y = 320;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(230,30,24,${(0.13 * pulse).toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // The beam, sweeping round.
  const a = t * 9;
  const beam = ctx.createRadialGradient(x, y, 10, x, y, 900);
  beam.addColorStop(0, `rgba(255,80,60,${(0.18 + 0.22 * pulse).toFixed(3)})`);
  beam.addColorStop(1, 'rgba(255,80,60,0)');
  ctx.fillStyle = beam;
  ctx.globalCompositeOperation = 'lighter';
  for (const off of [0, Math.PI]) {
    const d = a + off;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 900, d - 0.22, d + 0.22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // The lamp: a red glass dome on a dark base.
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(x - 70, y + 20, 140, 30);
  const glass = ctx.createRadialGradient(x - 14, y - 16, 4, x, y, 70);
  glass.addColorStop(0, `rgb(255,${Math.round(150 + 90 * pulse)},${Math.round(120 + 80 * pulse)})`);
  glass.addColorStop(0.5, `rgb(${Math.round(180 + 70 * pulse)},30,26)`);
  glass.addColorStop(1, '#5a0d0b');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 60, 70, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#120808';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Its glow.
  const glow = ctx.createRadialGradient(x, y, 20, x, y, 260);
  glow.addColorStop(0, `rgba(255,60,40,${(0.5 * pulse).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(x - 260, y - 260, 520, 520);
  ctx.restore();
}
