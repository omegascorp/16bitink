import { INK, type Pt } from '../../../../src/art/pen';
import { BIRD } from './catfishShape';
import { curve, dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { fillShape, FOLDED, paintTail, paintWing, PLUMAGES, type Plumage } from './feather';

/**
 * The feral pigeon (Columba livia), to the bar of the seal short's fur seal:
 * a soft plump body in layered grey-blue washes, rows of small feathers, two
 * clear black wing bars, a green and purple iridescent neck, a dark bill with
 * a white cere, an orange eye with a catchlight, pink feet and a fan-shaped
 * grey tail with a darker band. Own units: about 115 long with the tail,
 * facing +x, feet at y = +36.
 */

export interface PigeonPose {
  readonly x: number;
  readonly y: number;
  /** Length of the body in px for 100 own units. */
  readonly len: number;
  readonly face: 1 | -1;
  /** Wings: 0 folded .. 1 up and spread. */
  readonly wings?: number;
  /** Wing flap phase, radians. */
  readonly flap?: number;
  /** Head dipped to the water or the feathers, 0 .. 1. */
  readonly bow?: number;
  /** Head turned back, bill in the flank feathers, 0 .. 1. */
  readonly preen?: number;
  /** Crouched and fluffed in the shallows, tail fanned up, 0 .. 1. */
  readonly bath?: number;
  /** Which way the eye looks: -1 back (towards the river) .. 1 forward. */
  readonly look?: number;
  /** One foot lifted (a twitch), 0 .. 1. */
  readonly foot?: number;
  /** Wide, worried eye, 0 .. 1. */
  readonly alarm?: number;
  /** Legs dangling, as when it is carried, 0 .. 1. */
  readonly dangle?: number;
  readonly rot?: number;
  /** Which plumage (0 blue-grey, 1 darker, 2 paler). */
  readonly tone?: number;
  /** One screen pixel in the units of the surface drawn on (default: from the length). */
  readonly ink?: number;
}

export const PIGEON_UNITS = 100;
export const PIGEON_FEET_Y = 36;
/** The head's middle, for labels and the cat's whisker aim. */
export const PIGEON_AT = { head: { x: 31, y: -37 }, foot: { x: 8, y: 34 }, body: { x: 0, y: 0 } } as const satisfies Record<string, Pt>;

const NECK_PIVOT: Pt = { x: 22, y: -12 };

/** Clockwise from the shoulders: the plump torso, breast high, rump low; the neck is drawn on it. */
const TORSO = smoothLoop([
  { x: 18, y: -22 }, { x: 8, y: -20 }, { x: -8, y: -15 }, { x: -24, y: -7 }, { x: -33, y: 2 }, { x: -30, y: 11 }, { x: -18, y: 17 }, { x: -2, y: 22 }, { x: 13, y: 20 }, { x: 25, y: 11 }, { x: 31, y: -2 }, { x: 31, y: -14 }, { x: 26, y: -22 },
], 5);

function ink(ctx: CanvasRenderingContext2D, w: number, alpha = 0.8): void {
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

const PINK = '#d9727e';
const PINK_LIT = '#f3a7ac';

function leg(ctx: CanvasRenderingContext2D, hip: Pt, foot: Pt, curl: number, px: number): void {
  const knee = { x: (hip.x + foot.x) / 2 - 2.5, y: (hip.y + foot.y) / 2 };
  taper(ctx, [hip, knee, foot], 5.4, 3.8, PINK, 1);
  taper(ctx, [{ x: hip.x + 1, y: hip.y }, { x: knee.x + 1, y: knee.y }, { x: foot.x + 1, y: foot.y }], 1.6, 1.2, PINK_LIT, 0.8);
  const toes: readonly (readonly [number, number])[] = [[12, 1.5 + curl], [9, 4 + curl * 1.4], [6.5, -1 + curl * 0.8], [-7, 1.2 + curl]];
  for (const [dx, dy] of toes) {
    const tip = { x: foot.x + dx * (1 - curl * 0.07), y: foot.y + dy };
    taper(ctx, [foot, { x: (foot.x + tip.x) / 2, y: foot.y + dy * 0.2 - 0.4 }, tip], 3.2, 1.8, PINK, 1);
    taper(ctx, [tip, { x: tip.x + Math.sign(dx) * 2.2, y: tip.y + 0.8 }], 1.5, 0.3, '#2a2226', 0.95);
  }
  ctx.save();
  ink(ctx, px * 0.9, 0.5);
  ctx.beginPath();
  ctx.moveTo(hip.x - 2.2, hip.y);
  ctx.quadraticCurveTo(knee.x - 2, knee.y, foot.x - 1.6, foot.y);
  ctx.stroke();
  ctx.restore();
}

function paintLegs(ctx: CanvasRenderingContext2D, px: number, foot: number, dangle: number): void {
  const sway = dangle * 9;
  leg(ctx, { x: -6, y: 18 }, { x: -7 - sway, y: PIGEON_FEET_Y - 2 - dangle * 5 }, dangle * 2, px);
  leg(ctx, { x: 7, y: 18 }, { x: 8 + foot * 10 - sway * 0.5, y: PIGEON_FEET_Y - 2 - foot * 12 - dangle * 7 }, Math.max(dangle * 2, foot * 3), px);
}

/** Rows of small soft feathers over the flank and breast, following the body round. */
function paintScales(ctx: CanvasRenderingContext2D, pl: Plumage, px: number): void {
  ctx.save();
  ctx.lineWidth = px * 0.9;
  ctx.lineCap = 'round';
  for (let row = 0; row < 7; row++) {
    for (let i = 0; i < 10; i++) {
      const x = -28 + i * 6.4 + (row % 2) * 3.2;
      const y = -13 + row * 6 + 0.08 * x;
      ctx.strokeStyle = (row + i) % 3 ? 'rgba(40,50,66,0.2)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 3.7, 0.25 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
  void pl;
}

function paintTorso(ctx: CanvasRenderingContext2D, pl: Plumage, px: number): void {
  ctx.save();
  path(ctx, TORSO);
  ctx.clip();
  const g = ctx.createLinearGradient(-6, -22, 6, 24);
  g.addColorStop(0, pl.back);
  g.addColorStop(0.45, pl.flank);
  g.addColorStop(0.8, pl.belly);
  g.addColorStop(1, pl.flank);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, 80, 70);
  // The round of the body: slate breast, soft belly shadow, the light on the shoulder, bounce off the gravel.
  dab(ctx, 26, 4, 24, '74,88,114', 0.75);
  dab(ctx, -8, 22, 26, '46,56,76', 0.5);
  dab(ctx, -26, 6, 14, '60,72,92', 0.45);
  dab(ctx, 18, -6, 12, '240,246,252', 0.2);
  softLine(ctx, [{ x: -24, y: 18 }, { x: -2, y: 22.5 }, { x: 16, y: 19 }], 3, '#f3e4c8', 0.4, 3);
  paintScales(ctx, pl, px);
  ctx.restore();
}

/** The neck, a thick curve from the shoulders to the head: green above, purple below, in small shining feathers. */
function paintNeck(ctx: CanvasRenderingContext2D, head: Pt, px: number, root = 'rgba(125,90,156,0)'): void {
  const base = { x: 21, y: -7 };
  const mid = { x: (base.x + head.x) / 2 + (head.y - base.y) * 0.1, y: (base.y + head.y) / 2 - (head.x - base.x) * 0.16 };
  const line = curve(base, mid, head, 10);
  const halfAt = (u: number): number => 15.5 - 6 * u;
  const side = (s: number): Pt[] => line.map((p, i) => {
    const [a, b] = [line[Math.max(0, i - 1)]!, line[Math.min(10, i + 1)]!];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - (s * (b.y - a.y) * halfAt(i / 10)) / len, y: p.y + (s * (b.x - a.x) * halfAt(i / 10)) / len };
  });
  const [left, right] = [side(1), side(-1)];
  const shape = [...left, ...[...right].reverse()];
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(base.x, base.y, head.x, head.y);
  g.addColorStop(0, root);
  g.addColorStop(0.24, '#7d5a9c');
  g.addColorStop(0.42, '#6a5fa8');
  g.addColorStop(0.62, '#3f8a92');
  g.addColorStop(0.84, '#35946f');
  g.addColorStop(1, '#3b6f72');
  ctx.fillStyle = g;
  ctx.fillRect(-30, -60, 110, 110);
  for (let i = 0; i < 44; i++) {
    const u = 0.1 + 0.86 * (((i * 37) % 44) / 44);
    const p = line[Math.round(u * 10)]!;
    const off = ((i * 53) % 21) / 10 - 1;
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(190,250,214,0.55)' : i % 4 === 1 ? 'rgba(232,170,250,0.42)' : 'rgba(20,30,50,0.22)';
    ctx.lineWidth = px * 1;
    ctx.beginPath();
    ctx.arc(p.x + off * halfAt(u) * 0.8, p.y, 2.2, 0.2 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  dab(ctx, line[6]!.x + 4, line[6]!.y, 8, '226,255,238', 0.34);
  dab(ctx, line[3]!.x + 5, line[3]!.y, 7, '246,206,255', 0.26);
  ctx.restore();
  ctx.save();
  ink(ctx, px * 1.4, 0.62);
  for (const edge of [left, right]) {
    ctx.beginPath();
    edge.slice(2).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** The folded wing on the flank: pale coverts, two black bars, the long dark tips over the tail. */
function paintFolded(ctx: CanvasRenderingContext2D, pl: Plumage, px: number): void {
  const wing = smoothLoop(FOLDED, 5);
  const tips: readonly (readonly [number, number])[] = [[-61, 16], [-58, 18], [-54, 19], [-49, 19]];
  tips.forEach(([x, y], i) => {
    taper(ctx, [{ x: -22 + i * 3, y: 9 + i }, { x: (x - 22) / 2, y: (y + 11) / 2 }, { x, y }], 7, 2, '#3a4350', 1);
  });
  const g = ctx.createLinearGradient(6, -18, -10, 18);
  g.addColorStop(0, pl.covert);
  g.addColorStop(0.7, pl.flank);
  g.addColorStop(1, pl.belly);
  fillShape(ctx, wing, g);
  ctx.save();
  path(ctx, wing);
  ctx.clip();
  // Rows of coverts, then the two bars curving across the wing.
  ctx.lineCap = 'round';
  for (let row = 0; row < 5; row++) {
    for (let i = 0; i < 8; i++) {
      const x = 13 - i * 6 - row * 1.2;
      const y = -13 + row * 5 + i * 1.8;
      ctx.strokeStyle = 'rgba(44,54,72,0.3)';
      ctx.lineWidth = px;
      ctx.beginPath();
      ctx.arc(x, y, 3.3, 0.2 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();
    }
  }
  const bar = (x: number, w: number): void => {
    const pts = [{ x: x + 7, y: -20 }, { x: x + 1.5, y: -6 }, { x: x - 2.5, y: 6 }, { x: x - 2, y: 20 }];
    softLine(ctx, pts, w, '#0d1016', 1, 2);
    softLine(ctx, pts.map((p) => ({ x: p.x + w * 0.46, y: p.y })), 1.1, '#e7ecf1', 0.65, 1);
  };
  bar(-8, 6.4);
  bar(-24, 6.8);
  dab(ctx, 6, -12, 11, '255,255,255', 0.3);
  ctx.restore();
  ctx.save();
  ink(ctx, px * 1.3, 0.72);
  path(ctx, wing);
  ctx.stroke();
  ctx.restore();
}

const HEAD = smoothLoop([{ x: 23, y: -33 }, { x: 24, y: -42 }, { x: 31, y: -47 }, { x: 38, y: -44 }, { x: 41, y: -38 }, { x: 39, y: -32 }, { x: 33, y: -28 }, { x: 26, y: -28 }], 5);

function paintBill(ctx: CanvasRenderingContext2D, px: number): void {
  const bill = smoothLoop([{ x: 38.5, y: -40 }, { x: 44, y: -38.4 }, { x: 47.6, y: -35.8 }, { x: 47, y: -34.6 }, { x: 43, y: -35 }, { x: 39, y: -35 }], 4);
  fillShape(ctx, bill, '#2f3338');
  ctx.save();
  ink(ctx, px * 1.1, 0.8);
  path(ctx, bill);
  ctx.stroke();
  ctx.restore();
  dab(ctx, 43.5, -37.8, 2.2, '200,206,214', 0.6);
  // The white cere, two soft lobes on the bill's root.
  const cere = smoothLoop([{ x: 37.8, y: -41.6 }, { x: 40.6, y: -42.8 }, { x: 43, y: -40.8 }, { x: 42.4, y: -38.8 }, { x: 39, y: -38.6 }], 4);
  fillShape(ctx, cere, '#f8f5ee');
  ctx.save();
  ink(ctx, px * 0.8, 0.5);
  path(ctx, cere);
  ctx.stroke();
  ctx.restore();
}

function paintEye(ctx: CanvasRenderingContext2D, look: number, alarm: number, px: number): void {
  const [ex, ey] = [33.2, -39.4];
  const r = 2.9 + 1.9 * alarm;
  const disc = (x: number, y: number, rad: number, fill: string): void => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  disc(ex, ey, r + 0.9, '#cfd3d6');
  const iris = ctx.createRadialGradient(ex, ey, 0.5, ex, ey, r);
  iris.addColorStop(0, '#ffb43a');
  iris.addColorStop(0.7, '#f07f16');
  iris.addColorStop(1, '#b84e0c');
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, Math.PI * 2);
  ctx.fill();
  const [px0, pupil] = [ex + look * r * 0.42, r * (0.46 - 0.12 * alarm)];
  disc(px0, ey, pupil, '#07080a');
  disc(px0 - pupil * 0.4, ey - pupil * 0.55, Math.max(0.55, pupil * 0.38), '#ffffff');
  ctx.save();
  ink(ctx, px * 1, 0.85);
  ctx.beginPath();
  ctx.arc(ex, ey, r + 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function paintHead(ctx: CanvasRenderingContext2D, pl: Plumage, look: number, alarm: number, px: number): void {
  const g = ctx.createLinearGradient(24, -47, 36, -27);
  g.addColorStop(0, pl.slate);
  g.addColorStop(0.65, pl.slate);
  g.addColorStop(1, '#3d8f7f');
  fillShape(ctx, HEAD, g);
  ctx.save();
  path(ctx, HEAD);
  ctx.clip();
  dab(ctx, 29, -44, 8, '226,236,246', 0.42);
  dab(ctx, 36, -31, 7, '30,40,56', 0.4);
  ctx.restore();
  ctx.save();
  ink(ctx, px * 1.5, 0.78);
  path(ctx, HEAD);
  ctx.stroke();
  ctx.restore();
  paintBill(ctx, px);
  paintEye(ctx, look, alarm, px);
}

const pivot = (ctx: CanvasRenderingContext2D, o: Pt, a: number): void => {
  ctx.translate(o.x, o.y);
  ctx.rotate(a);
  ctx.translate(-o.x, -o.y);
};

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Own centre of the head as HEAD draws it, and where it sits standing, drinking and preening. */
const HEAD_MID: Pt = { x: 31, y: -37 };
const HEAD_UP: Pt = { x: 30, y: -33 };
const HEAD_DOWN: Pt = { x: 47, y: 10 };
const HEAD_BACK: Pt = { x: 5, y: -24 };

function headAt(p: PigeonPose): Pt {
  return lerpPt(lerpPt(HEAD_UP, HEAD_DOWN, p.bow ?? 0), HEAD_BACK, p.preen ?? 0);
}

/** The head at `at`: dipped by `bow`, or turned back over the shoulder into the flank by `preen`. */
function placeHead(ctx: CanvasRenderingContext2D, pl: Plumage, p: PigeonPose, at: Pt, px: number): void {
  const [bow, preen] = [p.bow ?? 0, p.preen ?? 0];
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(1.15 * bow);
  ctx.scale(1 - 2 * preen, 1);
  ctx.rotate(0.7 * preen);
  ctx.translate(-HEAD_MID.x, -HEAD_MID.y);
  paintHead(ctx, pl, p.look ?? 1, p.alarm ?? 0, px);
  ctx.restore();
}

/** The painted pigeon, placed. */
export function drawPigeon(ctx: CanvasRenderingContext2D, p: PigeonPose): void {
  const k = p.len / PIGEON_UNITS;
  const px = (p.ink ?? 1) / k;
  const [wings, bath] = [p.wings ?? 0, p.bath ?? 0];
  const pl = PLUMAGES[(p.tone ?? 0) % PLUMAGES.length]!;
  const spread = wings > 0.15;
  const angle = -1.52 + 0.42 * Math.sin(p.flap ?? 0) - 0.5 * (1 - wings);
  const head = headAt(p);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot ?? 0);
  ctx.scale(k, k);
  ctx.translate(0, -PIGEON_FEET_Y * 0.5 + bath * 13);
  pivot(ctx, { x: 0, y: 8 }, 0.24 * bath);
  if (spread) paintWing(ctx, { x: 13, y: -13 }, { pl: PLUMAGES[1]!, open: wings, angle: angle - 0.16, far: true, px });
  if (bath < 0.7) paintLegs(ctx, px, p.foot ?? 0, p.dangle ?? 0);
  paintTail(ctx, pl, Math.max(0.25, bath), 0.55 * bath, px);
  paintTorso(ctx, pl, px);
  ctx.save();
  ink(ctx, px * 1.6, 0.74);
  path(ctx, TORSO);
  ctx.stroke();
  ctx.restore();
  paintNeck(ctx, head, px);
  if (!spread) paintFolded(ctx, pl, px);
  placeHead(ctx, pl, p, head, px);
  if (spread) paintWing(ctx, { x: 6, y: -12 }, { pl, open: wings, angle: angle + 0.14, far: false, px });
  ctx.restore();
}

/** The bird clamped in the jaws (own units of ./catfishSide.ts): crosswise, a pigeon's size beside the head, head thrown back. */
export const seized = (flap: number, ink: number): PigeonPose => ({ x: BIRD.x, y: BIRD.y, len: 272, face: 1, rot: -0.06, wings: 1, flap, alarm: 1, look: -0.2, tone: 0, ink });

function placeSeized(ctx: CanvasRenderingContext2D, p: PigeonPose, k: number): void {
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot ?? 0);
  ctx.scale(k, k);
}

/** The part of a seized bird the jaws close over: its rump, tail and flank. Its feet are inside, out of sight. */
export function drawSeizedBody(ctx: CanvasRenderingContext2D, p: PigeonPose): void {
  const k = p.len / PIGEON_UNITS;
  const px = (p.ink ?? 1) / k;
  const pl = PLUMAGES[(p.tone ?? 0) % PLUMAGES.length]!;
  ctx.save();
  placeSeized(ctx, p, k);
  paintTail(ctx, pl, 0.5, 0.1, px);
  paintTorso(ctx, pl, px);
  ctx.save();
  ink(ctx, px * 1.6, 0.74);
  path(ctx, TORSO);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/** The part that sticks out past the lips: the wings flung up and out both ways, the neck wrung round, the head twisted, the eye wild. */
export function drawSeizedFront(ctx: CanvasRenderingContext2D, p: PigeonPose): void {
  const k = p.len / PIGEON_UNITS;
  const px = (p.ink ?? 1) / k;
  const pl = PLUMAGES[(p.tone ?? 0) % PLUMAGES.length]!;
  const beat = 0.2 * Math.sin(p.flap ?? 0);
  const head = { x: 40, y: -29 };
  ctx.save();
  placeSeized(ctx, p, k);
  // The far wing goes the other way, up past the head.
  ctx.save();
  ctx.translate(30, -9);
  ctx.scale(-0.92, 0.92);
  ctx.rotate(0.3);
  paintWing(ctx, { x: 0, y: 0 }, { pl: PLUMAGES[1]!, open: 0.85, angle: -1.86 - beat, far: true, px });
  ctx.restore();
  paintNeck(ctx, head, px, '#5f6f88');
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(-0.62 + 0.5 * beat);
  ctx.scale(1.16, 1.16);
  ctx.translate(-HEAD_MID.x, -HEAD_MID.y);
  paintHead(ctx, pl, p.look ?? 1, p.alarm ?? 1, px);
  ctx.restore();
  // The near wing flung up the other side, its root clear of the middle of the upper lip.
  ctx.save();
  ctx.translate(-20, -9);
  ctx.rotate(0.14);
  paintWing(ctx, { x: 0, y: 0 }, { pl, open: 0.9, angle: -1.86 + beat, far: false, px });
  ctx.restore();
  ctx.restore();
}

/** Where a point in the pigeon's own units lands on screen. */
export function onPigeon(p: PigeonPose, local: Pt): Pt {
  const k = p.len / PIGEON_UNITS;
  const [c, s] = [Math.cos(p.rot ?? 0), Math.sin(p.rot ?? 0)];
  const [lx, ly] = [local.x * k, (local.y - PIGEON_FEET_Y * 0.5) * k];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}
