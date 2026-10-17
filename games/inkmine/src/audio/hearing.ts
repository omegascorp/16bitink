/**
 * How loud things in the world sound from where the prospector is: a
 * landing by how hard it was, a blast by how far off it went. Pure, so it
 * can be tested without Web Audio.
 */

/** Falling slower than this (px/s) is a step down (one tile from standing lands at about 240), not a landing worth hearing; a jump lands at about 330. */
export const LAND_MIN_VY = 300;
/** Falling this fast (the sim's top speed) lands as loud as a landing gets. */
const LAND_MAX_VY = 520;

/** A landing's loudness from the speed it came down at: none for a step, rising to 1 for a full-speed fall. */
export function landGain(vy: number): number {
  if (!(vy >= LAND_MIN_VY)) return 0;
  const k = Math.min(1, (vy - LAND_MIN_VY) / (LAND_MAX_VY - LAND_MIN_VY));
  return 0.45 + 0.55 * k;
}

/** Tiles away at which a blast is as faint as it gets. */
const FAR_TILES = 30;
/** The faintest a blast in the world sounds: a rumble felt through the rock. */
const FAINTEST = 0.25;

/** A blast's loudness and stereo pan, `dx` and `dy` tiles from the prospector. */
export function farSound(dx: number, dy: number): { gain: number; pan: number } {
  const d = Math.hypot(dx, dy);
  const gain = Number.isFinite(d) ? Math.max(FAINTEST, 1 - d / FAR_TILES) : FAINTEST;
  const pan = Number.isFinite(dx) ? Math.max(-0.8, Math.min(0.8, dx / 12)) : 0;
  return { gain, pan };
}
