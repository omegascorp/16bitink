import type { DriveFamily, GunFamily } from './parts';

/** Damage × this, by the target's drive (design doc, "Counters"). */
export const COUNTERS: Readonly<Record<GunFamily, Readonly<Record<DriveFamily, number>>>> = {
  machinegun: { wheels: 1.3, halftracks: 0.9, tracks: 0.5 },
  cannon: { wheels: 1.0, halftracks: 1.0, tracks: 0.9 },
  rockets: { wheels: 0.7, halftracks: 1.1, tracks: 1.3 },
};

/** The floor: a hit always does at least a third of its countered damage. */
export const ARMOUR_FLOOR = 0.33;

/** Damage a hit of `dmg` from `gun` does to a tank on `drive` with `armour`. */
export function damageTaken(dmg: number, gun: GunFamily, drive: DriveFamily, armour: number): number {
  const c = dmg * COUNTERS[gun][drive];
  return Math.max(c - armour, c * ARMOUR_FLOOR);
}

/** The gun that counters a drive best. */
export function counterGun(drive: DriveFamily): GunFamily {
  const guns = Object.keys(COUNTERS) as GunFamily[];
  return guns.reduce((best, g) => (COUNTERS[g][drive] > COUNTERS[best][drive] ? g : best), guns[0]!);
}

/** Structure damage: only brick-breakers hurt brick; wood takes anything; rock and stone take nothing. */
export type Material = 'brick' | 'wood' | 'stone' | 'rock' | 'tree' | 'metal' | 'fuel';

export function structureDamage(dmg: number, material: Material, breaksBrick: boolean): number {
  switch (material) {
    case 'wood':
    case 'tree':
    case 'fuel':
      return dmg;
    case 'brick':
    case 'metal':
      return breaksBrick ? dmg : 0;
    default:
      return 0;
  }
}
