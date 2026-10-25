import { CHAPTER_PREY } from './chapters/index';
import type { PreyKind, PreySpec } from './preyTypes';

export * from './preyTypes';
export { freeSpot, stepPrey } from './preyMoves';

/** Chapter 1's prey: the farm's. */
const FARM_PREY: Readonly<Record<string, PreySpec>> = {
  mouse: { name: 'mouse', plural: 'mice', size: 13, growth: 30, gait: 'scurry', speed: 112, fear: 120, points: 10 },
  frog: { name: 'frog', size: 15, growth: 34, gait: 'hop', speed: 300, fear: 95, points: 12 },
  rat: { name: 'rat', size: 30, growth: 86, gait: 'scurry', speed: 84, fear: 105, points: 40 },
  egg: { name: "hen's egg", plural: "hen's eggs", size: 16, growth: 26, gait: 'still', speed: 0, fear: 0, points: 15 },
};

let all: Readonly<Record<PreyKind, PreySpec>> | null = null;

/**
 * Every prey kind in the game, by kind: the farm's and each chapter's
 * (logic/chapters/). Merged on first use, not at load: chapter modules
 * import this file, so at load time the chapters may not be ready yet.
 */
export function allPrey(): Readonly<Record<PreyKind, PreySpec>> {
  all ??= { ...FARM_PREY, ...CHAPTER_PREY };
  return all;
}

/** Every prey kind by kind, read through allPrey (a view, so it's safe to import anywhere). */
export const PREY_SPECS: Readonly<Record<PreyKind, PreySpec>> = new Proxy({} as Record<PreyKind, PreySpec>, {
  get: (_t, k) => (typeof k === 'string' ? allPrey()[k] : undefined),
  has: (_t, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(allPrey(), k),
  ownKeys: () => Reflect.ownKeys(allPrey()),
  getOwnPropertyDescriptor: (_t, k) => Object.getOwnPropertyDescriptor(allPrey(), k),
});

/** Whether `kind` is a prey kind of the game. */
export function isPreyKind(kind: unknown): kind is PreyKind {
  return typeof kind === 'string' && Object.prototype.hasOwnProperty.call(allPrey(), kind);
}

/** A prey kind's spec (a mouse's, for an unknown kind: validated levels never have one). */
export function preySpec(kind: PreyKind): PreySpec {
  return allPrey()[kind] ?? FARM_PREY.mouse!;
}

/** The plural of a prey kind's name. */
export function preyPlural(kind: PreyKind): string {
  const s = preySpec(kind);
  return s.plural ?? `${s.name}s`;
}
