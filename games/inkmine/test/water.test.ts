import { describe, expect, it } from 'vitest';
import { roofRows } from '../src/art/ground';
import { setTile, TILE, type Terrain, type TilePos } from '../src/logic/terrain';
import { Water } from '../src/logic/water';
import { grid } from './helpers';

/** `~` in a row is open water (a body); the rest as `grid`. */
function scene(rows: readonly string[], seaRow: number | null = null): { t: Terrain; w: Water } {
  const t = grid(rows.map((r) => r.replaceAll('~', '.')));
  const bodies = new Uint8Array(t.width * t.height);
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '~') bodies[y * t.width + x] = 1;
  }));
  return { t, w: Water.carved(t, seaRow, bodies, new Uint8Array(t.width * t.height), roofRows(t)) };
}

/** The water as rows: `~` wet, `.` dry open, `#` anything solid. */
function picture(t: Terrain, w: Water): string[] {
  return Array.from({ length: t.height }, (_, y) => Array.from({ length: t.width }, (_, x) => (w.isWet(x, y) ? '~' : t.tiles[y * t.width + x] === TILE.air ? '.' : '#')).join(''));
}

function dig(t: Terrain, w: Water, ...tiles: TilePos[]): void {
  for (const [x, y] of tiles) setTile(t, x, y, TILE.air);
  w.opened(tiles);
  w.settle();
}

const count = (w: Water): number => w.wet.reduce((a, b) => a + b, 0);

describe('water in the rock', () => {
  it('runs out of a pocket opened at its side into lower ground, and stands level', () => {
    const { t, w } = scene([
      'ssssssss',
      's~~~ssss',
      's~~~s..s',
      's~~~s..s',
      'sssssssss'.slice(0, 8),
    ]);
    dig(t, w, [4, 2]);
    // Nine tiles: the far chamber's floor fills first (it's lowest), then the rest stands level at the gap's height.
    expect(count(w)).toBe(9);
    const rows = picture(t, w);
    expect(rows[1]).toBe('#...####');
    expect(rows[3]).toBe('#~~~#~~#');
    expect([...rows[2]!].filter((c) => c === '~')).toHaveLength(4);
  });

  it('stays put when opened from above', () => {
    const { t, w } = scene([
      's.sssss',
      'ssssss',
      's~~~sss',
      'sssssss',
    ].map((r) => r.padEnd(7, 's')));
    dig(t, w, [1, 1]);
    expect(picture(t, w)[2]).toBe('#~~~###');
    expect(w.isWet(1, 1)).toBe(false);
  });

  it('never climbs over a rise to lower ground beyond it', () => {
    const { t, w } = scene([
      'sssssssss',
      's..sss..s',
      's~~sss..s',
      'ssssss..s',
      'sssssssss',
    ]);
    // Opened above the water into a passage that drops away beyond: the water stands lower than the gap, so it stays.
    dig(t, w, [3, 1], [4, 1], [5, 1]);
    expect(count(w)).toBe(2);
    expect(w.isWet(1, 2) && w.isWet(2, 2)).toBe(true);
    expect(w.isWet(6, 3)).toBe(false);
  });

  it('spills through a gap at its own level and down the far side', () => {
    const { t, w } = scene([
      'sssssssss',
      's~~sss..s',
      's~~sss..s',
      'ssssss..s',
      'sssssssss',
    ]);
    dig(t, w, [3, 1], [4, 1], [5, 1]);
    expect(count(w)).toBe(4);
    // The water at the gap's height ran out and fell to the bottom beyond.
    expect(w.isWet(6, 3) && w.isWet(7, 3)).toBe(true);
    expect(w.isWet(1, 1)).toBe(false);
  });

  it('pours down into a tunnel dug up under it', () => {
    const { t, w } = scene([
      'sssss',
      's~~~s',
      'sssss',
      'sssss',
      'sssss',
    ]);
    dig(t, w, [2, 4], [2, 3], [2, 2]);
    expect(count(w)).toBe(3);
    expect(w.isWet(2, 4) && w.isWet(2, 3) && w.isWet(2, 2)).toBe(true);
    expect(w.isWet(1, 1)).toBe(false);
  });

  it('takes a few seconds, and keeps its volume all the way', () => {
    const { t, w } = scene([
      'ssssssssssss',
      's~~~~~~~~~~s',
      's~~~~~~~~~~s',
      'ssssssssssss',
      's..........s',
      'ssssssssssss',
    ]);
    setTile(t, 1, 3, TILE.air);
    const flows = w.opened([[1, 3]]);
    expect(flows).toHaveLength(1);
    const before = count(w);
    w.step(0.1);
    expect(w.flowing).toBe(true);
    expect(count(w)).toBe(before);
    for (let i = 0; i < 100 && w.flowing; i++) w.step(0.1);
    expect(w.flowing).toBe(false);
    expect(count(w)).toBe(before);
    expect(w.isWet(10, 4)).toBe(true);
  });

  it('joins another body it reaches', () => {
    const { t, w } = scene([
      'ssssssss',
      's~~ss~~s',
      's~~ss~~s',
      'ssssssss',
    ]);
    dig(t, w, [3, 2], [4, 2]);
    expect(count(w)).toBe(8);
    expect(picture(t, w)[2]).toBe('#~~~~~~#');
  });

  it('never fills a dry bell', () => {
    const t = grid(['ssssss', 's....s', 's....s', 'ssssss']);
    const bodies = new Uint8Array(24);
    const dry = new Uint8Array(24);
    bodies[7] = bodies[8] = 1;
    dry[16] = 1;
    const w = Water.carved(t, null, bodies, dry, roofRows(t));
    w.opened([[1, 1]]);
    w.settle();
    expect(w.isWet(4, 2)).toBe(false);
  });
});

describe('the sea', () => {
  it('fills the open sky below sea level, and floods for good a tunnel dug up into its bed', () => {
    const { t, w } = scene([
      'ss......ss',
      'ss......ss',
      'ssssssssss',
      'ssssssssss',
      'ssssssssss',
    ], 1);
    expect(w.isWet(4, 0)).toBe(false);
    expect(w.isWet(4, 1)).toBe(true);
    dig(t, w, [1, 4], [2, 4], [3, 4], [3, 3], [3, 2]);
    // Everything below sea level and joined to it: the sea never runs out.
    for (const [x, y] of [[3, 2], [3, 3], [3, 4], [1, 4]] as const) expect(w.isWet(x, y)).toBe(true);
  });

  it('takes a body it reaches, and what stood above sea level runs out', () => {
    const { t, w } = scene([
      'ss....ss~~',
      'ss....ss~~',
      'sssssssss~',
      'ssssssssss',
    ].map((r) => r.replace(/~(?=~*$)/g, '~')), 1);
    // The body at the right edge: rows 0-2. Open it into the sea's bed at row 1.
    dig(t, w, [6, 1], [7, 1]);
    expect(w.isWet(8, 0)).toBe(false);
    expect(w.isWet(9, 2)).toBe(true);
    expect(w.sea[2 * 10 + 9]).toBe(1);
  });

  it('works out which water is the sea again from a save', () => {
    const { t, w } = scene([
      'ss....ss',
      'ss....ss',
      'ssssssss',
      's~~sssss',
    ], 1);
    const again = Water.saved(t, 1, w.wet, w.dry, roofRows(t));
    expect(again.sea[1 * 8 + 3]).toBe(1);
    expect(again.sea[3 * 8 + 1]).toBe(0);
    expect(again.isWet(1, 3)).toBe(true);
  });

  it('measures depth from the surface down', () => {
    const { w } = scene(['ss....ss', 'ss....ss', 'ss....ss', 'ssssssss'], 0);
    expect(w.depthAt(3, 2)).toBe(3);
    expect(w.depthAt(0, 2)).toBe(0);
  });
});
