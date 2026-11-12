/**
 * The parts of a tank: a gun, a hull and a drive, each a family at Mk I–III.
 * Numbers are the design doc's starting table (docs/inktanks-design.md,
 * "Tank stats"); tune them with the sim, never by guessing.
 */
export type GunFamily = 'machinegun' | 'cannon' | 'rockets';
export type HullFamily = 'light' | 'medium' | 'heavy';
export type DriveFamily = 'wheels' | 'halftracks' | 'tracks';
export type Family = GunFamily | HullFamily | DriveFamily;
export type Slot = 'gun' | 'hull' | 'drive';
export type Mk = 1 | 2 | 3;

export interface Part {
  readonly family: Family;
  readonly mk: Mk;
  /** An ace's prototype: rare tech, found nowhere else. */
  readonly proto?: boolean;
}

export interface Loadout {
  readonly gun: Part;
  readonly hull: Part;
  readonly drive: Part;
}

export type ShotKind = 'tracer' | 'shell' | 'rocket';

export interface GunSpec {
  readonly damage: number;
  /** Shots per trigger pull (Rockets fire a pair). */
  readonly shots: number;
  /** Seconds between pulls. */
  readonly reload: number;
  /** Native px. */
  readonly range: number;
  /** Native px per second. */
  readonly shotSpeed: number;
  /** Splash radius in native px, 0 for none. */
  readonly splash: number;
  readonly weight: number;
  readonly breaksBrick: boolean;
  readonly shot: ShotKind;
  /** Turret turn, radians per second. */
  readonly turretTurn: number;
  /** Spread of each shot, radians. */
  readonly spread: number;
}

export interface HullSpec {
  readonly hp: number;
  readonly armour: number;
  readonly weight: number;
  readonly engine: number;
  /** Collision radius, native px (a heavy hull is about 76 px long). */
  readonly radius: number;
}

export interface DriveSpec {
  /** Native px per second. */
  readonly speed: number;
  readonly hpFactor: number;
  readonly weight: number;
  /** Hull turn, radians per second. */
  readonly turn: number;
  /** Turns on the spot (no forward speed needed). */
  readonly pivots: boolean;
  /** Speed multipliers on slow ground. */
  readonly sand: number;
  readonly mud: number;
}

export const GUNS: Readonly<Record<GunFamily, GunSpec>> = {
  machinegun: { damage: 6, shots: 1, reload: 0.1, range: 280, shotSpeed: 900, splash: 0, weight: 1, breaksBrick: false, shot: 'tracer', turretTurn: 6, spread: 0.05 },
  cannon: { damage: 40, shots: 1, reload: 1.1, range: 360, shotSpeed: 650, splash: 0, weight: 4, breaksBrick: true, shot: 'shell', turretTurn: 3.6, spread: 0.015 },
  rockets: { damage: 30, shots: 2, reload: 2.4, range: 400, shotSpeed: 380, splash: 20, weight: 3, breaksBrick: true, shot: 'rocket', turretTurn: 3.2, spread: 0.03 },
};

export const HULLS: Readonly<Record<HullFamily, HullSpec>> = {
  light: { hp: 120, armour: 3, weight: 6, engine: 12, radius: 22 },
  medium: { hp: 200, armour: 7, weight: 12, engine: 16, radius: 26 },
  heavy: { hp: 320, armour: 12, weight: 20, engine: 21, radius: 31 },
};

export const DRIVES: Readonly<Record<DriveFamily, DriveSpec>> = {
  wheels: { speed: 190, hpFactor: 1.0, weight: 2, turn: 3.0, pivots: false, sand: 0.7, mud: 0.8 },
  halftracks: { speed: 160, hpFactor: 1.4, weight: 4, turn: 2.5, pivots: false, sand: 1, mud: 0.8 },
  tracks: { speed: 130, hpFactor: 1.9, weight: 7, turn: 2.1, pivots: true, sand: 1, mud: 1 },
};

export const GUN_FAMILIES: readonly GunFamily[] = ['machinegun', 'cannon', 'rockets'];
export const HULL_FAMILIES: readonly HullFamily[] = ['light', 'medium', 'heavy'];
export const DRIVE_FAMILIES: readonly DriveFamily[] = ['wheels', 'halftracks', 'tracks'];
export const FAMILIES: readonly Family[] = [...GUN_FAMILIES, ...HULL_FAMILIES, ...DRIVE_FAMILIES];

/** Mk II is +20% and Mk III +40% on the part's main stat. */
export const TIER_BONUS: Readonly<Record<Mk, number>> = { 1: 1, 2: 1.2, 3: 1.4 };

export function slotOf(family: Family): Slot {
  if ((GUN_FAMILIES as readonly string[]).includes(family)) return 'gun';
  if ((HULL_FAMILIES as readonly string[]).includes(family)) return 'hull';
  return 'drive';
}

export function isGun(f: Family): f is GunFamily {
  return slotOf(f) === 'gun';
}
export function isHull(f: Family): f is HullFamily {
  return slotOf(f) === 'hull';
}
export function isDrive(f: Family): f is DriveFamily {
  return slotOf(f) === 'drive';
}

/** The art family of a part (the parts manifest's key prefix). */
export const ART_FAMILY: Readonly<Record<Family, string>> = {
  machinegun: 'turretMG',
  cannon: 'turretCannon',
  rockets: 'turretRocket',
  light: 'hullLight',
  medium: 'hullMedium',
  heavy: 'hullHeavy',
  wheels: 'driveWheels',
  halftracks: 'driveHalftrack',
  tracks: 'driveTracks',
};

/** The art key `<family>-mk<n>`, as src/art/pixel/parts/manifest.json lists it. */
export function artKey(p: Part): string {
  return `${ART_FAMILY[p.family]}-mk${p.mk}`;
}

/** A short label: "Cannon Mk II". */
export function partLabel(p: Part): string {
  const name: Record<Family, string> = {
    machinegun: 'Machinegun', cannon: 'Cannon', rockets: 'Rockets',
    light: 'Light hull', medium: 'Medium hull', heavy: 'Heavy hull',
    wheels: 'Wheels', halftracks: 'Half-tracks', tracks: 'Tracks',
  };
  return `${p.proto ? 'Prototype ' : ''}${name[p.family]} Mk ${'I'.repeat(p.mk)}`;
}

export function withPart(l: Loadout, p: Part): Loadout {
  return { ...l, [slotOf(p.family)]: p };
}

export function partIn(l: Loadout, slot: Slot): Part {
  return l[slot];
}

export const part = (family: Family, mk: Mk = 1): Part => ({ family, mk });

export const STARTER_LOADOUT: Loadout = { gun: part('machinegun'), hull: part('light'), drive: part('wheels') };
