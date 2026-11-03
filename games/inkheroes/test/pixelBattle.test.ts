import { describe, expect, it } from 'vitest';
import { COLS, HEX_COUNT, ROWS, hexAt, neighbours } from '../src/logic/hex';
import { feetOn, feetPx, FEET_OFFSET, FIELD_RECT, fitWorld, hexAtPx, hexPx, HEX_PX, WORLD } from '../src/scenes/battle/pixelLayout';
import { badgeSize, clampExtend, drawBadge, HEX_STAMP, linePixels } from '../src/scenes/battle/pixelRaster';

describe('pixel battle layout', () => {
  it('centres the field in the world and keeps it on screen', () => {
    const first = hexPx(hexAt(0, 0));
    // The odd rows are shifted right, so an odd row reaches the field's right edge; the last row its bottom.
    const right = hexPx(hexAt(COLS - 1, 1));
    const bottom = hexPx(hexAt(0, ROWS - 1));
    expect(first).toEqual({ x: FIELD_RECT.x + HEX_PX.half, y: FIELD_RECT.y + HEX_PX.tip });
    // Heroes 3's 15 × 11 field: 682 × 472 from (139, 62), row 0 centred at (161, 88).
    if ((COLS as number) === 15 && (ROWS as number) === 11) {
      expect(FIELD_RECT).toEqual({ x: 139, y: 62, w: 682, h: 472 });
      expect(first).toEqual({ x: 161, y: 88 });
    }
    expect(right.x + HEX_PX.half).toBe(FIELD_RECT.x + FIELD_RECT.w);
    expect(bottom.y + HEX_PX.tip).toBe(FIELD_RECT.y + FIELD_RECT.h);
    expect(FIELD_RECT.y + FIELD_RECT.h).toBeLessThanOrEqual(WORLD.h);
    expect(Math.abs(FIELD_RECT.x - (WORLD.w - FIELD_RECT.x - FIELD_RECT.w))).toBeLessThanOrEqual(1);
  });

  it('puts every hex centre and foot point on a whole pixel', () => {
    for (let h = 0; h < HEX_COUNT; h++) {
      const p = hexPx(h);
      const f = feetPx(h);
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
      expect(f).toEqual({ x: p.x + FEET_OFFSET.x, y: p.y + FEET_OFFSET.y });
    }
  });

  it('stands a two-hex stack centred between its hexes', () => {
    const a = hexAt(3, 4);
    const b = hexAt(4, 4);
    expect(feetOn([a, b])).toEqual({ x: (hexPx(a).x + hexPx(b).x) / 2 + FEET_OFFSET.x, y: hexPx(a).y + FEET_OFFSET.y });
    expect(feetOn([a])).toEqual(feetPx(a));
  });

  it('finds the hex under each of its own pixels, and neighbours are where hex.ts says', () => {
    for (let h = 0; h < HEX_COUNT; h++) {
      const p = hexPx(h);
      for (const [dx, dy] of HEX_STAMP.inside) expect(hexAtPx(p.x + dx, p.y + dy)).toBe(h);
      for (const n of neighbours(h)) {
        const q = hexPx(n);
        const d = [Math.abs(q.x - p.x), Math.abs(q.y - p.y)];
        expect(d[1] === 0 ? d[0] === HEX_PX.w : d[0] === HEX_PX.half && d[1] === HEX_PX.pitch).toBe(true);
      }
    }
    expect(hexAtPx(0, 0)).toBeNull();
    expect(hexAtPx(WORLD.w - 1, WORLD.h - 1)).toBeNull();
  });

  it('tiles: no pixel is inside two hexes, and shared edges are the same pixels from both sides', () => {
    const seen = new Set<string>();
    for (let h = 0; h < HEX_COUNT; h++) {
      const p = hexPx(h);
      for (const [dx, dy] of HEX_STAMP.inside) {
        const k = `${p.x + dx},${p.y + dy}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
    const rimOf = (h: number): Set<string> => {
      const p = hexPx(h);
      return new Set(HEX_STAMP.rim.map(([x, y]) => `${p.x + x},${p.y + y}`));
    };
    const side = linePixels(HEX_PX.half, -HEX_PX.side, HEX_PX.half, HEX_PX.side).length;
    const slant = linePixels(0, -HEX_PX.tip, HEX_PX.half, -HEX_PX.side).length;
    for (let h = 0; h < HEX_COUNT; h++) {
      const a = rimOf(h);
      for (const n of neighbours(h)) {
        const shared = [...rimOf(n)].filter((k) => a.has(k)).length;
        expect(shared).toBe(hexPx(n).y === hexPx(h).y ? side : slant);
      }
    }
  });

  it('draws lines the same whichever end they start from', () => {
    expect(linePixels(0, 0, 15, -10)).toEqual(linePixels(15, -10, 0, 0));
    expect(linePixels(-15, 10, 0, 18)[0]).toEqual([-15, 10]);
  });
});

describe('world fit', () => {
  it('zooms by whole numbers and centres the world', () => {
    expect(fitWorld(1920, 1080)).toMatchObject({ k: 2, x: 0, y: 0 });
    expect(fitWorld(2880, 1620)).toMatchObject({ k: 3, x: 0, y: 0 });
    expect(fitWorld(2576, 1279)).toMatchObject({ k: 2, x: 328, y: 98 });
    expect(fitWorld(1280, 720)).toMatchObject({ k: 1, x: 160, y: 90, margin: { left: 160, right: 160, top: 90, bottom: 90 } });
    expect(fitWorld(1400, 900)).toMatchObject({ k: 1, x: 220, y: 180 });
  });

  it('snaps the offset to whole native pixels and covers the whole canvas', () => {
    for (const [w, h] of [[2576, 1279], [1921, 1083], [1280, 720], [844, 390], [390, 844]] as const) {
      const f = fitWorld(w, h);
      if (f.k >= 1) expect([f.x % f.k, f.y % f.k]).toEqual([0, 0]);
      expect(f.x - f.margin.left * f.k).toBeLessThanOrEqual(0);
      expect(f.y - f.margin.top * f.k).toBeLessThanOrEqual(0);
      expect(f.x + (WORLD.w + f.margin.right) * f.k).toBeGreaterThanOrEqual(w);
      expect(f.y + (WORLD.h + f.margin.bottom) * f.k).toBeGreaterThanOrEqual(h);
    }
  });

  it('falls back to a fraction only when even 1× does not fit', () => {
    const f = fitWorld(390, 844);
    expect(f.k).toBeCloseTo(390 / WORLD.w);
    expect(fitWorld(844, 390).k).toBeCloseTo(390 / WORLD.h);
    expect(f.x).toBe(0);
  });
});

describe('count badges', () => {
  it('fits the digits in a 1px outline', () => {
    expect(badgeSize(7)).toEqual({ w: 11, h: 13 });
    expect(badgeSize(120)).toEqual({ w: 23, h: 13 });
    const b = drawBadge(12, { fill: [54, 74, 150, 255], top: [150, 175, 235, 255] });
    expect([b.w, b.h]).toEqual([17, 13]);
    // Corner is the dark outline, the row under it the light top line.
    expect([...b.data.slice(0, 4)]).toEqual([20, 16, 12, 255]);
    expect([...b.data.slice((1 * b.w + 1) * 4, (1 * b.w + 1) * 4 + 4)]).toEqual([150, 175, 235, 255]);
  });
});

describe('extended backdrop', () => {
  it('repeats the edge rows and columns outward, never mirrors', () => {
    // A 2 × 2 source: red, green / blue, white (red channel 255, 0 / 0, 255).
    const src = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
    const out = clampExtend(src, 2, 2, { left: 2, right: 1, top: 1, bottom: 1 });
    expect([out.w, out.h]).toEqual([5, 4]);
    const row = (y: number): number[] => [0, 1, 2, 3, 4].map((x) => out.data[(y * out.w + x) * 4]!);
    expect(row(0)).toEqual([255, 255, 255, 0, 0]);
    expect(row(1)).toEqual([255, 255, 255, 0, 0]);
    expect(row(2)).toEqual([0, 0, 0, 255, 255]);
    expect(row(3)).toEqual([0, 0, 0, 255, 255]);
  });
});

describe('battle cursors', () => {
  it('points the sword the way the blow travels, to the nearest eighth', async () => {
    const { swordDir } = await import('../src/scenes/battle/battleCursors');
    expect(swordDir(1, 0)).toBe('e');
    expect(swordDir(-1, 0)).toBe('w');
    expect(swordDir(0, -1)).toBe('n');
    expect(swordDir(0, 1)).toBe('s');
    // Hex neighbours: half a hex across and a row (42 px) up or down.
    expect(swordDir(22, -42)).toBe('ne');
    expect(swordDir(-22, -42)).toBe('nw');
    expect(swordDir(22, 42)).toBe('se');
    expect(swordDir(-22, 42)).toBe('sw');
  });
});
