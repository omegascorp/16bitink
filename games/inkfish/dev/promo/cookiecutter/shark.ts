import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { SharkPose } from './story';

/**
 * The cookiecutter shark in the game's pen, painted: a cigar of a body,
 * chocolate brown above and pale below, a short blunt snout, huge green eyes,
 * the dark collar round its throat, two little dorsal fins set far back, a
 * broad tail, fleshy suction lips and a row of big triangular lower teeth.
 * Its belly glows green-blue (it's bioluminescent; the collar doesn't).
 *
 * Drawn in its own frame, 1000 units nose to tail (nose at +500, back up),
 * then placed by its pose. Turning it about its long axis (`roll`) swings its
 * fins and its shading round, for the spin.
 */

const BACK = [64, 48, 40] as const;
const FLANK = [116, 98, 84] as const;
const BELLY = [196, 188, 170] as const;
const COLLAR = '#20150f';
const FIN = '#4e3a30';
const GLOW = '#7af5d6';
const LIP = '#a18a7c';
const LIP_DARK = '#4a332b';
const TOOTH = '#f2ede2';
const IRIS = '#7fc46a';

const mix = (a: readonly number[], b: readonly number[], u: number): string =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * u)).join(',')})`;

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// ---------------------------------------------------------------- the shape

const TAIL_ROOT = -330;
const NOSE = 500;
const MAX_H = 104;
const ROOT_H = 26;
/** Where the blunt, rounded snout begins (units). */
const SNOUT = 350;

/** Half the body's height at x (units): a stubby cigar, thickest behind the head, a short rounded snout. */
export function halfHeight(x: number): number {
  if (x <= TAIL_ROOT) return ROOT_H;
  if (x < 60) return ROOT_H + (MAX_H * 0.94 - ROOT_H) * Math.sin((Math.PI / 2) * ((x - TAIL_ROOT) / (60 - TAIL_ROOT))) ** 0.85;
  if (x < SNOUT) return MAX_H * (0.94 + 0.06 * Math.sin((Math.PI / 2) * ((x - 60) / (SNOUT - 60))));
  const w = (x - SNOUT) / (NOSE - SNOUT);
  return MAX_H * Math.max(0, 1 - w ** 2.3) ** 0.55;
}

/** The body's outline: along the back from the tail root to the nose, back under the belly. */
const BODY: readonly Pt[] = [
  ...range(40, (u) => {
    const x = TAIL_ROOT + u * (NOSE - TAIL_ROOT);
    return { x, y: -halfHeight(x) };
  }),
  ...range(40, (u) => {
    const x = NOSE - u * (NOSE - TAIL_ROOT);
    return { x, y: halfHeight(x) * 0.96 };
  }),
];

/** The tail: a broad, nearly even fork, the lower lobe big. */
const TAIL: readonly Pt[] = [
  { x: TAIL_ROOT + 16, y: -25 }, { x: -380, y: -60 }, { x: -436, y: -104 }, { x: -480, y: -138 }, { x: -500, y: -140 }, { x: -492, y: -104 }, { x: -470, y: -56 },
  { x: -448, y: -14 }, { x: -464, y: 30 }, { x: -486, y: 78 }, { x: -500, y: 112 }, { x: -484, y: 116 }, { x: -440, y: 86 }, { x: -388, y: 50 }, { x: TAIL_ROOT + 16, y: 25 },
];

interface FinSpec {
  /** Base along the body (units), and the tip (x, how far out from the body). */
  readonly from: number;
  readonly to: number;
  readonly tip: { readonly x: number; readonly out: number };
  /** Where round the body it grows from: 0 the back, π the belly; plus is our side at roll 0. */
  readonly around: number;
}

const FINS: readonly FinSpec[] = [
  { from: -20, to: -138, tip: { x: -132, out: 66 }, around: 0 },
  { from: -186, to: -280, tip: { x: -276, out: 56 }, around: 0 },
  { from: -110, to: -200, tip: { x: -204, out: 44 }, around: Math.PI },
  { from: 268, to: 200, tip: { x: 150, out: 92 }, around: 2.3 },
  { from: 268, to: 200, tip: { x: 150, out: 92 }, around: -2.3 },
];

/** A fin's outline, turned with the body: its base on the body's edge where `around` is, its tip further out the same way. */
function finOutline(f: FinSpec, roll: number): Pt[] {
  const c = Math.cos(f.around + roll);
  const baseAt = (x: number): number => -halfHeight(x) * c;
  const tipH = halfHeight(f.tip.x) + f.tip.out;
  const tipY = -tipH * c;
  // A rounded fin: the leading edge bowed out, a soft round tip, the trailing edge curving back in.
  const a = { x: f.from, y: baseAt(f.from) };
  const b = { x: f.to, y: baseAt(f.to) };
  const tip = { x: f.tip.x, y: tipY };
  const lead = (u: number): Pt => ({ x: a.x + (tip.x - a.x) * u + 10 * Math.sin(Math.PI * u), y: a.y + (tip.y - a.y) * (u ** 0.8) });
  const trail = (u: number): Pt => ({ x: tip.x + (b.x - tip.x) * u - 6 * Math.sin(Math.PI * u), y: tip.y + (b.y - tip.y) * (u ** 1.3) });
  return [...range(6, lead), { x: tip.x - 8, y: tip.y + Math.sign(tip.y - a.y || 1) * 4 }, ...range(6, trail)];
}

/** Which side of the body a point at `around` faces: positive towards us. */
const facing = (around: number, roll: number): number => Math.sin(around + roll);

// ---------------------------------------------------------------- painting

/** Soft blotches fixed to the body, like a wash drying unevenly. */
const MOTTLE = (() => {
  const rng = createRng(1971);
  return Array.from({ length: 60 }, () => ({ x: TAIL_ROOT + rng() * (NOSE - TAIL_ROOT), y: (rng() - 0.5) * 2 * MAX_H, r: 20 + rng() * 46, light: rng() < 0.45, a: 0.08 + rng() * 0.12 }));
})();

function pathOf(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The body's wash: dark back, flank, pale belly, swung round by the roll. */
function paintBody(ctx: CanvasRenderingContext2D, pen: Pen, roll: number, px: number): void {
  const c = Math.cos(roll);
  const top = mix(BELLY, BACK, (1 + c) / 2);
  const bottom = mix(BACK, BELLY, (1 + c) / 2);
  const g = ctx.createLinearGradient(0, -MAX_H, 0, MAX_H);
  g.addColorStop(0, top);
  g.addColorStop(0.42, mix(FLANK, BACK, 0.25 + 0.25 * c));
  g.addColorStop(0.62, mix(FLANK, BELLY, 0.3 - 0.3 * c));
  g.addColorStop(1, bottom);
  ctx.save();
  pathOf(ctx, BODY);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  for (const m of MOTTLE) {
    const blot = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    blot.addColorStop(0, m.light ? `rgba(220,206,186,${m.a.toFixed(3)})` : `rgba(20,12,8,${m.a.toFixed(3)})`);
    blot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blot;
    ctx.fillRect(m.x - m.r, m.y - m.r, 2 * m.r, 2 * m.r);
  }
  // A wet sheen along the back.
  ctx.strokeStyle = 'rgba(236,226,206,0.16)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -220; x <= 420; x += 20) {
    const y = -halfHeight(x) * 0.68 * c;
    if (x === -220) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  // Hatching under the belly, on the shadowed side.
  const shade = [{ x: TAIL_ROOT, y: MAX_H * 0.45 }, { x: NOSE, y: MAX_H * 0.45 }, { x: NOSE, y: MAX_H * 1.2 }, { x: TAIL_ROOT, y: MAX_H * 1.2 }];
  pen.clipped(BODY, () => pen.hatch(shade, 9, 1.1, 1.1 / px, { color: '#120a06', alpha: 0.3 }));
  // Fine freckles.
  pen.stipple(BODY, 160, (x, y) => (y < MAX_H * 0.3 && x < 380 ? 0.4 : 0.05), 1.7, '#2a1c14');
}

/** The dark collar round the throat, behind the gills, on the side towards the belly. */
function paintCollar(ctx: CanvasRenderingContext2D, roll: number, glow: number): void {
  const c = Math.cos(roll);
  ctx.save();
  pathOf(ctx, BODY);
  ctx.clip();
  // A band round the throat, from the belly up the flank, its upper end rounding off.
  const side = c >= 0 ? 1 : -1;
  const band = [
    { x: 262, y: side * MAX_H * 1.1 }, { x: 266, y: side * MAX_H * 0.5 }, { x: 278, y: side * MAX_H * 0.12 }, { x: 300, y: -side * MAX_H * 0.04 },
    { x: 324, y: side * MAX_H * 0.06 }, { x: 338, y: side * MAX_H * 0.4 }, { x: 344, y: side * MAX_H * 1.1 },
  ];
  ctx.filter = 'blur(2px)';
  // Fading out up the flank.
  const fade = ctx.createLinearGradient(0, -side * MAX_H * 0.1, 0, side * MAX_H * 0.6);
  fade.addColorStop(0, 'rgba(32,21,15,0)');
  fade.addColorStop(1, COLLAR);
  ctx.fillStyle = fade;
  ctx.globalAlpha = (0.78 + 0.2 * glow) * Math.min(1, 0.3 + Math.abs(c));
  pathOf(ctx, band);
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

/** The glowing belly: a soft green-blue light along the underside (not the collar), and its halo in the water. */
function paintGlow(ctx: CanvasRenderingContext2D, roll: number, glow: number, px: number): void {
  if (glow <= 0.01) return;
  const c = Math.cos(roll);
  const side = c >= 0 ? 1 : -1;
  const belly = [
    ...range(24, (u) => {
      const x = -300 + u * 520;
      return { x, y: side * halfHeight(x) * 0.15 };
    }),
    ...range(24, (u) => {
      const x = 220 - u * 520;
      return { x, y: side * halfHeight(x) * 1.02 };
    }),
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // The halo under it.
  ctx.globalAlpha = 0.5 * glow * Math.max(0.35, Math.abs(c));
  const halo = ctx.createRadialGradient(-40, side * 80, 10, -40, side * 80, 420);
  halo.addColorStop(0, 'rgba(110,240,210,0.55)');
  halo.addColorStop(1, 'rgba(110,240,210,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-480, side * 80 - 420, 960, 840);
  // The belly itself, soft at its upper edge, the collar dark across it.
  pathOf(ctx, belly);
  ctx.clip();
  const g = ctx.createLinearGradient(0, side * halfHeight(0) * 0.15, 0, side * halfHeight(0));
  g.addColorStop(0, 'rgba(122,245,214,0)');
  g.addColorStop(0.5, 'rgba(122,245,214,0.5)');
  g.addColorStop(1, 'rgba(180,255,236,0.9)');
  ctx.globalAlpha = glow * Math.max(0.4, Math.abs(c));
  ctx.fillStyle = g;
  ctx.fillRect(-320, -MAX_H * 1.2, 560, MAX_H * 2.4);
  // Specks of light: the photophores.
  const rng = createRng(77);
  ctx.fillStyle = '#d8fff4';
  for (let i = 0; i < 70; i++) {
    const x = -300 + rng() * 520;
    const y = side * halfHeight(x) * (0.45 + rng() * 0.5);
    ctx.globalAlpha = glow * (0.35 + rng() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, (1.4 + rng() * 1.6) / Math.max(0.5, px * 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintFin(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], ink: number): void {
  ctx.save();
  pathOf(ctx, outline);
  const g = ctx.createLinearGradient(outline[0]!.x, outline[0]!.y, outline[2]!.x, outline[2]!.y);
  g.addColorStop(0, FIN);
  g.addColorStop(1, '#7b6656');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.stroke([...outline], ink, INK, 0.95, true);
}

function paintTail(ctx: CanvasRenderingContext2D, pen: Pen, beat: number, effort: number, ink: number): void {
  // Beating side to side, seen side on: the tail turns towards and away from us, narrowing.
  const squeeze = 1 - (0.12 + 0.2 * effort) * (0.5 + 0.5 * Math.sin(beat));
  const tail = TAIL.map((p) => ({ x: TAIL_ROOT + (p.x - TAIL_ROOT) * squeeze, y: p.y * (0.96 + 0.04 * Math.cos(beat)) }));
  ctx.save();
  pathOf(ctx, tail);
  const g = ctx.createLinearGradient(-500, -120, -500, 100);
  g.addColorStop(0, mix(BACK, FLANK, 0.2));
  g.addColorStop(0.5, mix(FLANK, BACK, 0.3));
  g.addColorStop(1, mix(BACK, FLANK, 0.4));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Its trailing edge darker, as on the real thing.
  ctx.strokeStyle = 'rgba(20,12,8,0.55)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  tail.slice(2, 11).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
  pen.stroke([...tail, tail[0]!], ink, INK, 1, true);
}

/** The eye: big and green, a lid pressed down over it for the mood. */
function paintEye(ctx: CanvasRenderingContext2D, pen: Pen, p: Pt, mood: SharkPose['eye'], ink: number): void {
  const r = 34;
  if (mood === 'wink') {
    // Shut tight in a happy curve, the cheek pushed up under it.
    pen.stroke(range(10, (u) => ({ x: p.x - r * 1.05 + u * r * 2.1, y: p.y + 6 - Math.sin(Math.PI * u) * r * 0.6 })), ink * 1.6, INK);
    pen.stroke(range(6, (u) => ({ x: p.x - r * 0.7 + u * r * 1.4, y: p.y + r * 0.62 - Math.sin(Math.PI * u) * r * 0.22 })), ink * 0.8, INK, 0.7);
    pen.stroke([{ x: p.x - r * 1.0, y: p.y - r * 1.15 }, { x: p.x, y: p.y - r * 1.5 }, { x: p.x + r * 1.0, y: p.y - r * 1.25 }], ink * 1.1, INK, 0.9);
    return;
  }
  const open = mood === 'wide' ? 1 : mood === 'squint' ? 0.42 : mood === 'smug' ? 0.5 : 0.86;
  const rx = r * 1.06;
  const ry = mood === 'wide' ? r * 1.1 : r;
  /** The lid's edge: the top of the eye pressed down to `open`, slanting for cheek or for determination. */
  const slant = mood === 'smug' ? 0.18 : mood === 'squint' ? -0.22 : 0;
  const lidY = (x: number): number => p.y - ry + 2 * ry * (1 - open) + (x - p.x) * slant;
  const lid = range(12, (u) => {
    const x = p.x - rx * 1.2 + u * rx * 2.4;
    return { x, y: lidY(x) };
  });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  // Below the lid only.
  ctx.beginPath();
  lid.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.lineTo(p.x + rx * 1.3, p.y + ry * 1.3);
  ctx.lineTo(p.x - rx * 1.3, p.y + ry * 1.3);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createRadialGradient(p.x + 6, p.y + 4, 2, p.x + 4, p.y, rx);
  g.addColorStop(0, '#e2f6be');
  g.addColorStop(0.45, IRIS);
  g.addColorStop(1, '#1f4220');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - rx * 1.2, p.y - ry * 1.2, rx * 2.4, ry * 2.4);
  const pupil = mood === 'wide' ? 0.3 : 0.46;
  ctx.fillStyle = '#060806';
  ctx.beginPath();
  ctx.ellipse(p.x + 6, p.y + 2, r * pupil * 0.78, r * pupil, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(250,255,240,0.95)';
  ctx.beginPath();
  ctx.arc(p.x - r * 0.22, p.y - r * 0.32 + r * (1 - open) * 1.2, r * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The ink round the visible eye and along the lid.
  pen.stroke(range(10, (u) => ({ x: p.x + rx * Math.cos(Math.PI * u * 1), y: p.y + ry * Math.sin(Math.PI * u) })), ink, INK, 0.95, false);
  if (open < 0.95) pen.stroke(lid.slice(2, 11), ink * 1.4, INK);
  else pen.stroke(range(10, (u) => ({ x: p.x - rx * Math.cos(Math.PI * u), y: p.y - ry * Math.sin(Math.PI * u) })), ink, INK, 0.95, false);
  // The brow: raised for surprise, slanted down for determination or cheek.
  const brow = mood === 'wide' ? -r * 1.75 : -r * 1.4;
  const tilt = mood === 'squint' ? 10 : mood === 'smug' ? -6 : 0;
  pen.stroke([{ x: p.x - r * 1.05, y: p.y + brow + tilt }, { x: p.x, y: p.y + brow - 6 }, { x: p.x + r * 1.05, y: p.y + brow - tilt }], ink * 1.2, INK, 0.9);
}

/** The mouth: a line under the snout, or a toothy grin, the big lower teeth showing. */
function paintMouth(ctx: CanvasRenderingContext2D, pen: Pen, grin: number, ink: number): void {
  const lift = 26 * grin;
  const line = range(10, (u) => ({ x: 476 - u * 112, y: 48 - 4 * Math.sin(Math.PI * u) - lift * u ** 2 }));
  if (grin > 0.05) {
    const below = line.map((p, i) => ({ x: p.x, y: p.y + (14 + 8 * Math.sin((Math.PI * i) / 10)) * grin }));
    const shape = [...line, ...[...below].reverse()];
    ctx.save();
    pathOf(ctx, shape);
    ctx.fillStyle = '#2a1512';
    ctx.fill();
    ctx.clip();
    // The row of big triangular lower teeth.
    ctx.fillStyle = TOOTH;
    for (let i = 0; i < 9; i++) {
      const a = below[i]!;
      const b = below[i + 1]!;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 2);
      ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 18 * grin);
      ctx.lineTo(b.x, b.y + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    pen.stroke(below, ink * 0.8, INK, 0.9);
  }
  pen.stroke(line, ink, INK, 0.95);
}

/** The suction lips at the front of the snout, flaring as they seal; the rubber plug held in them. */
function paintLips(ctx: CanvasRenderingContext2D, pen: Pen, lips: number, plug: number, ink: number): void {
  if (lips <= 0.02 && plug <= 0) return;
  const c = { x: NOSE - 8 + 10 * lips, y: 26 };
  const rx = 12 + 12 * lips;
  const ry = 30 + 34 * lips;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(c.x - rx, 0, c.x + rx, 0);
  g.addColorStop(0, LIP_DARK);
  g.addColorStop(0.5, LIP);
  g.addColorStop(1, '#c9b5a6');
  ctx.fillStyle = g;
  ctx.globalAlpha = Math.max(lips, plug > 0 ? 0.8 : 0);
  ctx.fill();
  ctx.restore();
  pen.stroke(range(16, (u) => ({ x: c.x + rx * Math.cos(Math.PI * 2 * u), y: c.y + ry * Math.sin(Math.PI * 2 * u) })), ink * 0.9, INK, 0.9, false);
  // Puckered as it sucks: creases running in towards the mouth.
  if (lips > 0.6) {
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      pen.hair([
        { x: c.x + rx * 0.95 * Math.cos(a), y: c.y + ry * 0.95 * Math.sin(a) },
        { x: c.x + rx * 0.45 * Math.cos(a + 0.15), y: c.y + ry * 0.45 * Math.sin(a + 0.15) },
      ], ink * 0.5, LIP_DARK, 0.75 * (lips - 0.6) / 0.4);
    }
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#2a1714';
    ctx.beginPath();
    ctx.ellipse(c.x + 2, c.y, rx * 0.28, ry * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The lip's fleshy rim.
  pen.hair(range(10, (u) => ({ x: c.x + rx * 0.55 * Math.cos(-Math.PI / 2 + Math.PI * u), y: c.y + ry * 0.75 * Math.sin(-Math.PI / 2 + Math.PI * u) })), ink * 0.6, LIP_DARK, 0.7);
  if (plug > 0) {
    // A round plug of black rubber, seen edge-on, held in the lips.
    const p = { x: c.x + rx + 12, y: c.y };
    ctx.save();
    ctx.globalAlpha = plug;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 16, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#121619';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + 5, p.y, 9, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2b343a';
    ctx.fill();
    ctx.restore();
    pen.stroke(range(14, (u) => ({ x: p.x + 16 * Math.cos(Math.PI * 2 * u), y: p.y + ry * 0.95 * Math.sin(Math.PI * 2 * u) })), ink * 0.8, INK, 0.9, false);
  }
}

/** Speed rings round the spinning body: chalk arcs on the near side, as if it were a drill. */
function paintWhirl(ctx: CanvasRenderingContext2D, whirl: number, roll: number, px: number): void {
  if (whirl <= 0.02) return;
  ctx.save();
  ctx.strokeStyle = '#eef3ee';
  ctx.lineCap = 'round';
  for (const [i, x] of [-200, -60, 80, 220, 350].entries()) {
    const h = halfHeight(x) * 1.25;
    const w = 26 + 0.12 * h;
    const spin = (roll * 0.5 + i * 0.9) % (Math.PI * 2);
    ctx.globalAlpha = 0.75 * whirl;
    ctx.lineWidth = 4.5 / px;
    ctx.beginPath();
    ctx.ellipse(x, 0, w, h, 0, -Math.PI / 2 + 0.25, Math.PI / 2 - 0.25);
    ctx.stroke();
    // An arrowhead riding round each ring.
    const a = -Math.PI / 2 + 0.3 + ((spin / (Math.PI * 2)) % 1) * (Math.PI - 0.6);
    const tip = { x: x + w * Math.cos(a), y: h * Math.sin(a) };
    ctx.beginPath();
    ctx.moveTo(tip.x - 10, tip.y - 14);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x + 12, tip.y - 10);
    ctx.stroke();
  }
  // Streaks off the back and belly.
  ctx.globalAlpha = 0.5 * whirl;
  ctx.lineWidth = 3 / px;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = -250 + k * 150;
      const y = side * (halfHeight(x) + 26 + k * 4);
      ctx.beginPath();
      ctx.moveTo(x - 50, y + side * 8);
      ctx.quadraticCurveTo(x, y + side * 20, x + 60, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Into the shark's own frame (1000 units nose to tail, nose at +500, back up). */
function enterShark(ctx: CanvasRenderingContext2D, p: SharkPose): void {
  const k = p.len / 1000;
  ctx.translate(p.nose.x, p.nose.y);
  ctx.rotate(p.angle);
  ctx.scale(k, k);
  ctx.translate(-NOSE, 0);
  // Facing left on screen would put its back down: keep the back up.
  if (Math.cos(p.angle) < 0) ctx.scale(1, -1);
}

/** A point of the shark's own frame on screen. */
export function onShark(p: SharkPose, local: Pt): Pt {
  const k = p.len / 1000;
  const flip = Math.cos(p.angle) < 0 ? -1 : 1;
  const x = (local.x - NOSE) * k;
  const y = local.y * k * flip;
  return { x: p.nose.x + x * Math.cos(p.angle) - y * Math.sin(p.angle), y: p.nose.y + x * Math.sin(p.angle) + y * Math.cos(p.angle) };
}

/** Where its eye is on screen. */
export const eyeOf = (p: SharkPose): Pt => onShark(p, { x: 404, y: -30 * Math.cos(p.roll) });

/** Just the belly's glow and the eye's shine, added over a picture whose lights have gone down. */
export function drawSharkGlow(ctx: CanvasRenderingContext2D, p: SharkPose, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  enterShark(ctx, p);
  paintGlow(ctx, p.roll, p.glow * strength, p.len / 1000);
  ctx.globalCompositeOperation = 'lighter';
  const eye = { x: 404, y: -30 * Math.cos(p.roll) };
  const g = ctx.createRadialGradient(eye.x, eye.y, 2, eye.x, eye.y, 40);
  g.addColorStop(0, `rgba(170,240,140,${(0.55 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(170,240,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(eye.x - 40, eye.y - 40, 80, 80);
  ctx.restore();
}

/** Draws the shark at its pose. `boil` is the line-boil frame. */
export function drawShark(ctx: CanvasRenderingContext2D, p: SharkPose, boil: number): void {
  const k = p.len / 1000;
  /** Screen px per unit: lines are given in screen px and divided by it. */
  const px = k;
  const pen = new Pen(ctx, 4401 + boil * 613, 1.3 / Math.max(0.2, k));
  const ink = 3.4 / Math.max(0.25, k) * Math.min(1, 0.55 + k * 0.6);
  ctx.save();
  enterShark(ctx, p);

  const behind = FINS.filter((f) => facing(f.around, p.roll) < 0);
  const front = FINS.filter((f) => facing(f.around, p.roll) >= 0);
  for (const f of behind) paintFin(ctx, pen, finOutline(f, p.roll), ink * 0.8);
  paintTail(ctx, pen, p.beat, p.effort, ink);
  paintBody(ctx, pen, p.roll, px);
  paintCollar(ctx, p.roll, p.glow);
  paintGlow(ctx, p.roll, p.glow, px);
  pen.stroke([...BODY, BODY[0]!], ink, INK, 1, true);

  const c = Math.cos(p.roll);
  // Gill slits and the eye, on whichever side is towards us.
  if (Math.abs(c) > 0.25) {
    const sideY = (y: number): number => y * Math.sign(c);
    for (let i = 0; i < 5; i++) {
      const x = 286 + i * 15;
      pen.hair([{ x, y: sideY(10) }, { x: x + 4, y: sideY(34) }, { x: x + 1, y: sideY(52) }], ink * 0.55, INK, 0.75);
    }
    paintEye(ctx, pen, { x: 404, y: -30 * c }, c > 0 ? p.eye : 'open', ink * 0.8);
  }
  for (const f of front) paintFin(ctx, pen, finOutline(f, p.roll), ink * 0.8);
  if (Math.abs(c) > 0.5 && c > 0) paintMouth(ctx, pen, p.grin, ink * 0.75);
  paintLips(ctx, pen, p.lips, p.plug, ink);
  paintWhirl(ctx, p.whirl, p.roll, px);
  ctx.restore();
}
