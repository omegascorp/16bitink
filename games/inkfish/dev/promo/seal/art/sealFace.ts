import { INK, type Pt } from '../../../../src/art/pen';
import { curve, path, smoothLoop, taper, turn } from './paint';
import { EYE, JAW_TOP, LIP, PIVOT } from './sealShape';

/**
 * The seal's live parts, drawn over the baked body each frame so its mood can
 * change them: the inside of the mouth and the teeth as the jaw drops, the big
 * dark eye (moods are its lids and brow, never a white), the long whiskers,
 * and the props: a napkin and drops of sweat.
 */

export type SealMood = 'fierce' | 'smug' | 'nervous' | 'sly' | 'plain';

export interface SealLook {
  readonly mood: SealMood;
  /** The lower jaw's opening, 0 .. 1. */
  readonly gape: number;
  /** A napkin tucked under the chin. */
  readonly napkin?: boolean;
  /** Throat puffed (a burp), 0 .. 1. */
  readonly puff?: number;
  /** Sweat drops, 0 .. 1. */
  readonly sweat?: number;
  /** Fore flipper raised and waving, 0 .. 1. */
  readonly wave?: number;
}

export interface FaceState extends SealLook {
  /** The jaw's turn, radians. */
  readonly open: number;
  readonly wave: number;
}

const FUR_LID = '#3b3028';
const IVORY = '#f3ead6';
const WHISKER = '#f2eadb';

// ---------------------------------------------------------------- the mouth

/** A conical tooth from `base` pointing `dir` (1 down, -1 up). */
function tooth(ctx: CanvasRenderingContext2D, base: Pt, dir: number, h: number, w: number, lw: number, lean = -0.6): void {
  const tip = { x: base.x + lean, y: base.y + dir * h };
  const shape = [
    { x: base.x - w / 2, y: base.y - dir * 0.6 },
    ...curve({ x: base.x - w / 2, y: base.y }, { x: base.x - w * 0.35, y: base.y + dir * h * 0.7 }, tip, 5),
    ...curve(tip, { x: base.x + w * 0.4, y: base.y + dir * h * 0.6 }, { x: base.x + w / 2, y: base.y }, 5),
    { x: base.x + w / 2, y: base.y - dir * 0.6 },
  ];
  ctx.save();
  path(ctx, shape);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(160,140,110,0.5)';
  ctx.fillRect(base.x, base.y - 10, w, 20);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  shape.slice(1, -1).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The inside of the mouth between the lip and the dropped jaw, its tongue and the teeth. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number, lw: number): void {
  if (open < 0.01) return;
  const lower = JAW_TOP.map((q) => turn(q, PIVOT, open));
  const upper = LIP.filter((p) => p.x < 160.5);
  const shape = [...upper, ...[...lower].reverse()];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(PIVOT.x, 0, 160, 0);
  g.addColorStop(0, '#120606');
  g.addColorStop(1, '#4a2124');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const tongue = turn({ x: 134, y: 17.5 }, PIVOT, open * 0.85);
  ctx.fillStyle = 'rgba(170,92,100,0.9)';
  ctx.beginPath();
  ctx.ellipse(tongue.x, tongue.y, 15, 3.4, open * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(160,96,102,0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  lower.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - 0.8) : ctx.moveTo(p.x, p.y - 0.8)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,60,66,0.8)';
  ctx.beginPath();
  upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 0.8) : ctx.moveTo(p.x, p.y + 0.8)));
  ctx.stroke();
  ctx.restore();
  // Upper teeth: small incisors, a long canine, the cheek teeth behind.
  for (const [x, y, h, w] of [[154.5, 10.4, 2.4, 1.5], [151, 11.1, 2.8, 1.6], [139.5, 12.4, 6.8, 2.9], [128, 13.6, 3.2, 2.3], [121, 14.4, 2.8, 2.1]] as const) {
    tooth(ctx, { x, y }, 1, h, w, lw);
  }
  // Lower teeth, on the turning jaw.
  for (const [x, y, h, w] of [[153, 11.6, 2.4, 1.5], [145, 12.6, 6, 2.7], [133, 13.7, 2.8, 2.2], [125.5, 14.6, 2.5, 2]] as const) {
    const base = turn({ x, y }, PIVOT, open);
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.rotate(open);
    tooth(ctx, { x: 0, y: 0 }, -1, h, w, lw, 0.5);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the eye

/** The lid's lower edge across the eye: [back, front] heights as fractions of the eye's half height (-1 top .. 1 bottom). */
function lidLine(mood: SealMood): readonly [number, number] {
  switch (mood) {
    case 'fierce': return [-0.5, 0.15];
    case 'smug': return [0.05, 0.05];
    case 'sly': return [-0.05, -0.35];
    case 'nervous': return [-1.15, -1.15];
    case 'plain': return [-0.82, -0.78];
  }
}

function drawEye(ctx: CanvasRenderingContext2D, mood: SealMood, wave: number, lw: number): void {
  const big = mood === 'nervous' ? 1.2 : 1;
  const [rx, ry] = [8 * big, 6.8 * big];
  const { x, y } = EYE;
  // Set into the face: a soft dark socket.
  const socket = ctx.createRadialGradient(x, y, rx * 0.6, x, y, rx * 2);
  socket.addColorStop(0, 'rgba(14,9,7,0.55)');
  socket.addColorStop(1, 'rgba(14,9,7,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - rx * 2, y - rx * 2, rx * 4, rx * 4);
  // The eye: almond, dark and liquid, the light through the lower iris warm brown.
  const eye = smoothLoop([{ x: x - rx, y: y + ry * 0.12 }, { x: x - rx * 0.1, y: y - ry }, { x: x + rx, y: y - ry * 0.15 }, { x: x + rx * 0.05, y: y + ry }], 6);
  ctx.save();
  path(ctx, eye);
  const g = ctx.createRadialGradient(x - rx * 0.1, y + ry * 0.45, 0.5, x, y, rx * 1.15);
  g.addColorStop(0, mood === 'nervous' ? '#6e4527' : '#4c2d1a');
  g.addColorStop(0.5, '#1c110b');
  g.addColorStop(1, '#060404');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The pupil: wide and lost in the dark, or a small hard point when nervous.
  const pr = mood === 'nervous' ? rx * 0.32 : rx * 0.62;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.05, y + ry * 0.05, pr, pr * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  // Reflections: the bright window up front, a small one behind, the wet rim along the bottom.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.3, y - ry * 0.36, rx * 0.25 * big, ry * 0.21 * big, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - rx * 0.38, y + ry * 0.34, rx * 0.09 * big, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,215,235,0.35)';
  ctx.lineWidth = 1.4 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.82, ry * 0.8, 0, 0.4, Math.PI - 0.5);
  ctx.stroke();
  // The lid, by mood: furred, its edge inked, lit along its fold.
  const [back, front] = lidLine(mood);
  if (back > -1) {
    const lid = [{ x: x - rx * 1.3, y: y - ry * 2 }, { x: x + rx * 1.3, y: y - ry * 2 }, { x: x + rx * 1.3, y: y + front * ry }, { x: x - rx * 1.3, y: y + back * ry }];
    ctx.fillStyle = FUR_LID;
    path(ctx, lid);
    ctx.fill();
    const edge = curve({ x: x - rx * 1.2, y: y + back * ry }, { x, y: y + ((back + front) / 2) * ry - ry * 0.12 }, { x: x + rx * 1.2, y: y + front * ry }, 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2.6 * lw;
    ctx.beginPath();
    edge.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 1.2 * lw) : ctx.moveTo(p.x, p.y + 1.2 * lw)));
    ctx.stroke();
  }
  ctx.restore();
  // Lids inked: firm above, fine below with a moist light under it.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const upperLid = eye.slice(0, 13);
  const lowerLid = [...eye.slice(12), eye[0]!];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.9 * lw;
  ctx.beginPath();
  upperLid.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.lineWidth = 1 * lw;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  lowerLid.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = '#f0e2c8';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.3 * lw;
  ctx.beginPath();
  lowerLid.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 1.6) : ctx.moveTo(p.x, p.y + 1.6)));
  ctx.stroke();
  ctx.restore();
  drawBrow(ctx, mood, wave, rx, ry, lw);
}

/** The fur over the eye: a lit fold, set by mood. */
function drawBrow(ctx: CanvasRenderingContext2D, mood: SealMood, wave: number, rx: number, ry: number, lw: number): void {
  const { x, y } = EYE;
  const [back, mid, front] = (() => {
    switch (mood) {
      case 'fierce': return [-1.55, -1.45, -0.75];
      case 'nervous': return [-1.5, -2.1, -2.35];
      case 'sly': return [-1.5 - 0.6 * wave, -2.2 - 0.5 * wave, -1.7];
      case 'smug': return [-1.25, -1.45, -1.3];
      case 'plain': return [-1.4, -1.65, -1.45];
    }
  })();
  const brow = curve({ x: x - rx * 1.5, y: y + back * ry }, { x: x, y: y + mid * ry }, { x: x + rx * 1.5, y: y + front * ry }, 10);
  taper(ctx, brow.map((p) => ({ x: p.x, y: p.y - 1.3 })), 2.4 * lw, 0.6 * lw, '#efe2c8', 0.4);
  taper(ctx, brow, (mood === 'fierce' ? 2.6 : 1.6) * lw, 0.5 * lw, INK, mood === 'plain' || mood === 'smug' ? 0.45 : 0.8);
  if (mood === 'fierce') {
    taper(ctx, curve({ x: x + rx * 0.6, y: y - ry * 1.9 }, { x: x + rx * 0.9, y: y - ry * 1.4 }, { x: x + rx * 1.3, y: y - ry * 1.15 }, 6), 1.4 * lw, 0.4 * lw, INK, 0.5);
  }
  if (mood === 'nervous') {
    taper(ctx, curve({ x: x - rx * 0.6, y: y - ry * 2.7 }, { x: x + rx * 0.3, y: y - ry * 3 }, { x: x + rx * 1.2, y: y - ry * 3.1 }, 6), 1.2 * lw, 0.4 * lw, INK, 0.45);
  }
}

// ---------------------------------------------------------------- whiskers, smile, props

/** The long pale whiskers, fanned forward and drooping, from the rows on the muzzle. */
function drawWhiskers(ctx: CanvasRenderingContext2D, beat: number, lw: number): void {
  const sway = 0.05 * Math.sin(beat * 0.7);
  for (let i = 0; i < 9; i++) {
    const row = i % 3;
    const base = { x: 151 - Math.floor(i / 3) * 4.2 - row * 1.4, y: 3 + row * 3.2 + Math.floor(i / 3) * 0.6 };
    const a = -0.05 + i * 0.075 + sway;
    const len = 44 + (i % 4) * 7 + (i > 5 ? 6 : 0);
    const tip = { x: base.x + Math.cos(a) * len, y: base.y + Math.sin(a) * len + 8 };
    const mid = { x: base.x + Math.cos(a) * len * 0.55, y: base.y + Math.sin(a) * len * 0.55 - 2 };
    const hair = curve(base, mid, tip, 12);
    taper(ctx, hair.map((p) => ({ x: p.x + 0.5, y: p.y + 0.7 })), 1.6 * lw, 0.3 * lw, '#1a120e', 0.25);
    taper(ctx, hair, Math.max(0.9, 2.2 * lw), 0.35 * lw, WHISKER, 0.92);
  }
}

/** A contented smile tucked up at the corner of the mouth. */
function drawSmile(ctx: CanvasRenderingContext2D, lw: number): void {
  taper(ctx, curve({ x: 124, y: 14.6 }, { x: 110, y: 17 }, { x: 103, y: 10 }, 8), 1.4 * lw, 2.2 * lw, INK, 0.85);
}

/** A napkin tucked in at the neck: linen with red checks, folded. */
function drawNapkin(ctx: CanvasRenderingContext2D, lw: number): void {
  const cloth = smoothLoop([{ x: 64, y: 24 }, { x: 89, y: 27 }, { x: 113, y: 25 }, { x: 101, y: 62 }, { x: 88, y: 92 }, { x: 74, y: 96 }, { x: 62, y: 70 }, { x: 57, y: 46 }], 3);
  ctx.save();
  path(ctx, cloth);
  ctx.fillStyle = '#fbf7ec';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(200,69,44,0.6)';
  ctx.lineWidth = 3.2;
  for (let i = -2; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(42 + i * 11, 18);
    ctx.lineTo(48 + i * 11, 104);
    ctx.moveTo(40, 22 + i * 11);
    ctx.lineTo(130, 18 + i * 11);
    ctx.stroke();
  }
  // Folds: soft shade down the cloth, a lit crease.
  const g = ctx.createLinearGradient(60, 0, 112, 0);
  g.addColorStop(0, 'rgba(60,40,30,0.28)');
  g.addColorStop(0.45, 'rgba(60,40,30,0)');
  g.addColorStop(1, 'rgba(60,40,30,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(50, 20, 70, 80);
  const top = ctx.createLinearGradient(0, 22, 0, 40);
  top.addColorStop(0, 'rgba(40,26,20,0.35)');
  top.addColorStop(1, 'rgba(40,26,20,0)');
  ctx.fillStyle = top;
  ctx.fillRect(50, 20, 70, 22);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2 * lw;
  ctx.beginPath();
  ctx.moveTo(86, 30);
  ctx.quadraticCurveTo(84, 60, 80, 90);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8 * lw;
  ctx.lineJoin = 'round';
  path(ctx, cloth);
  ctx.stroke();
  ctx.restore();
}

/** A drop of sweat. */
function drawSweatDrop(ctx: CanvasRenderingContext2D, at: Pt, size: number, lw: number): void {
  const drop = smoothLoop([{ x: at.x, y: at.y - size * 1.4 }, { x: at.x + size * 0.8, y: at.y - size * 0.1 }, { x: at.x, y: at.y + size * 0.7 }, { x: at.x - size * 0.8, y: at.y - size * 0.1 }], 4);
  ctx.save();
  path(ctx, drop);
  const g = ctx.createLinearGradient(at.x, at.y - size, at.x, at.y + size);
  g.addColorStop(0, '#e6f5fd');
  g.addColorStop(1, '#9fd0f0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#2d6fa8';
  ctx.lineWidth = 1.6 * lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(at.x - size * 0.25, at.y - size * 0.1, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The face over the baked body: the mouth (then `jaw` draws the lower jaw over
 * it), the eye, whiskers and smile, the napkin, then `flipper` (the near fore
 * flipper, over the napkin), then sweat.
 */
export function drawSealFace(ctx: CanvasRenderingContext2D, look: FaceState, lw: number, beat: number, jaw: () => void, flipper: () => void): void {
  drawMouth(ctx, look.open, lw);
  jaw();
  drawEye(ctx, look.mood, look.wave, lw);
  drawWhiskers(ctx, beat, lw);
  if (look.mood === 'smug' || look.mood === 'sly') drawSmile(ctx, lw);
  if (look.napkin) drawNapkin(ctx, lw);
  flipper();
  const sweat = look.sweat ?? 0;
  if (sweat > 0.01) {
    drawSweatDrop(ctx, { x: 76, y: -52 - 12 * sweat }, 7 + 4 * sweat, lw);
    drawSweatDrop(ctx, { x: 132, y: -40 + 18 * sweat }, 6, lw);
  }
}

