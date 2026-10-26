import { INK, Pen, type Pt } from '../../../src/art/pen';
import { clamp01, lerp, ramp } from '../short';
import { inBody, pathOf } from './paint';
import { type BodyPose, LIVER_MID, LIVER_NEAR } from './pose';
import { drawRays, drawVignette, drawWater, glow, type Rgb, wash } from './sea';
import { ALL_AT, boltAt, chargeLevelAt, cycles, ENERGY_AT, FAT_AT, wrap } from './story';

/**
 * "all fat and energy." (hype): warm golden water, light pouring down. The
 * liver, glowing, hangs above a big inked battery; golden drops of fat drip
 * from it into the battery, which fills from empty to full, and on "energy"
 * a lightning bolt flashes across it and sparkles burst round it.
 */

const HYPE_TOP: Rgb = [92, 58, 22];
const HYPE_MID: Rgb = [46, 26, 12];
const HYPE_BOTTOM: Rgb = [10, 5, 3];
const GOLD = '#ffc94a';
const FAT = '#ffd36a';

/** The battery: its body (centre, size) and the nub on its right. */
export const BATTERY = { x: 520, y: 860, w: 600, h: 290, r: 46, nubW: 52, nubH: 130 } as const;
/** The liver, shown on its own above the battery: in its owner's local frame, laid out at this pose. */
const LIVER_POSE: BodyPose = { x: 540 + (-500 - LIVER_MID.x) * 1.45, y: 470 - LIVER_MID.y * 1.45, length: 1450, angle: 0, flip: false };

function roundedBox(x0: number, y0: number, w: number, h: number, r: number): Pt[] {
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number): void => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  corner(x0 + w - r, y0 + r, -Math.PI / 2);
  corner(x0 + w - r, y0 + h - r, 0);
  corner(x0 + r, y0 + h - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

const BOLT: readonly Pt[] = [
  { x: 40, y: -120 }, { x: -70, y: 14 }, { x: -6, y: 14 }, { x: -40, y: 120 }, { x: 72, y: -24 }, { x: 8, y: -24 }, { x: 40, y: -120 },
];

function drawBattery(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const b = BATTERY;
  const level = chargeLevelAt(t);
  const x0 = b.x - b.w / 2;
  const y0 = b.y - b.h / 2;
  const pen = new Pen(ctx, 4411 + boil * 977, 1.6);
  const shell = roundedBox(x0, y0, b.w, b.h, b.r);
  const nub = roundedBox(x0 + b.w - 4, b.y - b.nubH / 2, b.nubW, b.nubH, 16);
  // The case: paper under a dark wash.
  pen.fill(shell, '#1d1712', 0.92);
  pen.fill(nub, '#2c241c', 0.95);
  // The charge: a green-to-gold fill from the left, with a bright top edge.
  const pad = 22;
  const inner = roundedBox(x0 + pad, y0 + pad, b.w - pad * 2, b.h - pad * 2, b.r - 14);
  const fillW = (b.w - pad * 2) * level;
  if (fillW > 1) {
    ctx.save();
    pathOf(ctx, inner);
    ctx.clip();
    const g = ctx.createLinearGradient(x0, 0, x0 + b.w, 0);
    g.addColorStop(0, '#7fd35a');
    g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    ctx.fillRect(x0 + pad, y0, fillW, b.h);
    ctx.fillStyle = 'rgba(255,255,230,0.45)';
    ctx.fillRect(x0 + pad, y0 + pad, fillW, 16);
    // The fill's front edge, rippling.
    ctx.strokeStyle = 'rgba(255,250,220,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let y = y0; y <= y0 + b.h; y += 10) {
      const x = x0 + pad + fillW + 6 * Math.sin(y / 18 + cycles(30, t));
      if (y === y0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  // The ink: a heavy outline, a glint, hatching under it.
  pen.hatch(shell.filter((p) => p.y > b.y + b.h * 0.2), 12, 0.6, 1.2, { color: '#000000', alpha: 0.25 });
  pen.stroke([...shell, shell[0]!], 9, INK);
  pen.stroke([...nub, nub[0]!], 7, INK);
  pen.hair([{ x: x0 + 40, y: y0 + 12 }, { x: x0 + b.w * 0.6, y: y0 + 10 }], 4, '#fff6dc', 0.6);
  // The bolt, flashing on "energy".
  const bolt = boltAt(t);
  if (bolt > 0.01) {
    const s = 1 + 0.15 * Math.max(0, 1 - (wrap(t) - ENERGY_AT) / 0.25);
    const pts = BOLT.map((p) => ({ x: b.x + p.x * s, y: b.y + p.y * s }));
    glow(ctx, b.x, b.y, 300, '255,230,120', 0.6 * bolt);
    pen.fill(pts, '#fff7c2', bolt);
    pen.stroke(pts, 6, INK, bolt);
  }
}

/** Drops of fat dripping from the liver into the battery. */
function drawDrops(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const on = ramp(u, ALL_AT, FAT_AT + 0.1);
  if (on <= 0) return;
  const from = { x: 540, y: 560 };
  const to = BATTERY.y - BATTERY.h / 2 - 10;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const age = (u - (FAT_AT - 0.25) - i * 0.18) / 0.45;
    if (age < 0 || age > 1) continue;
    const y = lerp(from.y, to, age * age);
    const x = from.x + (i - 2) * 46;
    const r = 13 + (i % 2) * 4;
    ctx.globalAlpha = on * (1 - 0.3 * age);
    ctx.fillStyle = FAT;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.2);
    ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.4, x, y + r);
    ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.4, x, y - r * 2.2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Sparkles bursting round the battery on "energy". */
function drawSparkles(ctx: CanvasRenderingContext2D, t: number): void {
  const a = boltAt(t);
  if (a <= 0.01) return;
  const age = Math.max(0, wrap(t) - ENERGY_AT);
  ctx.save();
  ctx.fillStyle = '#fff3b0';
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.3;
    const d = 330 + 160 * clamp01(age / 0.6) + (i % 3) * 30;
    const x = BATTERY.x + Math.cos(ang) * d;
    const y = BATTERY.y + Math.sin(ang) * d * 0.62;
    const r = (16 + (i % 4) * 6) * (0.6 + 0.4 * Math.sin(cycles(40, t) + i));
    ctx.globalAlpha = a;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const aa = (k * Math.PI) / 4;
      const rr = k % 2 === 0 ? r : r * 0.2;
      ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The liver on its own, glowing, above the battery. */
function drawFloatingLiver(ctx: CanvasRenderingContext2D, t: number): void {
  const pulse = 1 + 0.1 * Math.sin(cycles(22, t));
  const at = { x: 540, y: 470 + 8 * Math.sin(cycles(3, t)) };
  glow(ctx, at.x, at.y, 320, '255,150,60', 0.45 * pulse);
  inBody(ctx, { ...LIVER_POSE, y: LIVER_POSE.y + (at.y - 470) }, () => {
    pathOf(ctx, LIVER_NEAR);
    const g = ctx.createRadialGradient(LIVER_MID.x, LIVER_MID.y, 0, LIVER_MID.x, LIVER_MID.y, 220);
    g.addColorStop(0, `rgba(255,200,100,${(0.85 * pulse).toFixed(3)})`);
    g.addColorStop(1, 'rgba(230,100,40,0.45)');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255,150,60,0.9)';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,140,1)';
    ctx.lineWidth = 4;
    ctx.stroke();
  });
}

export function drawEnergy(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const bolt = boltAt(t);
  drawWater(ctx, sheet, HYPE_TOP, HYPE_MID, HYPE_BOTTOM);
  drawRays(ctx, t, 1.6 + 0.8 * bolt, -100, '255,215,140');
  // A punch in on "energy".
  const k = 1 + 0.06 * bolt;
  ctx.save();
  ctx.translate(540, 760);
  ctx.scale(k, k);
  ctx.translate(-540, -760);
  drawFloatingLiver(ctx, t);
  drawDrops(ctx, t);
  drawBattery(ctx, t, boil);
  drawSparkles(ctx, t);
  ctx.restore();
  wash(ctx, 'soft-light', '#ffb040', 0.2 + 0.2 * bolt);
  drawVignette(ctx, 0.55, '10,4,0');
}
