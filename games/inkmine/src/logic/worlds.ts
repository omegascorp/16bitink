import type { OreKey } from './ore';
import type { Fuels } from './suit';

/**
 * The worlds you can stand on, by the id their world save is keyed by (and
 * the star map's, starSystem.ts): Graphite, free, and Mycel, the full
 * game's first, and Brine, its second (their ground comes from the server,
 * level/planets.ts). The
 * profile says which one you're at. Ids are saved: never change one.
 */
export const WORLD_IDS = ['graphite', 'mycel', 'brine'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export const isWorldId = (v: unknown): v is WorldId => typeof v === 'string' && (WORLD_IDS as readonly string[]).includes(v);

/**
 * What each world's fuels are (spec, "What makes a planet unique": its own
 * fuels for the drill and life support). The lander's tank, the starship's
 * and the lander's air tank are split from the same water as the suit's air:
 * ice on Graphite, where it's frozen; liquid on Mycel and Brine. The cell runs on
 * graphite on Graphite (battery anodes) and on Mycel on what a carbon fuel
 * cell burns: lignite, or the carbon a drilled cap leaves. The main fuel
 * comes first, and is the one named.
 */
export const FUELS: Readonly<Record<WorldId, Fuels>> = {
  graphite: { cell: ['graphite'], air: ['ice'] },
  mycel: { cell: ['lignite', 'carbon'], air: ['water'] },
  // Fresh water from under the islands for the air and tanks; manganese nodules for the cell (an alkaline battery's cathode).
  brine: { cell: ['nodule'], air: ['water'] },
};

export const fuelsAt = (at: WorldId): Fuels => FUELS[at];

/** What the tanks are split from where you are: the same water the suit's air comes from. */
export const waterAt = (at: WorldId): OreKey => FUELS[at].air[0]!;
