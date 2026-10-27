import { createRng } from '../logic/rng';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Jungle Temple's guard: a stout, grumpy little boar. Round, with no
 * spikes, so Nib can stomp it. Faces right, centred on its collision circle, feet at
 * y = 22. The Great Boar, the chapter's boss, is the same beast painted
 * bigger (`size`) and crowned with temple gold.
 */
export const BOAR_FRAME = { w: 76, h: 72, ox: 38, oy: 38 } as const;
export type BoarMood = 'grump' | 'scared';

const HIDE = '#8b5e3c';
const HIDE_LIGHT = '#c49770';
const HIDE_DARK = '#4f321f';
const SNOUT = '#d79a86';
const TUSK = '#fbf3df';

export function paintBoar(mood: BoarMood, boil: number, size = 1, crown = false): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.round(BOAR_FRAME.w * ART_RES * size), Math.round(BOAR_FRAME.h * ART_RES * size));
  ctx.scale(ART_RES * size, ART_RES * size);
  ctx.translate(BOAR_FRAME.ox, BOAR_FRAME.oy);
  const pen = new Pen(ctx, 500 + boil * 13, 0.55);
  const scared = mood === 'scared';
  paintShadow(ctx);
  // The far legs first, a shade darker; the trot swaps them each boil frame.
  const step = boil === 1 ? 2 : boil === 2 ? -2 : 0;
  paintLeg(pen, -12 - step, mix(HIDE_DARK, '#000000', 0.25));
  paintLeg(pen, 9 + step, mix(HIDE_DARK, '#000000', 0.25));
  paintTail(pen, boil);
  const body = paintBody(pen, ctx, boil);
  paintLeg(pen, -8 + step, HIDE_DARK);
  paintLeg(pen, 13 - step, HIDE_DARK);
  paintHead(pen, ctx, body, scared);
  if (crown) paintCrown(pen, ctx);
  return canvas;
}

/** A band of temple gold between the ears, with three points and a green stone. */
function paintCrown(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const crown = [{ x: 4, y: -11 }, { x: 5, y: -19 }, { x: 8.5, y: -14 }, { x: 12, y: -22 }, { x: 15.5, y: -14 }, { x: 19, y: -19 }, { x: 20, y: -10 }];
  const g = ctx.createLinearGradient(0, -22, 0, -10);
  g.addColorStop(0, '#fbe7a1');
  g.addColorStop(1, '#c08a24');
  ctx.fillStyle = g;
  ctx.beginPath();
  crown.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.stroke([...crown, crown[0]!], 1, INK, 0.9, false);
  pen.dot(12, -14.5, 1.8, '#3f9a6a');
  pen.dot(11.5, -15, 0.6, '#ffffff', 0.8);
}

function paintShadow(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(0, 22, 0, 0, 22, 26);
  g.addColorStop(0, 'rgba(40,30,20,0.32)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.save();
  ctx.translate(0, 22);
  ctx.scale(1, 0.2);
  ctx.fillStyle = g;
  ctx.fillRect(-28, -28, 56, 56);
  ctx.restore();
}

/** A short leg with a dark split hoof. */
function paintLeg(pen: Pen, x: number, color: string): void {
  const leg = [{ x: x - 3.4, y: 10 }, { x: x + 3.4, y: 10 }, { x: x + 3, y: 20 }, { x: x - 3, y: 20 }];
  pen.fill(leg, color, 1);
  pen.fill(ellipse(x, 20.5, 3.8, 2.2, 10), '#2a1c12', 1);
  pen.hair([{ x, y: 19 }, { x, y: 22 }], 0.7, PAPER_LINE, 0.6);
}
const PAPER_LINE = '#f2e6cf';

/** A little curly tail, bobbing with the trot. */
function paintTail(pen: Pen, boil: number): void {
  const bob = boil - 1;
  const curl: Pt[] = [];
  for (let t = 0; t <= 1; t += 0.08) {
    const a = t * Math.PI * 3.2;
    curl.push({ x: -22 - t * 5 - Math.sin(a) * 2.6, y: -3 + bob - Math.cos(a) * 2.6 + t * 2 });
  }
  pen.stroke(curl, 1.8, HIDE_DARK, 1, false);
}

/** The round body: lit from the top left, a paler belly and a soft crest of bristles down the back. */
function paintBody(pen: Pen, ctx: CanvasRenderingContext2D, boil: number): Pt[] {
  const rng = createRng(77 + boil * 5);
  const body: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    // A faint fuzz along the top only: a soft coat, never spikes.
    const fuzz = Math.sin(a) < -0.3 ? (rng() - 0.5) * 1.4 : 0;
    body.push({ x: -2 + Math.cos(a) * (21 + fuzz), y: 3 + Math.sin(a) * (16 + fuzz) });
  }
  const g = ctx.createRadialGradient(-8, -6, 2, -2, 3, 26);
  g.addColorStop(0, HIDE_LIGHT);
  g.addColorStop(0.55, HIDE);
  g.addColorStop(1, HIDE_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(body, () => {
    // The paler belly.
    const belly = ctx.createRadialGradient(0, 18, 0, 0, 18, 16);
    belly.addColorStop(0, rgba(HIDE_LIGHT, 0.8));
    belly.addColorStop(1, rgba(HIDE_LIGHT, 0));
    ctx.fillStyle = belly;
    ctx.fillRect(-20, 4, 40, 18);
    // Brush strokes of coat.
    for (let i = 0; i < 9; i++) {
      const x = -18 + i * 4 + rng() * 2;
      const y = -6 + rng() * 12;
      pen.hair([{ x, y }, { x: x - 3, y: y + 3 }], 0.8, HIDE_DARK, 0.35);
    }
  });
  // A soft, flat mane down the back: a dark band with a wavy edge, never spikes.
  const mane: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = -2.6 + i * 0.12;
    mane.push({ x: -2 + Math.cos(a) * 21, y: 3 + Math.sin(a) * 16 });
  }
  for (let i = 12; i >= 0; i--) {
    const a = -2.6 + i * 0.12;
    const r = 17.5 + (i % 2) * 1.2;
    mane.push({ x: -2 + Math.cos(a) * (r + 3), y: 3 + Math.sin(a) * r });
  }
  pen.fill(mane, HIDE_DARK, 0.85);
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95);
  return body;
}

function paintHead(pen: Pen, ctx: CanvasRenderingContext2D, body: readonly Pt[], scared: boolean): void {
  // Ears, the far one darker, pink inside.
  for (const [ex, dark] of [[7, true], [14, false]] as const) {
    const ear = [{ x: ex - 4, y: -9 }, { x: ex + 1, y: -19 }, { x: ex + 4, y: -8 }];
    pen.fill(ear, dark ? HIDE_DARK : HIDE, 1);
    pen.fill([{ x: ex - 2, y: -10 }, { x: ex + 1, y: -16 }, { x: ex + 2.5, y: -10 }], SNOUT, dark ? 0.5 : 0.85);
    pen.stroke([...ear], 1, INK, 0.9, false);
  }
  // The head bulges out of the body's front.
  const head = ellipse(12, 0, 12, 11, 24);
  const g = ctx.createRadialGradient(8, -5, 1, 12, 0, 14);
  g.addColorStop(0, HIDE_LIGHT);
  g.addColorStop(1, HIDE);
  pen.fill(head, HIDE, 1);
  ctx.fillStyle = g;
  ctx.beginPath();
  head.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Only the part of the head outside the body gets an outline.
  pen.stroke(head.filter((p) => !inside(body, p.x - 1.5, p.y)), 1.2, INK, 0.9, false);
  // Eyes looking ahead (or wide with worry when wet).
  for (const ex of [9.5, 16.5]) {
    const eye = ellipse(ex, -5, 3.3, scared ? 3.8 : 3, 14);
    pen.fill(eye, '#ffffff', 1);
    pen.stroke([...eye, eye[0]!], 0.7, INK, 0.8, false);
    const pr = scared ? 1.1 : 1.6;
    pen.dot(ex + (scared ? 0 : 1), -5 + (scared ? -0.6 : 0.4), pr, '#140f0a');
    pen.dot(ex + 1.3, -5.6, 0.5, '#ffffff', 0.9);
  }
  // Brows: frowning down at the snout, or raised.
  if (scared) {
    pen.stroke([{ x: 6.5, y: -11 }, { x: 11, y: -12.5 }], 1.4, HIDE_DARK, 1, false);
    pen.stroke([{ x: 14, y: -12.5 }, { x: 19, y: -11.5 }], 1.4, HIDE_DARK, 1, false);
  } else {
    pen.stroke([{ x: 6, y: -11.5 }, { x: 12, y: -8.5 }], 1.8, HIDE_DARK, 1, false);
    pen.stroke([{ x: 14, y: -8.5 }, { x: 20, y: -11 }], 1.8, HIDE_DARK, 1, false);
  }
  // The snout: a flat pink disc with two nostrils.
  const snout = ellipse(23, 3, 4.6, 5.4, 16);
  pen.fill(snout, SNOUT, 1);
  pen.stroke([...snout, snout[0]!], 1.1, INK, 0.9);
  pen.fill(ellipse(22.2, 1.4, 0.9, 1.4, 8), '#6e3d33', 1);
  pen.fill(ellipse(24.4, 4, 0.9, 1.4, 8), '#6e3d33', 1);
  // Mouth and two little tusks.
  if (scared) {
    pen.hair([{ x: 10, y: 8 }, { x: 12, y: 6.8 }, { x: 14, y: 8 }, { x: 16, y: 6.8 }, { x: 18, y: 8 }], 1.1, INK, 0.9);
    // Sweat drops.
    pen.dot(4, -10, 1.3, '#9cc6ea', 0.9);
    pen.dot(2.5, -6, 1, '#9cc6ea', 0.9);
  } else {
    pen.hair([{ x: 10, y: 8.5 }, { x: 14, y: 6.8 }, { x: 19, y: 8 }], 1.2, INK, 0.9);
  }
  for (const tx of [14, 18.5]) {
    const tusk = [{ x: tx - 1.1, y: 8 }, { x: tx + 1.1, y: 7.6 }, { x: tx + 1.6, y: 3.4 }];
    pen.fill(tusk, TUSK, 1);
    pen.stroke(tusk, 0.6, INK, 0.7, false);
  }
}

/** Point-in-polygon, to outline only the head's edge that stands clear of the body. */
function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
