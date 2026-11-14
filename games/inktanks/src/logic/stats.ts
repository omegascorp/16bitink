import { DRIVES, GUNS, HULLS, TIER_BONUS, type DriveFamily, type GunFamily, type HullFamily, type Loadout, type ShotKind } from './parts';
import { clamp } from './vec';

/**
 * Research lines, 3 steps each, +8% a step. Guns: damage, reload. Hulls:
 * armour, HP. Drives: speed, grip (turning, and the sand and mud penalties).
 */
export type ResearchLine = 'damage' | 'reload' | 'armour' | 'hp' | 'speed' | 'grip';
export const RESEARCH_STEP = 0.08;
export const RESEARCH_MAX = 3;

/** Steps done per family and line; missing entries are 0. */
export type Research = Readonly<Partial<Record<string, Readonly<Partial<Record<ResearchLine, number>>>>>>;

export function researchSteps(r: Research | undefined, family: string, line: ResearchLine): number {
  return clamp(r?.[family]?.[line] ?? 0, 0, RESEARCH_MAX);
}

const bonus = (r: Research | undefined, family: string, line: ResearchLine): number => 1 + RESEARCH_STEP * researchSteps(r, family, line);

export interface GunStats {
  readonly family: GunFamily;
  readonly damage: number;
  readonly shots: number;
  readonly reload: number;
  readonly range: number;
  readonly shotSpeed: number;
  readonly splash: number;
  readonly breaksBrick: boolean;
  readonly shot: ShotKind;
  readonly turretTurn: number;
  readonly spread: number;
}

export interface TankStats {
  readonly maxHp: number;
  readonly armour: number;
  /** Native px per second on open ground. */
  readonly speed: number;
  readonly turn: number;
  readonly pivots: boolean;
  readonly weight: number;
  /** Engine power ÷ total weight, clamped to 0.7–1.1. */
  readonly engineFactor: number;
  readonly sand: number;
  readonly mud: number;
  readonly radius: number;
  readonly hull: HullFamily;
  readonly drive: DriveFamily;
  readonly gun: GunStats;
}

/**
 * Every tank's HP is the table's × this. Tuned with the sim: at ×1 the doc's
 * guns end a chapter 1 fight in about 30 s; ×2.5 with chapter 1 aim gives 3–5 minute matches.
 */
export const HP_SCALE = 2.5;

export const ENGINE_MIN = 0.7;
export const ENGINE_MAX = 1.1;

/** A slow-ground multiplier with grip research taking part of the penalty away. */
function gripped(mult: number, grip: number): number {
  return mult >= 1 ? 1 : 1 - (1 - mult) / grip;
}

export function tankStats(l: Loadout, research?: Research): TankStats {
  const g = l.gun.family as GunFamily;
  const h = l.hull.family as HullFamily;
  const d = l.drive.family as DriveFamily;
  const gun = GUNS[g];
  const hull = HULLS[h];
  const drive = DRIVES[d];
  const weight = hull.weight + drive.weight + gun.weight;
  const engineFactor = clamp(hull.engine / weight, ENGINE_MIN, ENGINE_MAX);
  const grip = bonus(research, d, 'grip');
  return {
    maxHp: Math.round(hull.hp * HP_SCALE * TIER_BONUS[l.hull.mk] * drive.hpFactor * bonus(research, h, 'hp')),
    armour: hull.armour * bonus(research, h, 'armour'),
    speed: drive.speed * TIER_BONUS[l.drive.mk] * engineFactor * bonus(research, d, 'speed'),
    turn: drive.turn * grip,
    pivots: drive.pivots,
    weight,
    engineFactor,
    sand: gripped(drive.sand, grip),
    mud: gripped(drive.mud, grip),
    radius: hull.radius,
    hull: h,
    drive: d,
    gun: {
      family: g,
      damage: gun.damage * TIER_BONUS[l.gun.mk] * bonus(research, g, 'damage'),
      shots: gun.shots,
      reload: gun.reload / bonus(research, g, 'reload'),
      range: gun.range,
      shotSpeed: gun.shotSpeed,
      splash: gun.splash,
      breaksBrick: gun.breaksBrick,
      shot: gun.shot,
      turretTurn: gun.turretTurn,
      spread: gun.spread,
    },
  };
}

/** Sustained damage per second of `a`'s gun on `b`, counters and armour included. */
export function dps(a: TankStats, b: TankStats, damageFn: (dmg: number, gun: GunFamily, drive: DriveFamily, armour: number) => number): number {
  return (damageFn(a.gun.damage, a.gun.family, b.drive, b.armour) * a.gun.shots) / a.gun.reload;
}
