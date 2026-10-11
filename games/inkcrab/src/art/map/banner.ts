import { bezier, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FONT, type IslandArt, straight } from './context';

/** Where the scene writes an island's name and tagline, relative to its cartouche's centre (and their sizes). */
export const BANNER_TEXT = { nameDy: -13, nameSize: 40, taglineDy: 23, taglineSize: 22 } as const;

function measure(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** A four-pointed star: a small flourish either side of a name. */
function star(a: IslandArt, x: number, y: number, r: number, wash: string): void {
  const d = a.pen(41 + Math.round(x));
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.3 : r;
    pts.push(pt(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr));
  }
  d.pen.fill(pts, wash, 0.8);
  d.pen.hair(straight(pts, 1.5), 0.6, a.ink, 0.85);
}

/**
 * The island's name cartouche: a paper scroll with rolled ends and notched
 * tails, washed in the island's colours, sized to the hand lettering that
 * the scene writes over it.
 */
export function islandBanner(a: IslandArt): void {
  const { x, y, h } = a.plan.label;
  const { biome } = a.region.beach;
  const name = `${biome.beach}. ${biome.name}`;
  const tag = a.draft ? 'uncharted · coming soon' : biome.tagline;
  const nameW = measure(a.ctx, name, BANNER_TEXT.nameSize);
  const w = Math.max(nameW, measure(a.ctx, tag, BANNER_TEXT.taglineSize)) + 84;
  if (x + w / 2 + 60 < a.span.x0 || x - w / 2 - 60 > a.span.x1) return;
  const d = a.pen(40);
  const l = x - w / 2;
  const r = x + w / 2;
  const t = y - h / 2 + 4;
  const b = y + h / 2 - 4;
  // Notched tails folded behind each end.
  for (const dir of [-1, 1] as const) {
    const e = dir < 0 ? l : r;
    const tail = [pt(e - dir * 14, t + 16), pt(e + dir * 44, t + 22), pt(e + dir * 30, (t + b) / 2 + 14), pt(e + dir * 46, b + 10), pt(e - dir * 14, b + 6)];
    d.pen.fill(tail, PAPER_FILL, 1);
    d.pen.fill(tail, biome.land, a.draft ? 0.2 : 0.45);
    d.pen.hatch(tail, 2.6, dir < 0 ? 0.8 : 2.3, 0.4, { color: a.ink, alpha: 0.35 });
    d.pen.stroke(straight(tail, 3), 1, a.ink, 0.85, false);
  }
  const wave = (yy: number, k: number): Pt[] => Array.from({ length: 25 }, (_, i) => pt(l + (w * i) / 24, yy + Math.sin((i / 24) * Math.PI * 2 + k) * 2.5));
  const top = wave(t, 0.4);
  const bottom = wave(b, 0.4);
  const panel = [...top, ...[...bottom].reverse()];
  d.pen.fill(panel.map((p) => pt(p.x + 3, p.y + 4)), 'rgba(38,49,106,0.14)', 1);
  d.pen.fill(panel, PAPER_FILL, 1);
  d.pen.fill(panel, biome.sand, a.draft ? 0.15 : 0.35);
  // A ruled double border inside the scroll.
  const inner = [...wave(t + 6, 0.4), ...[...wave(b - 6, 0.4)].reverse()].map((p) => pt(Math.min(r - 10, Math.max(l + 10, p.x)), p.y));
  d.pen.hair(straight(inner, 3), 0.5, a.ink, 0.5);
  d.pen.stroke(straight(panel, 3), 1.3, a.ink, 0.9, false);
  // Rolled ends: a curl of paper at each side.
  for (const dir of [-1, 1] as const) {
    const e = dir < 0 ? l : r;
    const roll = [...bezier(pt(e, t), pt(e + dir * 16, (t + b) / 2), pt(e, b), 10)];
    d.pen.fill([...roll], PAPER_FILL, 1);
    d.pen.stroke(roll, 1.1, a.ink, 0.9, false);
    const cy = b - 8;
    d.pen.hair(Array.from({ length: 14 }, (_, i) => {
      const ang = (i / 13) * Math.PI * 1.7;
      const rr = 6 - i * 0.35;
      return pt(e + dir * (4 + Math.cos(ang) * rr), cy + Math.sin(ang) * rr);
    }), 0.7, a.ink, 0.8);
  }
  if (!a.draft) for (const dir of [-1, 1]) star(a, x + dir * (nameW / 2 + 22), y + BANNER_TEXT.nameDy + 2, 7, biome.sea);
}
