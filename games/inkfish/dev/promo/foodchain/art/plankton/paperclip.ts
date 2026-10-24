import { INK, type Pt } from '../../../../../src/art/pen';
import { arc, boundsOf, LEN, line, Plate, pt, ribbon, SHINE } from './ink';

/** A plain steel Gem paperclip in ink, lit from the upper left, for scale beside a krill. */
const WIRE = 2.6;
const CLIP_PATH: readonly Pt[] = (() => {
  const raw = [
    ...line(pt(-14, -4), pt(26, -4), 10),
    ...arc(pt(26, 1.5), 5.5, -Math.PI / 2, Math.PI / 2, 10).slice(1),
    ...line(pt(26, 7), pt(-37, 7), 16).slice(1),
    ...arc(pt(-37, -2.25), 9.25, Math.PI / 2, (3 * Math.PI) / 2, 14).slice(1),
    ...line(pt(-37, -11.5), pt(38.5, -11.5), 19).slice(1),
    ...arc(pt(38.5, 0), 11.5, -Math.PI / 2, Math.PI / 2, 16).slice(1),
    ...line(pt(38.5, 11.5), pt(-26, 11.5), 16).slice(1),
  ];
  const b = boundsOf(raw);
  const s = LEN / (b.x1 - b.x0 + WIRE);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return raw.map((p) => pt((p.x - cx) * s, (p.y - cy) * s));
})();

export function paintPaperclip(pl: Plate): void {
  const { ctx, k } = pl;
  const pen = pl.pen(1, 0.5);
  const path = pl.m(CLIP_PATH).map((p) => pt(p.x + pen.jitter(), p.y + pen.jitter()));
  const w = WIRE * k;
  const tube = (width: number, colour: string, alpha: number, dx: number, dy: number): void => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
    ctx.stroke();
    ctx.restore();
  };
  // Steel wire lit from the upper left: mid grey, a shadow side, a bright side, one hard glint.
  tube(w, '#8e979e', 1, 0, 0);
  tube(w * 0.42, '#5e676e', 0.7, w * 0.26, w * 0.3);
  tube(w * 0.5, '#d3d9dd', 0.9, -w * 0.14, -w * 0.18);
  tube(w * 0.16, SHINE, 0.95, -w * 0.24, -w * 0.3);
  const { top, bot } = ribbon(path, () => w);
  const ink = pl.pen(2);
  ink.stroke(top, pl.line * 0.55, INK, 1, false);
  ink.stroke(bot, pl.line * 0.55, INK, 1, false);
  for (const [a, b] of [[top[0]!, bot[0]!], [top[top.length - 1]!, bot[bot.length - 1]!]] as const) ink.stroke([a, b], pl.line * 0.55, INK, 1, false);
}
