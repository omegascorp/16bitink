import type { Town } from '../../logic/town';

/** What the town list's rows show: a new town, or a town built up, redraws them. */
export const townListKey = (towns: readonly Town[]): string => towns.map((t) => `${t.id}:${t.built.join()}`).join('|');
