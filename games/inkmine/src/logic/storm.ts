import type { Box } from './body';
import { createRng, rangeOf, type Rng } from './rng';
import { isSolid, type Terrain } from './terrain';

/**
 * Talus's dust storms (spec, "Talus: dust storms"). A thin, dry atmosphere
 * over fine dust: the sun heats the ground, the air above it rises, and
 * the wind it pulls in lifts the dust, which soaks up more sunlight and
 * warms the air still more. On Mars that feedback grows storms the size of
 * continents; one ended the Opportunity rover in 2018, its solar panels
 * starved of light.
 *
 * A storm comes in turns: a long calm; a warning (dust on the horizon); the
 * storm itself, gusting one way across the flats; then it clears. Caught
 * out in it, the wind shoves you (harder in the air than on your feet) and
 * the grit sandblasts the suit: a hit for every few seconds in the open.
 * Anything solid over your head, or a wall a tile or two away on the side
 * the wind comes from, is cover: an overhang, a hole, the lee of a boulder or the lander. While
 * it blows the lander's panels make nothing.
 *
 * Stepped by the Mine; never saved (each landing starts calm).
 */
export const STORM = {
  /** Seconds of calm after landing before the first warning, and between storms. */
  firstCalm: [70, 110],
  calm: [140, 220],
  /** Seconds of warning, of storm, and of clearing. */
  warn: 18,
  blow: [32, 46],
  clear: 6,
  /** Seconds a storm takes to build to full strength. */
  rise: 3,
  /** Px/s it shoves you at full strength: on your feet, and off them (walking is 125). */
  wind: 75,
  airWind: 150,
  /** Seconds out in it per hit the grit lands. */
  grit: 5,
  /** Columns upwind a wall still gives a lee. */
  lee: 2,
} as const;

export type StormPhase = 'calm' | 'warn' | 'blow' | 'clear';

/** A change of phase this step, for the scene to say and show. */
export type StormTurn = StormPhase;

/**
 * One world's weather. `phase` and `left` (seconds of it to go) say where
 * it is; `dir` is the way the wind blows (east 1, west -1), picked fresh
 * for each storm as its warning begins.
 */
export class Storm {
  phase: StormPhase = 'calm';
  left: number;
  dir: 1 | -1 = 1;
  /** Seconds since this phase began. */
  private into = 0;
  /** Seconds the current storm lasts, for its strength as it dies down. */
  private length: number = STORM.blow[0];
  private readonly rng: Rng;

  constructor(seed: number) {
    this.rng = createRng(seed ^ 0x570a);
    this.left = rangeOf(this.rng, STORM.firstCalm[0], STORM.firstCalm[1]);
  }

  /** On towards the next phase; returns the phase it turned to, if it did. */
  step(dt: number): StormTurn | null {
    this.left -= dt;
    this.into += dt;
    if (this.left > 0) return null;
    this.into = 0;
    if (this.phase === 'calm') {
      // Its way is known from the warning on: the dust shows on that side's horizon first.
      this.dir = this.rng() < 0.5 ? 1 : -1;
      return this.turn('warn', STORM.warn);
    }
    if (this.phase === 'warn') {
      this.length = rangeOf(this.rng, STORM.blow[0], STORM.blow[1]);
      return this.turn('blow', this.length);
    }
    if (this.phase === 'blow') return this.turn('clear', STORM.clear);
    return this.turn('calm', rangeOf(this.rng, STORM.calm[0], STORM.calm[1]));
  }

  private turn(phase: StormPhase, seconds: number): StormPhase {
    this.phase = phase;
    this.left = seconds;
    return phase;
  }

  /**
   * How hard it's blowing, 0..1: nothing in the calm or the warning,
   * building over its first seconds, gusting while it blows, and dying
   * away as it clears.
   */
  get strength(): number {
    if (this.phase === 'calm' || this.phase === 'warn') return 0;
    if (this.phase === 'clear') return Math.max(0, this.left / STORM.clear) * 0.7;
    const build = Math.min(1, this.into / STORM.rise);
    // Two slow waves beating together: lulls and gusts, never quite still.
    const gust = 0.8 + 0.2 * Math.sin(this.into * 1.9) * Math.sin(this.into * 0.53 + 1);
    return build * gust;
  }

  /** How thick the dust hangs, 0..1: it rolls in through the warning, and thins as it clears. */
  get dust(): number {
    if (this.phase === 'calm') return 0;
    if (this.phase === 'warn') return 0.25 * (1 - this.left / STORM.warn);
    if (this.phase === 'clear') return 0.25 + 0.75 * (this.left / STORM.clear);
    return 0.25 + 0.75 * Math.min(1, this.into / STORM.rise);
  }

  /** Whether the grit and the wind can do anything: it's blowing, or still dying down. */
  get blowing(): boolean {
    return this.phase === 'blow' || this.phase === 'clear';
  }
}

/**
 * Whether a body is out in the wind: open sky over every column it stands
 * in, and no wall on the side the wind comes from at the height of its
 * head or its middle, within STORM.lee columns. Anything over its head is
 * a roof; a wall upwind is a lee.
 */
export function exposed(t: Terrain, b: Box, tile: number, dir: 1 | -1): boolean {
  const head = Math.floor(b.y / tile);
  const mid = Math.floor((b.y + b.h / 2) / tile);
  const left = Math.floor(b.x / tile);
  const right = Math.floor((b.x + b.w - 0.01) / tile);
  for (let x = left; x <= right; x++) {
    for (let y = head - 1; y >= 0; y--) if (isSolid(t, x, y)) return false;
  }
  // Upwind: the wind blows towards `dir`, so it comes from the other side.
  for (let k = 1; k <= STORM.lee; k++) {
    const x = dir === 1 ? left - k : right + k;
    if (isSolid(t, x, head) || isSolid(t, x, mid)) return false;
  }
  return true;
}

/** The storm in a line for the HUD, and whether it's a danger; null in the calm. */
export function stormLine(s: Storm, out: boolean): { readonly text: string; readonly danger: boolean } | null {
  if (s.phase === 'calm') return null;
  if (s.phase === 'warn') return { text: `Dust storm in ${Math.ceil(s.left)} s: find cover`, danger: true };
  return out ? { text: "Dust storm: you're out in it!", danger: true } : { text: 'Dust storm: under cover', danger: false };
}
