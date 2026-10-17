import type { Profile } from '../logic/economy';
import type { WorldId } from '../logic/worlds';
import { PLANET_1 } from './planet1';
import type { PlanetDef } from './types';

/** The planets that ship with the game: Graphite, free. The rest come from the server, to owners only (see content/paid.ts). */
const FREE: readonly PlanetDef[] = [PLANET_1];

let planets: readonly PlanetDef[] = FREE;

/** Adds the full game's planets, already validated (level/validate.ts), after the free one. */
export function installPaidPlanets(paid: readonly PlanetDef[]): void {
  planets = [...FREE, ...paid];
}

/** Every planet with ground this player has: Graphite, then the full game's once installed. */
export const loadedPlanets = (): readonly PlanetDef[] => planets;

/** The planet whose world is `id`, if this player has it. */
export const planetOf = (id: WorldId): PlanetDef | undefined => planets.find((p) => p.world.id === id);

/** Whether a world's ground is here to land on (Mycel needs the full game). */
export const hasWorld = (id: WorldId): boolean => !!planetOf(id);

/** The planet the prospector is at (Graphite if theirs isn't loaded: BootScene keeps them off ground they don't have). */
export const currentPlanet = (p: Pick<Profile, 'at'>): PlanetDef => planetOf(p.at) ?? PLANET_1;
