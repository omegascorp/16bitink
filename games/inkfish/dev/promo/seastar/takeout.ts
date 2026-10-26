import { INK, Pen } from '../../../src/art/pen';
import { type Pt, pt, ring } from './geom';

/**
 * The aside, as an ink inset: "like eating takeout in the parking lot". A
 * card pops in at the top of the frame: inside a car at dusk, a takeout box
 * on the dashboard, a little sea star at the wheel with noodles on a
 * chopstick, and the parking lot through the windshield (lines, a lamp, a
 * parked car). `amount` 0 .. 1 pops it in and out.
 */

export const INSET = { x: 540, y: 520, w: 820, h: 430 } as const;

const SKY = '#e9b98a';
const SKY_LOW = '#f3dcb8';
const ASPHALT = '#57565c';
const CAR_IN = '#1d1c22';
const DASH = '#2a2830';
const BOX = '#fbf7ee';
const STAR = '#d9622a';

export function drawTakeout(ctx: CanvasRenderingContext2D, amount: number, t: number, boil: number): void {
  if (amount <= 0.01) return;
  const pop = amount < 1 ? 0.6 + 0.4 * amount + 0.08 * Math.sin(amount * Math.PI) : 1;
  const pen = new Pen(ctx, 1201 + boil * 17, 0.9);
  const { w, h } = INSET;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount * 1.4);
  ctx.translate(INSET.x, INSET.y);
  ctx.rotate(-0.03 + 0.02 * (1 - amount));
  ctx.scale(pop, pop);
  ctx.translate(-w / 2, -h / 2);
  const card = [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)];
  pen.fill(card.map((p) => pt(p.x + 14, p.y + 16)), '#000000', 0.45);
  pen.fill(card, '#f4eddc', 1);
  const inner = [pt(18, 18), pt(w - 18, 18), pt(w - 18, h - 18), pt(18, h - 18)];
  pen.clipped(inner, () => drawCarScene(ctx, pen, w, h, t));
  pen.stroke([...inner, inner[0]!], 3, INK, 0.9);
  pen.stroke([...card, card[0]!], 4, INK, 1);
  ctx.restore();
}

function drawCarScene(ctx: CanvasRenderingContext2D, pen: Pen, w: number, h: number, t: number): void {
  // Outside: a dusky sky over the lot.
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  g.addColorStop(0, SKY);
  g.addColorStop(1, SKY_LOW);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const horizon = h * 0.42;
  pen.fill([pt(0, horizon), pt(w, horizon), pt(w, h), pt(0, h)], ASPHALT, 0.9);
  // A low store front and a lamp post.
  pen.fill([pt(90, horizon), pt(90, horizon - 70), pt(520, horizon - 70), pt(520, horizon)], '#8a6f63', 0.85);
  pen.stroke([pt(90, horizon - 70), pt(520, horizon - 70)], 2.4, INK, 0.8);
  for (let x = 120; x < 500; x += 70) pen.fill([pt(x, horizon - 50), pt(x + 44, horizon - 50), pt(x + 44, horizon - 18), pt(x, horizon - 18)], '#f6d67e', 0.85);
  pen.stroke([pt(640, horizon + 20), pt(640, 70)], 5, INK, 0.9);
  pen.stroke([pt(640, 70), pt(600, 64)], 5, INK, 0.9);
  pen.fill(ring(596, 72, 22, 9, 14), '#fff1b0', 0.95);
  // Parking lines running away, and a parked car.
  for (let i = -3; i <= 4; i++) {
    const x0 = w / 2 + i * 70;
    const x1 = w / 2 + i * 190;
    pen.stroke([pt(x0, horizon + 6), pt(x1, h * 0.95)], 4, '#f2efe6', 0.85, false);
  }
  const car = [pt(560, horizon + 54), pt(590, horizon + 20), pt(690, horizon + 18), pt(730, horizon + 52), pt(760, horizon + 58), pt(760, horizon + 84), pt(540, horizon + 84), pt(540, horizon + 60)];
  pen.fill(car, '#6f8fb3', 0.95);
  pen.stroke([...car, car[0]!], 2.4, INK, 0.85);
  pen.fill(ring(585, horizon + 86, 15, 15, 12), INK, 1);
  pen.fill(ring(720, horizon + 86, 15, 15, 12), INK, 1);
  // Inside the car: roof, pillars, the dashboard.
  pen.fill([pt(0, 0), pt(w, 0), pt(w, 34), pt(0, 34)], CAR_IN, 1);
  pen.fill([pt(0, 0), pt(70, 0), pt(150, h), pt(0, h)], CAR_IN, 1);
  pen.fill([pt(w, 0), pt(w - 70, 0), pt(w - 150, h), pt(w, h)], CAR_IN, 1);
  const dash = [pt(0, h * 0.7), pt(w * 0.3, h * 0.64), pt(w * 0.7, h * 0.64), pt(w, h * 0.7), pt(w, h), pt(0, h)];
  pen.fill(dash, DASH, 1);
  pen.stroke(dash.slice(0, 4), 3.4, '#45424c', 0.9);
  // The takeout box on the dashboard, steam curling up.
  const bx = w * 0.62;
  const by = h * 0.65;
  const box = [pt(bx - 62, by - 120), pt(bx + 62, by - 120), pt(bx + 46, by), pt(bx - 46, by)];
  pen.fill(box, BOX, 1);
  pen.fill([pt(bx - 62, by - 120), pt(bx - 30, by - 150), pt(bx, by - 120)], '#ece5d6', 1);
  pen.fill([pt(bx + 62, by - 120), pt(bx + 30, by - 150), pt(bx, by - 120)], '#e2dac9', 1);
  pen.stroke([...box, box[0]!], 3, INK, 1);
  pen.stroke([pt(bx - 62, by - 120), pt(bx - 30, by - 150), pt(bx, by - 120), pt(bx + 30, by - 150), pt(bx + 62, by - 120)], 2.6, INK, 0.9);
  pen.circle(bx, by - 62, 20, 3, '#c83a2e');
  pen.stroke([pt(bx - 60, by - 120), pt(bx, by - 190), pt(bx + 60, by - 120)], 2, '#6b6b70', 0.9);
  for (let i = 0; i < 3; i++) {
    const s: Pt[] = [];
    for (let k = 0; k <= 8; k++) s.push(pt(bx - 30 + i * 28 + 10 * Math.sin(k * 0.9 + t * 6 + i), by - 160 - k * 9));
    pen.hair(s, 2.4, '#ffffff', 0.55);
  }
  // A little sea star at the wheel, noodles on a chopstick.
  const sx = w * 0.27;
  const sy = h * 0.86;
  const star: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? 92 : 40;
    star.push(pt(sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.9));
  }
  pen.fill(star, STAR, 1);
  pen.clipped(star, () => {
    for (let i = 0; i < 14; i++) pen.dot(sx + Math.cos(i * 2.4) * (12 + (i % 5) * 13), sy + Math.sin(i * 2.4) * (12 + (i % 5) * 11), 5, '#f4e6c8', 0.95);
  });
  pen.stroke([...star, star[0]!], 3.2, INK, 1);
  const wheel = ring(sx - 10, h * 0.98, 150, 70, 30);
  pen.stroke([...wheel.slice(15), wheel[0]!], 14, '#111015', 1, false);
  const tip = pt(sx + 70, sy - 70);
  pen.stroke([pt(sx + 20, sy - 30), pt(tip.x + 40, tip.y - 70)], 4, '#b88a52', 1, false);
  pen.stroke([pt(sx + 32, sy - 26), pt(tip.x + 54, tip.y - 64)], 4, '#b88a52', 1, false);
  for (let i = 0; i < 4; i++) pen.hair([pt(tip.x + 38 + i * 4, tip.y - 62), pt(tip.x + 30 + i * 6, tip.y - 20 + i * 6)], 2.6, '#f2d78a', 1);
}
