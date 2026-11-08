import { blob, hash, ink, lin, type Pt, smoothClosed } from './draw';
import { brow, eye, hatch, LW, mouth, type Mood, nose, shirt, SKIN_INK } from './faceParts';

/**
 * The three crew, painted as men of 1967 with the same washes and thin ink as
 * the animals: natural proportions, a skin wash with light and shadow, hair of
 * the day (a side parting, a crew cut, a receding grey with horn-rims), plain
 * work shirts. `shock` and `joy` blend between a calm look, a gasp and a grin.
 */

type Hair = 'side' | 'crew' | 'receding';

export interface Crew {
  readonly skin: readonly [string, string, string];
  readonly hair: string;
  readonly hairLight: string;
  readonly style: Hair;
  readonly glasses: boolean;
  readonly iris: string;
  readonly shirt: readonly [string, string];
  /** How far the head's turned, -1 .. 1. */
  readonly turn: number;
  readonly lip: string;
  /** Shadow of a day's beard, 0 .. 1. */
  readonly stubble: number;
}

export const CREW: readonly Crew[] = [
  { skin: ['#f0c8a4', '#d59a72', '#8a5236'], hair: '#2c1d14', hairLight: '#6b4a30', style: 'side', glasses: false, iris: '#47586a', shirt: ['#7f9ab4', '#3f5a78'], turn: 0.42, lip: '#9c5a48', stubble: 0.35 },
  { skin: ['#e8bb92', '#c8875e', '#7c4830'], hair: '#7d7468', hairLight: '#c0b8aa', style: 'receding', glasses: true, iris: '#4c4030', shirt: ['#cfc2a0', '#8c7e5c'], turn: 0.06, lip: '#935244', stubble: 0.15 },
  { skin: ['#f3cfae', '#dca47c', '#94593a'], hair: '#8d5d2c', hairLight: '#d0a262', style: 'crew', glasses: false, iris: '#4e6a58', shirt: ['#d9d8cf', '#8e96a0'], turn: -0.36, lip: '#a4604c', stubble: 0.1 },
];

export interface FaceLook {
  readonly shock: number;
  readonly joy: number;
  /** Looks to one side, -1 .. 1. */
  readonly gaze?: number;
  /** Eyes shut for a blink, 0 .. 1. */
  readonly blink?: number;
}

function headShape(jaw: number): Pt[] {
  return [
    { x: 0, y: -1.32 }, { x: 0.68, y: -1.16 }, { x: 0.93, y: -0.62 }, { x: 0.97, y: -0.06 }, { x: 0.86, y: 0.2 }, { x: 0.84, y: 0.62 }, { x: 0.68, y: 1.04 + jaw * 0.5 }, { x: 0.42, y: 1.38 + jaw }, { x: 0.14, y: 1.5 + jaw }, { x: -0.14, y: 1.5 + jaw },
    { x: -0.42, y: 1.38 + jaw }, { x: -0.68, y: 1.04 + jaw * 0.5 }, { x: -0.84, y: 0.62 }, { x: -0.86, y: 0.2 }, { x: -0.97, y: -0.06 }, { x: -0.93, y: -0.62 }, { x: -0.68, y: -1.16 },
  ];
}

function ear(ctx: CanvasRenderingContext2D, side: number, who: Crew): void {
  ctx.beginPath();
  ctx.ellipse(side * 0.93, 0.14, 0.13, 0.29, side * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = lin(ctx, 0, -0.2, 0, 0.5, [[0, who.skin[1]], [1, who.skin[2]]]);
  ctx.fill();
  ctx.strokeStyle = SKIN_INK;
  ctx.lineWidth = LW * 0.9;
  ctx.stroke();
  ink(ctx, [{ x: side * 0.94, y: 0 }, { x: side * 1, y: 0.14 }, { x: side * 0.94, y: 0.3 }], LW * 0.6, SKIN_INK, 0.5);
}

/** Skin washes, clipped to the head: light from the left and above, planes of shadow, warm cheeks, a day's beard. */
function washes(ctx: CanvasRenderingContext2D, who: Crew, fx: number, m: Mood): void {
  blob(ctx, -0.34, -0.72, 0.8, 0.5, 0, '255,240,222', 0.7);
  blob(ctx, 1, 0.3, 0.72, 1.6, 0, who.skin[2] === '#8a5236' ? '110,62,40' : '120,70,46', 0.6);
  blob(ctx, 0.1, 1.38, 1.1, 0.42, 0, '110,62,40', 0.42);
  for (const s of [-1, 1]) {
    blob(ctx, s * 0.42 + fx, -0.02, 0.36, 0.2, 0, '120,70,50', 0.34);
    blob(ctx, s * 0.56 + fx * 0.5, 0.5 - m.joy * 0.08, 0.34, 0.26, 0, '226,120,92', 0.28 + 0.16 * m.joy);
  }
  if (who.stubble > 0) {
    ctx.save();
    ctx.globalAlpha = who.stubble;
    blob(ctx, fx, 1.06, 0.85, 0.42, 0, '70,62,66', 0.75);
    blob(ctx, fx, 0.66, 0.4, 0.1, 0, '70,62,66', 0.55);
    ctx.restore();
  }
  // Thin pen lines over the wash, as on the animals: hatching down the shadow side and the sockets, the cheekbone, the crease of a working face.
  const shadow = who.turn >= 0 ? 1 : -1;
  hatch(ctx, shadow * 0.58, -0.5, 11, { x: shadow * 0.012, y: 0.15 }, { x: shadow * 0.34, y: 0.1 }, 0.2);
  hatch(ctx, -0.32, 1.26, 9, { x: 0.09, y: 0.01 }, { x: 0.04, y: 0.13 }, 0.2);
  for (const s of [-1, 1]) {
    hatch(ctx, s * 0.25 + fx, -0.24, 5, { x: s * 0.06, y: -0.012 }, { x: s * 0.03, y: 0.11 }, 0.2);
    ink(ctx, [{ x: s * 0.72 + fx * 0.6, y: 0.22 }, { x: s * 0.5 + fx, y: 0.38 }], LW * 0.5, SKIN_INK, 0.2);
    ink(ctx, [{ x: s * 0.26 + fx * 1.2, y: 0.5 }, { x: s * 0.42 + fx, y: 0.76 }], LW * 0.55, SKIN_INK, 0.34);
    ink(ctx, [{ x: s * 0.2 + fx, y: 0.17 }, { x: s * 0.44 + fx, y: 0.21 }, { x: s * 0.66 + fx, y: 0.14 }], LW * 0.45, SKIN_INK, 0.3);
  }
  ink(ctx, [{ x: fx - 0.11, y: 1.22 }, { x: fx, y: 1.25 }, { x: fx + 0.11, y: 1.22 }], LW * 0.5, SKIN_INK, 0.35);
  if (m.shock > 0.4) for (const y of [-0.76, -0.64]) ink(ctx, [{ x: -0.42 + fx, y: y + 0.02 }, { x: fx, y }, { x: 0.42 + fx, y: y + 0.02 }], LW * 0.6, SKIN_INK, 0.35 * m.shock);
}

function hairSide(ctx: CanvasRenderingContext2D, who: Crew): void {
  const mass: Pt[] = [{ x: -1.02, y: -0.28 }, { x: -1.08, y: -0.86 }, { x: -0.74, y: -1.36 }, { x: -0.1, y: -1.56 }, { x: 0.64, y: -1.46 }, { x: 1.06, y: -0.98 }, { x: 1.03, y: -0.3 }, { x: 0.88, y: -0.62 }, { x: 0.68, y: -0.92 }, { x: 0.1, y: -1.02 }, { x: -0.46, y: -0.98 }, { x: -0.78, y: -0.82 }, { x: -0.9, y: -0.46 }];
  smoothClosed(ctx, mass);
  ctx.fillStyle = lin(ctx, -1, -1.5, 1, -0.4, [[0, who.hairLight], [0.45, who.hair], [1, who.hair]]);
  ctx.fill();
  ink(ctx, mass, LW * 0.9, SKIN_INK, 0.8, true);
  for (let i = 0; i < 12; i++) ink(ctx, [{ x: -0.62 + i * 0.03, y: -1.08 - i * 0.012 }, { x: -0.1 + i * 0.1, y: -1.42 + i * 0.02 }, { x: 0.3 + i * 0.07, y: -1.26 + i * 0.03 }], LW * 0.45, who.hairLight, 0.34);
  ink(ctx, [{ x: -0.62, y: -0.96 }, { x: -0.56, y: -1.2 }, { x: -0.48, y: -1.42 }], LW * 0.8, SKIN_INK, 0.55);
}

function hairCrew(ctx: CanvasRenderingContext2D, who: Crew): void {
  const mass: Pt[] = [{ x: -1, y: -0.42 }, { x: -1.04, y: -0.98 }, { x: -0.72, y: -1.42 }, { x: 0, y: -1.52 }, { x: 0.72, y: -1.42 }, { x: 1.04, y: -0.98 }, { x: 1, y: -0.42 }, { x: 0.88, y: -0.84 }, { x: 0.44, y: -1.06 }, { x: -0.44, y: -1.06 }, { x: -0.88, y: -0.84 }];
  smoothClosed(ctx, mass);
  ctx.fillStyle = lin(ctx, -0.8, -1.5, 0.9, -0.5, [[0, who.hairLight], [1, who.hair]]);
  ctx.fill();
  ink(ctx, mass, LW * 0.8, SKIN_INK, 0.7, true);
  for (let i = 0; i < 44; i++) {
    const [x, y] = [-0.92 + hash(i) * 1.84, -1.42 + hash(i + 50) * 0.42];
    ink(ctx, [{ x, y: y + 0.09 }, { x: x * 1.04, y }], LW * 0.5, i % 2 ? who.hairLight : SKIN_INK, 0.42);
  }
}

function hairReceding(ctx: CanvasRenderingContext2D, who: Crew): void {
  for (const s of [-1, 1]) {
    const mass: Pt[] = [{ x: s * 1.02, y: 0 }, { x: s * 1.08, y: -0.62 }, { x: s * 0.84, y: -1.16 }, { x: s * 0.46, y: -1.36 }, { x: s * 0.6, y: -1.04 }, { x: s * 0.84, y: -0.74 }, { x: s * 0.9, y: -0.24 }];
    smoothClosed(ctx, mass);
    ctx.fillStyle = lin(ctx, 0, -1.3, 0, 0, [[0, who.hairLight], [1, who.hair]]);
    ctx.fill();
    ink(ctx, mass, LW * 0.7, SKIN_INK, 0.6, true);
  }
  const crown: Pt[] = [{ x: -0.52, y: -1.3 }, { x: 0, y: -1.46 }, { x: 0.52, y: -1.3 }, { x: 0.16, y: -1.2 }, { x: -0.2, y: -1.22 }];
  smoothClosed(ctx, crown);
  ctx.fillStyle = who.hairLight;
  ctx.fill();
  ink(ctx, crown, LW * 0.6, SKIN_INK, 0.45, true);
  for (let i = 0; i < 8; i++) ink(ctx, [{ x: -0.44 + i * 0.12, y: -1.28 }, { x: -0.3 + i * 0.1, y: -1.4 }], LW * 0.4, who.hair, 0.5);
}

/** Heavy-framed 1960s spectacles: a thick dark brow bar, thin below, a glint on each lens. */
function glasses(ctx: CanvasRenderingContext2D, fx: number, y: number): void {
  for (const s of [-1, 1]) {
    const x = s * 0.42 + fx;
    ctx.beginPath();
    ctx.roundRect(x - 0.33, y - 0.21, 0.66, 0.44, 0.15);
    ctx.fillStyle = 'rgba(220,235,240,0.14)';
    ctx.fill();
    ctx.strokeStyle = '#1e1712';
    ctx.lineWidth = LW * 0.9;
    ctx.stroke();
    ink(ctx, [{ x: x - 0.33, y: y - 0.16 }, { x, y: y - 0.22 }, { x: x + 0.33, y: y - 0.16 }], LW * 2.3, '#1e1712');
    ink(ctx, [{ x: x - 0.2, y: y - 0.1 }, { x: x - 0.07, y: y - 0.14 }], LW * 1.2, '#ffffff', 0.55);
    ink(ctx, [{ x: x + s * 0.33, y: y - 0.14 }, { x: s * 1, y: y - 0.1 }], LW * 1.3, '#1e1712');
  }
  ink(ctx, [{ x: fx - 0.09, y: y - 0.09 }, { x: fx, y: y - 0.13 }, { x: fx + 0.09, y: y - 0.09 }], LW * 1.3, '#1e1712');
}

/** Head and shoulders, the head centred on (cx, cy) with half-width `r`. */
export function drawCrew(ctx: CanvasRenderingContext2D, who: Crew, cx: number, cy: number, r: number, look: FaceLook): void {
  const m: Mood = { shock: look.shock, joy: look.joy, gaze: (look.gaze ?? 0) * 0.5 + who.turn * 0.6, blink: look.blink ?? 0 };
  const fx = who.turn * 0.2;
  const jaw = 0.17 * Math.max(0, m.shock - 0.2);
  const eyeY = -0.02 - 0.03 * m.joy;
  const head = headShape(jaw);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r * 0.94, r * 1.04);
  ctx.beginPath();
  ctx.moveTo(-0.62, 0.8);
  ctx.lineTo(-0.66, 1.9);
  ctx.lineTo(0.66, 1.9);
  ctx.lineTo(0.62, 0.8);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0.9, 0, 1.9, [[0, who.skin[2]], [0.5, who.skin[1]], [1, who.skin[1]]]);
  ctx.fill();
  shirt(ctx, who.shirt[0], who.shirt[1], who.skin[1]);
  ear(ctx, who.turn > 0 ? -1 : 1, who);
  ear(ctx, who.turn > 0 ? 1 : -1, who);
  smoothClosed(ctx, head);
  ctx.fillStyle = lin(ctx, -1, -1, 1, 1.3, [[0, who.skin[0]], [0.55, who.skin[1]], [1, who.skin[2]]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  washes(ctx, who, fx, m);
  ctx.restore();
  ink(ctx, head, LW, SKIN_INK, 0.75, true);
  if (who.style === 'side') hairSide(ctx, who);
  else if (who.style === 'crew') hairCrew(ctx, who);
  else hairReceding(ctx, who);
  const lift = 0.2 * m.shock - 0.05 * m.joy;
  for (const s of [-1, 1]) {
    const x = s * 0.42 + fx * (s === Math.sign(who.turn) ? 1.2 : 0.8);
    eye(ctx, x, eyeY, 0.235 * (s === Math.sign(who.turn) ? 1 - Math.abs(who.turn) * 0.28 : 1), m, who.iris);
    brow(ctx, x, eyeY - 0.25 - (m.shock > 0.2 ? 0.03 : 0), 0.27, lift, s, who.hair);
  }
  nose(ctx, fx * 1.35, who.turn);
  mouth(ctx, fx * 1.1, 0.92, m, who.lip);
  if (who.glasses) glasses(ctx, fx, eyeY);
  ctx.restore();
}
