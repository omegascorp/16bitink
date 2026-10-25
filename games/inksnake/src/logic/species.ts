/**
 * The player's snakes, one per chapter. Numbers are board px and seconds:
 * each species handles a little differently, loosely true to life.
 */
export const SNAKES = ['corn', 'hognose', 'sidewinder', 'eggeater', 'flying', 'krait', 'spidertail', 'adder', 'cobra', 'anaconda'] as const;
export type SnakeId = (typeof SNAKES)[number];

/** How a snake deals with prey too big to swallow on the spot. */
export type BigPrey = 'coil' | 'venom' | 'none';

export interface SnakeSpec {
  readonly name: string;
  /** Latin name, for the guide and cards. */
  readonly latin: string;
  /** Body width at the start of a level, px. */
  readonly width: number;
  /** Cruising speed, px/s. */
  readonly speed: number;
  /** Fastest turn, radians/s. */
  readonly turn: number;
  readonly big: BigPrey;
  /** Only these prey kinds will do (the egg-eater's eggs); anything else is left alone. */
  readonly diet?: readonly string[];
  /** How wide its jaws stretch, in body widths (most snakes 1.2; the egg-eater's far more). */
  readonly gape?: number;
  /** It eats other snakes (the king cobra): a rival narrower than its gape goes down whole. */
  readonly snakeEater?: boolean;
}

export const SNAKE_SPECS: Readonly<Record<SnakeId, SnakeSpec>> = {
  corn: { name: 'corn snake', latin: 'Pantherophis guttatus', width: 15, speed: 150, turn: 4.6, big: 'coil' },
  hognose: { name: 'eastern hognose', latin: 'Heterodon platirhinos', width: 17, speed: 128, turn: 3.6, big: 'none' },
  sidewinder: { name: 'sidewinder', latin: 'Crotalus cerastes', width: 15, speed: 140, turn: 4.2, big: 'venom' },
  eggeater: { name: 'egg-eater', latin: 'Dasypeltis scabra', width: 13, speed: 140, turn: 4, big: 'none', gape: 3.4, diet: ['weaver-egg', 'guinea-egg', 'egg'] },
  flying: { name: 'paradise flying snake', latin: 'Chrysopelea paradisi', width: 12, speed: 165, turn: 4.4, big: 'venom' },
  krait: { name: 'banded sea krait', latin: 'Laticauda colubrina', width: 15, speed: 155, turn: 3.8, big: 'venom' },
  spidertail: { name: 'spider-tailed horned viper', latin: 'Pseudocerastes urarachnoides', width: 17, speed: 125, turn: 3.6, big: 'venom' },
  adder: { name: 'adder', latin: 'Vipera berus', width: 16, speed: 135, turn: 3.8, big: 'venom' },
  cobra: { name: 'king cobra', latin: 'Ophiophagus hannah', width: 18, speed: 170, turn: 3.6, big: 'venom', snakeEater: true },
  anaconda: { name: 'green anaconda', latin: 'Eunectes murinus', width: 24, speed: 120, turn: 3.0, big: 'coil' },
};

/** A strike: this many times cruising speed, for this long, then a rest before the next. */
export const STRIKE = { boost: 2.9, time: 0.2, rest: 0.75 } as const;

/** The body thickens as it grows: this much wider per px of length gained, up to MAX_WIDEN times its start. */
const WIDEN_PER_PX = 0.0005;
const MAX_WIDEN = 1.35;

/** Body width once the snake has grown `gained` px this level. */
export function bodyWidth(spec: SnakeSpec, gained: number): number {
  return spec.width * Math.min(MAX_WIDEN, 1 + Math.max(0, gained) * WIDEN_PER_PX);
}

/** The widest prey that goes down whole, for a body this wide (snakes' jaws stretch past their head). */
export function gapeOf(width: number, spec?: SnakeSpec): number {
  return width * (spec?.gape ?? 1.2);
}

/** The widest prey a venomous bite can put to sleep, for a body this wide. */
export function venomMaxOf(width: number): number {
  return width * 3;
}

/** A meal wider than this many body widths needs the snake to stop and work its jaws over it. */
export const BIG_MEAL = 1.35;

/** The widest prey a loop of body can hold. */
export function coilMaxOf(width: number): number {
  return width * 3.4;
}
