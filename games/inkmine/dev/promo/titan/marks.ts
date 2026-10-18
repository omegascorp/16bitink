import { cub, edge, eyeDot, makeDraw, oval, pt, type Draw } from '../../../src/art/kit';
import { dab, paint } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { ringedPlanet, sphere } from '../../../src/art/skyArt';
import { PROSPECTOR_FINISH, render } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { clamp01, smooth } from '../short';
import { BOIL } from '../../../src/art/palette';
import type { Sprite } from '../sprites';

/**
 * The pictures for the nouns that aren't the prospector: Titan from space
 * (with Saturn behind it) in a small round inset for "Saturn's moon Titan",
 * a toddler for scale, and the handwritten notes ("4×", "≈ 10 kg",
 * "−180 °C"), each popping in.
 */
export const INSET_R = 120;

/** Titan seen from space: an orange globe wrapped in haze, its thin blue outer haze at the limb, ringed Saturn beyond. */
export function bakeInset(): HTMLCanvasElement {
  const S = INSET_R * 2 + 16;
  const { canvas, ctx } = makeCanvas(S, S);
  const c = pt(S / 2, S / 2);
  const d = makeDraw(ctx, 51, 0, 0);
  const disc = oval(c.x, c.y, INSET_R, INSET_R, 64);
  d.pen.fill(disc, '#0c1028', 1);
  d.pen.clipped(disc, () => {
    const rng = createRng(5);
    for (let i = 0; i < 70; i++) d.pen.dot(rng() * S, rng() * S, 0.6 + rng() * 1.1, PAPER_FILL, 0.4 + rng() * 0.5);
    ringedPlanet(d, pt(c.x - 52, c.y - 46), 34);
    const tc = pt(c.x + 26, c.y + 30);
    const r = 70;
    // The blue haze high above its orange haze.
    d.pen.fill(oval(tc.x, tc.y, r + 6, r + 6, 48), '#7fa6d6', 0.55);
    const globe = oval(tc.x, tc.y, r, r, 48);
    sphere(d, tc, r, globe, '#e2a052', '#8a4a1c');
    d.pen.clipped(globe, () => {
      for (const [k, w] of [[-0.55, 0.12], [-0.1, 0.1], [0.35, 0.14]] as const) dab(d, oval(tc.x, tc.y + r * k, r * 1.1, r * w, 24), '#c07a3a', 0.35, 2);
    });
    edge(d, globe, 1.4);
  });
  edge(d, disc, 3);
  return canvas;
}

/** A toddler, arms up: round head, a tuft of hair, a onesie. Drawn in the game's units, feet at y = 0. */
function drawToddler(d: Draw): void {
  const skin = '#f0c4a0';
  const suit = '#f2d77a';
  for (const s of [-1, 1]) {
    // Legs, then arms reaching up.
    paint(d, oval(s * 2.4, -2.6, 1.9, 2.8, 14), suit, { alpha: 0.95, shadow: 0.5, hatch: 0.12, line: 0.5 });
    paint(d, oval(s * 2.8, -0.4, 1.6, 1, 12), skin, { alpha: 0.95, shadow: 0.4, hatch: 0, line: 0.45 });
    const arm = [pt(s * 3.6, -10.4), pt(s * 6.6, -14.6), pt(s * 7.8, -14), pt(s * 4.8, -8.6)];
    paint(d, arm, suit, { alpha: 0.95, shadow: 0.45, hatch: 0.1, line: 0.5 });
    paint(d, oval(s * 7.4, -15.2, 1.3, 1.3, 12), skin, { alpha: 0.95, shadow: 0.4, hatch: 0, line: 0.45 });
  }
  const body = [...cub(pt(-4.6, -3), pt(-6, -8), pt(-4, -12.4), pt(0, -12.6), 8), ...cub(pt(0, -12.6), pt(4, -12.4), pt(6, -8), pt(4.6, -3), 8)];
  paint(d, body, suit, { alpha: 0.95, shadow: 0.55, hatch: 0.14, line: 0.6 });
  // Snaps down the front.
  for (const y of [-5, -7.4, -9.8]) d.pen.dot(0.2, y, 0.38, '#c9a446', 1);
  const head = oval(0, -17.4, 5.4, 5.1, 28);
  paint(d, head, skin, { alpha: 0.95, shadow: 0.5, hatch: 0.1, line: 0.6 });
  d.pen.stroke([pt(-1.2, -22.2), pt(0.2, -23.6), pt(1.4, -22.8), pt(0.6, -22)], 0.6, '#7a4a28', 0.9, false);
  eyeDot(d, -1.8, -17.6, 0.6);
  eyeDot(d, 1.8, -17.6, 0.6);
  d.pen.stroke([pt(-1.2, -15.2), pt(0, -14.4), pt(1.2, -15.2)], 0.4, d.ink, 0.85, false);
  dab(d, oval(-3, -16, 1.2, 0.8, 10), '#e88a7a', 0.45, 0.4);
  dab(d, oval(3, -16, 1.2, 0.8, 10), '#e88a7a', 0.45, 0.4);
}

export const TODDLER_SCALE = 12;
export function bakeToddler(): Sprite {
  const res = 12;
  const frame = { w: 22, h: 28, ox: 11, oy: 25 };
  const frames = Array.from({ length: BOIL }, (_, f) =>
    render(frame.w, frame.h, frame.ox, frame.oy, res, (ctx) => drawToddler(makeDraw(ctx, 600 + f, f, 0)), PROSPECTOR_FINISH));
  return { frames, frame, res };
}

const GOLD: TextInk = { fill: '#ffd36a', halo: '#24110a' };
const ICE: TextInk = { fill: '#e8f6ff', halo: '#14244a' };

/** A note popping in: overshoots a touch as it lands. */
const popOf = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : 0.6 + 0.4 * smooth(u * 1.4) + 0.18 * Math.sin(Math.PI * u));

/** A handwritten note, popped in by `show` (0..1 of its fade, popping as it rises). */
export function note(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, show: number, ink: TextInk = PAPER_ON_DARK): void {
  if (show <= 0) return;
  drawTextLine(ctx, text, x, y, size * popOf(clamp01(show * 1.6)), 700, show, ink);
}
export const goldNote = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, show: number): void =>
  note(ctx, text, x, y, size, show, GOLD);
export const iceNote = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, show: number): void =>
  note(ctx, text, x, y, size, show, ICE);
