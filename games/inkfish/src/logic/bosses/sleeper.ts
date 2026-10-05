/**
 * The sleeper shark, chapter 8's giant: slow, silent and almost impossible
 * to see in the midnight zone.
 *
 * While it's bigger than you it drifts towards you in the dark: outside your
 * light you see nothing of it but two eye-glints. Get close and the glints
 * flare (the warning), then it lurches forward, sucking you towards its mouth.
 * Once you're bigger it sleeps on the seabed, eyes shut, showing only inside
 * your light, so a glow stick is how you find it; wake it and it lumbers off
 * slowly before settling to sleep again.
 */

export type SleeperMode = 'drift' | 'flare' | 'lurch' | 'rest' | 'sleep' | 'lumber';

export interface SleeperState {
  readonly mode: SleeperMode;
  readonly until: number;
  /** The next lurch may start from this time, ms. */
  readonly lurchAt: number;
}

export interface SleeperSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  readonly seen: boolean;
}

export const SLEEPER = {
  /** It lurches at you from this close... */
  lurchRange: 300,
  /** ...after its eyes flare this long. */
  flareMs: 500,
  lurchMs: 650,
  lurchSpeed: 470,
  /** How hard the lurch sucks you towards its mouth, px/s. */
  pull: 170,
  restMs: 1800,
  lurchCooldownMs: 3000,
  driftSpeed: 75,
  /** Asleep, it wakes when you come this close... */
  wakeRange: 220,
  /** ...and lumbers off for this long, slowly. */
  lumberMs: 2400,
  lumberSpeed: 215,
  /** How much of your light it takes to see it asleep (it's dark and still). */
  sleepLight: 0.6,
} as const;

export const SLEEPER_START: SleeperState = { mode: 'drift', until: 0, lurchAt: 0 };

/** One step of the sleeper shark's mind. Pure: the scene moves the fish to match. */
export function stepSleeper(s: SleeperState, i: SleeperSense): SleeperState {
  return i.rel === 'hide' ? sleep(s, i) : hunt(s, i);
}

function hunt(s: SleeperState, i: SleeperSense): SleeperState {
  if (s.mode === 'flare') return i.now >= s.until ? { ...s, mode: 'lurch', until: i.now + SLEEPER.lurchMs } : s;
  if (s.mode === 'lurch') return i.now >= s.until ? { ...s, mode: 'rest', until: i.now + SLEEPER.restMs } : s;
  if (s.mode === 'rest') return i.now >= s.until ? { ...s, mode: 'drift', lurchAt: i.now + SLEEPER.lurchCooldownMs } : s;
  if (i.rel === 'hunt' && i.seen && i.dist < SLEEPER.lurchRange && i.now >= s.lurchAt) return { ...s, mode: 'flare', until: i.now + SLEEPER.flareMs };
  return s.mode === 'drift' ? s : { ...s, mode: 'drift' };
}

function sleep(s: SleeperState, i: SleeperSense): SleeperState {
  if (s.mode === 'lumber') return i.now >= s.until ? { ...s, mode: 'sleep' } : s;
  if (s.mode !== 'sleep') return { ...s, mode: 'sleep' };
  return i.dist < SLEEPER.wakeRange ? { ...s, mode: 'lumber', until: i.now + SLEEPER.lumberMs } : s;
}

/**
 * How visible it is (0..1) `d` px from you in a light of radius `light`:
 * fully inside the light, fading at its edge, gone beyond. Asleep it needs
 * to be well inside.
 */
export function sleeperVisibility(d: number, light: number, asleep: boolean): number {
  const reach = light * (asleep ? SLEEPER.sleepLight : 1);
  const fade = reach * 0.35;
  return Math.max(0, Math.min(1, (reach - d) / fade));
}
