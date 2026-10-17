import { hash, valueNoise } from '../logic/noise';
import { ORES, type OreKey } from '../logic/ore';
import { createRng, type Rng } from '../logic/rng';
import { contentAt, createTerrain, inside, setContent, setTile, setVolatile, TILE, tileAt, volatileAt, type Terrain } from '../logic/terrain';
import { VOLATILES } from '../logic/volatiles';

/**
 * Carves a dig site from a short spec and a seed, the way InkCrab's
 * carve.ts builds a beach from its level definition: the spec says what
 * matters (size, where the grades change, how many caves, veins and
 * firedamp pockets, where the old charges are), the seed fills in the
 * rest, so the same level is the same map for everyone.
 *
 * A wrapping site (a whole world you can walk round) is carved so it meets
 * itself: its noise repeats round the ring, and caves, veins and rooms that
 * run off one side carry on from the other.
 */
export interface OreRule {
  readonly ore: OreKey;
  /** Depth band (rows below the surface) its veins start in. */
  readonly from: number;
  readonly to: number;
  readonly veins: number;
  /** Blocks per vein. */
  readonly size: readonly [number, number];
  /** Only between these columns, going east from the first (round the join on a wrapping world); default everywhere. */
  readonly cols?: readonly [number, number];
}

export interface CarveSpec {
  readonly width: number;
  readonly height: number;
  /** A whole world: walk off one side and you come back from the other. */
  readonly wrap?: boolean;
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
  /** Firedamp pockets (natural): little clusters, most of them by a seam of `seam` ore, as methane gathers by coal. */
  readonly firedamp: number;
  /** The ore firedamp gathers by (default graphite; lignite on Mycel). */
  readonly seam?: OreKey;
  /** Spore pockets (Mycel): little clusters in the soil. */
  readonly spores?: number;
  /** Cap mushrooms: clusters standing on the open surface or on cave floors. */
  readonly caps?: readonly CapRule[];
  /** Old charges an earlier crew left, placed by hand where the level needs them: column and depth below the surface. */
  readonly charges?: readonly { readonly kind: 'charge' | 'lineCharge'; readonly at: readonly [number, number] }[];
  /** The lander's column: the ground is flat and clear around it. */
  readonly landerCol: number;
  /** Other columns kept flat and clear round, like the lander's (an outpost stands there). */
  readonly flats?: readonly number[];
  /** Hand-placed caves round a column and depth, so wide and tall. */
  readonly rooms?: readonly Room[];
  /** Hand-placed fissures: open passages two tiles across, through these points (column, depth) in order. They go through any rock. */
  readonly tunnels?: readonly (readonly (readonly [number, number])[])[];
  /** Vaults: small treasure rooms walled in harder rock, with one door plugged with softer stuff. */
  readonly vaults?: readonly Vault[];
  /** Firedamp pockets placed by hand (column, depth), as a way through a vault wall. */
  readonly pockets?: readonly (readonly [number, number])[];
  /** A sea (Brine): islands stand out of it; everywhere else the ground drops to a seabed under water. */
  readonly sea?: SeaSpec;
  /** Hand-placed caves full of water, sealed in the rock (spec, "Brine: Water and air"). */
  readonly aquifers?: readonly Room[];
  /** Small sealed pockets of water scattered through the rock: so many, between these depths, so big. */
  readonly waterPockets?: { readonly count: number; readonly from: number; readonly to: number; readonly size: readonly [number, number] };
  /** Hand-placed caves kept full of air, that water never fills (an air bell). */
  readonly bells?: readonly Room[];
}

/**
 * A sea round islands: the islands (column bands, going east from the
 * first) keep the rolling ground at `surface`; between them the ground
 * slopes down off a beach to a seabed `bed` rows below it, and the sea
 * stands `level` rows below the islands' ground.
 */
export interface SeaSpec {
  /** Rows below `surface` the sea's surface lies: its first wet row is `surface + level`. */
  readonly level: number;
  readonly islands: readonly (readonly [number, number])[];
  /** The seabed's depth below `surface`, shallowest to deepest, out away from the islands. */
  readonly bed: readonly [number, number];
  /** Columns a beach takes to slope from an island down to the seabed. */
  readonly shore?: number;
  /** Shallows: bands of columns where the bed rises to this depth below `surface` (a reef). */
  readonly shoals?: readonly { readonly cols: readonly [number, number]; readonly depth: number }[];
}

/** A carved world: its ground, and its water (none without a sea or water in the rock). */
export interface CarvedSite {
  readonly terrain: Terrain;
  /** 1 where carved water stands in the rock (the sea is let in later, from the sky: water.ts). */
  readonly water: Uint8Array;
  /** 1 where water never goes (air bells). */
  readonly dry: Uint8Array;
  /** The sea's first wet row, or null. */
  readonly seaRow: number | null;
}

/** Clusters of cap mushrooms: on the open surface or on cave floors, optionally only between two columns. */
export interface CapRule {
  readonly where: 'surface' | 'caves';
  readonly clusters: number;
  /** Caps a cluster, at most. */
  readonly size: number;
  readonly cols?: readonly [number, number];
}

export interface Room {
  readonly at: readonly [number, number];
  readonly w: number;
  readonly h: number;
}

/** A vault: an open room `w` × `h` from its top-left (column, depth), walled two tiles thick. */
export interface Vault {
  readonly at: readonly [number, number];
  readonly w: number;
  readonly h: number;
  readonly wall: 'stone' | 'deep';
  /** A side whose wall is plugged with soil instead (none: walled all round). */
  readonly door?: 'left' | 'right' | 'top';
}

/** A vault's wall thickness, tiles. */
export const VAULT_WALL = 2;

/** Rows of bedrock at the bottom of every site. */
export const BEDROCK_ROWS = 2;
/** Columns either side of the lander kept flat. */
const PAD = 3;
/** Volatiles and caves keep this many rows below the surface. */
const TOPSOIL = 3;

/** Columns from `a` to `b` the short way (round the join on a wrapping site). */
function gap(spec: CarveSpec, a: number, b: number): number {
  const d = Math.abs(b - a);
  return spec.wrap ? Math.min(d % spec.width, spec.width - (d % spec.width)) : d;
}

/** The noise's repeat on a wrapping site, so the ground meets itself. */
const period = (spec: CarveSpec): number | undefined => (spec.wrap ? spec.width : undefined);

const col = (spec: CarveSpec, x: number): number => (spec.wrap ? x - spec.width * Math.floor(x / spec.width) : x);

/** Columns from `x` to the nearest place kept flat: the lander, or one of the flats. */
function fromFlat(spec: CarveSpec, x: number): number {
  return Math.min(gap(spec, x, spec.landerCol), ...(spec.flats ?? []).map((f) => gap(spec, x, f)));
}

export function surfaceAt(spec: CarveSpec, x: number): number {
  const fromLander = fromFlat(spec, x);
  if (fromLander <= PAD) return spec.surface;
  const c = col(spec, x);
  const roll = valueNoise(c, 0, 9, spec.seed, period(spec)) * 2.2 + valueNoise(c, 0, 3, spec.seed + 1, period(spec)) * 0.6;
  const ease = Math.min(1, (fromLander - PAD) / 4);
  const land = spec.surface + Math.round(roll * ease);
  return spec.sea ? seaFloor(spec, spec.sea, c, land) : land;
}

/** Columns from `x` to the nearest island, 0 on one (the short way round a wrapping site). */
function offshore(spec: CarveSpec, sea: SeaSpec, x: number): number {
  let best = Infinity;
  for (const [a, b] of sea.islands) {
    const span = col(spec, b - a);
    const into = col(spec, x - a);
    if (into <= span) return 0;
    best = Math.min(best, into - span, col(spec, a - x));
  }
  return best;
}

/**
 * The ground under a sea: an island's own rolling ground, or off it, a
 * beach sloping down to the seabed, which rolls slowly between its depths
 * (rising to a shoal's depth over a reef).
 */
function seaFloor(spec: CarveSpec, sea: SeaSpec, x: number, land: number): number {
  const off = offshore(spec, sea, x);
  if (off === 0) return land;
  const [shallow, deep] = sea.bed;
  const swell = (valueNoise(x, 0, 17, spec.seed + 41, period(spec)) + 1) / 2;
  let bed = shallow + (deep - shallow) * Math.min(1, swell * 0.6 + Math.min(1, off / 40) * 0.6);
  for (const s of sea.shoals ?? []) {
    const span = col(spec, s.cols[1] - s.cols[0]);
    const into = col(spec, x - s.cols[0]);
    if (into > span) continue;
    // Rounded over the reef: shallowest in the middle.
    const k = Math.sin((Math.PI * (into + 0.5)) / (span + 1));
    bed = bed + (s.depth - bed) * Math.min(1, k * 1.6);
  }
  const shore = sea.shore ?? 6;
  const t = Math.min(1, off / shore);
  // A beach: down from the island's ground to the bed, steepest halfway.
  const ease = t * t * (3 - 2 * t);
  return Math.round(land + (spec.surface + bed - land) * ease);
}

export function carve(spec: CarveSpec): Terrain {
  return carveSite(spec).terrain;
}

/** Carves the site and its water: the ground, then the water standing in it (water.ts lets the sea in). */
export function carveSite(spec: CarveSpec): CarvedSite {
  const t = carveGround(spec);
  const n = spec.width * spec.height;
  const water = new Uint8Array(n);
  const dry = new Uint8Array(n);
  const rng = createRng(spec.seed + 977);
  const surface = Array.from({ length: spec.width }, (_, x) => surfaceAt(spec, x));
  for (const room of spec.aquifers ?? []) {
    openRoom(t, spec, room);
    forRoom(t, spec, room, (i) => (water[i] = 1));
  }
  const wp = spec.waterPockets;
  for (let i = 0; wp && i < wp.count; i++) waterPocket(t, spec, surface, wp, rng, water);
  for (const bell of spec.bells ?? []) {
    openRoom(t, spec, bell);
    forRoom(t, spec, bell, (i) => {
      dry[i] = 1;
      water[i] = 0;
    });
  }
  return { terrain: t, water, dry, seaRow: spec.sea ? spec.surface + spec.sea.level : null };
}

/** Every open tile of a hand-placed room, by index. */
function forRoom(t: Terrain, spec: CarveSpec, room: Room, f: (i: number) => void): void {
  const [c, depth] = room.at;
  const x0 = c - Math.floor(room.w / 2);
  const y0 = spec.surface + depth - Math.floor(room.h / 2);
  for (let j = 0; j < room.h; j++) {
    for (let i = 0; i < room.w; i++) {
      const x = col(spec, x0 + i);
      const y = y0 + j;
      if (inside(t, x, y) && tileAt(t, x, y) === TILE.air) f(y * spec.width + x);
    }
  }
}

/** A sealed pocket of water: a little blob opened in solid rock, well away from any opening, and filled. */
function waterPocket(t: Terrain, spec: CarveSpec, surface: readonly number[], wp: NonNullable<CarveSpec['waterPockets']>, rng: Rng, water: Uint8Array): void {
  for (let tries = 0; tries < 30; tries++) {
    const x = Math.floor(rng() * spec.width);
    const y = surface[x]! + wp.from + Math.floor(rng() * Math.max(1, wp.to - wp.from));
    const w = wp.size[0] + Math.floor(rng() * (wp.size[1] - wp.size[0] + 1));
    const h = Math.max(1, Math.round(w * (0.4 + rng() * 0.3)));
    // Sealed: solid rock a tile round it on every side, and nothing volatile in it.
    let sealed = gap(spec, x, spec.landerCol) > PAD + 2;
    for (let j = -1; j <= h && sealed; j++) {
      for (let i = -1; i <= w && sealed; i++) {
        const tx = col(spec, x + i);
        const ty = y + j;
        const tile = tileAt(t, tx, ty);
        if (!inside(t, tx, ty) || tile === TILE.air || tile === TILE.bedrock || tile === TILE.cap || volatileAt(t, tx, ty)) sealed = false;
      }
    }
    if (!sealed) continue;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const tx = col(spec, x + i);
        setTile(t, tx, y + j, TILE.air);
        water[(y + j) * spec.width + tx] = 1;
      }
    }
    return;
  }
}

function carveGround(spec: CarveSpec): Terrain {
  const t = createTerrain(spec.width, spec.height, spec.wrap ?? false);
  const rng = createRng(spec.seed);
  const surface = Array.from({ length: spec.width }, (_, x) => surfaceAt(spec, x));
  layGround(t, spec, surface);
  for (let i = 0; i < spec.caves; i++) worm(t, spec, surface, rng);
  for (const room of spec.rooms ?? []) openRoom(t, spec, room);
  for (const line of spec.tunnels ?? []) tunnel(t, spec, line);
  for (const rule of spec.ores) for (let i = 0; i < rule.veins; i++) vein(t, spec, surface, rule, rng);
  for (let i = 0; i < spec.firedamp; i++) firedamp(t, spec, surface, rng);
  for (let i = 0; i < (spec.spores ?? 0); i++) sporePocket(t, spec, surface, rng);
  for (const vault of spec.vaults ?? []) wallVault(t, spec, vault);
  for (const [x, depth] of spec.pockets ?? []) {
    const y = spec.surface + depth;
    if (inside(t, x, y) && tileAt(t, x, y) !== TILE.air && tileAt(t, x, y) !== TILE.bedrock) setTile(t, x, y, tileAt(t, x, y), 0, VOLATILES.firedamp.id);
  }
  for (const { kind, at: [x, depth] } of spec.charges ?? []) {
    const y = surface[col(spec, x)]! + depth;
    if (inside(t, x, y) && tileAt(t, x, y) !== TILE.air && tileAt(t, x, y) !== TILE.bedrock) setVolatile(t, x, y, VOLATILES[kind].id);
  }
  // Caps last, on the ground as it finally lies.
  for (const rule of spec.caps ?? []) for (let i = 0; i < rule.clusters; i++) caps(t, spec, surface, rule, rng);
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
      const d = y - surface[x]! + valueNoise(x, y, 6, spec.seed + 3, period(spec)) * 3.5;
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
        if (!inside(t, cx, cy) || cy < surface[col(spec, cx)]! + TOPSOIL) continue;
        if (fromFlat(spec, cx) <= PAD) continue;
        const tile = tileAt(t, cx, cy);
        if (tile === TILE.soil || tile === TILE.stone || tile === TILE.deep) setTile(t, cx, cy, TILE.air);
      }
    }
  }
}

/** Opens tile (x, y) unless it's bedrock or out of the grid. */
function open(t: Terrain, x: number, y: number): void {
  const tile = tileAt(t, x, y);
  if (inside(t, x, y) && tile !== TILE.air && tile !== TILE.bedrock) setTile(t, x, y, TILE.air);
}

/** A hand-placed cave, `w` × `h` tiles round its centre tile: a flat floor to walk on under an arched roof. */
function openRoom(t: Terrain, spec: CarveSpec, room: Room): void {
  const [col, depth] = room.at;
  const x0 = col - Math.floor(room.w / 2);
  const y0 = spec.surface + depth - Math.floor(room.h / 2);
  for (let j = 0; j < room.h; j++) {
    const dy = ((j + 0.5) / room.h) * 2 - 1;
    for (let i = 0; i < room.w; i++) {
      const dx = ((i + 0.5) / room.w) * 2 - 1;
      if (dx * dx + (dy < 0 ? dy * dy : dy ** 8) <= 1) open(t, x0 + i, y0 + j);
    }
  }
}

/** A fissure: a passage two tiles across along a line of points. */
function tunnel(t: Terrain, spec: CarveSpec, line: readonly (readonly [number, number])[]): void {
  for (let i = 1; i < line.length; i++) {
    const [ax, ad] = line[i - 1]!;
    const [bx, bd] = line[i]!;
    const steps = Math.max(Math.abs(bx - ax), Math.abs(bd - ad)) * 2;
    for (let k = 0; k <= steps; k++) {
      const x = Math.round(ax + ((bx - ax) * k) / steps);
      const y = spec.surface + Math.round(ad + ((bd - ad) * k) / steps);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) open(t, x + dx, y + dy);
    }
  }
}

/** A vault: an empty room walled in harder rock, with nothing in the wall but what's put there by hand. */
function wallVault(t: Terrain, spec: CarveSpec, v: Vault): void {
  const [vx, depth] = v.at;
  const vy = spec.surface + depth;
  const W = VAULT_WALL;
  const wall = v.wall === 'deep' ? TILE.deep : TILE.stone;
  for (let y = vy - W; y < vy + v.h + W; y++) {
    for (let x = vx - W; x < vx + v.w + W; x++) {
      if (!inside(t, x, y)) continue;
      const inRoom = x >= vx && x < vx + v.w && y >= vy && y < vy + v.h;
      const door = (v.door === 'left' && x < vx && y >= vy && y < vy + v.h)
        || (v.door === 'right' && x >= vx + v.w && y >= vy && y < vy + v.h)
        || (v.door === 'top' && y < vy && x >= vx && x < vx + v.w);
      setTile(t, x, y, inRoom ? TILE.air : door ? TILE.soil : wall);
    }
  }
}

/** A vein: a clump of ore grown block by block through solid rock. */
/** A column for a vein to start in: anywhere, or within its rule's band of columns. */
function veinColumn(spec: CarveSpec, rule: OreRule, rng: Rng): number {
  if (!rule.cols) return Math.floor(rng() * spec.width);
  const [from, to] = rule.cols;
  const span = col(spec, to - from) + 1;
  return col(spec, from + Math.floor(rng() * span));
}

function vein(t: Terrain, spec: CarveSpec, surface: readonly number[], rule: OreRule, rng: Rng): void {
  const x = veinColumn(spec, rule, rng);
  const y = surface[x]! + rule.from + Math.floor(rng() * Math.max(1, rule.to - rule.from));
  if (!holdsOre(t, x, y)) return;
  const size = rule.size[0] + Math.floor(rng() * (rule.size[1] - rule.size[0] + 1));
  const id = ORES[rule.ore].id;
  const grown: [number, number][] = [[x, y]];
  setContent(t, x, y, id);
  for (let tries = 0; grown.length < size && tries < size * 8; tries++) {
    const [bx, by] = grown[Math.floor(rng() * grown.length)]!;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rng() * 4)]!;
    if (!holdsOre(t, bx + dx!, by + dy!)) continue;
    setContent(t, bx + dx!, by + dy!, id);
    grown.push([bx + dx!, by + dy!]);
  }
}

function holdsOre(t: Terrain, x: number, y: number): boolean {
  const tile = tileAt(t, x, y);
  return inside(t, x, y) && (tile === TILE.soil || tile === TILE.stone || tile === TILE.deep) && contentAt(t, x, y) === 0;
}

/** A cluster of one to three firedamp pockets in soil or stone, half the time beside a seam. */
function firedamp(t: Terrain, spec: CarveSpec, surface: readonly number[], rng: Rng): void {
  const seams = rng() < 0.5 ? seamTiles(t, spec.seam ?? 'graphite') : [];
  for (let tries = 0; tries < 40; tries++) {
    const seam = seams.length ? seams[Math.floor(rng() * seams.length)]! : null;
    const x = col(spec, seam ? seam[0] + (rng() < 0.5 ? -1 : 1) : 1 + Math.floor(rng() * (spec.width - 2)));
    const y = seam ? seam[1] + Math.floor(rng() * 3) - 1 : surface[x]! + TOPSOIL + Math.floor(rng() * (spec.height - surface[x]! - TOPSOIL - BEDROCK_ROWS - 1));
    if (!pocketable(t, spec, surface, x, y)) continue;
    const size = 1 + Math.floor(rng() * 3);
    let [cx, cy] = [x, y];
    for (let k = 0; k < size && pocketable(t, spec, surface, cx, cy); k++) {
      setVolatile(t, cx, cy, VOLATILES.firedamp.id);
      if (rng() < 0.5) cx += rng() < 0.5 ? -1 : 1;
      else cy += rng() < 0.5 ? -1 : 1;
    }
    return;
  }
}

/** Every tile of the seam ore, for firedamp to gather by. */
function seamTiles(t: Terrain, ore: OreKey): [number, number][] {
  const out: [number, number][] = [];
  const id = ORES[ore].id;
  for (let i = 0; i < t.content.length; i++) if (t.content[i] === id) out.push([i % t.width, Math.floor(i / t.width)]);
  return out;
}

/** A cluster of one to four spore pockets in the soil, below the topsoil. */
function sporePocket(t: Terrain, spec: CarveSpec, surface: readonly number[], rng: Rng): void {
  for (let tries = 0; tries < 40; tries++) {
    const x = 1 + Math.floor(rng() * (spec.width - 2));
    const y = surface[x]! + TOPSOIL + Math.floor(rng() * Math.max(1, spec.stone));
    if (!pocketable(t, spec, surface, x, y)) continue;
    const size = 1 + Math.floor(rng() * 4);
    let [cx, cy] = [x, y];
    for (let k = 0; k < size && pocketable(t, spec, surface, cx, cy); k++) {
      setVolatile(t, cx, cy, VOLATILES.spores.id);
      if (rng() < 0.6) cx += rng() < 0.5 ? -1 : 1;
      else cy += rng() < 0.5 ? -1 : 1;
    }
    return;
  }
}

/**
 * A cluster of cap mushrooms side by side, each standing on solid ground
 * with open air over it: along the open surface, or on a cave floor. Never
 * by the lander or an outpost (their ground is kept clear).
 */
function caps(t: Terrain, spec: CarveSpec, surface: readonly number[], rule: CapRule, rng: Rng): void {
  const standing = (x: number, y: number): boolean => inside(t, x, y) && tileAt(t, x, y) === TILE.air && tileAt(t, x, y - 1) === TILE.air
    && tileAt(t, x, y + 1) !== TILE.air && tileAt(t, x, y + 1) !== TILE.cap && fromFlat(spec, x) > PAD + 1;
  for (let tries = 0; tries < 60; tries++) {
    const x0 = rule.cols ? veinColumn(spec, { ore: 'copper', from: 0, to: 0, veins: 0, size: [0, 0], cols: rule.cols }, rng) : Math.floor(rng() * spec.width);
    let y: number;
    if (rule.where === 'surface') y = surfaceAt(spec, x0) - 1;
    else {
      // A cave floor: the first open tile over solid ground, going down from somewhere below the topsoil.
      y = surface[x0]! + TOPSOIL + Math.floor(rng() * (spec.height - surface[x0]! - TOPSOIL - BEDROCK_ROWS - 2));
      while (y < spec.height - BEDROCK_ROWS && !(tileAt(t, x0, y) === TILE.air && tileAt(t, x0, y + 1) !== TILE.air)) y++;
    }
    if (!standing(x0, y)) continue;
    const n = 1 + Math.floor(rng() * rule.size);
    for (let k = 0; k < n; k++) {
      const x = col(spec, x0 + k);
      if (!standing(x, y)) break;
      setTile(t, x, y, TILE.cap);
    }
    return;
  }
}

/** Soil or stone with nothing in it, below the topsoil and away from the lander. */
function pocketable(t: Terrain, spec: CarveSpec, surface: readonly number[], x: number, y: number): boolean {
  if (!inside(t, x, y) || y < surface[col(spec, x)]! + TOPSOIL || gap(spec, x, spec.landerCol) <= PAD) return false;
  const tile = tileAt(t, x, y);
  return (tile === TILE.soil || tile === TILE.stone) && contentAt(t, x, y) === 0 && volatileAt(t, x, y) === 0;
}
