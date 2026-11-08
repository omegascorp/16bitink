import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { BOTTLE_MOUTH, CAN_MOUTH } from './story';

/**
 * The old glass bottle and the dented can on the sand where fringeheads live:
 * each in two layers, the inside (behind the fish) and the glass or metal in
 * front, one pair per boil frame. Screen px.
 */

export interface PropArt {
  readonly back: readonly HTMLCanvasElement[];
  readonly front: readonly HTMLCanvasElement[];
}

const CY = BOTTLE_MOUTH.y;

/** The bottle's half width along its length: a rounded base, the body, the shoulder, the neck and its lip. */
function radiusAt(x: number): number {
  if (x < 270) return 75 + 20 * Math.sqrt(Math.max(0, 1 - ((270 - x) / 20) ** 2));
  if (x < 560) return 95;
  if (x < 640) return 37 + 58 * (0.5 + 0.5 * Math.cos((Math.PI * (x - 560)) / 80));
  if (x < BOTTLE_MOUTH.x - 14) return 36;
  return 44;
}

function bottleOutline(): Pt[] {
  const xs: number[] = [];
  for (let x = 250; x <= BOTTLE_MOUTH.x; x += 6) xs.push(x);
  if (xs[xs.length - 1] !== BOTTLE_MOUTH.x) xs.push(BOTTLE_MOUTH.x);
  return [...xs.map((x) => ({ x, y: CY - radiusAt(x) })), ...[...xs].reverse().map((x) => ({ x, y: CY + radiusAt(x) }))];
}

export function makeBottle(): PropArt {
  const outline = bottleOutline();
  const back: HTMLCanvasElement[] = [];
  const front: HTMLCanvasElement[] = [];
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const b = makeCanvas(VIDEO.width, VIDEO.height);
    const pb = new Pen(b.ctx, 50 + f * 19, 0.8);
    pb.fill(outline, '#16382c', 0.5);
    // A drift of sand inside, along the bottom of the body.
    const heap = [{ x: 262, y: CY + 70 }, ...Array.from({ length: 12 }, (_, i) => ({ x: 270 + i * 26, y: CY + 62 - 8 * Math.sin((i / 11) * Math.PI) })), { x: 566, y: CY + 80 }, { x: 560, y: CY + 95 }, { x: 270, y: CY + 95 }];
    pb.fill(heap, '#a8935f', 0.85);
    pb.stipple(heap, 260, () => 0.6, 1, '#3e3420');
    back.push(b.canvas);

    const c = makeCanvas(VIDEO.width, VIDEO.height);
    const pen = new Pen(c.ctx, 80 + f * 23, 1);
    // Green glass, with a darker edge where it's thickest.
    pen.fill(outline, '#7fc7a0', 0.24);
    pen.clipped(outline, () => {
      const g = c.ctx.createLinearGradient(0, CY - 95, 0, CY + 95);
      g.addColorStop(0, 'rgba(20,60,40,0.4)');
      g.addColorStop(0.2, 'rgba(20,60,40,0)');
      g.addColorStop(0.8, 'rgba(20,60,40,0)');
      g.addColorStop(1, 'rgba(20,60,40,0.45)');
      c.ctx.fillStyle = g;
      c.ctx.fillRect(240, CY - 100, 480, 200);
      // An old paper label, faded and peeling.
      const label = [{ x: 352, y: CY - 92 }, { x: 470, y: CY - 94 }, { x: 476, y: CY - 30 }, { x: 466, y: CY + 10 }, { x: 478, y: CY + 60 }, { x: 470, y: CY + 94 }, { x: 356, y: CY + 92 }, { x: 348, y: CY + 30 }, { x: 358, y: CY - 10 }];
      pen.fill(label, '#e8dcb8', 0.55);
      pen.hatch(label, 7, 0.9, 0.7, { color: '#8a7a54', alpha: 0.35 });
      pen.stroke([...label, label[0]!], 1.4, '#5a4a30', 0.6);
      // Algae and grime.
      pen.stipple(outline, 1400, (x, y) => (y > CY + 30 ? 0.7 : 0.15) * (x < 330 ? 1 : 0.6), 1.3, '#2f4a24');
    });
    // Barnacles on the glass.
    const rng = createRng(17);
    for (let i = 0; i < 6; i++) {
      const x = 290 + rng() * 240;
      const y = CY - 60 + rng() * 40;
      const r = 6 + rng() * 5;
      const cone = ellipse(x, y, r, r * 0.8, 10);
      pen.fill(cone, '#d9d2bd', 0.95);
      pen.dot(x, y, r * 0.35, '#5a5446');
      pen.stroke([...cone, cone[0]!], 1.2, INK, 0.9);
    }
    // Light catching the glass.
    pen.stroke(Array.from({ length: 14 }, (_, i) => ({ x: 286 + i * 22, y: CY - 70 })), 7, '#f4fff4', 0.45, false);
    pen.stroke(Array.from({ length: 8 }, (_, i) => ({ x: 300 + i * 30, y: CY - 52 })), 2.4, '#f4fff4', 0.35, false);
    pen.stroke([{ x: 575, y: CY - 74 }, { x: 610, y: CY - 50 }, { x: 645, y: CY - 30 }, { x: 690, y: CY - 28 }], 4, '#f4fff4', 0.4, false);
    pen.stroke([...outline, outline[0]!], 2.8, INK, 1);
    // The lip of the neck, seen a little from the side.
    const lip = ellipse(BOTTLE_MOUTH.x, CY, 9, 44, 24);
    pen.stroke([...lip, lip[0]!], 4.5, '#cfeedd', 0.55, false);
    pen.stroke([...lip, lip[0]!], 1.6, INK, 0.9);
    // Sand heaped against the base.
    const mound = [{ x: 220, y: CY + 98 }, { x: 300, y: CY + 82 }, { x: 420, y: CY + 88 }, { x: 560, y: CY + 84 }, { x: 640, y: CY + 98 }, { x: 640, y: CY + 130 }, { x: 220, y: CY + 130 }];
    pen.fill(mound, '#bda775', 1);
    pen.stipple(mound, 300, () => 0.7, 1.1, '#4a3e28');
    pen.stroke(mound.slice(0, 5), 2, INK, 0.7);
    front.push(c.canvas);
  }
  return { back, front };
}

// ---------------------------------------------------------------- the can

const CAN_LEN = 150;
const CAN_R = 44;

export function makeCan(): PropArt {
  const { x: mx, y: my } = CAN_MOUTH;
  const back: HTMLCanvasElement[] = [];
  const front: HTMLCanvasElement[] = [];
  for (let f = 0; f < BOIL_FRAMES; f++) {
    const b = makeCanvas(VIDEO.width, VIDEO.height);
    const pb = new Pen(b.ctx, 300 + f * 7, 0.6);
    pb.fill(ellipse(mx, my, 15, CAN_R, 22), '#120c0a', 1);
    back.push(b.canvas);

    const c = makeCanvas(VIDEO.width, VIDEO.height);
    const ctx = c.ctx;
    const pen = new Pen(ctx, 330 + f * 11, 1);
    const hole = ellipse(mx, my, 15, CAN_R, 22);
    // The body: from round the opening's lip to the closed end, a dent in the top.
    const lipArc = Array.from({ length: 11 }, (_, i) => {
      const a = -Math.PI / 2 - (i / 10) * Math.PI;
      return { x: mx + Math.cos(a) * 17, y: my + Math.sin(a) * (CAN_R + 1) };
    });
    const endArc = Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI / 2 - (i / 10) * Math.PI;
      return { x: mx + CAN_LEN + Math.cos(a) * 15, y: my + Math.sin(a) * CAN_R };
    });
    const top = [{ x: mx + 60, y: my - CAN_R + 2 }, { x: mx + 78, y: my - CAN_R + 12 }, { x: mx + 96, y: my - CAN_R + 3 }];
    const body = [...lipArc, ...endArc, ...[...top].reverse()];
    ctx.save();
    ctx.beginPath();
    body.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    hole.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, my - CAN_R, 0, my + CAN_R);
    g.addColorStop(0, '#c9655a');
    g.addColorStop(0.35, '#a6453b');
    g.addColorStop(1, '#4c201c');
    ctx.fillStyle = g;
    ctx.fill('evenodd');
    ctx.clip('evenodd');
    // A faded pale band round it, no brand; rust.
    ctx.fillStyle = 'rgba(236,226,200,0.55)';
    ctx.fillRect(mx + 20, my - 8, CAN_LEN, 18);
    pen.stipple(body, 900, (x) => (x > mx + 90 ? 0.8 : 0.35), 1.4, '#5a3216');
    pen.stroke([{ x: mx + 70, y: my - CAN_R + 6 }, { x: mx + 80, y: my - 10 }, { x: mx + 74, y: my + 20 }], 1.6, '#2a1210', 0.6);
    ctx.restore();
    pen.stroke([...hole, hole[0]!], 4, '#d8d6cc', 0.9, false);
    pen.stroke([...hole, hole[0]!], 1.4, INK, 0.9);
    pen.stroke([...body, body[0]!], 2.4, INK, 1);
    front.push(c.canvas);
  }
  return { back, front };
}

export function drawProp(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number): void {
  ctx.drawImage(frames[boil % frames.length]!, 0, 0);
}
