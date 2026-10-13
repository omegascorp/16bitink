import { CRATES, type CrateKey } from '../logic/crates';
import { hash, valueNoise } from '../logic/noise';
import { ORES, type OreKey } from '../logic/ore';
import { createRng, type Rng } from '../logic/rng';
import { contentAt, createTerrain, inside, setTile, TILE, tileAt, type Terrain } from '../logic/terrain';

/**
 * Carves a dig site from a short spec and a seed, the way InkCrab's
 * carve.ts builds a beach from its level definition: the spec says what
 * matters (size, where the grades change, how many caves, veins and
 * crates), the seed fills in the rest, so the same level is the same map
 * for everyone.
 */
export interface OreRule {
  readonly ore: OreKey;
  /** Depth band (rows below the surface) its veins start in. */
  readonly from: number;
  readonly to: number;
  readonly veins: number;
  /** Blocks per vein. */
  readonly size: readonly [number, number];
}

export interface CarveSpec {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  /** The surface row at the lander; the ground rolls a little either side. */
  readonly surface: number;
  /** Depths where stone and deep rock begin (the boundary wanders a few rows). */
  readonly stone: number;
  readonly deep: number;
  /** Worm caves, and the shallowest depth they start at. */
  readonly caves: number;
  readonly caveFrom: number;
  readonly ores: readonly OreRule[];
  readonly crates: Readonly<Partial<Record<CrateKey, number>>>;
  /** The lander's column: the ground is flat and clear around it. */
  readonly landerCol: number;
}

/** Rows of bedrock at the bottom of every site. */
export const BEDROCK_ROWS = 2;
/** Columns either side of the lander kept flat. */
const PAD = 3;
/** Crates and caves keep this many rows below the surface. */
const TOPSOIL = 3;

export function surfaceAt(spec: CarveSpec, x: number): number {
  if (Math.abs(x - spec.landerCol) <= PAD) return spec.surface;
  const roll = valueNoise(x, 0, 9, spec.seed) * 2.2 + valueNoise(x, 0, 3, spec.seed + 1) * 0.6;
  const ease = Math.min(1, (Math.abs(x - spec.landerCol) - PAD) / 4);
  return spec.surface + Math.round(roll * ease);
}

export function carve(spec: CarveSpec): Terrain {
  const t = createTerrain(spec.width, spec.height);
  const rng = createRng(spec.seed);
  const surface = Array.from({ length: spec.width }, (_, x) => surfaceAt(spec, x));
  layGround(t, spec, surface);
  for (let i = 0; i < spec.caves; i++) worm(t, spec, surface, rng);
  for (const rule of spec.ores) for (let i = 0; i < rule.veins; i++) vein(t, spec, surface, rule, rng);
  for (const [kind, count] of Object.entries(spec.crates) as [CrateKey, number][]) {
    for (let i = 0; i < count; i++) placeCrate(t, spec, surface, kind, rng);
  }
  return t;
}

/** Soil, stone and deep rock by depth, their borders wandering, over bedrock. */
function layGround(t: Terrain, spec: CarveSpec, surface: readonly number[]): void {
  for (let x = 0; x < spec.width; x++) {
    for (let y = surface[x]!; y < spec.height; y++) {
      const floor = spec.height - BEDROCK_ROWS - (hash(x, 0, spec.seed + 7) < 0.4 ? 1 : 0);
      if (y >= floor) {
        setTile(t, x, y, TILE.bedrock);
        continue;
      }
      const d = y - surface[x]! + valueNoise(x, y, 6, spec.seed + 3) * 3.5;
      setTile(t, x, y, d < spec.stone ? TILE.soil : d < spec.deep ? TILE.stone : TILE.deep);
    }
  }
}

/** A winding cave: a drunken walk carving a tunnel a tile or two across. */
function worm(t: Terrain, spec: CarveSpec, surface: readonly number[], rng: Rng): void {
  let x = 2 + rng() * (spec.width - 4);
  let y = spec.surface + spec.caveFrom + rng() * (spec.height - spec.surface - spec.caveFrom - BEDROCK_ROWS - 4);
  let a = rng() * Math.PI * 2;
  const steps = 18 + Math.floor(rng() * 30);
  for (let s = 0; s < steps; s++) {
    a += (rng() - 0.5) * 0.9;
    // Caves run more across than up and down.
    x += Math.cos(a);
    y += Math.sin(a) * 0.5;
    const r = rng() < 0.3 ? 1.5 : 1;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const cx = Math.round(x + dx);
        const cy = Math.round(y + dy);
        if (!inside(t, cx, cy) || cy < surface[cx]! + TOPSOIL) continue;
        if (Math.abs(cx - spec.landerCol) <= PAD) continue;
        const tile = tileAt(t, cx, cy);
        if (tile === TILE.soil || tile === TILE.stone || tile === TILE.deep) setTile(t, cx, cy, TILE.air);
      }
    }
  }
}

/** A vein: a clump of ore grown block by block through solid rock. */
function vein(t: Terrain, spec: CarveSpec, surface: readonly number[], rule: OreRule, rng: Rng): void {
  const x = Math.floor(rng() * spec.width);
  const y = surface[x]! + rule.from + Math.floor(rng() * Math.max(1, rule.to - rule.from));
  if (!holdsOre(t, x, y)) return;
  const size = rule.size[0] + Math.floor(rng() * (rule.size[1] - rule.size[0] + 1));
  const id = ORES[rule.ore].id;
  const grown: [number, number][] = [[x, y]];
  t.content[y * t.width + x] = id;
  for (let tries = 0; grown.length < size && tries < size * 8; tries++) {
    const [bx, by] = grown[Math.floor(rng() * grown.length)]!;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rng() * 4)]!;
    if (!holdsOre(t, bx + dx!, by + dy!)) continue;
    t.content[(by + dy!) * t.width + bx + dx!] = id;
    grown.push([bx + dx!, by + dy!]);
  }
}

function holdsOre(t: Terrain, x: number, y: number): boolean {
  const tile = tileAt(t, x, y);
  return inside(t, x, y) && (tile === TILE.soil || tile === TILE.stone || tile === TILE.deep) && contentAt(t, x, y) === 0;
}

function placeCrate(t: Terrain, spec: CarveSpec, surface: readonly number[], kind: CrateKey, rng: Rng): void {
  for (let tries = 0; tries < 40; tries++) {
    const x = 1 + Math.floor(rng() * (spec.width - 2));
    const y = surface[x]! + TOPSOIL + Math.floor(rng() * (spec.height - surface[x]! - TOPSOIL - BEDROCK_ROWS - 1));
    if (Math.abs(x - spec.landerCol) <= PAD || !holdsOre(t, x, y) || tileAt(t, x, y) === TILE.deep) continue;
    setTile(t, x, y, TILE.crate, CRATES[kind].id);
    return;
  }
}
