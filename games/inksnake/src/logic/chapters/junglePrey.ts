import { stepHopper, stepScurrier } from '../preyMoves';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';

/**
 * The Jungle's prey. The king cobra's real meals are other snakes (rival
 * snakes on the board, see jungleRival.ts); the frogs, bandicoot rats and
 * skinks are snacks for it and food for the rat snakes and the python.
 * Every one of them stands stock still while a cobra's hood is spread at
 * it (see abilities/cobra.ts).
 */

/** A spread hood holds prey still this long: its seconds left are kept in `data.still`. */
export function holdStill(p: Prey, seconds: number): void {
  const d = p.data ?? (p.data = {});
  d.still = Math.max(d.still ?? 0, seconds);
}

/** Seconds a hood still holds this prey animal. */
export function stillFor(p: Prey): number {
  return p.data?.still ?? 0;
}

type Gait = (p: Prey, spec: PreySpec, world: PreyWorld, near: boolean, dt: number) => void;

/** A gait that first stands still while a hood holds it. */
function hooded(kind: string, gait: Gait): NonNullable<PreySpec['step']> {
  return (p, world, dt, near) => {
    const left = stillFor(p);
    if (left > 0) {
      p.data!.still = Math.max(0, left - dt);
      p.mode = 'idle';
      p.speed = 0;
      return;
    }
    gait(p, JUNGLE_PREY[kind]!, world, near, dt);
  };
}

/** A meal not swallowed the moment it was put down slips out of play (it never should be: see jungleRival.ts). */
const LOST_MEAL = 0.25;

/** A rival snake, swallowed: it exists as prey only for the moment it goes down. */
function mealStep(p: Prey, _world: PreyWorld, dt: number): void {
  const d = p.data ?? (p.data = {});
  d.age = (d.age ?? 0) + dt;
  if (d.age > LOST_MEAL && p.mode !== 'caught') p.mode = 'hidden';
}

/** A swallowed snake as a meal: how much it's worth. Never placed on the board by a level. */
const meal = (name: string, size: number, growth: number, points: number): PreySpec => ({
  name, size, growth, gait: 'still', speed: 0, fear: 0, points, step: mealStep,
});

export const JUNGLE_PREY: Readonly<Record<string, PreySpec>> = {
  bullfrog: { name: 'Indian bullfrog', size: 15, growth: 28, gait: 'hop', speed: 280, fear: 95, points: 12, step: hooded('bullfrog', stepHopper) },
  bandicoot: { name: 'bandicoot rat', size: 16, growth: 32, gait: 'scurry', speed: 105, fear: 115, points: 12, step: hooded('bandicoot', stepScurrier) },
  skink: { name: 'skink', size: 10, growth: 20, gait: 'scurry', speed: 165, fear: 105, points: 10, step: hooded('skink', stepScurrier) },
  // The rival snakes, as meals (by the rival's kind: a feast of rat snakes counts these).
  ratsnake: meal('rat snake', 13, 46, 30),
  'banded-krait': meal('banded krait', 15, 50, 35),
  'big-krait': meal('big banded krait', 22, 76, 55),
  'rock-python': meal('rock python', 30, 110, 80),
};
