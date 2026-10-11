import { BEACH_2 } from '../src/level/beach2';
import { BEACH_3 } from '../src/level/beach3';
import { BEACH_4 } from '../src/level/beach4';
import { BEACH_5 } from '../src/level/beach5';
import { BEACH_6 } from '../src/level/beach6';
import { BEACH_7 } from '../src/level/beach7';
import { BEACH_8 } from '../src/level/beach8';
import { BEACH_9 } from '../src/level/beach9';
import { BEACH_10 } from '../src/level/beach10';
import type { LevelDef } from '../src/level/types';

/**
 * Paid beaches 2–10 (90 levels). SERVER-ONLY: imported by the website's
 * content registry and served by /api/content/inkcrab to verified owners.
 * Never import this, or the beach files, from the game's client code or
 * they ship to everyone (test/paywall.test.ts checks).
 */
export const INKCRAB_PAID_BEACHES: readonly (readonly LevelDef[])[] = [BEACH_2, BEACH_3, BEACH_4, BEACH_5, BEACH_6, BEACH_7, BEACH_8, BEACH_9, BEACH_10];
