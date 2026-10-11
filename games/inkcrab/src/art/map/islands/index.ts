import type { BiomeId } from '../../../level/biomes';
import type { BiomeArt } from '../island';
import { ATOLL } from './atoll';
import { BASALT } from './basalt';
import { DUNES } from './dunes';
import { FROST } from './frost';
import { HARBOUR } from './harbour';
import { KELP_COAST } from './kelp';
import { MANGROVE } from './mangrove';
import { MOONLIT } from './moonlit';
import { ROCKPOOL } from './rockpool';
import { WRECK } from './wreck';

/** Each biome's island drawings. */
export const BIOME_ART: Readonly<Record<BiomeId, BiomeArt>> = {
  atoll: ATOLL, dunes: DUNES, rockpool: ROCKPOOL, mangrove: MANGROVE, basalt: BASALT, kelp: KELP_COAST, wreck: WRECK, harbour: HARBOUR, frost: FROST, moonlit: MOONLIT,
};
