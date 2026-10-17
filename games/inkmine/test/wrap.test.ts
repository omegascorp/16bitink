import { describe, expect, it } from 'vitest';
import { carve, surfaceAt, type CarveSpec } from '../src/level/carve';
import { newPiece } from '../src/logic/pieces';
import { ORES } from '../src/logic/ore';
import { foldX, inside, ringDelta, TILE, tileAt, wrapX } from '../src/logic/terrain';
import { blastArea } from '../src/logic/volatiles';
import { bagHas, grid, mine, run, standAt, T } from './helpers';

// Twelve columns round; the lander over column 0, so it straddles the join.
const RING = [
  '............',
  '............',
  'ssssssssssss',
  'ssssssssssss',
  'ssssssssssss',
  '############',
];
const W = RING[0]!.length;

const ringMine = (over = {}) => mine(RING, { terrain: grid(RING, true), lander: { col: 0, row: 2 }, ...over });

describe('a wrapping grid', () => {
  const t = grid(RING, true);

  it('folds columns round the ring and has no sides', () => {
    expect(wrapX(t, -1)).toBe(W - 1);
    expect(wrapX(t, W)).toBe(0);
    expect(inside(t, -5, 2)).toBe(true);
    expect(inside(t, 3, -1)).toBe(false);
    expect(tileAt(t, -1, 3)).toBe(TILE.soil);
    expect(tileAt(t, W + 2, 0)).toBe(TILE.air);
  });

  it('measures the short way round', () => {
    expect(ringDelta(t, W - 1, 0)).toBe(1);
    expect(ringDelta(t, 0, W - 1)).toBe(-1);
    expect(ringDelta(t, (W - 0.5) * T, 0.5 * T, T)).toBe(T);
    expect(foldX(t, -10, T)).toBe(W * T - 10);
  });

  it('a grid that does not wrap keeps its bedrock sides', () => {
    const flat = grid(RING);
    expect(inside(flat, -1, 3)).toBe(false);
    expect(tileAt(flat, -1, 3)).toBe(TILE.bedrock);
    expect(ringDelta(flat, W - 1, 0)).toBe(-(W - 1));
  });

  it('a blast by the join breaks the rock on both sides of it, as folded tiles', () => {
    const area = blastArea(t, 'firedamp', 0, 3);
    expect(area).toContainEqual([W - 1, 3]);
    for (const [x] of area) expect(x).toBeGreaterThanOrEqual(0);
  });
});

describe('walking round a wrapping world', () => {
  it('walks east off the last column and comes back in on the first', () => {
    const m = ringMine();
    standAt(m, W - 2, 2);
    run(m, 1, { ix: 1 });
    const col = Math.floor((m.player.x + m.player.w / 2) / T);
    expect(col).toBeGreaterThanOrEqual(1);
    expect(col).toBeLessThan(W / 2);
    // The sim keeps the prospector folded into the grid.
    expect(m.player.x).toBeGreaterThanOrEqual(0);
    expect(m.player.x).toBeLessThan(W * T);
  });

  it('walks west the same way', () => {
    const m = ringMine();
    standAt(m, 2, 2);
    run(m, 1, { ix: -1 });
    expect(Math.floor((m.player.x + m.player.w / 2) / T)).toBeGreaterThan(W / 2);
  });

  it('drills across the join, into the first column, as a folded tile', () => {
    // In a pit two deep in the last column, so the first column is a wall, not a step.
    const m = ringMine({ lander: { col: 6, row: 2 } });
    m.terrain.tiles[2 * W + (W - 1)] = TILE.air;
    m.terrain.tiles[3 * W + (W - 1)] = TILE.air;
    standAt(m, W - 1, 4);
    const events = run(m, 1, { ix: 1 });
    const drilled = events.flatMap((e) => (e.kind === 'drilled' ? [e.tile] : []));
    expect(drilled[0]).toEqual([0, 3]);
    expect(tileAt(m.terrain, 0, 3)).toBe(TILE.air);
  });

  it('picks up ore lying just over the join', () => {
    const m = ringMine({ lander: { col: 6, row: 2 } });
    standAt(m, W - 1, 2);
    m.pieces = [newPiece(ORES.copper.id, 0.5 * T, 1.5 * T)];
    run(m, 0.5);
    expect(bagHas(m.suit.bag)).toEqual({ copper: 1 });
  });

  it('banks at a lander standing across the join', () => {
    const m = ringMine({ bag: undefined });
    standAt(m, W - 1, 2);
    expect(m.atLander).toBe(true);
  });
});

describe('carving a wrapping world', () => {
  const spec: CarveSpec = {
    width: 64, height: 40, seed: 77, surface: 10, landerCol: 5, wrap: true,
    stone: 12, deep: 24, caves: 4, caveFrom: 4,
    ores: [{ ore: 'copper', from: 1, to: 8, veins: 6, size: [2, 4], cols: [56, 8] }],
    firedamp: 2,
  };
  const t = carve(spec);

  it('makes a grid that wraps', () => {
    expect(t.wrap).toBe(true);
  });

  it('rolls its surface on round the join without a step', () => {
    expect(Math.abs(surfaceAt(spec, spec.width - 1) - surfaceAt(spec, 0))).toBeLessThanOrEqual(2);
    expect(surfaceAt(spec, -3)).toBe(surfaceAt(spec, spec.width - 3));
  });

  it('keeps the ground flat round a lander near the join, on both sides', () => {
    const near = { ...spec, landerCol: 1 };
    expect(surfaceAt(near, spec.width - 1)).toBe(spec.surface);
    expect(surfaceAt(near, 3)).toBe(spec.surface);
  });

  it("lays a band's veins only in its columns, across the join", () => {
    const xs = [...t.content.keys()].filter((i) => t.content[i] === ORES.copper.id).map((i) => i % t.width);
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) expect(x >= 54 || x <= 10, `copper at column ${x}`).toBe(true);
  });
});

describe('the outpost', () => {
  it('stands on flat ground, like the lander', () => {
    const spec: CarveSpec = { width: 64, height: 40, seed: 77, surface: 10, landerCol: 5, wrap: true, stone: 12, deep: 24, caves: 0, caveFrom: 4, ores: [], firedamp: 0, flats: [40] };
    for (let x = 37; x <= 43; x++) expect(surfaceAt(spec, x)).toBe(spec.surface);
  });

  it('knows when the prospector is there, and only then', () => {
    const m = mine(['............', '............', 'ssssssssssss', '############'], { outpost: { col: 9, row: 2 } });
    standAt(m, 2, 2);
    expect(m.atOutpost).toBe(false);
    standAt(m, 9, 2);
    expect(m.atOutpost).toBe(true);
    expect(mine(['......', '......', 'ssssss', '######']).atOutpost).toBe(false);
  });
});
