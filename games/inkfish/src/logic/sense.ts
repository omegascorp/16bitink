import { relationTo } from './sizing';

/**
 * The mako's sense: like every shark it feels the faint electric field of
 * living fish nearby. Every so often it "listens", and the prey it could eat
 * within range light up for a moment, even in the dark or off screen.
 */
export const SENSE = {
  /** How far it feels, world units. */
  range: 560,
  /** Time between pulses, and how long a sensed fish stays marked, ms. */
  everyMs: 1600,
  showMs: 1100,
} as const;

interface Body {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** The fish within range that the player could eat, nearest first. */
export function sensedPrey<T extends Body>(player: Body, fish: readonly T[], range: number = SENSE.range): T[] {
  const dist = (f: T): number => Math.hypot(f.x - player.x, f.y - player.y);
  return fish
    .filter((f) => dist(f) <= range && relationTo(player.size, f.size) === 'prey')
    .sort((a, b) => dist(a) - dist(b));
}
