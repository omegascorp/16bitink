import { distToSegment, shapeBounds } from '../../logic/geom';
import { SCREEN, type LandDef, type StructureDef, type TerrainPatch } from '../../logic/land';
import { createRng, type Rng } from '../../logic/rng';
import type { Pt } from '../../logic/vec';
import { KINDS } from './kinds';
import { CH1_COLS, CH1_REGIONS, CH1_ROWS } from './regions';

/**
 * The placeholder Meadowlands land: regions as data, terrain patches and a
 * seeded scatter of structures per region. The chapter 1 content pass
 * replaces the scatter with hand-placed layouts; the shapes stay data.
 */
const W = SCREEN.w;
const H = SCREEN.h;
const px = (sx: number, sy: number): Pt => ({ x: sx * W, y: sy * H });

const RIVER: readonly Pt[] = [px(0.55, 0), px(0.55, 4.25), px(2.0, 4.45), px(3.2, 4.7), px(4.6, 5.0), px(7, 5.25)];
const RIVER_W = 110;
const BRIDGES: readonly { at: Pt; across: 'x' | 'y' }[] = [
  { at: px(0.55, 2.5), across: 'x' },
  { at: { x: 1440, y: 2366 }, across: 'y' },
  { at: { x: 3456, y: 2584 }, across: 'y' },
  { at: { x: 5952, y: 2790 }, across: 'y' },
];
const TRUCK_ROAD: readonly Pt[] = [px(2.2, 2.6), px(3.5, 2.6), px(4.5, 2.5), px(5.4, 3.0), px(5.5, 4.4)];
const RAIL_Y = 5.3 * H;
const FORT_ROAD: readonly Pt[] = [px(3.7, 6.55), px(6.3, 6.55), px(6.3, 6.4), px(3.7, 6.4)];

type Recipe = readonly (readonly [string, number])[];
const RECIPES: Readonly<Record<string, Recipe>> = {
  farm: [['farmhouse', 1], ['barn', 1], ['shed', 2], ['fence', 4], ['crops', 2], ['oak', 4], ['bush', 4], ['wallBrick', 2], ['rockA', 1]],
  orchard: [['oak', 10], ['bush', 4], ['shed', 1], ['fenceV', 2], ['wallBrick', 1]],
  river: [['oak', 4], ['bush', 4], ['rockA', 2], ['rockC', 2], ['pine', 2]],
  village: [['houseA', 2], ['houseB', 2], ['shed', 1], ['wallBrick', 3], ['wallBrickV', 1], ['fence', 2], ['bush', 2], ['oak', 2]],
  woods: [['oak', 8], ['pine', 10], ['bush', 6], ['rockA', 2]],
  quarry: [['rockB', 4], ['rockA', 4], ['rockC', 4], ['shed', 1], ['wallStone', 2]],
  hill: [['rockA', 3], ['rockB', 1], ['bush', 4], ['wallBrick', 2], ['oak', 2]],
  rails: [['wagon', 2], ['shed', 1], ['wallBrick', 2], ['rockC', 2], ['bush', 2]],
  airfield: [['hangar', 1], ['shed', 1], ['bush', 3], ['wallBrick', 2], ['fence', 2]],
  fort: [['rockA', 2], ['bush', 2]],
};

function terrain(): TerrainPatch[] {
  const t: TerrainPatch[] = [
    { ground: 'dirt', shape: { kind: 'circle', ...px(1.8, 2.7), r: 260 } },
    { ground: 'grassDry', shape: { kind: 'rect', x: 3 * W, y: 1 * H, w: W, h: 3 * H } },
    { ground: 'dirt', shape: { kind: 'path', pts: TRUCK_ROAD, width: 70 } },
    { ground: 'sand', shape: { kind: 'circle', ...px(5.0, 0.8), r: 520 } },
    { ground: 'mud', shape: { kind: 'circle', ...px(6.0, 1.3), r: 200 } },
    { ground: 'grassDry', shape: { kind: 'circle', ...px(6.5, 3.3), r: 420 } },
    { ground: 'dirt', shape: { kind: 'rect', x: 3 * W, y: RAIL_Y - 30, w: 2 * W, h: 60 } },
    { ground: 'dirt', shape: { kind: 'rect', x: 0.2 * W, y: 5.7 * H, w: 2.6 * W, h: 0.5 * H } },
    { ground: 'mud', shape: { kind: 'circle', ...px(1.2, 1.5), r: 160 } },
    { ground: 'dirt', shape: { kind: 'rect', x: 3.2 * W, y: 6.15 * H, w: 3.6 * W, h: 0.7 * H } },
    { ground: 'water', shape: { kind: 'path', pts: RIVER, width: RIVER_W } },
  ];
  for (const b of BRIDGES) {
    const w = b.across === 'x' ? 220 : 100;
    const h = b.across === 'x' ? 100 : 220;
    t.push({ ground: 'bridge', shape: { kind: 'rect', x: b.at.x - w / 2, y: b.at.y - h / 2, w, h } });
  }
  return t;
}

function onRiver(x: number, y: number, pad: number): boolean {
  for (let i = 1; i < RIVER.length; i++) {
    if (distToSegment(x, y, RIVER[i - 1]!.x, RIVER[i - 1]!.y, RIVER[i]!.x, RIVER[i]!.y) < RIVER_W / 2 + pad) return true;
  }
  return false;
}

function onRoad(x: number, y: number, pad: number): boolean {
  for (let i = 1; i < TRUCK_ROAD.length; i++) {
    if (distToSegment(x, y, TRUCK_ROAD[i - 1]!.x, TRUCK_ROAD[i - 1]!.y, TRUCK_ROAD[i]!.x, TRUCK_ROAD[i]!.y) < 35 + pad) return true;
  }
  return Math.abs(y - RAIL_Y) < 40 + pad && x > 3 * W && x < 5 * W;
}

interface Placer {
  readonly rng: Rng;
  readonly out: StructureDef[];
  readonly boxes: { x0: number; y0: number; x1: number; y1: number }[];
  n: number;
}

function place(p: Placer, kind: string, x: number, y: number, tag?: string): boolean {
  const k = KINDS[kind]!;
  const b = shapeBounds(k.shape, x, y);
  const pad = 34;
  if (p.boxes.some((o) => b.x0 - pad < o.x1 && b.x1 + pad > o.x0 && b.y0 - pad < o.y1 && b.y1 + pad > o.y0)) return false;
  if (onRiver(x, y, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 20) || onRoad(x, y, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2)) return false;
  p.boxes.push(b);
  p.out.push({ id: `s${p.n++}`, kind, x: Math.round(x), y: Math.round(y), shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, tag });
  return true;
}

function scatter(p: Placer, kind: string, count: number, cell: readonly [number, number]): void {
  for (let i = 0, tries = 0; i < count && tries < count * 25; tries++) {
    const x = (cell[0] + p.rng.range(0.1, 0.9)) * W;
    const y = (cell[1] + p.rng.range(0.12, 0.88)) * H;
    if (place(p, kind, x, y)) i++;
  }
}

function specials(p: Placer): void {
  // Raid targets: the Boars' fuel barrels round the orchard barn.
  for (const [sx, sy] of [[3.3, 1.5], [3.7, 1.8], [3.4, 2.4], [3.75, 3.4]] as const) place(p, 'fuelBarrels', sx * W, sy * H, 'target');
  place(p, 'barn', 3.5 * W, 2.05 * H);
  place(p, 'radarMast', 6.5 * W, 3.3 * H, 'radar');
  for (const b of BRIDGES) {
    const kind = b.across === 'x' ? 'bridgeRail' : 'bridgeRailV';
    const off = b.across === 'x' ? { x: 0, y: 46 } : { x: 46, y: 0 };
    p.out.push(...[-1, 1].map((s) => ({ id: `s${p.n++}`, kind, x: b.at.x + off.x * s, y: b.at.y + off.y * s, shape: KINDS[kind]!.shape, material: 'stone' as const, hp: 0 })));
    p.boxes.push({ x0: b.at.x - 120, y0: b.at.y - 120, x1: b.at.x + 120, y1: b.at.y + 120 });
  }
  // The old fort: a stone ring with a gate on the north side.
  const fx = 4.0 * W;
  const fy = 6.1 * H;
  for (let i = 0; i < 5; i++) place(p, i === 2 ? 'fortGate' : 'fortWall', fx + i * 300, fy);
  place(p, 'fortWallV', fx - 150, fy + 150);
  place(p, 'fortWallV', fx + 1350, fy + 150);
}

function crateSpots(rng: Rng, structures: readonly StructureDef[]): Pt[] {
  const spots: Pt[] = [];
  for (const s of structures) {
    if (!['farmhouse', 'barn', 'houseA', 'houseB', 'shed', 'hangar', 'wagon'].includes(s.kind)) continue;
    const b = shapeBounds(s.shape, s.x, s.y);
    spots.push({ x: s.x + rng.range(-20, 20), y: b.y1 + 34 });
  }
  for (let sy = 0; sy < CH1_ROWS; sy++) {
    for (let sx = 0; sx < CH1_COLS; sx++) {
      for (let i = 0; i < 3; i++) {
        const p = { x: (sx + rng.range(0.15, 0.85)) * W, y: (sy + rng.range(0.15, 0.85)) * H };
        if (!onRiver(p.x, p.y, 30)) spots.push(p);
      }
    }
  }
  return spots;
}

export function buildCh1Land(seed = 1): LandDef {
  const rng = createRng(seed);
  const p: Placer = { rng, out: [], boxes: [], n: 0 };
  specials(p);
  for (const r of CH1_REGIONS) {
    const recipe = RECIPES[r.id] ?? [];
    for (const cell of r.cells) for (const [kind, count] of recipe) scatter(p, kind, Math.max(1, Math.round((count * 4) / Math.max(4, r.cells.length))), cell);
  }
  return {
    id: 'meadowlands',
    name: 'Meadowlands',
    cols: CH1_COLS,
    rows: CH1_ROWS,
    base: 'grass',
    regions: CH1_REGIONS,
    terrain: terrain(),
    structures: p.out,
    crateSpots: crateSpots(rng, p.out),
    roads: { truck: TRUCK_ROAD, fort: FORT_ROAD, rail: [{ x: 3 * W, y: RAIL_Y }, { x: 5 * W, y: RAIL_Y }] },
    points: { hill: px(6.5, 3.3), wreck: px(3.4, 5.55), pickup: px(2.3, 3.1), fort: px(5.0, 6.5) },
  };
}

export const CH1_LAND: LandDef = buildCh1Land();
