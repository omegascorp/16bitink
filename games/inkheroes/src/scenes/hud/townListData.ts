import type { Town } from '../../logic/town';

/** What the town list's rows show: a new town, a town built up, or another town open redraws them. */
export const townListKey = (towns: readonly Town[], here = ''): string => `${here}>${towns.map((t) => `${t.id}:${t.built.join()}`).join('|')}`;
