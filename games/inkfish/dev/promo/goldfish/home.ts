import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/fish/kit';
import { drawTextLine } from '../captions';
import { arc, drawRedCross, GLASS_TINT, livePen, prop, type Prop, RED, roundRect, WATER_DEEP, WATER_TOP, WOOD, WOOD_DARK } from './ink';
import { BOWL } from './story';

/**
 * Home: the round goldfish bowl on a wooden shelf (inked in two layers, the
 * water and gravel behind the fish, the glass in front of it), the
 * "3-second memory?" tag and the stopwatch hanging on the wall above it.
 */

const { x: BX, y: BY, r: BR } = BOWL;
/** Where the glass circle meets the open top, and the gravel's top. */
const MOUTH_Y = BY - Math.sqrt(BR * BR - BOWL.mouth * BOWL.mouth);
const GRAVEL_Y = BY + 238;
export const SHELF_Y = BY + BR - 6;

const halfChord = (y: number): number => Math.sqrt(Math.max(0, BR * BR - (y - BY) ** 2));
/** The bowl's inside, below a level: the glass circle cut flat. */
function below(level: number): Pt[] {
  const a = Math.asin((level - BY) / BR);
  return arc(BX, BY, BR - 4, BR - 4, a, Math.PI - a, 48);
}
const PEBBLES = ['#b58a5a', '#8d6e57', '#c9a36f', '#9a9aa0', '#c6704a', '#e0c49a'];

/** A sprig of waterweed rising from the gravel, swaying back to the left. */
function weed(pen: Pen, x: number, base: number, height: number, lean: number, rng: () => number): void {
  const stem: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const f = i / 8;
    return { x: x + lean * f * f + 6 * Math.sin(f * 5), y: base - height * f };
  });
  pen.stroke(stem, 2.4, '#3f6a3a', 0.95, false);
  stem.slice(1).forEach((p, i) => {
    for (const side of [-1, 1]) {
      const len = 24 + rng() * 14 - i * 1.2;
      const tip = { x: p.x + side * len, y: p.y - len * 0.45 };
      const leaf = [p, { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 - 7 }, tip, { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 + 5 }];
      pen.fill(leaf, '#78a863', 0.75);
      pen.hair([...leaf, p], 1, '#2f4f2b', 0.8);
    }
  });
}

/** Behind the fish: the shelf, the bowl's shadow, the water, the gravel and the weed. */
export function makeBowlBack(): Prop {
  return prop(0, 380, 1080, 820, 11, (pen, ctx, rng) => {
    // The shelf: a plank with grain, and the bowl's shadow on it.
    const plank = [{ x: -10, y: SHELF_Y }, { x: 1080, y: SHELF_Y }, { x: 1080, y: SHELF_Y + 40 }, { x: -10, y: SHELF_Y + 40 }];
    pen.fill(plank, WOOD, 0.75);
    pen.fill([{ x: -10, y: SHELF_Y + 26 }, { x: 1080, y: SHELF_Y + 26 }, { x: 1080, y: SHELF_Y + 40 }, { x: -10, y: SHELF_Y + 40 }], WOOD_DARK, 0.55);
    for (let i = 0; i < 7; i++) {
      const y = SHELF_Y + 6 + i * 3.2 + rng() * 2;
      pen.hair([{ x: -10, y }, { x: 300 + rng() * 300, y: y + rng() * 2 }, { x: 1080, y: y + 1 }], 0.8, WOOD_DARK, 0.5);
    }
    pen.stroke([{ x: -10, y: SHELF_Y }, { x: 1080, y: SHELF_Y }], 2.6);
    pen.stroke([{ x: -10, y: SHELF_Y + 40 }, { x: 1080, y: SHELF_Y + 40 }], 2.2);
    pen.fill(ellipse(BX + 30, SHELF_Y + 2, 250, 16, 30), '#3b2a1c', 0.25);

    // Water: pale at the top, deeper towards the gravel, with a soft hatch of depth.
    const water = below(BOWL.water);
    const wash = ctx.createLinearGradient(0, BOWL.water, 0, BY + BR);
    wash.addColorStop(0, WATER_TOP);
    wash.addColorStop(1, WATER_DEEP);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = wash;
    ctx.beginPath();
    water.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    pen.clipped(water, () => {
      // The far side of the glass curving away: shade hatched round the right.
      for (let i = 0; i < 26; i++) {
        const a = -0.6 + i * 0.05;
        pen.hair(arc(BX + 40, BY + 20, BR - 30 - (i % 3) * 6, BR - 40, a, a + 0.5, 6), 0.8, '#3d6f7a', 0.22);
      }
    });

    // Gravel: overlapping pebbles, each washed and inked.
    pen.clipped(below(GRAVEL_Y), () => {
      pen.fill([{ x: BX - BR, y: GRAVEL_Y }, { x: BX + BR, y: GRAVEL_Y }, { x: BX + BR, y: BY + BR }, { x: BX - BR, y: BY + BR }], '#d8bf94', 0.8);
      for (let i = 0; i < 150; i++) {
        const y = GRAVEL_Y + 4 + rng() * 78;
        const half = halfChord(y);
        const x = BX - half + rng() * half * 2;
        const r = 7 + rng() * 7;
        const stone = ellipse(x, y, r * 1.3, r * 0.85, 10);
        pen.fill(stone, PEBBLES[Math.floor(rng() * PEBBLES.length)]!, 0.9);
        pen.hair([...stone, stone[0]!], 0.9, INK, 0.7);
      }
    });
    pen.stroke(arc(BX, GRAVEL_Y, halfChord(GRAVEL_Y) - 4, 10, Math.PI, 0, 24), 1.6, INK, 0.7, false);
    weed(pen, BX - 170, GRAVEL_Y + 30, 250, -40, rng);
    weed(pen, BX + 190, GRAVEL_Y + 34, 170, 30, rng);

    // The water's surface, seen a little from above.
    const surface = ellipse(BX, BOWL.water, halfChord(BOWL.water) - 4, 22, 40);
    pen.fill(surface, '#cfe7e6', 0.55);
    pen.stroke([...surface, surface[0]!], 1.5, '#2d4c55', 0.8, false);
    // The back half of the bowl's lip.
    pen.stroke(arc(BX, MOUTH_Y, BOWL.mouth + 14, 20, Math.PI, Math.PI * 2, 24), 2, INK, 0.75, false);
  });
}

/** In front of the fish: a faint water tint over it, the glass outline, the lip and the highlights. */
export function makeBowlFront(): Prop {
  return prop(0, 380, 1080, 820, 12, (pen, ctx) => {
    pen.clipped(below(BOWL.water + 18), () => {
      pen.fill(ellipse(BX, BY, BR, BR, 48), '#6aa6ad', 0.08);
      // Glass thickness: a tinted ring just inside the outline.
      const ring = ctx.createRadialGradient(BX, BY, BR * 0.78, BX, BY, BR);
      ring.addColorStop(0, 'rgba(127,176,184,0)');
      ring.addColorStop(1, 'rgba(90,140,150,0.35)');
      ctx.fillStyle = ring;
      ctx.fillRect(BX - BR, BY - BR, BR * 2, BR * 2);
    });
    const a = Math.asin((MOUTH_Y - BY) / BR);
    const glass = arc(BX, BY, BR, BR, a, Math.PI - a, 72);
    pen.stroke(glass, 3.2);
    pen.stroke(arc(BX, BY, BR - 9, BR - 9, a + 0.04, Math.PI - a - 0.04, 72), 1, GLASS_TINT, 0.7, false);
    // The lip: a rolled rim, front half.
    const lip = arc(BX, MOUTH_Y, BOWL.mouth + 14, 20, 0, Math.PI, 24);
    pen.stroke(lip, 3);
    pen.stroke(arc(BX, MOUTH_Y + 7, BOWL.mouth + 6, 16, 0.15, Math.PI - 0.15, 20), 1.3, INK, 0.6, false);
    // Highlights: a window's reflection up on the left, a long gleam down the right.
    for (const [a0, a1, rr, w] of [[3.55, 4.05, BR - 34, 9], [3.62, 3.92, BR - 56, 5], [0.15, 0.95, BR - 30, 6]] as const) {
      pen.stroke(arc(BX, BY, rr, rr, a0, a1, 14), w, PAPER_FILL, 0.85, false);
    }
    pen.fill(ellipse(BX - 196, BY - 160, 22, 12, 12), PAPER_FILL, 0.8);
  });
}

// ---------------------------------------------------------------- the wall

/** The tag on its string from a pin, swaying by `sway` radians. */
export const TAG = { pin: { x: 168, y: 292 }, w: 604, h: 124, at: { x: 186, y: 336 } } as const;

export function drawTag(ctx: CanvasRenderingContext2D, boil: number, sway: number, cross: readonly [number, number]): void {
  const pen = livePen(ctx, 21, boil);
  // The pin, and the string down to the tag's hole.
  pen.stroke([TAG.pin, { x: TAG.at.x + 6, y: TAG.at.y + TAG.h / 2 - 4 }], 1.6, INK, 0.9, false);
  pen.fill(ellipse(TAG.pin.x, TAG.pin.y, 11, 11, 12), RED, 0.9);
  pen.stroke([...ellipse(TAG.pin.x, TAG.pin.y, 11, 11, 12), { x: TAG.pin.x + 11, y: TAG.pin.y }], 1.6, INK, 1, false);
  ctx.save();
  ctx.translate(TAG.at.x, TAG.at.y + TAG.h / 2);
  ctx.rotate(0.03 + sway);
  ctx.translate(0, -TAG.h / 2);
  const { w, h } = TAG;
  // A luggage tag: clipped corners at the string end, a reinforced hole.
  const card: Pt[] = [{ x: 0, y: 26 }, { x: 26, y: 0 }, ...roundRect(26, 0, w - 26, h, 10).slice(0, 14), { x: 26, y: h }, { x: 0, y: h - 26 }];
  pen.fill(card, '#f6e3b4', 1);
  pen.fill(card.slice(0, 4), '#e9cc8a', 0.5);
  pen.stroke([...card, card[0]!], 2.6);
  pen.stroke([...ellipse(30, h / 2, 13, 13, 14), { x: 43, y: h / 2 }], 2.2, INK, 1, false);
  pen.hair([...ellipse(30, h / 2, 19, 19, 14), { x: 49, y: h / 2 }], 1.1, INK, 0.6);
  drawTextLine(ctx, '3-second memory?', w / 2 + 24, h / 2 + 25, 80, 700, 1, { fill: INK, halo: '#f6e3b4' });
  drawRedCross(ctx, w / 2 + 22, h / 2 + 2, w - 110, h + 10, cross, 15);
  ctx.restore();
}

/** The stopwatch on its nail, its hand stopped at 3 seconds and "0:03" on its face. */
export const WATCH = { x: 905, y: 392, r: 82 } as const;

export function drawStopwatch(ctx: CanvasRenderingContext2D, boil: number, wobble: number): void {
  const pen = livePen(ctx, 22, boil);
  const { x, y, r } = WATCH;
  ctx.save();
  ctx.translate(x, y - r - 34);
  ctx.rotate(wobble);
  ctx.translate(-x, -(y - r - 34));
  // The ring it hangs by, the crown and the button.
  pen.stroke([...ellipse(x, y - r - 34, 14, 14, 14), { x: x + 14, y: y - r - 34 }], 3);
  const crown = [{ x: x - 13, y: y - r - 20 }, { x: x + 13, y: y - r - 20 }, { x: x + 13, y: y - r + 4 }, { x: x - 13, y: y - r + 4 }];
  pen.fill(crown, '#c9ccd2', 1);
  pen.stroke([...crown, crown[0]!], 2.2);
  const button = [{ x: x + r * 0.62, y: y - r * 0.86 }, { x: x + r * 0.8, y: y - r * 1.04 }, { x: x + r * 0.94, y: y - r * 0.9 }, { x: x + r * 0.76, y: y - r * 0.72 }];
  pen.fill(button, '#c9ccd2', 1);
  pen.stroke([...button, button[0]!], 2);
  // The case, a metal rim with its shine, and the face.
  pen.fill(ellipse(x, y, r, r, 40), '#b9bec6', 1);
  pen.fill(ellipse(x - r * 0.12, y - r * 0.12, r * 0.92, r * 0.92, 40), '#dfe2e6', 0.8);
  pen.stroke([...ellipse(x, y, r, r, 40), { x: x + r, y }], 3.2);
  pen.fill(ellipse(x, y, r * 0.8, r * 0.8, 40), PAPER_FILL, 1);
  pen.stroke([...ellipse(x, y, r * 0.8, r * 0.8, 40), { x: x + r * 0.8, y }], 1.6, INK, 0.9, false);
  for (let i = 0; i < 60; i += 5) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const r0 = r * (i % 15 === 0 ? 0.62 : 0.68);
    pen.hair([{ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 }, { x: x + Math.cos(a) * r * 0.76, y: y + Math.sin(a) * r * 0.76 }], i % 15 === 0 ? 2 : 1.2, INK, 0.9);
  }
  drawTextLine(ctx, '0:03', x, y + r * 0.45, 40, 700, 1, { fill: INK, halo: PAPER_FILL });
  // The hand at 3 seconds (of 60), in red.
  const a = (3 / 60) * Math.PI * 2 - Math.PI / 2;
  pen.stroke([{ x: x - Math.cos(a) * r * 0.14, y: y - Math.sin(a) * r * 0.14 }, { x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.7 }], 3.4, RED, 1, false);
  pen.dot(x, y, 5.5, INK);
  ctx.restore();
}
