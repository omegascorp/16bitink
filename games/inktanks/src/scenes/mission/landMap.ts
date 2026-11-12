import { CELL, GROUNDS, SCREEN, type OpenLand, type RegionDef } from '../../logic/land';

/**
 * A small painted map of the open land, for the drop map and the minimap:
 * one canvas, drawn once per mission from the ground grid and structures.
 */
const COLOURS: Readonly<Record<string, string>> = {
  grass: '#6f8f45', grassDry: '#9a9a55', dirt: '#8a6c45', sand: '#cdb67a', mud: '#5e4a33', water: '#3e6f8e', bridge: '#7a6448',
};
const PAPER = '#d9ccaa';

export interface LandMap {
  readonly canvas: HTMLCanvasElement;
  readonly scale: number;
  /** World px of the map's top-left corner (the open land's bounds, plus a margin). */
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
}

const MARGIN = 120;

export function paintLandMap(l: OpenLand, scale: number): LandMap {
  const x0 = Math.max(0, l.bounds.x0 - MARGIN);
  const y0 = Math.max(0, l.bounds.y0 - MARGIN);
  const w = Math.min(l.width, l.bounds.x1 + MARGIN) - x0;
  const h = Math.min(l.height, l.bounds.y1 + MARGIN) - y0;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d')!;
  ctx.translate(-x0 * scale, -y0 * scale);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x0 * scale, y0 * scale, c.width, c.height);
  const s = CELL * scale;
  for (let gy = 0; gy < l.gridRows; gy++) {
    for (let gx = 0; gx < l.gridCols; gx++) {
      const i = gy * l.gridCols + gx;
      if (!l.open[i]) continue;
      ctx.fillStyle = COLOURS[GROUNDS[l.ground[i]!]!]!;
      ctx.fillRect(gx * s, gy * s, s + 0.5, s + 0.5);
    }
  }
  ctx.fillStyle = 'rgba(40, 32, 22, 0.75)';
  for (const st of l.structures) {
    if (st.cover) continue;
    const r = st.shape.kind === 'circle' ? st.shape.r : 30;
    ctx.fillRect((st.x - r) * scale, (st.y - r) * scale, Math.max(1.5, r * 2 * scale), Math.max(1.5, r * 2 * scale));
  }
  return { canvas: c, scale, x0, y0, w, h };
}

/** The region's cells as rects on the map, in map px. */
export function regionRects(r: RegionDef, map: LandMap): { x: number; y: number; w: number; h: number }[] {
  const s = map.scale;
  return r.cells.map(([cx, cy]) => ({ x: (cx * SCREEN.w - map.x0) * s, y: (cy * SCREEN.h - map.y0) * s, w: SCREEN.w * s, h: SCREEN.h * s }));
}
