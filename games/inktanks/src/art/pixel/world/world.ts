/**
 * The Meadowlands world art: what manifest.json (written by dev/pixel/world/install.py) holds.
 *
 * Structures use the castle projection, screen = (gx, gy - z). Every image of one structure shares one canvas, so one
 * `anchor` (the canvas px of its ground origin) serves every state and piece. Footprints, sort lines and roof rects are
 * in native px from that origin (footprint, sortY) or the canvas (roofFade). Vehicles are straight down, facing north.
 */
import manifestJson from './manifest.json';

export type Pt = readonly [number, number];

export interface StructurePiece {
  readonly file: string;
  /** gy from the origin where the piece sorts among tanks; 999 = always over them (roofs, canopies, tall crops). */
  readonly sortY: number;
}

export interface StructureArt {
  /** 'ground' pieces (bridge deck, rail track) are drawn with the ground, under everything. */
  readonly layer: 'structure' | 'ground';
  readonly anchor: Pt;
  readonly size: Pt;
  /** 2 whole, 1 cracked, 0 breached; or just 1 and 0. */
  readonly states: readonly number[];
  readonly hp: number;
  readonly height: number;
  /** Tracks and heavy hulls drive through it. */
  readonly flattenable: boolean;
  /** Hides a tank inside that isn't firing (bush, tall crops). */
  readonly cover: boolean;
  /** Per state: the collision polygons on the ground, from the 3D model. Empty when nothing collides. */
  readonly footprint: Readonly<Record<string, readonly (readonly Pt[])[]>>;
  /** Per state with a roof: the canvas rect [x, y, w, h] that fades when a tank is under or behind it. */
  readonly roofFade: Readonly<Record<string, readonly [number, number, number, number]>>;
  /** Keyed `<name>-<state>`, `<name>-<state>-front`, `<name>-<state>-roof`. */
  readonly pieces: Readonly<Record<string, StructurePiece>>;
  readonly shadows: Readonly<Record<string, string>>;
}

export interface GroundArt {
  readonly file: string;
  readonly edge: string;
  readonly size: number;
  readonly order: number;
}

export interface DecalArt {
  readonly key: string;
  readonly file: string;
  readonly size: Pt;
}

export interface FortressArt {
  readonly size: number;
  readonly body: string;
  readonly treads: readonly string[];
  /** Turret mounts: native px from the body's centre at rotation 0. */
  readonly mounts: Readonly<Record<string, { readonly at: Pt; readonly turret: string }>>;
  /** Per turret: its frame size and one muzzle per barrel, native px from the frame centre at rotation 0. */
  readonly turrets: Readonly<Record<string, { readonly size: number; readonly muzzle: readonly Pt[] }>>;
  readonly files: Readonly<Record<string, string>>;
}

export interface WorldManifest {
  readonly density: 'C';
  readonly unit: number;
  readonly sun: { readonly shadow: Pt };
  readonly ground: Readonly<Record<string, GroundArt>>;
  readonly decals: Readonly<Record<string, readonly DecalArt[]>>;
  readonly structures: Readonly<Record<string, StructureArt>>;
  readonly vehicles: {
    readonly truck: { readonly size: number; readonly frames: readonly string[]; readonly wreck: string; readonly files: Readonly<Record<string, string>> };
    readonly fortress: FortressArt;
  };
}

export const WORLD = manifestJson as unknown as WorldManifest;

/** The piece keys of a structure in a state, in draw order: body, front, roof. */
export function piecesOf(name: string, state: number): string[] {
  const s = WORLD.structures[name];
  if (!s) throw new Error(`world: no structure "${name}"`);
  return [`${name}-${state}`, `${name}-${state}-front`, `${name}-${state}-roof`].filter((k) => k in s.pieces);
}
