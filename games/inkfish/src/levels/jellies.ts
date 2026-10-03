import type { Rng } from '../logic/rng';
import type { ZoneId } from './types';

/**
 * Jellyfish: one real species per zone, so the stinging drifters change as
 * you go deeper. Public data, like the species list.
 */
export type JellyId =
  | 'moonjelly' | 'compassjelly' | 'seanettle' | 'boxjelly' | 'lionsmane'
  | 'mauvestinger' | 'combjelly' | 'atolla' | 'crownjelly' | 'trenchjelly';

/** pulse: rows up and sinks back. glide: comb jellies row smoothly on beating combs. dart: box jellies actually swim. */
export type JellyMotion = 'pulse' | 'glide' | 'dart';

export interface JellyInfo {
  readonly name: string;
  /** Drawn size and sting reach, relative to the standard jelly. */
  readonly scale: number;
  readonly motion: JellyMotion;
  /** Colour of its living light; absent for jellies that don't glow. */
  readonly glow?: string;
}

export const JELLY_INFO: Readonly<Record<JellyId, JellyInfo>> = {
  moonjelly: { name: 'moon jelly', scale: 1, motion: 'pulse' },
  compassjelly: { name: 'compass jelly', scale: 1, motion: 'pulse' },
  seanettle: { name: 'sea nettle', scale: 1.05, motion: 'pulse' },
  boxjelly: { name: 'box jelly', scale: 0.85, motion: 'dart' },
  lionsmane: { name: "lion's mane", scale: 1.3, motion: 'pulse' },
  mauvestinger: { name: 'mauve stinger', scale: 0.85, motion: 'pulse', glow: '#7fe8d8' },
  combjelly: { name: 'comb jelly', scale: 0.8, motion: 'glide', glow: '#6fd0ff' },
  atolla: { name: 'atolla jelly', scale: 0.95, motion: 'pulse', glow: '#4f9dff' },
  crownjelly: { name: 'crown jelly', scale: 1.05, motion: 'pulse', glow: '#5c8cff' },
  trenchjelly: { name: 'trench jelly', scale: 0.8, motion: 'pulse' },
};

export const JELLY_IDS = Object.keys(JELLY_INFO) as JellyId[];

/** Each zone's own jelly. */
export const ZONE_JELLY: Readonly<Record<ZoneId, JellyId>> = {
  tidepool: 'moonjelly', seagrass: 'compassjelly', kelp: 'seanettle', reef: 'boxjelly', wreck: 'lionsmane',
  dropoff: 'mauvestinger', twilight: 'combjelly', midnight: 'atolla', abyss: 'crownjelly', trench: 'trenchjelly',
};

/** Share of a level's jellies that drifted down from the zone above. */
export const STRAY_SHARE = 0.25;

const ZONE_ORDER = Object.keys(ZONE_JELLY) as ZoneId[];

/** The jellies a zone can show: its own, and the one from the zone above (not for the first zone). */
export function zoneJellies(zone: ZoneId): readonly JellyId[] {
  const i = ZONE_ORDER.indexOf(zone);
  return i > 0 ? [ZONE_JELLY[zone], ZONE_JELLY[ZONE_ORDER[i - 1]!]] : [ZONE_JELLY[zone]];
}

/** Mostly the zone's own jelly, now and then a stray from the zone above. */
export function pickJelly(zone: ZoneId, rng: Rng): JellyId {
  const [own, stray] = zoneJellies(zone);
  return stray && rng() < STRAY_SHARE ? stray : own!;
}
