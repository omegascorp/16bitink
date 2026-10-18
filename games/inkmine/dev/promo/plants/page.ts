import { createRng } from '../../../src/logic/rng';
import { makeDraw, oval, pt } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { BLUE, INK, PAPER, RED } from '../../../src/art/palette';
import { BOIL } from '../../../src/art/palette';
import { CAPTION_FONT } from '../captions';
import { drawSprite, type Sprite } from '../sprites';
import { bakeBlack } from './blackPaint';
import { BIG_LEAF_ART, drawBigLeaf } from './flora';
import { CARD, cardAt, flashAt, notesAt, shakeAt, splatAt, stampAt } from './story';

/**
 * The notebook page (beats 4–6): a bright field-notebook page popping in
 * on "NASA" over the dark, with the scientists' finding written and
 * sketched on it (a red dwarf → a black leaf → "BLACK!", ringed in red, and
 * the paper it's from); later the stage for the smug green Earth leaf
 * (earth.ts) and the red "WRONG" stamp slammed over it.
 */
const PAD = 40;

/** The page itself, baked per boil frame: paper, ruled lines, a margin, a pen edge and a soft drop shadow. */
function bakeCard(f: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(CARD.w + PAD * 2, CARD.h + PAD * 2);
  ctx.translate(PAD, PAD);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  ctx.restore();
  const d = makeDraw(ctx, 9000 + f, f, 0);
  const rng = createRng(31 + f);
  for (let y = 120; y < CARD.h - 20; y += 62) d.pen.stroke([pt(20, y), pt(CARD.w - 20, y + (rng() - 0.5) * 2)], 1.2, BLUE, 0.22, false);
  d.pen.stroke([pt(96, 12), pt(97, CARD.h - 12)], 1.6, RED, 0.35, false);
  // A watercolour bloom or two on the paper, and its edge.
  d.pen.clipped([pt(0, 0), pt(CARD.w, 0), pt(CARD.w, CARD.h), pt(0, CARD.h)], () => {
    for (let i = 0; i < 6; i++) d.pen.fill(oval(rng() * CARD.w, rng() * CARD.h, 60 + rng() * 90, 40 + rng() * 60, 20), '#e9dcc0', 0.25);
  });
  const corners = [pt(0, 0), pt(CARD.w, 0), pt(CARD.w, CARD.h), pt(0, CARD.h)];
  corners.forEach((c, i) => d.pen.stroke([c, corners[(i + 1) % 4]!], 2.4, INK, 0.8, false));
  return canvas;
}

/** The stamp, baked once: "WRONG" in red ink in a double frame, the ink worn with gaps as a rubber stamp prints. */
function bakeStamp(): HTMLCanvasElement {
  const w = 760;
  const h = 300;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.strokeStyle = '#c8241c';
  ctx.fillStyle = '#c8241c';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 26);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(36, 36, w - 72, h - 72, 16);
  ctx.stroke();
  ctx.font = `700 230px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WRONG', w / 2, h / 2 + 12);
  ctx.lineWidth = 4;
  ctx.strokeText('WRONG', w / 2, h / 2 + 12);
  // Worn ink: specks and scrapes where the rubber didn't print.
  const rng = createRng(53);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, 0.6 + rng() * rng() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    ctx.globalAlpha = 0.5;
    ctx.fillRect(rng() * w, rng() * h, 30 + rng() * 80, 1.5 + rng() * 2);
  }
  return canvas;
}

/**
 * Runs `draw` in the page's frame (its pop, its tilt, the slam's shake),
 * screen coordinates otherwise. It draws opaque: render.ts fades the page
 * as one layer, so nothing on it shows through anything else.
 */
export function onCard(ctx: CanvasRenderingContext2D, t: number, draw: () => void): void {
  const c = cardAt(t);
  if (c.alpha <= 0) return;
  const s = shakeAt(t);
  ctx.save();
  ctx.translate(CARD.x + s.x, CARD.y + s.y);
  ctx.rotate(CARD.rot + s.rot);
  ctx.scale(c.scale, c.scale);
  ctx.translate(-CARD.x, -CARD.y);
  draw();
  ctx.restore();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string, reveal = 1, weight = 700): void {
  if (reveal <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(s).width;
  ctx.beginPath();
  ctx.rect(x - w / 2 - 10, y - size, (w + 20) * reveal, size * 1.4);
  ctx.clip();
  ctx.textAlign = 'center';
  ctx.fillStyle = colour;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** Part of a pen stroke through `pts`, `u` of the way. */
function partial(pts: readonly Pt[], u: number): Pt[] {
  const n = Math.max(2, Math.ceil(pts.length * u));
  return pts.slice(0, n);
}

export interface Page {
  /** The page and what's written on it (under the Earth leaf). */
  drawPage(ctx: CanvasRenderingContext2D, t: number, boil: number): void;
  /** The stamp and its flecks (over the Earth leaf). */
  drawStamp(ctx: CanvasRenderingContext2D, t: number): void;
  /** The flash as the page pops in, over everything. */
  drawFlash(ctx: CanvasRenderingContext2D, t: number): void;
}

export function makePage(): Page {
  const cards = Array.from({ length: BOIL }, (_, f) => bakeCard(f));
  const stamp = bakeStamp();
  const sketch: Sprite = bakeBlack(BIG_LEAF_ART, 2.2, 6300, drawBigLeaf, { to: { x: 0, y: -1 }, alpha: 0.6, px: 2.5 });
  const ringPts = oval(545, 922, 290, 105, 40).map((p, i) => pt(p.x + Math.sin(i * 1.7) * 4, p.y));
  const arrow = Array.from({ length: 12 }, (_, i) => pt(410 + i * 15, 650 - Math.sin((i / 11) * Math.PI) * 26));

  const notes = (ctx: CanvasRenderingContext2D, t: number, boil: number): void => {
    const n = notesAt(t);
    if (n.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= n.alpha;
    const d = makeDraw(ctx, 9100 + boil, boil, 0);
    text(ctx, 'NASA scientists', 540, 440, 112, INK, n.heading);
    if (n.heading > 0.3) d.pen.stroke(partial([pt(250, 470), pt(540, 476), pt(830, 468)], (n.heading - 0.3) / 0.7), 3, INK, 0.8, false);
    if (n.star > 0) {
      const r = 80 * n.star;
      const g = ctx.createRadialGradient(285, 640, 0, 285, 640, r * 1.8);
      g.addColorStop(0, 'rgba(225, 70, 40, 0.95)');
      g.addColorStop(0.5, 'rgba(190, 45, 30, 0.85)');
      g.addColorStop(0.56, 'rgba(190, 45, 30, 0.2)');
      g.addColorStop(1, 'rgba(190, 45, 30, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(285 - r * 2, 640 - r * 2, r * 4, r * 4);
      d.pen.stroke([...oval(285, 640, r, r, 30), oval(285, 640, r, r, 30)[0]!], 2.4, INK, 0.85);
      text(ctx, 'red dwarf', 285, 790, 64, RED, n.star);
    }
    if (n.arrow > 0) {
      const a = partial(arrow, n.arrow);
      d.pen.stroke(a, 4, INK, 0.9, false);
      if (n.arrow >= 1) d.pen.stroke([pt(560, 628), pt(578, 650), pt(556, 668)], 4, INK, 0.9, false);
    }
    drawSprite(ctx, sketch, boil, { x: 640, y: 690, scale: 2.2, rotation: -0.3, alpha: n.leaf });
    text(ctx, 'BLACK!', 540, 975, 170, INK, n.black);
    if (n.ring > 0) d.pen.stroke(partial([...ringPts, ringPts[0]!, ringPts[1]!], n.ring), 5, RED, 0.9, false);
    text(ctx, 'Kiang et al., Astrobiology 2007', 560, 1072, 40, INK, n.cite, 500);
    ctx.restore();
  };

  return {
    drawPage(ctx, t, boil): void {
      onCard(ctx, t, () => {
        ctx.drawImage(cards[boil % cards.length]!, CARD.x - CARD.w / 2 - PAD, CARD.y - CARD.h / 2 - PAD);
        notes(ctx, t, boil);
      });
    },
    drawStamp(ctx, t): void {
      const s = stampAt(t);
      if (s) {
        onCard(ctx, t, () => {
          ctx.save();
          ctx.translate(540, 780);
          ctx.rotate(-0.21);
          ctx.scale(s.scale, s.scale);
          ctx.globalAlpha *= s.alpha * 0.92;
          ctx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
          ctx.restore();
          flecks(ctx, splatAt(t));
        });
      }
    },
    drawFlash(ctx, t): void {
      const f = flashAt(t);
      if (f > 0) {
        ctx.save();
        ctx.globalAlpha = 0.55 * f;
        ctx.fillStyle = '#fff8ec';
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.restore();
      }
    },
  };
}

/** Red ink flung off the stamp as it lands, flying out and settling as spots. */
const FLECKS = (() => {
  const rng = createRng(2121);
  return Array.from({ length: 22 }, () => ({ a: rng() * Math.PI * 2, d: 260 + rng() * 260, r: 4 + rng() * 11 }));
})();
function flecks(ctx: CanvasRenderingContext2D, u: number): void {
  if (u <= 0) return;
  const k = Math.min(1, u * 3);
  const out = 1 - (1 - k) ** 3;
  ctx.save();
  ctx.fillStyle = '#c8241c';
  for (const f of FLECKS) {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(540 + Math.cos(f.a) * f.d * out, 780 + Math.sin(f.a) * f.d * out * 0.75, f.r, f.r * (1 - 0.3 * (1 - k)), f.a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
