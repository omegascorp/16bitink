/**
 * The full game's planets, served by the website's /api/content/inkmine to
 * owners only. SERVER-ONLY: never import from client code (test/paywall.test.ts
 * checks). Their art, ores, gear and story text ship with the game; this is
 * the ground itself and where things lie in it.
 */
import { PLANET_2 } from './planet2';
import { PLANET_3 } from './planet3';
import { PLANET_4 } from './planet4';

export const INKMINE_PAID_PLANETS = [PLANET_2, PLANET_3, PLANET_4];
