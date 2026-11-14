import type { Material } from '../../logic/damage';
import { rectShape, type Poly, type Shape } from '../../logic/geom';
import worldManifest from '../../art/pixel/world/manifest.json';

/**
 * Structure kinds for chapter 1's levels, in native px. When the
 * world art lands (src/art/pixel/world/manifest.json), its footprints replace
 * these shapes; keys match the world manifest's structure names.
 */
export interface KindDef {
  readonly shape: Shape;
  readonly material: Material;
  readonly hp: number;
  readonly flattenable?: boolean;
  readonly cover?: boolean;
  readonly roof?: boolean;
  /** Placeholder fill for the renderer until the art lands. */
  readonly colour: number;
  /** Height in native px (for the castle projection placeholder). */
  readonly height: number;
}

const PLACEHOLDER_KINDS: Readonly<Record<string, KindDef>> = {
  farmhouse: { shape: rectShape(150, 90), material: 'brick', hp: 260, roof: true, colour: 0xb07a52, height: 70 },
  barn: { shape: rectShape(180, 110), material: 'wood', hp: 220, roof: true, colour: 0x9a3e2c, height: 80 },
  houseA: { shape: rectShape(120, 80), material: 'brick', hp: 200, roof: true, colour: 0xc08c5c, height: 60 },
  houseB: { shape: rectShape(100, 90), material: 'brick', hp: 200, roof: true, colour: 0xa87850, height: 60 },
  shed: { shape: rectShape(70, 50), material: 'wood', hp: 80, colour: 0x8a6a44, height: 40 },
  wallBrick: { shape: rectShape(120, 18), material: 'brick', hp: 100, colour: 0xa0583c, height: 26 },
  wallBrickV: { shape: rectShape(18, 120), material: 'brick', hp: 100, colour: 0xa0583c, height: 26 },
  fence: { shape: rectShape(120, 8), material: 'wood', hp: 20, flattenable: true, colour: 0x7a5a36, height: 16 },
  fenceV: { shape: rectShape(8, 120), material: 'wood', hp: 20, flattenable: true, colour: 0x7a5a36, height: 16 },
  wallStone: { shape: rectShape(120, 22), material: 'stone', hp: 0, colour: 0x8c8c84, height: 28 },
  wallStoneV: { shape: rectShape(22, 120), material: 'stone', hp: 0, colour: 0x8c8c84, height: 28 },
  oak: { shape: { kind: 'circle', r: 16 }, material: 'rock', hp: 0, colour: 0x3c6a2c, height: 80 },
  pine: { shape: { kind: 'circle', r: 10 }, material: 'tree', hp: 30, flattenable: true, colour: 0x2c5a34, height: 70 },
  bush: { shape: { kind: 'circle', r: 28 }, material: 'tree', hp: 0, cover: true, colour: 0x4a7a34, height: 20 },
  crops: { shape: rectShape(160, 100), material: 'tree', hp: 0, cover: true, colour: 0xb8a848, height: 18 },
  rockA: { shape: { kind: 'circle', r: 22 }, material: 'rock', hp: 0, colour: 0x7c7870, height: 24 },
  rockB: { shape: { kind: 'circle', r: 32 }, material: 'rock', hp: 0, colour: 0x6c6860, height: 30 },
  rockC: { shape: { kind: 'circle', r: 15 }, material: 'rock', hp: 0, colour: 0x8a847a, height: 16 },
  bridgeRail: { shape: rectShape(200, 10), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  bridgeRailN: { shape: rectShape(240, 10), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  bridgeRailS: { shape: rectShape(240, 10), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  bridgeRailE: { shape: rectShape(10, 240), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  bridgeRailW: { shape: rectShape(10, 240), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  bridgeRailV: { shape: rectShape(10, 200), material: 'stone', hp: 0, colour: 0x8a7a64, height: 14 },
  fuelBarrels: { shape: rectShape(50, 40), material: 'fuel', hp: 90, colour: 0xc04a2a, height: 24 },
  radarMast: { shape: rectShape(40, 40), material: 'metal', hp: 150, colour: 0x6a7a8a, height: 110 },
  hangar: { shape: rectShape(260, 160), material: 'stone', hp: 0, roof: true, colour: 0x7a8288, height: 90 },
  fortWall: { shape: rectShape(240, 30), material: 'stone', hp: 0, colour: 0x6e6a62, height: 50 },
  fortWallV: { shape: rectShape(30, 240), material: 'stone', hp: 0, colour: 0x6e6a62, height: 50 },
  fortGate: { shape: rectShape(120, 30), material: 'brick', hp: 300, colour: 0x8a5a3a, height: 50 },
  wagon: { shape: rectShape(120, 50), material: 'stone', hp: 0, colour: 0x5a4a3a, height: 40 },
  /** Rescue: a crew's cage. */
  cage: { shape: rectShape(56, 56), material: 'wood', hp: 60, colour: 0x6a5030, height: 34 },
  fortTower: { shape: { kind: 'circle', r: 44 }, material: 'stone', hp: 0, colour: 0x6e6a62, height: 70 },
};

/** Our kind names → the world manifest's structure names. */
export const ART_NAME: Readonly<Record<string, string>> = {
  farmhouse: 'farmhouse', barn: 'barn', houseA: 'houseTimber', houseB: 'houseStone', shed: 'shed',
  wallBrick: 'brickWallH', wallBrickV: 'brickWallV', fence: 'fenceH', fenceV: 'fenceV', wallStone: 'stoneWallH', wallStoneV: 'stoneWallV',
  oak: 'oak', pine: 'pine', bush: 'bush', crops: 'crops', rockA: 'rockA', rockB: 'rockB', rockC: 'rockC',
  bridgeRail: 'bridgeRailN', bridgeRailN: 'bridgeRailN', bridgeRailS: 'bridgeRailS', bridgeRailE: 'bridgeRailE', bridgeRailW: 'bridgeRailW', bridgeRailV: 'bridgeRailE',
  /** Ground pieces: drawn under the land by the ground stream where a 'bridge' patch lies, never placed as structures. */
  bridgeDeck: 'bridgeDeck', bridgeDeckV: 'bridgeDeckV', cage: 'cage', fuelBarrels: 'fuelBarrels', radarMast: 'radarMast', hangar: 'hangar',
  fortWall: 'fortWallH', fortWallV: 'fortWallV', fortGate: 'fortGate', wagon: 'wagon', fortTower: 'fortTower',
};

type Footprint = Readonly<Record<string, readonly (readonly (readonly [number, number])[])[]>>;
const WORLD = (worldManifest as unknown as { structures?: Record<string, { footprint: Footprint; states: readonly number[]; flattenable: boolean; cover: boolean }> }).structures ?? {};

/** The whole state's footprint from the 3D model, as one shape (null when it has none). */
function worldShape(name: string): Shape | null {
  const w = WORLD[name];
  if (!w) return null;
  const top = String(Math.max(...w.states));
  const polys: Poly[] = (w.footprint[top] ?? []).map((pts) => ({ kind: 'poly', pts }));
  if (polys.length === 0) return null;
  return polys.length === 1 ? polys[0]! : { kind: 'multi', polys };
}

/**
 * The kinds the land uses: the world art's footprints, flattenable and cover
 * where it has the structure (never guessed), the placeholders elsewhere.
 * HP stays ours for now (the manifest's is a suggestion; tune in the content pass).
 */
export const KINDS: Readonly<Record<string, KindDef>> = Object.fromEntries(
  Object.entries(PLACEHOLDER_KINDS).map(([kind, k]) => {
    const name = ART_NAME[kind];
    const shape = name ? worldShape(name) : null;
    const w = name ? WORLD[name] : undefined;
    return [kind, shape && w ? { ...k, shape, flattenable: w.flattenable || undefined, cover: w.cover || undefined } : k];
  }),
);
