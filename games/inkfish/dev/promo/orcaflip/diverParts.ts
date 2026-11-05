import { INK } from '../../../src/art/pen';
import { hash } from '../alvin/art/draw';
import { CAPTION_FONT } from '../captions';
import { drawDiver, regulatorOf } from '../diver/diver';
import { DIVER_SCALE } from '../diver/story';
import { VIDEO } from '../short';
import { scratchLayer } from './parts';
import { BEAM_LEN, torchHand, type DiverShot, type SinkState } from './poses';

/** The painted scuba diver from the lobster short, as this short's scientist: close up with a slate, and racing the sinking shark with a torch. */

const GLOVE = '#1a2128';
/** The hand on the slate, in the diver's own frame (the other is behind it). */
const SLATE_HAND = { x: 27, y: -30 } as const;
/** The slate's middle, width and height in the diver's own frame, and how it leans (against his own lean, so it faces us square). */
const SLATE = { x: 54, y: -60, w: 52, h: 66, tilt: -0.34 } as const;
/** His eyes in his own frame, drawn again close up (the pen's dots are too coarse at this size). */
const FACE = { x: 5, y: -83.5, ex: 6.2, r: 4.6 } as const;

/** Runs `draw` in the diver's own frame. */
function inDiver(ctx: CanvasRenderingContext2D, d: DiverShot, draw: () => void): void {
  ctx.save();
  ctx.translate(d.pose.x, d.pose.y);
  ctx.rotate(d.pose.rot);
  ctx.scale(DIVER_SCALE * d.scale, DIVER_SCALE * d.scale);
  draw();
  ctx.restore();
}

function diverBody(ctx: CanvasRenderingContext2D, d: DiverShot, boil: number): void {
  ctx.save();
  ctx.translate(d.pose.x, d.pose.y);
  ctx.scale(d.scale, d.scale);
  drawDiver(ctx, { ...d.pose, x: 0, y: 0 }, boil);
  ctx.restore();
}

/** The diver in the water's light: lit from above, dimmer and bluer lower down, the ink softened to a deep navy. */
function diverInWater(ctx: CanvasRenderingContext2D, d: DiverShot, boil: number): void {
  const c = scratchLayer();
  diverBody(c, d, boil);
  inDiver(c, d, () => {
    slate(c);
    glove(c);
    eyes(c);
  });
  const light = c.createLinearGradient(0, 500, 0, 1700);
  light.addColorStop(0, 'rgba(190,232,250,0.16)');
  light.addColorStop(0.5, 'rgba(24,96,150,0.18)');
  light.addColorStop(1, 'rgba(4,34,66,0.5)');
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = light;
  c.fillRect(0, 0, VIDEO.width, VIDEO.height);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(c.canvas, 0, 0);
}

/** A stream of bubbles rising from the regulator. */
function breath(ctx: CanvasRenderingContext2D, d: DiverShot, t: number): void {
  const m = regulatorOf({ ...d.pose, x: 0, y: 0 });
  const [x0, y0] = [d.pose.x + m.x * d.scale, d.pose.y + m.y * d.scale];
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const u = (t * 0.9 + i / 12) % 1;
    const r = d.scale * (2.5 + 5 * hash(i + 3)) * (0.7 + u);
    const x = x0 + d.scale * (26 * u * (hash(i) - 0.3) + 7 * Math.sin(u * 9 + i));
    const y = y0 - d.scale * 170 * u;
    ctx.fillStyle = 'rgba(210,240,252,0.2)';
    ctx.strokeStyle = `rgba(240,252,255,${0.85 * (1 - u * u)})`;
    ctx.lineWidth = Math.max(1.6, r * 0.18);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** A white dive slate: a small belly-up shark in pencil and a big question mark. */
function slate(ctx: CanvasRenderingContext2D): void {
  const { x, y, w, h, tilt } = SLATE;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 3);
  ctx.fillStyle = '#f4f1e6';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Ruled pencil notes.
  ctx.strokeStyle = 'rgba(40,50,60,0.55)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, -h / 2 + 7 + i * 4.5);
    for (let k = 1; k <= 8; k++) ctx.lineTo(-w / 2 + 6 + (k * (w - 12 - i * 10)) / 8, -h / 2 + 7 + i * 4.5 + (k % 2 ? -0.6 : 0.6));
    ctx.stroke();
  }
  // The shark as sketched: a long body, the fin down, belly up.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(18, -10);
  ctx.quadraticCurveTo(0, -15, -14, -10);
  ctx.lineTo(-21, -14);
  ctx.lineTo(-19, -9);
  ctx.lineTo(-21, -4);
  ctx.lineTo(-14, -8);
  ctx.quadraticCurveTo(0, -3, 18, -10);
  ctx.moveTo(-1, -6);
  ctx.lineTo(-5, -1);
  ctx.lineTo(-7, -6);
  ctx.stroke();
  ctx.fillStyle = '#c8281e';
  ctx.font = `700 26px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('?', 1, 22);
  ctx.restore();
}

/** The near hand on the slate's edge: the fingers over the front of it, so it's plainly held. */
function glove(ctx: CanvasRenderingContext2D): void {
  const { x, y } = SLATE_HAND;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const [fx, fy] = [x + 1.5 * i, y + (i - 1.5) * 4.4];
    for (const [width, colour] of [[4.8, INK], [3.2, GLOVE]] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(fx - 3, fy);
      ctx.lineTo(fx + 6, fy - 2.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Wide eyes behind the glass, round and clear at close range, a catchlight in each. */
function eyes(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(FACE.x, FACE.y);
  for (const k of [-1, 1]) {
    const x = k * FACE.ex;
    ctx.beginPath();
    ctx.arc(x, 0, FACE.r, 0, Math.PI * 2);
    ctx.fillStyle = '#fbf8ef';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 1.2, 0.3, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#5a7d4e';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 1.2, 0.3, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 0.3, -0.8, 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.restore();
}

/** The close shot: bubbles rising behind the head, the diver with the slate held out in front. */
export function drawCloseDiver(ctx: CanvasRenderingContext2D, d: DiverShot, boil: number, t: number): void {
  breath(ctx, d, t);
  diverInWater(ctx, d, boil);
}

/** The torch in the hand flung out ahead, its barrel along the arm. */
function torch(ctx: CanvasRenderingContext2D, d: DiverShot): void {
  const hand = torchHand(d.pose.kick);
  inDiver(ctx, d, () => {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(0.13);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#2a3138';
    ctx.beginPath();
    ctx.rect(-7, -26, 14, 32);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3b8';
    ctx.beginPath();
    ctx.moveTo(-8, -26);
    ctx.lineTo(-12, -35);
    ctx.lineTo(12, -35);
    ctx.lineTo(8, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

/** The beam: a soft cone from the lens, layers of it so its edges feather, fading out to nothing at its end. */
function beam(ctx: CanvasRenderingContext2D, s: SinkState): void {
  const a = Math.atan2(s.beamEnd.y - s.lens.y, s.beamEnd.x - s.lens.x);
  ctx.save();
  ctx.translate(s.lens.x, s.lens.y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, 0, BEAM_LEN, 0);
  g.addColorStop(0, 'rgba(255,246,190,0.2)');
  g.addColorStop(0.6, 'rgba(255,246,190,0.08)');
  g.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = g;
  for (const spread of [150, 125, 100, 78, 56]) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(BEAM_LEN, -spread);
    ctx.quadraticCurveTo(BEAM_LEN + 40, 0, BEAM_LEN, spread);
    ctx.lineTo(0, 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The diver kicking down after the shark, torch thrust out ahead, the beam dying short of it. */
export function drawChasingDiver(ctx: CanvasRenderingContext2D, s: SinkState, boil: number, t: number): void {
  beam(ctx, s);
  breath(ctx, s.diver, t);
  diverBody(ctx, s.diver, boil);
  torch(ctx, s.diver);
}
