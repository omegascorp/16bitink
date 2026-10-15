import { bezier, C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { type Fish, jawAlong, MORAY_LEN, type Moray, type Pt, type SecondJaw } from './story';

/**
 * The moray as an X-ray: the game's drawing with its lower jaw hinged open
 * at the corner of its mouth (the moray's own mouth sits low on its head, so
 * the shared swimmer's gape doesn't fit it), its head and throat washed dark
 * like a radiograph, with the skull, the jaws and the second jaw in its
 * throat drawn over it in chalk. A meal in its mouth goes in between the
 * jaws and shows inside as a pale ghost.
 *
 * Everything is composed on its own layer, so the X-ray only lands on the
 * fish; the caller clips that layer to the rock it comes out of.
 */

const A = ANATOMY.moray;
const NOSE_X = xAt(A, 0);
const h = (t: number): number => heightAt(A, t);
/** The corner of the mouth, where the lower jaw hinges. */
const CORNER: Pt = { x: xAt(A, 0.15), y: C + h(0.15) * 0.1 };
/** The drawing's upper lip, and the cut just under its teeth that splits upper jaw from lower. */
const UPPER_LIP = bezier({ x: NOSE_X, y: C - 1 }, { x: xAt(A, 0.07), y: C + 1 }, CORNER, 12);
const CUT = UPPER_LIP.map((p, i) => ({ x: p.x, y: p.y + 3.4 * (1 - i / 12) }));
const LOWER_LIP = bezier({ x: xAt(A, 0.025), y: C + h(0.025) * 0.85 }, { x: xAt(A, 0.08), y: C + h(0.08) * 0.8 }, CORNER, 10);
/** The X-ray wash: solid up to the throat, fading out behind it. */
const XRAY_SOLID = 0.27;
const XRAY_END = 0.34;

export const BONE = '#e9eef8';
export const SECOND_JAW = '#ffc93d';
const XRAY = '14,26,51';
const NIGHT = '#0a1224';
const MOUTH = '#2a1418';

/** The drawing's px to the screen, for this moray (its head is rigid: no tail wave reaches it). */
export function texMatrix(m: Moray): DOMMatrix {
  const k = MORAY_LEN / (2 * A.hl);
  return new DOMMatrix().translate(m.x, m.y).rotate((-m.tilt * 180) / Math.PI).scale(k, k).translate(-C, -C);
}

/** The lower jaw's swing about the corner of the mouth, in the drawing's px. */
const jawSwing = (gape: number): DOMMatrix => new DOMMatrix().translate(CORNER.x, CORNER.y).rotate((gape * 180) / Math.PI).translate(-CORNER.x, -CORNER.y);

const trace = (ctx: CanvasRenderingContext2D, pts: readonly Pt[], move = true): void => {
  pts.forEach((p, i) => (i === 0 && move ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
};

/** Everything below the cut, forward of the corner: the lower jaw and chin. */
function lowerJawPath(ctx: CanvasRenderingContext2D, fresh = true): void {
  if (fresh) ctx.beginPath();
  trace(ctx, [...CUT].reverse());
  ctx.lineTo(NOSE_X + 16, CUT[0]!.y);
  ctx.lineTo(NOSE_X + 16, C + 44);
  ctx.lineTo(CORNER.x, C + 44);
  ctx.closePath();
}

const apply = (ctx: CanvasRenderingContext2D, m: DOMMatrix): void => ctx.setTransform(m);

export interface MorayLayers {
  readonly body: CanvasRenderingContext2D;
  readonly out: CanvasRenderingContext2D;
}

export interface Meal {
  readonly sprite: Sprite;
  readonly ghost: Sprite;
  readonly fish: Fish;
}

/** The X-ray on the body layer, only where the fish is: the dark wash, a meal's ghost, the skull and jaws, and the arrow down the throat. */
function xray(body: CanvasRenderingContext2D, S: DOMMatrix, boil: number, meal: Meal | null, arrow: number): void {
  body.save();
  body.globalCompositeOperation = 'source-atop';
  apply(body, S);
  const wash = body.createLinearGradient(NOSE_X, 0, xAt(A, XRAY_END), 0);
  wash.addColorStop(0, `rgba(${XRAY},0.9)`);
  wash.addColorStop(XRAY_SOLID / XRAY_END, `rgba(${XRAY},0.9)`);
  wash.addColorStop(1, `rgba(${XRAY},0)`);
  body.fillStyle = wash;
  body.fillRect(xAt(A, XRAY_END), C - 60, NOSE_X + 30 - xAt(A, XRAY_END), 120);
  if (meal && meal.fish.ghost > 0) {
    body.save();
    body.setTransform(1, 0, 0, 1, 0, 0);
    drawFishOn(body, meal.ghost, meal.fish, boil, 0.8 * meal.fish.ghost);
    body.restore();
  }
  drawSkull(body);
  drawLowerJaw(body);
  if (arrow > 0) drawThroatArrow(body, arrow);
  body.restore();
}

/** Draws the whole moray onto `layers.out` (cleared first): body, X-ray, jaws, meal and second jaw. */
export function composeMoray(layers: MorayLayers, sprite: Sprite, m: Moray, jaw: SecondJaw, boil: number, meal: Meal | null, arrow: number): void {
  const { body, out } = layers;
  const { width, height } = out.canvas;
  const S = texMatrix(m);
  const swing = S.multiply(jawSwing(m.gape));
  const pose: Pose = { j: 0, shape: 'moray', age: 0, x: m.x, y: m.y, length: MORAY_LEN, facing: 1, tilt: m.tilt, beat: m.beat, effort: m.effort };
  body.clearRect(0, 0, width, height);
  drawSwimmer(body, sprite, pose, boil, m.lump > 0 ? { lump: { size: m.lump, at: m.lumpAt } } : {});
  xray(body, S, boil, meal, arrow);

  out.save();
  out.setTransform(1, 0, 0, 1, 0, 0);
  out.clearRect(0, 0, width, height);
  // The inside of the open mouth, between the cut and where the lower jaw has swung to.
  apply(out, S);
  out.beginPath();
  trace(out, CUT);
  out.setTransform(swing);
  trace(out, [...CUT].reverse(), false);
  out.closePath();
  out.fillStyle = MOUTH;
  out.fill();
  // The meal, between the jaws.
  out.setTransform(1, 0, 0, 1, 0, 0);
  if (meal) drawFishOn(out, meal.sprite, meal.fish, boil);
  // The upper head and body as drawn, then the lower jaw swung open.
  out.save();
  apply(out, S);
  out.beginPath();
  out.rect(-4000, -4000, 8000, 8000);
  lowerJawPath(out, false);
  out.clip('evenodd');
  out.setTransform(1, 0, 0, 1, 0, 0);
  out.drawImage(body.canvas, 0, 0);
  out.restore();
  out.save();
  apply(out, swing);
  lowerJawPath(out);
  out.clip();
  out.setTransform(swing.multiply(S.inverse()));
  out.drawImage(body.canvas, 0, 0);
  out.restore();
  // The second jaw, over the head and into the mouth, never out past the fish.
  out.globalCompositeOperation = 'source-atop';
  apply(out, S);
  drawSecondJaw(out, jaw);
  out.restore();
}

/** A fish turned by its `face`. */
export function drawFishOn(ctx: CanvasRenderingContext2D, sprite: Sprite, f: Fish, boil: number, alpha = 1): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  const pose: Pose = { j: 0, shape: 'chromis', age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort };
  drawSwimmer(ctx, sprite, pose, boil, { alpha });
  ctx.restore();
}

/** A line of chalk in the drawing's px. */
function chalk(ctx: CanvasRenderingContext2D, colour: string, width: number, alpha: number): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** The skull, the upper jaw and its teeth, the gill arches, the spine and the throat. */
function drawSkull(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  chalk(ctx, BONE, 0.7, 0.85);
  // The braincase: over the eye, back to the nape.
  const top = Array.from({ length: 11 }, (_, i) => {
    const t = 0.01 + (0.2 * i) / 10;
    return { x: xAt(A, t), y: C - h(t) * 0.66 };
  });
  ctx.beginPath();
  trace(ctx, top);
  ctx.quadraticCurveTo(xAt(A, 0.23), C - h(0.21) * 0.2, xAt(A, 0.17), C - 1.2);
  trace(ctx, UPPER_LIP.map((p) => ({ x: p.x, y: p.y - 1.4 })).reverse().slice(3), false);
  ctx.stroke();
  // The upper jaw's bone and its needle teeth.
  ctx.beginPath();
  trace(ctx, UPPER_LIP);
  ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 1; i < 11; i += 2) {
    const p = UPPER_LIP[i]!;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 0.7, p.y + 2.8);
  }
  ctx.stroke();
  // The eye socket, and the eye in it.
  const ex = xAt(A, A.eye.t);
  const ey = C - h(A.eye.t) * 0.3;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(ex, ey, A.eye.r * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc(ex + 0.6, ey, A.eye.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Gill arches.
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.5;
  for (const t of [0.19, 0.215, 0.24]) {
    ctx.beginPath();
    ctx.moveTo(xAt(A, t) + 1, C - h(t) * 0.45);
    ctx.quadraticCurveTo(xAt(A, t) - 2.5, C + 2, xAt(A, t) + 1, C + h(t) * 0.55);
    ctx.stroke();
  }
  // The spine, starting behind the skull.
  ctx.beginPath();
  for (let t = 0.24; t < XRAY_END; t += 0.016) {
    const x = xAt(A, t);
    const y = C - h(t) * 0.42;
    ctx.moveTo(x, y - 1.6);
    ctx.lineTo(x, y + 1.6);
    ctx.moveTo(x - 1.4, y);
    ctx.lineTo(x + 1.4, y);
  }
  ctx.stroke();
  // The throat: a tube back from the corner of the mouth.
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([2.4, 1.8]);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(CORNER.x, CORNER.y + side * 3.5);
    ctx.lineTo(xAt(A, XRAY_END), C + 1.5 + side * 4.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** The lower jaw's bone and teeth (drawn swung open with it). */
function drawLowerJaw(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  chalk(ctx, BONE, 0.7, 0.85);
  ctx.beginPath();
  trace(ctx, LOWER_LIP);
  ctx.moveTo(xAt(A, 0.03), C + h(0.03) * 0.98);
  ctx.quadraticCurveTo(xAt(A, 0.1), C + h(0.1) * 0.85, xAt(A, 0.17), C + h(0.17) * 0.45);
  ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 1; i < 9; i += 2) {
    const p = LOWER_LIP[i]!;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 0.7, p.y - 2.6);
  }
  ctx.stroke();
  ctx.restore();
}

/** "Down": a dashed chalk arrow from the mouth back down the throat, drawn in as `u` runs 0 → 1. */
function drawThroatArrow(ctx: CanvasRenderingContext2D, u: number): void {
  const from = xAt(A, 0.03);
  const to = from + (xAt(A, 0.4) - from) * Math.min(1, u * 1.1);
  const y = C - 7.5;
  ctx.save();
  chalk(ctx, SECOND_JAW, 1.1, 1);
  ctx.setLineDash([2.6, 1.6]);
  ctx.beginPath();
  ctx.moveTo(from, y);
  ctx.lineTo(to, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(to + 2.6, y - 2.2);
  ctx.lineTo(to, y);
  ctx.lineTo(to + 2.6, y + 2.2);
  ctx.stroke();
  ctx.restore();
}

/** The second jaw's tip in the drawing's px. */
export const jawTip = (jaw: SecondJaw): Pt => ({ x: xAt(A, jawAlong(jaw)), y: C + 1.5 });
const JAW_LONG = 17;
/** Where its retractor muscles anchor, back in the body. */
const ANCHOR_X = xAt(A, 0.38);

/** One half of the second jaw: a hooked bone from the hinge to the tip, with teeth curving back into the throat. */
function jawBone(ctx: CanvasRenderingContext2D, hinge: Pt, angle: number, side: -1 | 1): void {
  ctx.save();
  ctx.translate(hinge.x, hinge.y);
  ctx.rotate(angle);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, side * 0.6);
    ctx.quadraticCurveTo(JAW_LONG * 0.55, side * 3.2, JAW_LONG, side * 0.4);
    for (let i = 0; i < 4; i++) {
      const x = JAW_LONG * (0.35 + 0.19 * i);
      const y = side * (2.4 - 0.5 * i);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 0.4, y - side * 1.9, x - 1.8, y - side * 2.4);
    }
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 2.1;
  ctx.stroke();
  path();
  ctx.strokeStyle = SECOND_JAW;
  ctx.lineWidth = 1.05;
  ctx.stroke();
  ctx.restore();
}

/** The second jaw: two hooked bones on muscles anchored back in the body, `open` spreading them. */
function drawSecondJaw(ctx: CanvasRenderingContext2D, jaw: SecondJaw): void {
  const tip = jawTip(jaw);
  const hinge = { x: tip.x - JAW_LONG, y: tip.y };
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = SECOND_JAW;
  ctx.lineWidth = 0.45;
  for (const dy of [-2.2, -0.8, 0.8, 2.2]) {
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y + dy * 0.5);
    ctx.lineTo(ANCHOR_X, C + 1.5 + dy * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  const spread = 0.42 * jaw.open;
  jawBone(ctx, hinge, -spread, -1);
  jawBone(ctx, hinge, spread, 1);
}
