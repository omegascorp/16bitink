import type { Blast } from './blastSim';
import type { CreatureKind } from './creatures';
import type { Hold } from './hold';
import type { MineItem } from './items';
import type { OreKey } from './ore';
import type { StoreKind } from './stores';
import type { StormTurn } from './storm';
import type { Gauge } from './suit';
import type { TilePos } from './terrain';

/** What happened in a step of the dig site (mine.ts), for the scene to draw, play and say. */
export type MineEvent =
  | { readonly kind: 'tiles'; readonly tiles: readonly TilePos[] }
  | { readonly kind: 'drilled'; readonly tile: TilePos; readonly cost: number; readonly ore: number }
  | { readonly kind: 'tooHard'; readonly tile: TilePos }
  | { readonly kind: 'flat' }
  | { readonly kind: 'ore'; readonly ore: number }
  | { readonly kind: 'bagFull' }
  | { readonly kind: 'bank'; readonly moved: Hold; readonly pieces: number }
  | { readonly kind: 'cargoFull' }
  /** The lander put the suit right (hearts, shield, air, cell). */
  | { readonly kind: 'restock' }
  /** At the lander, the air tank or the battery couldn't fill the suit (stores.ts). */
  | { readonly kind: 'storesShort'; readonly short: readonly StoreKind[] }
  | { readonly kind: 'noFuel' }
  | { readonly kind: 'fed'; readonly gauge: Gauge; readonly ore: OreKey }
  | { readonly kind: 'cantFeed'; readonly gauge: Gauge; readonly ore: OreKey; readonly why: 'none' | 'full' }
  | { readonly kind: 'airLow' }
  | { readonly kind: 'airOut' }
  | { readonly kind: 'shielded' }
  | { readonly kind: 'lit'; readonly tile: TilePos }
  /** Drilled into a spore pocket: it puffed, and the cloud cost air. */
  | { readonly kind: 'spores'; readonly tile: TilePos }
  /** Sprang off a cap mushroom. */
  | { readonly kind: 'bounce'; readonly big: boolean }
  | { readonly kind: 'blast'; readonly blast: Blast }
  | { readonly kind: 'hurt'; readonly hearts: number; readonly cause: 'blast' | 'air' | 'creature' | 'rock' | 'storm' }
  /** The weather turned: a storm coming, blowing, clearing, or calm again (storm.ts). */
  | { readonly kind: 'storm'; readonly now: StormTurn }
  /** Loose rock (rocks.ts): it started to shake, dropped, landed, or broke on the prospector. */
  | { readonly kind: 'rock'; readonly now: 'shake' | 'fall' | 'land' | 'hit'; readonly tile: TilePos }
  /** Fired the pulse. */
  | { readonly kind: 'pulse' }
  /** A pulse hit a creature: `killed` when it burst or was severed. */
  | { readonly kind: 'struck'; readonly creature: CreatureKind; readonly killed: boolean }
  /** A puffball spat a clot of spores. */
  | { readonly kind: 'spat' }
  /** A snap tendril caught the prospector, or let go. */
  | { readonly kind: 'grabbed' }
  | { readonly kind: 'freed' }
  /** The Mother Mycel beat; `near` when its wave reached the prospector. */
  | { readonly kind: 'beat'; readonly near: boolean }
  /** A bubble jelly stung the prospector; a rasp eel bit them. */
  | { readonly kind: 'stung' }
  | { readonly kind: 'bitten' }
  /** The Leviathan stirred in its sleep, woke, or went back to sleep. */
  | { readonly kind: 'leviathan'; readonly now: 'stir' | 'wake' | 'sleep' }
  /** The Rockslide stirred, woke, shook rock down from the roof, or went back to sleep. */
  | { readonly kind: 'rockslide'; readonly now: 'stir' | 'wake' | 'quake' | 'sleep' }
  /** A boulder crab pinched the prospector; a sand skate struck up at them. */
  | { readonly kind: 'pinched' }
  | { readonly kind: 'struckUp' }
  /** Water moved (a flood running): these tiles' water changed. */
  | { readonly kind: 'water'; readonly tiles: readonly TilePos[] }
  /** Ground opened into water, and it's pouring in; `near` when it's close to the prospector. */
  | { readonly kind: 'flood'; readonly near: boolean; readonly sea: boolean }
  /** Went into the water, or came out. */
  | { readonly kind: 'splash'; readonly into: boolean }
  /** Deep enough under water that the air drains `rate` times as fast (said as it gets worse). */
  | { readonly kind: 'deep'; readonly rate: number }
  /** Winched up; `left` pieces stayed in the world under the flag. */
  | { readonly kind: 'recall'; readonly left: number }
  /** Touched the flag: pieces back in the bag. */
  | { readonly kind: 'bagBack'; readonly pieces: number }
  | { readonly kind: 'item'; readonly item: MineItem }
  | { readonly kind: 'bankItem'; readonly item: MineItem }
  /** Touched an old part: studied (its design is the item's blueprint) and taken apart, its salvage spilt as ore. */
  | { readonly kind: 'salvage'; readonly item: MineItem }
  /** The suit gave out; `dropped` pieces stayed where you fell. */
  | { readonly kind: 'failed'; readonly dropped: number };
