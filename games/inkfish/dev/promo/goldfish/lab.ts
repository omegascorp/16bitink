import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/fish/kit';
import { arc, livePen, prop, type Prop, roundRect, WATER_DEEP, WATER_TOP, WOOD, WOOD_DARK } from './ink';
import { CHUTE, LEVER, paddleAt, TANK } from './story';

/**
 * The lab, in its own coordinates (the screen's, once the camera is there):
 * a tiled wall, the bench, the test tank (water and gravel behind the fish,
 * the glass and its frame in front), the lever on the tank wall wired to the
 * feeder on the rim, the pellets, and the scientist's sleeve and hand.
 */

const FRAME = '#2d3036';
const BRASS = '#d4a243';
const PELLET = '#a8612b';
const SKIN = '#e8b896';
const COAT = '#fbfaf6';
const { x0, x1, y0, y1 } = TANK;

/** The wall's tiles, faint, fading in from the edge the camera comes over (`x` lab px of the screen's left edge). */
export function drawTiles(ctx: CanvasRenderingContext2D, left: number): void {
  const step = 135;
  ctx.save();
  ctx.strokeStyle = '#6f8790';
  ctx.lineWidth = 2;
  for (let y = 300; y < y1; y += step) {
    for (let x = Math.floor(left / step) * step; x < left + 1080 + step; x += step) {
      const fade = Math.max(0, Math.min(1, (x + 60) / 240)) * Math.max(0, Math.min(1, (y - 260) / 260));
      if (fade <= 0) continue;
      ctx.globalAlpha = 0.16 * fade;
      ctx.strokeRect(x + 3, y + 3, step - 6, step - 6);
    }
  }
  ctx.restore();
}

/** Waterweed: a few strap leaves rising from the gravel. */
function eelgrass(pen: Pen, x: number, height: number, rng: () => number): void {
  for (let i = 0; i < 5; i++) {
    const lean = (rng() - 0.5) * 70;
    const h = height * (0.6 + rng() * 0.4);
    const base = { x: x + i * 9, y: TANK.gravel + 10 };
    const pts = Array.from({ length: 8 }, (_, k) => {
      const f = k / 7;
      return { x: base.x + lean * f * f + 8 * Math.sin(f * 4 + i), y: base.y - h * f };
    });
    const leaf = [...pts.map((p, k) => ({ x: p.x - 6 * (1 - k / 8), y: p.y })), ...[...pts].reverse().map((p, k) => ({ x: p.x + 6 * (k / 8), y: p.y }))];
    pen.fill(leaf, '#6f9e5a', 0.7);
    pen.stroke(pts, 1.3, '#2f4f2b', 0.85, false);
  }
}

/** Behind the fish: the bench, the water, the gravel, the weed, the airstone, and the lever's bracket and wire. */
export function makeTankBack(): Prop {
  return prop(-40, 560, 1160, 640, 31, (pen, ctx, rng) => {
    // The bench: a plank like the shelf at home.
    const top = y1 + 2;
    pen.fill([{ x: 0, y: top }, { x: 1120, y: top }, { x: 1120, y: top + 40 }, { x: 0, y: top + 40 }], WOOD, 0.75);
    pen.fill([{ x: 0, y: top + 26 }, { x: 1120, y: top + 26 }, { x: 1120, y: top + 40 }, { x: 0, y: top + 40 }], WOOD_DARK, 0.55);
    for (let i = 0; i < 7; i++) {
      const y = top + 6 + i * 3.2 + rng() * 2;
      pen.hair([{ x: 0, y }, { x: 500 + rng() * 300, y: y + rng() * 2 }, { x: 1120, y: y + 1 }], 0.8, WOOD_DARK, 0.5);
    }
    pen.stroke([{ x: 0, y: top }, { x: 1120, y: top }], 2.6);
    pen.stroke([{ x: 0, y: top + 40 }, { x: 1120, y: top + 40 }], 2.2);
    // The joint with the shelf at home.
    pen.stroke([{ x: 1, y: top }, { x: 1, y: top + 40 }], 1.6, WOOD_DARK, 0.8, false);
    // Water, pale at the top and deeper below, with a few shafts of light.
    const water = [{ x: x0 + 6, y: TANK.water }, { x: x1 - 6, y: TANK.water }, { x: x1 - 6, y: y1 - 10 }, { x: x0 + 6, y: y1 - 10 }];
    const wash = ctx.createLinearGradient(0, TANK.water, 0, y1);
    wash.addColorStop(0, WATER_TOP);
    wash.addColorStop(1, WATER_DEEP);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = wash;
    ctx.fillRect(x0 + 6, TANK.water, x1 - x0 - 12, y1 - 10 - TANK.water);
    ctx.restore();
    pen.clipped(water, () => {
      for (const sx of [260, 420, 610]) {
        pen.fill([{ x: sx, y: TANK.water }, { x: sx + 60, y: TANK.water }, { x: sx - 40, y: TANK.gravel }, { x: sx - 120, y: TANK.gravel }], '#ffffff', 0.12);
      }
      // The back glass: a soft vertical hatch.
      for (let x = x0 + 20; x < x1 - 10; x += 26) pen.hair([{ x, y: TANK.water + 8 }, { x: x - 8, y: TANK.gravel }], 0.7, '#3d6f7a', 0.12);
    });
    // The surface line, and gravel along the bottom.
    pen.stroke([{ x: x0 + 6, y: TANK.water }, { x: x1 - 6, y: TANK.water }], 1.6, '#2d4c55', 0.8, false);
    pen.fill([{ x: x0 + 6, y: TANK.gravel }, { x: x1 - 6, y: TANK.gravel - 6 }, { x: x1 - 6, y: y1 - 10 }, { x: x0 + 6, y: y1 - 10 }], '#d8bf94', 0.85);
    for (let i = 0; i < 170; i++) {
      const x = x0 + 14 + rng() * (x1 - x0 - 28);
      const y = TANK.gravel + 4 + rng() * (y1 - TANK.gravel - 18);
      const r = 5 + rng() * 6;
      const stone = ellipse(x, y, r * 1.3, r * 0.85, 10);
      pen.fill(stone, ['#b58a5a', '#8d6e57', '#c9a36f', '#9a9aa0', '#e0c49a'][Math.floor(rng() * 5)]!, 0.9);
      pen.hair([...stone, stone[0]!], 0.8, INK, 0.65);
    }
    eelgrass(pen, 170, 260, rng);
    eelgrass(pen, 330, 170, rng);
    // The airstone at the back left.
    const stone = roundRect(214, TANK.gravel - 18, 44, 22, 8);
    pen.fill(stone, '#9aa3a8', 1);
    pen.stroke([...stone, stone[0]!], 1.8);
    pen.stroke([{ x: 236, y: TANK.gravel - 18 }, { x: 236, y: TANK.water - 30 }, { x: 250, y: y0 - 20 }], 2, '#5b6770', 0.9, false);
    // The lever's bracket on the right wall, and its wire up to the feeder.
    const { pivot } = LEVER;
    const bracket = [{ x: x1 - 6, y: pivot.y - 16 }, { x: pivot.x - 6, y: pivot.y - 8 }, { x: pivot.x - 6, y: pivot.y + 8 }, { x: x1 - 6, y: pivot.y + 16 }];
    pen.fill(bracket, '#8b9298', 1);
    pen.stroke([...bracket, bracket[0]!], 2);
    pen.stroke([{ x: x1 - 14, y: pivot.y - 16 }, { x: x1 - 14, y: y0 + 6 }, { x: x1 - 40, y: y0 - 30 }], 1.8, '#5b6770', 0.9, false);
  });
}

/** In front of the fish: a faint water tint, the glass with its gleams, and the black frame top and bottom. */
export function makeTankFront(): Prop {
  return prop(80, 600, 920, 540, 32, (pen) => {
    pen.fill([{ x: x0 + 6, y: TANK.water }, { x: x1 - 6, y: TANK.water }, { x: x1 - 6, y: y1 }, { x: x0 + 6, y: y1 }], '#6aa6ad', 0.07);
    for (const [gx, w] of [[x0 + 60, 26], [x0 + 104, 8], [x1 - 120, 14]] as const) {
      pen.fill([{ x: gx, y: y0 + 30 }, { x: gx + w, y: y0 + 30 }, { x: gx + w - 90, y: y1 - 40 }, { x: gx - 90, y: y1 - 40 }], PAPER_FILL, 0.28);
    }
    for (const [bx, by, bh] of [[x0 - 10, y0 - 10, 26], [x0 - 10, y1 - 16, 22]] as const) {
      const bar = [{ x: bx, y: by }, { x: x1 + 10, y: by }, { x: x1 + 10, y: by + bh }, { x: bx, y: by + bh }];
      pen.fill(bar, FRAME, 0.9);
      pen.hair([{ x: bx + 6, y: by + 5 }, { x: x1 + 4, y: by + 5 }], 1.4, '#8d939b', 0.8);
      pen.stroke([...bar, bar[0]!], 2.2);
    }
    pen.stroke([{ x: x0, y: y0 + 16 }, { x: x0, y: y1 - 16 }], 3);
    pen.stroke([{ x: x1, y: y0 + 16 }, { x: x1, y: y1 - 16 }], 3);
    pen.stroke([{ x: x0 + 9, y: y0 + 20 }, { x: x0 + 9, y: y1 - 20 }], 1, '#7fb0b8', 0.8, false);
  });
}

/** Bubbles: inked rings with a glint. */
export function drawBubbles(ctx: CanvasRenderingContext2D, boil: number, bubbles: readonly { readonly x: number; readonly y: number; readonly r: number }[]): void {
  const pen = livePen(ctx, 37, boil, 0.4);
  for (const b of bubbles) {
    pen.fill(ellipse(b.x, b.y, b.r, b.r, 12), '#eaf6f5', 0.5);
    pen.hair([...ellipse(b.x, b.y, b.r, b.r, 12), { x: b.x + b.r, y: b.y }], 1.3, '#2d4c55', 0.85);
    pen.dot(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, PAPER_FILL, 0.9);
  }
}

/** The lever: an arm hanging from its pivot to a brass paddle, swung by `angle` (radians from straight down). */
export function drawLever(ctx: CanvasRenderingContext2D, boil: number, angle: number): void {
  const pen = livePen(ctx, 33, boil);
  const { pivot } = LEVER;
  const tip = paddleAt(angle);
  pen.stroke([pivot, tip], 7, '#5b6770', 1, false);
  pen.stroke([pivot, tip], 2.6, '#9aa3a8', 1, false);
  const disc = ellipse(tip.x, tip.y, LEVER.paddle, LEVER.paddle, 22);
  pen.fill(disc, BRASS, 1);
  pen.fill(ellipse(tip.x - 6, tip.y - 6, LEVER.paddle * 0.5, LEVER.paddle * 0.4, 12), '#f7dd8f', 0.8);
  pen.stroke([...disc, disc[0]!], 2.6);
  pen.fill(ellipse(pivot.x, pivot.y, 9, 9, 12), '#6b737a', 1);
  pen.stroke([...ellipse(pivot.x, pivot.y, 9, 9, 12), { x: pivot.x + 9, y: pivot.y }], 2, INK, 1, false);
}

/** The feeder on the rim: a hopper of pellets over a chute that dips under the surface. */
export function drawFeeder(ctx: CanvasRenderingContext2D, boil: number, kick: number): void {
  const pen = livePen(ctx, 34, boil);
  const cx = CHUTE.x;
  const hopper = [{ x: cx - 54, y: y0 - 76 }, { x: cx + 54, y: y0 - 76 }, { x: cx + 20, y: y0 - 18 }, { x: cx - 20, y: y0 - 18 }];
  const chute = [{ x: cx - 10, y: y0 - 20 }, { x: cx + 10, y: y0 - 20 }, { x: cx + 10, y: CHUTE.y - 8 }, { x: cx - 10, y: CHUTE.y - 8 }];
  pen.fill(chute, '#c9ccd2', 1);
  pen.stroke([...chute, chute[0]!], 2);
  pen.fill(hopper, '#e3ecef', 0.95);
  // The pellets waiting inside, and the glass's gleam.
  pen.clipped(hopper, () => {
    for (let i = 0; i < 22; i++) {
      const p = { x: cx - 40 + (i % 8) * 11 + (Math.floor(i / 8) % 2) * 6, y: y0 - 28 - Math.floor(i / 8) * 10 };
      pen.fill(ellipse(p.x, p.y, 6, 5, 8), PELLET, 0.95);
    }
  });
  pen.stroke([{ x: cx - 38, y: y0 - 68 }, { x: cx - 13, y: y0 - 26 }], 3, PAPER_FILL, 0.8, false);
  pen.stroke([...hopper, hopper[0]!], 2.6);
  const lid = [{ x: cx - 62, y: y0 - 86 }, { x: cx + 62, y: y0 - 86 }, { x: cx + 62, y: y0 - 74 }, { x: cx - 62, y: y0 - 74 }];
  pen.fill(lid, FRAME, 0.9);
  pen.stroke([...lid, lid[0]!], 2);
  // The little door at the chute's mouth flicks open as a pellet comes out.
  const door = 0.9 * kick;
  pen.stroke([{ x: cx - 12, y: CHUTE.y - 8 }, { x: cx - 12 + 24 * Math.cos(door), y: CHUTE.y - 8 + 24 * Math.sin(door) }], 3, FRAME, 1, false);
}

/** One food pellet: a small round treat. */
export function drawPellet(ctx: CanvasRenderingContext2D, boil: number, at: Pt): void {
  const pen = livePen(ctx, 35, boil, 0.5);
  const r = 12;
  pen.fill(ellipse(at.x, at.y, r, r * 0.9, 14), PELLET, 1);
  pen.fill(ellipse(at.x - 3, at.y - 3, r * 0.45, r * 0.35, 10), '#e0a066', 0.9);
  pen.stroke([...ellipse(at.x, at.y, r, r * 0.9, 14), { x: at.x + r, y: at.y }], 2, INK, 1, false);
}

/**
 * The scientist: a lab-coat sleeve in from the right and a hand pointing
 * down at the lever, `reach` 0 (out of frame) .. 1, the finger dipping on
 * `tap`. Drawn along its own axis: the wrist at the origin, the finger out
 * along +x.
 */
export function drawHand(ctx: CanvasRenderingContext2D, boil: number, reach: number, tap: number): void {
  if (reach <= 0) return;
  const pen = livePen(ctx, 36, boil);
  const wrist = { x: 1220 - 220 * reach, y: 520 + 50 * reach + 18 * tap };
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(Math.PI * 0.66 - 0.06 * tap);
  // The sleeve, back up the arm, with its folds and cuff.
  const sleeve = [{ x: -10, y: -38 }, { x: -320, y: -58 }, { x: -320, y: 62 }, { x: -10, y: 40 }];
  pen.fill(sleeve, COAT, 1);
  pen.fill([{ x: -60, y: 10 }, { x: -320, y: 20 }, { x: -320, y: 62 }, { x: -10, y: 40 }], '#c9d3da', 0.45);
  for (const fx of [-110, -170, -240]) pen.hair([{ x: fx, y: -40 }, { x: fx - 24, y: 0 }, { x: fx - 10, y: 40 }], 1.2, INK, 0.5);
  pen.stroke(sleeve.slice(0, 2), 2.6, INK, 1, false);
  pen.stroke(sleeve.slice(2), 2.6, INK, 1, false);
  const cuff = [{ x: -8, y: -40 }, { x: -44, y: -42 }, { x: -44, y: 44 }, { x: -8, y: 42 }];
  pen.fill(cuff, COAT, 1);
  pen.stroke([...cuff, cuff[0]!], 2.4);
  pen.dot(-26, 24, 4, '#9aa3a8');
  // The hand: a palm, curled fingers, the thumb, and the index finger pointing.
  const palm = [
    ...arc(28, 0, 40, 34, -Math.PI * 0.62, Math.PI * 0.62, 14),
    { x: -2, y: 30 }, { x: -6, y: -30 },
  ];
  pen.fill(palm, SKIN, 1);
  pen.stroke([...palm, palm[0]!], 2.4);
  for (const fy of [8, 20]) {
    const curl = arc(58, fy, 14, 9, -Math.PI / 2, Math.PI / 2, 8);
    pen.fill(curl, SKIN, 1);
    pen.stroke(curl, 2, INK, 1, false);
  }
  const finger = [{ x: 52, y: -26 }, { x: 128, y: -22 }, ...arc(128, -14, 9, 9, -Math.PI / 2, Math.PI / 2, 8), { x: 54, y: -5 }];
  pen.fill(finger, SKIN, 1);
  pen.stroke(finger, 2.4, INK, 1, false);
  pen.hair([{ x: 96, y: -20 }, { x: 98, y: -8 }], 1, INK, 0.6);
  pen.hair(arc(124, -14, 5, 6, -Math.PI / 2, Math.PI / 2, 6), 1, INK, 0.6);
  const thumb = [{ x: 30, y: -32 }, { x: 64, y: -40 }, ...arc(68, -34, 8, 7, -Math.PI / 2, Math.PI / 2, 6), { x: 40, y: -24 }];
  pen.fill(thumb, SKIN, 1);
  pen.stroke(thumb, 2.2, INK, 1, false);
  ctx.restore();
}
