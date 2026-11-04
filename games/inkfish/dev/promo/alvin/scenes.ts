import { PAPER } from '../../../src/art/pen';
import { type TextInk, drawTextLine } from '../captions';
import { drawAlvin } from './art/alvin';
import { crewPorts } from './art/crewPort';
import { blob } from './art/draw';
import { stencil } from './art/stencil';
import { fishPose, onFish } from './art/swordfish';
import { descentAt, hookAt, portsAt, swordAt, SWORD_PERSP, SWORD_ROLL, SWORD_YAW } from './poses';
import { TEXT } from './script';
import { depthAt, nameAt, placeAt, sizeAt, STUCK_AT, usDepthAt, usSizeAt, yearAt } from './story';
import { drawStuck } from './stuck';
import { depths, seabed, shafts, specks, tint, vignette, waterGradient } from './water';
import { VIDEO } from '../short';

/** The first four scenes: frame 1 and the seam, the descent, the portholes and the wrenching fish. */

const LIGHT_TEXT: TextInk = { fill: PAPER, halo: '#041a30' };

function say(ctx: CanvasRenderingContext2D, text: string, line: { readonly y: number; readonly size: number }, alpha: number): void {
  drawTextLine(ctx, text, VIDEO.width / 2, line.y, line.size, 700, alpha, LIGHT_TEXT);
}

function wash(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** Frame 1: the swordfish driving its sword into the white sub's side; also the sword flashing in at the loop's end. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const h = hookAt(t);
  waterGradient(ctx, '#2478ad', '#06294a');
  shafts(ctx, 0.75, t);
  depths(ctx, '3,20,44', 0.5);
  seabed(ctx, 1640, '16,44,70', 0.95);
  specks(ctx, t, 36, -26, 0.3);
  drawStuck(ctx, h, boil, t * 9);
  vignette(ctx, 0.4);
  wash(ctx, '#020a16', h.dark);
  wash(ctx, '#ffffff', h.flash);
}

/** Black water, the little sub lit by its own lamps, sinking; the year, the depth, the place. */
export function drawDescent(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const d = descentAt(t);
  waterGradient(ctx, tint('#0a3a66', '#02070f', d.depth), tint('#031a30', '#010305', d.depth));
  specks(ctx, t, 60, -90 - 160 * d.depth, 0.35);
  blob(ctx, d.sub.x + 60, d.sub.y + 30, 380, 280, 0, '120,190,230', 0.2);
  drawAlvin(ctx, { x: d.sub.x, y: d.sub.y, len: 420, rot: d.rot }, { lit: 0.5, beams: 1, prop: t * 8, reach: 150, port: crewPorts([{ shock: 0, joy: 0 }]) }, boil);
  vignette(ctx, 0.7);
  say(ctx, '1967', TEXT.year, yearAt(t) + 0);
  say(ctx, '610 m', TEXT.depth, depthAt(t));
  say(ctx, '2,000 ft', TEXT.depthUs, usDepthAt(t));
  say(ctx, 'off Florida', TEXT.place, placeAt(t));
}

/** Close on the sub's front: three portholes, three faces in warm light, the name on the hull. */
export function drawPorts(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const p = portsAt(t);
  waterGradient(ctx, '#0a3458', '#02101e');
  seabed(ctx, 1680, '12,36,60', 0.95);
  const sway = 6 * Math.sin(t * 1.1);
  drawAlvin(ctx, { x: -945 + sway, y: 700 + 4 * Math.sin(t * 0.8) + 18 * p.jolt, len: 4000, rot: 0.003 * Math.sin(t) }, { lit: 1, beams: 0.3, prop: t * 6, port: crewPorts(p.faces, p.jolt) }, boil);
  stencil(ctx, 'ALVIN', VIDEO.width / 2 + sway, TEXT.name.y - TEXT.name.size * 0.72, TEXT.name.size * 0.72, '#233a56', nameAt(t));
  vignette(ctx, 0.4);
}

/** The fish wrenching and wiggling, stuck: a very big close-up of the swordfish on the white hull. */
export function drawSword(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const s = swordAt(t);
  waterGradient(ctx, '#0f4a7c', '#031428');
  shafts(ctx, 0.45, t);
  depths(ctx, '2,14,32', 0.5);
  seabed(ctx, 1640, '12,36,60', 0.95);
  specks(ctx, t, 30, -20, 0.25);
  drawStuck(ctx, s, boil, t * 9);
  drawWiggle(ctx, t, s.fishLen, s.a, s.tip);
  vignette(ctx, 0.45);
  say(ctx, '2.4 m', TEXT.size, sizeAt(t));
  say(ctx, '8 ft', TEXT.sizeUs, usSizeAt(t));
}

/** Little curved marks round the fish's head and tail, showing the wiggle (after "STUCK"). */
function drawWiggle(ctx: CanvasRenderingContext2D, t: number, len: number, a: number, tip: { readonly x: number; readonly y: number }): void {
  const on = Math.min(1, Math.max(0, (t - STUCK_AT + 0.1) / 0.2));
  if (on <= 0) return;
  const fish = fishPose({ tip, len, a, yaw: SWORD_YAW, roll: SWORD_ROLL, persp: SWORD_PERSP });
  const pts = [onFish(fish, { x: 20, y: -18, z: 0 }), onFish(fish, { x: -58, y: -36, z: 0 }), onFish(fish, { x: -58, y: 36, z: 0 })];
  ctx.save();
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.8 * on * (0.5 + 0.5 * Math.sin(t * 30));
  pts.forEach((p, i) => {
    for (const r of [34, 58]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, a + Math.PI * (i === 0 ? -0.2 : 0.5) , a + Math.PI * (i === 0 ? 0.2 : 1.1));
      ctx.stroke();
    }
  });
  ctx.restore();
}
