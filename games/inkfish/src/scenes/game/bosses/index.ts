import type { SpeciesId } from '../../../levels/types';
import type { Fish } from '../fish';
import { BassBoss } from './bass';
import type { Boss, BossHost } from './kit';
import { GrouperBoss } from './grouper';
import { LingcodBoss } from './lingcod';
import { OarfishBoss } from './oarfish';
import { SeadevilBoss } from './seadevil';
import { SharkBoss } from './shark';
import { SleeperBoss } from './sleeper';
import { SwordfishBoss } from './swordfish';
import { TarponBoss } from './tarpon';

export type { Boss, BossHost } from './kit';

/** Each giant's own skills. The squid isn't here: it has its own rig (see squid.ts). */
const BOSSES: Readonly<Partial<Record<SpeciesId, (fish: Fish, host: BossHost) => Boss>>> = {
  bass: (fish, host) => new BassBoss(fish, host),
  tarpon: (fish, host) => new TarponBoss(fish, host),
  lingcod: (fish, host) => new LingcodBoss(fish, host),
  grouper: (fish, host) => new GrouperBoss(fish, host),
  shark: (fish, host) => new SharkBoss(fish, host),
  swordfish: (fish, host) => new SwordfishBoss(fish, host),
  oarfish: (fish, host) => new OarfishBoss(fish, host),
  sleepershark: (fish, host) => new SleeperBoss(fish, host),
  seadevil: (fish, host) => new SeadevilBoss(fish, host),
};

export function makeBoss(fish: Fish, host: BossHost): Boss | null {
  return BOSSES[fish.species]?.(fish, host) ?? null;
}
