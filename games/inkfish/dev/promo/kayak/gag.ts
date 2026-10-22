import { INK, Pen, type Pt } from '../../../src/art/pen';
import { lerp } from '../short';
import { drawBonk } from './effects';
import { ADRIAN, drawPaddler } from './people';
import { CHALK } from './scene';
import {
  bonkAt, cutawayAt, FOCUS, gagMood, KAYAK_LEN, onWhale, type Paddler, ringAt, ringDrawnAt, slideAt, toScreen, type View, type WhalePose,
} from './story';

/**
 * "A humpback's throat is too narrow for a person.": a cutaway of the
 * whale's shut head, held out of the water. A window cut into its side shows
 * the mouth inside, the baleen hanging from the roof, the water held in the
 * ballooned throat with Adrián floating in it, and, at the back, the throat
 * itself: a tube barely wider than his head. A chalk ring goes round it on
 * "throat"; the kayak slides back and bonks against it, twice; it won't go.
 */

/** The throat's opening, in the whale's frame, and its radius (a humpback's is about 38 cm across). */
export const THROAT: Pt = { x: -6, y: 56 };
export const THROAT_R = 19;
const TUBE_END: Pt = { x: -230, y: 92 };
/** The cutaway window: an ellipse over the mouth and throat, and a strip back along the tube. */
const WINDOW = { x: 185, y: 80, rx: 262, ry: 112, spin: 0.06 } as const;
const KAYAK_SCALE = 0.72;

const CAVITY = '#5a2a2e';
const CAVITY_DEEP = '#1c0b0d';
const CUT = '#8a7470';
const FLESH = '#b06a6a';
const WATER_IN = 'rgba(40,64,66,0.88)';

function windowPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(WINDOW.x, WINDOW.y, WINDOW.rx, WINDOW.ry, WINDOW.spin, 0, Math.PI * 2);
  // Back along the throat.
  const d = { x: TUBE_END.x - THROAT.x, y: TUBE_END.y - THROAT.y };
  const len = Math.hypot(d.x, d.y);
  const n = { x: (-d.y / len) * 46, y: (d.x / len) * 46 };
  ctx.moveTo(THROAT.x + 60 + n.x, THROAT.y + n.y);
  ctx.lineTo(TUBE_END.x + n.x, TUBE_END.y + n.y);
  ctx.lineTo(TUBE_END.x - n.x, TUBE_END.y - n.y);
  ctx.lineTo(THROAT.x + 60 - n.x, THROAT.y - n.y);
  ctx.closePath();
}

/** Into the whale's frame from the screen. */
function enterWhale(ctx: CanvasRenderingContext2D, v: View, w: WhalePose): void {
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
  ctx.translate(w.x, w.y);
  ctx.rotate(-w.tilt);
}

/** Where Adrián floats in the cutaway (world), slid back towards the throat by `slide`. */
export function adrianInside(w: WhalePose, s: number, t: number): Paddler {
  // Along the water held in the throat, level in the world: from the throat's mouth out towards the snout.
  const along = { x: Math.cos(w.tilt), y: Math.sin(w.tilt) };
  const bow = (KAYAK_LEN / 2) * KAYAK_SCALE;
  const d = lerp(bow + 190, bow + THROAT_R * 0.2, slideAt(s));
  const local = { x: THROAT.x + along.x * d, y: THROAT.y + along.y * d + 4 };
  const at = onWhale(w, local);
  const bonk = bonkAt(s);
  return { x: at.x, y: at.y + 3 * Math.sin(t * 5), tilt: 0.12 * bonk * Math.sin(s * 60), facing: -1, scale: KAYAK_SCALE, stroke: 0, ...gagMood(s) };
}

export function drawCutaway(ctx: CanvasRenderingContext2D, v: View, w: WhalePose, s: number, t: number, boil: number): void {
  const shown = cutawayAt(s);
  if (shown <= 0.01) return;
  const pen = new Pen(ctx, 6061 + boil * 977, 1.3);
  ctx.save();
  const base = ctx.getTransform();
  ctx.globalAlpha = shown;
  enterWhale(ctx, v, w);
  ctx.save();
  windowPath(ctx);
  ctx.clip();
  // The cavity: dark red, darkest at the back; the cut through the snout above the lip.
  const g = ctx.createLinearGradient(THROAT.x, 0, WINDOW.x + WINDOW.rx, 0);
  g.addColorStop(0, CAVITY_DEEP);
  g.addColorStop(0.4, CAVITY);
  g.addColorStop(1, '#6e3a3c');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -100, 800, 400);
  const roof = [{ x: -300, y: -200 }, { x: 500, y: -200 }, { x: 500, y: -14 }, { x: 212, y: -20 }, { x: -20, y: -6 }, { x: -300, y: 20 }];
  pen.fill(roof, CUT, 1);
  pen.hatch(roof, 7, 0.8, 0.9, { alpha: 0.3 });
  pen.stroke(roof.slice(2), 2.6, INK, 1, false);
  // Baleen hanging from the roof.
  for (let x = -10; x < 470; x += 10) {
    const top = -14 + (x / 470) * -6;
    const len = 52 - (x / 470) * 22;
    pen.hair([{ x, y: top }, { x: x - 8, y: top + len }], 3.4, '#1a1412', 0.9);
  }
  drawThroatTube(ctx, pen, s);
  // The water held in the throat, level in the world.
  const along = { x: Math.cos(w.tilt), y: Math.sin(w.tilt) };
  const down = { x: -Math.sin(w.tilt), y: Math.cos(w.tilt) };
  const c = { x: THROAT.x + down.x * 6, y: THROAT.y + down.y * 6 };
  const water = [
    { x: c.x - along.x * 900, y: c.y - along.y * 900 }, { x: c.x + along.x * 900, y: c.y + along.y * 900 },
    { x: c.x + along.x * 900 + down.x * 600, y: c.y + along.y * 900 + down.y * 600 }, { x: c.x - along.x * 900 + down.x * 600, y: c.y - along.y * 900 + down.y * 600 },
  ];
  pen.fill(water, WATER_IN, 1);
  pen.hair([water[0]!, water[1]!], 2.2, '#9bb4ae', 0.7);
  // Adrián, in the world's frame (the clip stays).
  ctx.restore();
  ctx.save();
  windowPath(ctx);
  ctx.clip();
  ctx.setTransform(base);
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
  drawPaddler(ctx, adrianInside(w, s, t), ADRIAN, boil, t, 11);
  ctx.restore();
  // The window's cut edge.
  ctx.save();
  windowPath(ctx);
  ctx.lineWidth = 7;
  ctx.strokeStyle = FLESH;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.setLineDash([18, 10]);
  ctx.stroke();
  ctx.restore();
  drawRing(ctx, s);
  ctx.restore();
  const ring = toScreen(v, onWhale(w, THROAT));
  drawBonk(ctx, { x: ring.x, y: ring.y - 10 * v.zoom }, 34 * v.zoom, bonkAt(s));
}

/** The throat: a narrow tube going back into the body, pink-walled, dark inside, its mouth a small ring. */
function drawThroatTube(ctx: CanvasRenderingContext2D, pen: Pen, s: number): void {
  const d = { x: TUBE_END.x - THROAT.x, y: TUBE_END.y - THROAT.y };
  const len = Math.hypot(d.x, d.y);
  const n = { x: -d.y / len, y: d.x / len };
  const squash = 1 - 0.25 * bonkAt(s);
  const r = THROAT_R * squash;
  const wall = (k: number): Pt[] => [{ x: THROAT.x + n.x * r * k, y: THROAT.y + n.y * r * k }, { x: TUBE_END.x + n.x * r * 0.8 * k, y: TUBE_END.y + n.y * r * 0.8 * k }];
  const tube = [...wall(1.25), ...wall(-1.25).reverse()];
  pen.fill(tube, FLESH, 1);
  pen.fill([...wall(0.75), ...wall(-0.75).reverse()], CAVITY_DEEP, 1);
  pen.stroke(wall(1.25), 2.2, INK);
  pen.stroke(wall(-1.25), 2.2, INK);
  ctx.save();
  ctx.translate(THROAT.x, THROAT.y);
  ctx.rotate(Math.atan2(d.y, d.x));
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 1.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0c0405';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** The chalk ring round the throat's mouth, drawn round on "throat", wobbling at each bonk. */
function drawRing(ctx: CanvasRenderingContext2D, s: number): void {
  const shown = ringAt(s);
  const drawn = ringDrawnAt(s);
  if (shown <= 0.01 || drawn <= 0.01) return;
  const wob = 1 + 0.2 * bonkAt(s) * Math.sin(s * 70);
  ctx.save();
  ctx.translate(THROAT.x, THROAT.y);
  ctx.globalAlpha *= shown;
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 40 * wob, 44 / wob, 0.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * drawn);
  ctx.stroke();
  ctx.restore();
}
