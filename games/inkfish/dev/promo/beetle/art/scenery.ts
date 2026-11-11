import type { Pt } from '../../../../src/art/pen';
import { VIDEO } from '../../short';
import { dab, path, smoothLoop, softLine } from '../../seal/art/paint';
import { inkLine, seeded } from '../../pelican/art/ink';
import { LIMBS, LOWER, UPPER, VENT } from './frog';

/**
 * Everything behind the animals: the dark pond bank at night-ish dusk (high
 * contrast, so the green frog and the glossy beetle pop), the frog's gullet
 * and stomach seen from inside (painted, warm and a little see-through: no
 * slime, no gore), the dark where the beetle kicks, the X-ray of the whole
 * frog with its gut lit, and the stopwatch.
 */

const W = VIDEO.width;
const H = VIDEO.height;

// ---------------------------------------------------------------- the pond bank

const REEDS = (() => {
  const rng = seeded(41);
  return Array.from({ length: 26 }, () => ({ x: rng() * 1.4 - 0.2, h: 0.35 + rng() * 0.5, lean: (rng() - 0.5) * 0.2, w: 6 + rng() * 14, tone: rng() }));
})();
const BOKEH = (() => {
  const rng = seeded(97);
  return Array.from({ length: 22 }, () => ({ x: rng(), y: rng() * 0.6, r: 20 + rng() * 60, a: 0.05 + rng() * 0.12, warm: rng() < 0.4 }));
})();

/** The backdrop, screen space: water and reeds out of focus, a little parallax with the camera; `groundY` is the bank's top on screen. */
export function drawPond(ctx: CanvasRenderingContext2D, groundY: number, parallax: number, dark = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#08130f');
  g.addColorStop(0.45, '#12261c');
  g.addColorStop(0.75, '#1c3322');
  g.addColorStop(1, '#0d150c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const b of BOKEH) dab(ctx, ((b.x * W - parallax * 0.3) % W + W) % W, b.y * H + 120, b.r, b.warm ? '255,210,140' : '170,230,200', b.a);
  // Reeds, soft and dark, two depths.
  for (const r of REEDS) {
    const x = r.x * W - parallax * (0.4 + r.tone * 0.4);
    const top = groundY - r.h * H;
    softLine(ctx, [{ x, y: groundY + 20 }, { x: x + r.lean * 200, y: (groundY + top) / 2 }, { x: x + r.lean * 420, y: top }], r.w, r.tone < 0.5 ? '#061008' : '#1e3a24', 0.55, 4);
  }
  // A glint of water behind the bank.
  softLine(ctx, [{ x: -50, y: groundY - 30 }, { x: W / 2, y: groundY - 36 }, { x: W + 50, y: groundY - 28 }], 40, '#3a6a5a', 0.18, 6);
  // The mossy bank.
  const bank = ctx.createLinearGradient(0, groundY - 10, 0, H);
  bank.addColorStop(0, '#3a4a26');
  bank.addColorStop(0.12, '#2a3a1c');
  bank.addColorStop(1, '#0e1408');
  ctx.fillStyle = bank;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 6);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, groundY + 4 * Math.sin((x + parallax) * 0.02));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  const rng = seeded(5);
  for (let i = 0; i < 70; i++) {
    const x = ((rng() * W * 1.5 - parallax) % W + W) % W;
    const y = groundY + 10 + rng() * (H - groundY);
    dab(ctx, x, y, 10 + rng() * 26, rng() < 0.5 ? '90,120,50' : '10,16,6', 0.25);
  }
  if (dark > 0) {
    ctx.fillStyle = `rgba(4,8,6,${dark})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** A soft warm key light from the upper right, over the whole picture. */
export function drawKeyLight(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  dab(ctx, W * 0.85, H * 0.18, H * 0.7, '255,220,160', 0.35);
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.45, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- inside: the gullet and the stomach

const CENTRE: Pt = { x: W / 2, y: 820 };
const RUGAE = (() => {
  const rng = seeded(61);
  return Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * Math.PI * 2 + rng() * 0.2, bend: (rng() - 0.5) * 0.5, len: 0.6 + rng() * 0.4 }));
})();

/**
 * Looking down the gullet behind the sliding beetle: soft muscular rings of
 * warm, see-through wall streaming outward as it slides (`slide` is their
 * phase), opening into the round stomach (`stomach` 0 .. 1), the light from
 * the mouth behind it (`light` 1 .. 0) shrinking to nothing.
 */
export function drawGullet(ctx: CanvasRenderingContext2D, slide: number, stomach: number, light: number): void {
  ctx.fillStyle = '#0c0204';
  ctx.fillRect(0, 0, W, H);
  const lit = Math.max(0, light);
  const g = ctx.createRadialGradient(CENTRE.x, CENTRE.y, 20, CENTRE.x, CENTRE.y, 1100);
  g.addColorStop(0, '#1a0508');
  g.addColorStop(0.3, '#5a1a1e');
  g.addColorStop(0.7, '#a04a40');
  g.addColorStop(1, '#c87a5e');
  ctx.globalAlpha = 0.25 + 0.75 * lit;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  // Light through the walls: faint warm veins.
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3;
    const pts = Array.from({ length: 6 }, (_, j) => ({ x: CENTRE.x + Math.cos(a + j * 0.05) * (120 + j * 170), y: CENTRE.y + Math.sin(a + j * 0.05) * (110 + j * 160) }));
    softLine(ctx, pts, 5, '#e08a6a', 0.18 * lit * (1 - stomach * 0.5), 3);
  }
  // The rings: each a fold with a lit edge and a dark one, streaming out.
  const n = 9;
  const ringsAlpha = 1 - 0.85 * stomach;
  for (let i = n - 1; i >= 0; i--) {
    const depth = i - (slide % 1);
    const r = 70 * Math.exp(depth * 0.42) * (1 + stomach * 0.6);
    const fade = Math.min(1, r / 160) * ringsAlpha * (0.35 + 0.65 * lit);
    ctx.save();
    ctx.translate(CENTRE.x, CENTRE.y);
    ctx.scale(1, 0.92);
    ctx.globalAlpha = fade * 0.5;
    ctx.strokeStyle = '#2a0608';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, r * 0.05, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = '#e8a08a';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.arc(0, -r * 0.03, r * 0.96, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
  }
  // The stomach: soft folds fanning round the chamber.
  if (stomach > 0.01) {
    for (const f of RUGAE) {
      const pts = Array.from({ length: 7 }, (_, j) => {
        const d = 260 + j * 110 * f.len;
        const a = f.a + f.bend * (j / 6);
        return { x: CENTRE.x + Math.cos(a) * d, y: CENTRE.y + Math.sin(a) * d * 0.95 };
      });
      softLine(ctx, pts, 30, '#2a080a', 0.35 * stomach, 4);
      softLine(ctx, pts.map((p) => ({ x: p.x - 8, y: p.y - 8 })), 10, '#d88a78', 0.3 * stomach * (0.3 + 0.7 * lit), 3);
    }
    dab(ctx, CENTRE.x, CENTRE.y, 360, '20,4,6', 0.5 * stomach);
  }
}

/** Out of the light: the dark closing in, an iris round the beetle (`light` 1 .. 0). */
export function drawIris(ctx: CanvasRenderingContext2D, light: number): void {
  const lit = Math.max(0, light);
  const iris = 1150 * lit;
  const dark = ctx.createRadialGradient(CENTRE.x, CENTRE.y - 20, iris * 0.35, CENTRE.x, CENTRE.y - 20, Math.max(1, iris));
  dark.addColorStop(0, 'rgba(0,0,0,0)');
  dark.addColorStop(1, 'rgba(0,0,0,0.96)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, W, H);
}

/** The darkness of the stomach once the light is gone, and a soft red throb of the wall at each kick. */
export function drawDark(ctx: CanvasRenderingContext2D, kick: number, glimmer: number): void {
  ctx.fillStyle = '#030102';
  ctx.fillRect(0, 0, W, H);
  dab(ctx, CENTRE.x, CENTRE.y - 20, 620, '80,18,20', 0.35 * glimmer + 0.35 * kick);
  if (kick > 0.02) {
    ctx.save();
    ctx.globalAlpha = kick * 0.5;
    ctx.strokeStyle = '#c04a40';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(CENTRE.x, CENTRE.y - 20, 420 + 120 * (1 - kick), 400 + 110 * (1 - kick), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** A dim warm rim light behind the beetle so its shape reads in the dark. */
export function drawRimGlow(ctx: CanvasRenderingContext2D, at: Pt, r: number, alpha: number): void {
  dab(ctx, at.x, at.y, r, '200,110,60', 0.35 * alpha);
  dab(ctx, at.x, at.y, r * 0.55, '255,170,100', 0.22 * alpha);
}

// ---------------------------------------------------------------- the X-ray

/** The gut, mouth to vent, in the frog's own units: gullet, stomach, the coiled intestine, the vent. */
const GUT_KEYS: readonly Pt[] = [
  { x: 150, y: -104 }, { x: 112, y: -100 }, { x: 74, y: -94 }, { x: 44, y: -88 }, { x: 20, y: -86 }, { x: -2, y: -80 }, { x: -14, y: -68 },
  { x: -8, y: -56 }, { x: -24, y: -48 }, { x: -44, y: -58 }, { x: -60, y: -70 }, { x: -76, y: -60 }, { x: -62, y: -46 }, { x: -82, y: -40 },
  { x: -100, y: -50 }, { x: -116, y: -44 }, { x: -128, y: -38 }, VENT,
];

/** Catmull-Rom through the keys, open, evenly resampled by length. */
export const GUT: readonly Pt[] = (() => {
  const pts: Pt[] = [];
  const k = GUT_KEYS;
  for (let i = 0; i < k.length - 1; i++) {
    const [p0, p1, p2, p3] = [k[Math.max(0, i - 1)]!, k[i]!, k[i + 1]!, k[Math.min(k.length - 1, i + 2)]!];
    for (let j = 0; j < 12; j++) {
      const s = j / 12;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
      pts.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  pts.push(VENT);
  return pts;
})();
const GUT_LEN = GUT.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - GUT[i]!.x, p.y - GUT[i]!.y), 0);

/** A point along the gut (0 the mouth .. 1 the vent) and the heading there. */
export function gutPoint(u: number): { readonly p: Pt; readonly a: number } {
  let left = Math.max(0, Math.min(1, u)) * GUT_LEN;
  for (let i = 1; i < GUT.length; i++) {
    const [a, b] = [GUT[i - 1]!, GUT[i]!];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d || i === GUT.length - 1) {
      const f = d > 0 ? Math.min(1, left / d) : 0;
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, a: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= d;
  }
  return { p: VENT, a: Math.PI };
}

/** The X-ray's backdrop, screen space: deep blue, a faint grid and scan lines. */
export function drawXrayBack(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#040a18');
  g.addColorStop(0.5, '#081a34');
  g.addColorStop(1, '#030812');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,200,255,0.06)';
  ctx.lineWidth = 2;
  for (let x = 30; x < W; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40; y < H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const scan = ((t * 260) % (H + 200)) - 100;
  const s = ctx.createLinearGradient(0, scan - 80, 0, scan + 80);
  s.addColorStop(0, 'rgba(140,220,255,0)');
  s.addColorStop(0.5, 'rgba(140,220,255,0.07)');
  s.addColorStop(1, 'rgba(140,220,255,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, scan - 80, W, 160);
  ctx.restore();
}

const BONES: readonly (readonly Pt[])[] = [
  // Skull, spine and the long hip bones (the frog's jumping frame).
  [{ x: 168, y: -116 }, { x: 140, y: -134 }, { x: 96, y: -140 }, { x: 62, y: -132 }],
  [{ x: 62, y: -128 }, { x: 30, y: -124 }, { x: -10, y: -116 }, { x: -50, y: -110 }],
  [{ x: -50, y: -110 }, { x: -84, y: -104 }, { x: -118, y: -70 }],
  [{ x: -50, y: -110 }, { x: -96, y: -86 }, { x: -122, y: -58 }],
  // Hind leg: femur, shin, the long ankle and toes.
  [{ x: -118, y: -60 }, { x: -60, y: -52 }, { x: -6, y: -32 }],
  [{ x: -6, y: -30 }, { x: -70, y: -18 }, { x: -138, y: -16 }],
  [{ x: -140, y: -12 }, { x: -110, y: -9 }, { x: -78, y: -6 }],
  [{ x: -78, y: -6 }, { x: -40, y: -8 }, { x: 0, y: -3 }],
  // Arm.
  [{ x: 46, y: -60 }, { x: 52, y: -34 }, { x: 74, y: -6 }],
  [{ x: 74, y: -6 }, { x: 98, y: -3 }],
];

/**
 * The whole frog in X-ray, in its own units (call inside the frog's
 * transform): a glowing see-through body, faint bones, the gut lit from the
 * mouth up to `upTo` (0 .. 1), brighter all over when `whole` is up.
 */
export function drawXrayFrog(ctx: CanvasRenderingContext2D, upTo: number, whole: number, boil: number): void {
  const body = [UPPER, LOWER, LIMBS.THIGH, LIMBS.SHIN, LIMBS.FOOT, LIMBS.ARM];
  ctx.save();
  for (const s of body) {
    ctx.fillStyle = `rgba(110,200,255,${0.1 + 0.08 * whole})`;
    path(ctx, s);
    ctx.fill();
  }
  dab(ctx, 0, -80, 200, '110,200,255', 0.1 + 0.15 * whole);
  for (const b of BONES) softLine(ctx, b, 7, '#cfeeff', 0.3 + 0.1 * whole, 3);
  // The eye socket.
  ctx.strokeStyle = 'rgba(200,240,255,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(110, -150, 16, 0, Math.PI * 2);
  ctx.stroke();
  for (const s of body) inkLine(ctx, s, 2.2 + 1.2 * whole, 0.7 + 0.3 * whole, boil, true, '#8fe0ff');
  // The gut: dim all along, glowing warm where the beetle has been.
  softLine(ctx, GUT, 12, '#5a7aa0', 0.5, 3);
  const n = Math.max(2, Math.round(GUT.length * Math.max(upTo, whole)));
  softLine(ctx, GUT.slice(0, n), 16, '#ffb24a', 0.55, 5);
  softLine(ctx, GUT.slice(0, n), 5, '#fff0c0', 0.9, 2);
  ctx.restore();
}

/** A soft pop of air at the vent as the beetle comes out. */
export function drawPop(ctx: CanvasRenderingContext2D, at: Pt, u: number): void {
  if (u <= 0 || u >= 1) return;
  const rng = seeded(9);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.6 + rng() * 0.8);
    const d = 6 + 34 * u;
    softLine(ctx, [{ x: at.x + Math.cos(a) * d * 0.5, y: at.y + Math.sin(a) * d * 0.5 }, { x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d }], 2.4, '#fff4d0', 0.8 * (1 - u), 2);
  }
}

// ---------------------------------------------------------------- the stopwatch

/** A stopwatch at (x, y), radius r, its hand at `minutes` on a 30-minute dial. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, minutes: number, boil: number): void {
  ctx.save();
  // Crown and button.
  ctx.fillStyle = '#c8c0a8';
  ctx.fillRect(x - r * 0.12, y - r * 1.25, r * 0.24, r * 0.2);
  ctx.fillRect(x - r * 0.2, y - r * 1.32, r * 0.4, r * 0.1);
  const rim = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r * 1.08);
  rim.addColorStop(0, '#f2ead2');
  rim.addColorStop(0.8, '#b8ae90');
  rim.addColorStop(1, '#6a6450');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
  ctx.fill();
  const face = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
  face.addColorStop(0, '#fffdf4');
  face.addColorStop(1, '#e6dcc2');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.fill();
  // Ticks, every minute, longer every five.
  ctx.strokeStyle = '#2a2620';
  for (let i = 0; i < 30; i++) {
    const a = -Math.PI / 2 + (i / 30) * Math.PI * 2;
    const long = i % 5 === 0;
    ctx.lineWidth = long ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * (long ? 0.7 : 0.78), y + Math.sin(a) * r * (long ? 0.7 : 0.78));
    ctx.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  // The swept wedge and the hand.
  const end = -Math.PI / 2 + (minutes / 30) * Math.PI * 2;
  ctx.fillStyle = 'rgba(208,42,31,0.22)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.84, -Math.PI / 2, end);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d02a1f';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(end) * r * 0.14, y - Math.sin(end) * r * 0.14);
  ctx.lineTo(x + Math.cos(end) * r * 0.8, y + Math.sin(end) * r * 0.8);
  ctx.stroke();
  ctx.fillStyle = '#2a2620';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  inkLine(ctx, smoothLoop(Array.from({ length: 16 }, (_, i) => ({ x: x + Math.cos((i / 16) * Math.PI * 2) * r * 1.08, y: y + Math.sin((i / 16) * Math.PI * 2) * r * 1.08 })), 3), 3, 0.85, boil, true);
}
