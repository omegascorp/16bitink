import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import { ace, assault, fortress } from './combat';
import { ambush, chase, escort } from './convoy';
import { breakout, salvage } from './run';
import { raid, rescue } from './targets';
import type { Objective } from './types';
import { capture, hold, recon } from './zones';

/** Sets up a level's main objective in a match (after the map, before the enemies). */
export function createObjective(m: Match, def: ObjectiveDef): Objective {
  switch (def.kind) {
    case 'assault':
      return assault(m);
    case 'raid':
      return raid(m, def);
    case 'escort':
      return escort(m, def);
    case 'hold':
      return hold(m, def);
    case 'ace':
      return ace(m);
    case 'rescue':
      return rescue(m, def);
    case 'ambush':
      return ambush(m, def);
    case 'salvage':
      return salvage(m, def);
    case 'breakout':
      return breakout(m, def);
    case 'recon':
      return recon(m, def);
    case 'capture':
      return capture(m, def);
    case 'chase':
      return chase(m, def);
    case 'fortress':
      return fortress(m, def);
  }
}
