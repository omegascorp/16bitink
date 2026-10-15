import { PLANET_1 } from './planet1';
import type { PlanetDef } from './types';

/** Planets with worlds; the free one only for now (paid planets come from the server, later). */
export const PLANETS: readonly PlanetDef[] = [PLANET_1];

/** The planet the prospector is on: chapter 1 is Graphite, and the lander doesn't fly yet. */
export const currentPlanet = (): PlanetDef => PLANETS[0]!;
