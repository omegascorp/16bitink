import type { Pt } from '../../../../src/art/pen';
import type { Brush } from './sharkHead';

/**
 * Megalodon's battle scars, in head units: three parallel raking gashes on the
 * flank behind the gills, a nick across the brow, a torn bite mark on the
 * snout. Each a pale healed line over a dark groove.
 */
export function megaScars(b: Brush, warp: (p: Pt) => Pt): void {
  const { ctx, px } = b;
  const mark = (pts: readonly Pt[], w: number): void => {
    const r = pts.map(warp);
    for (const [dy, colour, width] of [[px(1.6), 'rgba(10,14,20,0.42)', w], [0, 'rgba(214,222,228,0.6)', w * 0.6]] as const) {
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = px(width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      r.forEach((p, i) => (i ? ctx.quadraticCurveTo(p.x - 0.6, p.y + dy, p.x, p.y + dy) : ctx.moveTo(p.x, p.y + dy)));
      ctx.stroke();
      ctx.restore();
    }
  };
  for (let i = 0; i < 3; i++) {
    const o = i * 5;
    mark([{ x: -92 - o, y: -44 + i * 1.5 }, { x: -96 - o, y: -36 }, { x: -99 - o, y: -27 }, { x: -103 - o, y: -20 + i }], 3.2);
  }
  mark([{ x: -24, y: -41 }, { x: -20, y: -36 }, { x: -15, y: -33 }], 2.6);
  for (let i = 0; i < 4; i++) mark([{ x: 2 + i * 2.6, y: -27 + i * 1.2 }, { x: 3 + i * 2.6, y: -24 + i * 1.2 }], 1.8);
}
