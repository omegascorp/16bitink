import { makeDraw, oval, pt, type Draw } from '../../../src/art/kit';
import { rgba } from '../../../src/art/paint';
import { BOIL } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT } from '../captions';
import { drawQuill } from './marks';
import { PAGE, pageSlide, quillAt, STROKES, writtenAt, type Writing } from './lesson';

/**
 * Galileo's notebook page, after his figure in Two New Sciences (1638): a
 * bone, and one three times as long, thickened far more than three times
 * so it can bear its weight. Old paper, sepia ink; the name, the bones and
 * the year written out by a quill as the narrator says them.
 */
const SEPIA = '#5a3a20';
const PAPER_OLD = '#efe2c2';
const BONE = '#e6d4ad';
/** The big bone's shaft is 3^1.5 ≈ 5.2 times as thick as the small one's: the thickness Galileo's rule asks for. */
const SMALL = { x0: 200, x1: 450, y: 335, shaft: 26 } as const;
const BIG = { x0: 110, x1: 830, y: 565, shaft: 26 * 5.2 } as const;

function paper(d: Draw): void {
  const ctx = d.pen.ctx;
  const rng = createRng(1638);
  const edge: Pt[] = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const side = Math.floor(u * 4);
    const k = (u * 4) % 1;
    const wob = (rng() - 0.5) * 5;
    const corners = [pt(0, 0), pt(PAGE.w, 0), pt(PAGE.w, PAGE.h), pt(0, PAGE.h)];
    const a = corners[side]!;
    const b = corners[(side + 1) % 4]!;
    edge.push(pt(a.x + (b.x - a.x) * k + (side % 2 ? wob : 0), a.y + (b.y - a.y) * k + (side % 2 ? 0 : wob)));
  }
  d.pen.fill(edge, PAPER_OLD, 1);
  d.pen.clipped(edge, () => {
    // Foxing and a darker, browned rim, as an old page has.
    const g = ctx.createRadialGradient(PAGE.w / 2, PAGE.h / 2, PAGE.h * 0.3, PAGE.w / 2, PAGE.h / 2, PAGE.h * 0.85);
    g.addColorStop(0, rgba('#efe2c2', 0));
    g.addColorStop(1, rgba('#a07a44', 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PAGE.w, PAGE.h);
    for (let i = 0; i < 26; i++) d.pen.fill(oval(rng() * PAGE.w, rng() * PAGE.h, 3 + rng() * 14, 3 + rng() * 10, 12), '#b48a52', 0.12 + rng() * 0.12);
    for (let y = 270; y < PAGE.h - 20; y += 56) d.pen.hair([pt(30, y), pt(PAGE.w - 30, y + 2)], 0.8, '#9fb0c8', 0.25);
  });
  d.pen.stroke([...edge, edge[0]!], 2, SEPIA, 0.6);
}

/** A long bone lying along y from x0 to x1: a shaft, its two knobbed ends, shaded with hatching underneath. */
function bone(d: Draw, b: { x0: number; x1: number; y: number; shaft: number }): void {
  const h = b.shaft / 2;
  const knob = b.shaft * 1.05;
  const end = (x: number, dir: number): Pt[] => [
    pt(x + dir * knob * 0.7, b.y - h),
    pt(x + dir * knob * 0.2, b.y - knob),
    pt(x - dir * knob * 0.35, b.y - knob * 0.95),
    pt(x - dir * knob * 0.62, b.y - knob * 0.35),
    pt(x - dir * knob * 0.45, b.y),
    pt(x - dir * knob * 0.62, b.y + knob * 0.4),
    pt(x - dir * knob * 0.3, b.y + knob * 0.95),
    pt(x + dir * knob * 0.25, b.y + knob * 0.92),
    pt(x + dir * knob * 0.7, b.y + h),
  ];
  // The left end round from the shaft's top to its underside, then the right end back up.
  const outline = [...end(b.x0 + knob * 0.6, 1), ...end(b.x1 - knob * 0.6, -1).reverse()];
  d.pen.fill(outline, BONE, 0.95);
  d.pen.clipped(outline, () => d.pen.hatch(outline, Math.max(5, b.shaft / 9), 0.85, 1.8, { color: SEPIA, alpha: 0.7, onlyBelow: b.y + h * 0.1 }));
  d.pen.stroke([...outline, outline[0]!], Math.max(3.2, b.shaft / 24), SEPIA, 0.95);
  // The shaft's long lines, as an engraver draws its roundness.
  d.pen.hair([pt(b.x0 + knob * 1.3, b.y - h * 0.45), pt((b.x0 + b.x1) / 2, b.y - h * 0.5), pt(b.x1 - knob * 1.3, b.y - h * 0.45)], 1.4, SEPIA, 0.3);
}

function bones(d: Draw): void {
  bone(d, SMALL);
  bone(d, BIG);
}

function bake(draw: (d: Draw) => void, seed: number): HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(PAGE.w, PAGE.h);
    draw(makeDraw(ctx, seed + f, f, 0));
    return canvas;
  });
}

const TEXT: Readonly<Partial<Record<Writing, { readonly text: string; readonly size: number }>>> = {
  name: { text: 'Galileo', size: 120 },
  year: { text: '1638', size: 120 },
  book: { text: 'Two New Sciences', size: 64 },
};

/** A written stroke revealed left to right up to `u`. */
function reveal(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, u: number, draw: () => void): void {
  if (u <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 140, y0, (x1 - x0) * u + 140, y1 - y0);
  ctx.clip();
  draw();
  ctx.restore();
}

export function makePageScene(): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const sheet = bake(paper, 8100);
  const figure = bake(bones, 8200);
  return (ctx, t, boil) => {
    const slide = pageSlide(t);
    if (slide > 1300) return;
    ctx.save();
    ctx.translate(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2 + slide);
    ctx.rotate(PAGE.tilt + slide * 0.0002);
    ctx.translate(-PAGE.w / 2, -PAGE.h / 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 40;
    ctx.drawImage(sheet[boil % BOIL]!, 0, 0);
    ctx.shadowColor = 'transparent';
    for (const s of STROKES) {
      const u = writtenAt(s.id, t);
      const text = TEXT[s.id];
      const band = text ? [s.y - text.size, s.y + text.size * 0.4] : [s.y - s.wave * 1.8 - 20, s.y + s.wave * 1.8 + 20];
      reveal(ctx, s.x0, s.x1, band[0]!, band[1]!, u, () => {
        if (!text) {
          ctx.drawImage(figure[boil % BOIL]!, 0, 0);
          return;
        }
        ctx.font = `700 ${text.size}px ${CAPTION_FONT}`;
        ctx.fillStyle = SEPIA;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text.text, s.x0, s.y);
      });
    }
    const q = quillAt(t);
    if (q) drawQuill(ctx, q.x, q.y, q.lift, boil);
    ctx.restore();
  };
}
