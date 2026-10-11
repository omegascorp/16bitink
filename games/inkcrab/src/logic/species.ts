/**
 * The creatures roaming a beach besides the player. All share one rule
 * (bigger catches you, smaller is food: if you're bigger, you eat it) and
 * differ in how they move and whether they hunt.
 */
export type SpeciesId = 'ghostcrab' | 'slater' | 'beetle' | 'darkling' | 'antlion' | 'skink' | 'raven' | 'shorecrab' | 'blenny' | 'sculpin' | 'octopus' | 'gull'
  | 'fiddler' | 'mudskipper' | 'heron' | 'treecrab'
  | 'lavalizard' | 'sallycrab'
  | 'kelpcrab' | 'dungeness' | 'raccoon'
  | 'porcelaincrab' | 'stonecrab' | 'bluecrab' | 'hermit'
  | 'bubbler' | 'mudcrab' | 'monitor'
  | 'seaspider' | 'snowcrab' | 'arcticfox'
  | 'brittlestar' | 'horneyed' | 'coconutcrab';

/**
 * How it gets about: walkers roam the surface and open tunnels; a lurker
 * stays put at the bottom of its pit; a burrower swims through the sand
 * itself (never rock), anywhere below the surface; a swimmer only moves in
 * water; a den-dweller stays in its rock crevice and reaches out of it; a
 * wader stalks the open mud and stabs with its bill; a climber walks the
 * mud and climbs about in the mangrove roots.
 */
export type Movement = 'walk' | 'lurk' | 'burrow' | 'swim' | 'den' | 'wade' | 'climb';

export interface SpeciesSpec {
  readonly id: SpeciesId;
  readonly name: string;
  /** Speed as a share of the ghost crab's at the same size. */
  readonly speed: number;
  /** How far (tiles) it notices the player. */
  readonly sight: number;
  /** Whether it goes after a smaller player; timid ones only ever run. */
  readonly hunts: boolean;
  /** Runs in bursts: seconds running, then seconds standing still. */
  readonly burst?: { readonly run: number; readonly rest: number };
  /** Default: walk. */
  readonly move?: Movement;
  /** Hops up walls a walker would turn back at. */
  readonly hops?: boolean;
  /** Hunts by smell: fog doesn't hide the crab from it, only the reek of kelp wrack does. */
  readonly nose?: boolean;
  /** Only about at low tide: flies off when the water comes in (gulls). */
  readonly lowTide?: boolean;
  /**
   * Body box as a share of the shell size scale (see critterBox). Widths sit
   * near 1, as wide as a crab in a shell of the same size, so on screen a
   * bigger creature always looks bigger than a smaller crab.
   */
  readonly box: { readonly w: number; readonly h: number };
}

export const SPECIES: Readonly<Record<SpeciesId, SpeciesSpec>> = {
  ghostcrab: { id: 'ghostcrab', name: 'ghost crab', speed: 1, sight: 6, hunts: true, box: { w: 0.95, h: 0.65 } },
  // A sea slater: a woodlouse of the strandline. Slow and harmless-minded; it never chases.
  slater: { id: 'slater', name: 'sea slater', speed: 0.6, sight: 4, hunts: false, box: { w: 1, h: 0.47 } },
  // A tiger beetle: a real beach predator, sprinting in short dashes with keen eyes.
  beetle: { id: 'beetle', name: 'tiger beetle', speed: 1.5, sight: 8, hunts: true, burst: { run: 0.7, rest: 0.5 }, box: { w: 0.95, h: 0.57 } },
  // Dune Sea (beach 2). A darkling beetle: the dunes' slow, harmless forager.
  darkling: { id: 'darkling', name: 'darkling beetle', speed: 0.65, sight: 4, hunts: false, box: { w: 0.95, h: 0.55 } },
  // An antlion: waits, buried to the jaws, at the bottom of its sand pit.
  antlion: { id: 'antlion', name: 'antlion', speed: 0, sight: 0, hunts: true, move: 'lurk', box: { w: 0.9, h: 0.42 } },
  // A sandfish skink: swims through the sand itself, after crabs in their tunnels.
  skink: { id: 'skink', name: 'sandfish', speed: 0.6, sight: 7, hunts: true, move: 'burrow', box: { w: 1.25, h: 0.45 } },
  // A raven: walks the dunes and hops up what would stop a crab; too big for a tunnel.
  raven: { id: 'raven', name: 'raven', speed: 1.1, sight: 9, hunts: true, hops: true, box: { w: 1.15, h: 0.95 } },
  // Tide Pool Notes (beach 3). A young shore crab: the pools' small, timid prey.
  shorecrab: { id: 'shorecrab', name: 'shore crab', speed: 0.8, sight: 4, hunts: false, box: { w: 0.95, h: 0.6 } },
  // A blenny: a small, quick pool fish, in water only.
  blenny: { id: 'blenny', name: 'blenny', speed: 0.9, sight: 6, hunts: true, move: 'swim', box: { w: 1.2, h: 0.5 } },
  // A sculpin: a big-headed, slower fish that comes in with the tide.
  sculpin: { id: 'sculpin', name: 'sculpin', speed: 0.7, sight: 7, hunts: true, move: 'swim', box: { w: 1.3, h: 0.6 } },
  // An octopus: stays in its crevice in the rock and reaches out of it.
  octopus: { id: 'octopus', name: 'octopus', speed: 0, sight: 4, hunts: true, move: 'den', box: { w: 0.9, h: 0.7 } },
  // A herring gull: walks the exposed shore at low tide, hops up rocks.
  gull: { id: 'gull', name: 'gull', speed: 1, sight: 9, hunts: true, hops: true, lowTide: true, box: { w: 1.2, h: 1 } },
  // Mangrove Margins (beach 4). A fiddler crab: the mudflat's small, timid prey, one claw far bigger than the other.
  fiddler: { id: 'fiddler', name: 'fiddler crab', speed: 0.85, sight: 4, hunts: false, box: { w: 0.95, h: 0.6 } },
  // A mudskipper: a fish that skips across the mud in quick bursts. It can't climb.
  mudskipper: { id: 'mudskipper', name: 'mudskipper', speed: 1.15, sight: 6, hunts: true, burst: { run: 0.4, rest: 0.8 }, box: { w: 1.25, h: 0.5 } },
  // A striated heron: stalks the open mud and stabs with its bill. The root tangle keeps the bill out.
  heron: { id: 'heron', name: 'heron', speed: 0.45, sight: 6, hunts: true, move: 'wade', box: { w: 1, h: 1.5 } },
  // A mangrove tree crab: walks the mud and climbs the roots after crabs up there.
  // Ash & Basalt (beach 5). A lava lizard: the black beach's small, quick, timid prey.
  lavalizard: { id: 'lavalizard', name: 'lava lizard', speed: 1, sight: 5, hunts: false, box: { w: 1.2, h: 0.5 } },
  // A young Sally Lightfoot crab: fast, sooty black on the lava, it hops up the basalt after smaller crabs.
  sallycrab: { id: 'sallycrab', name: 'Sally Lightfoot crab', speed: 1.15, sight: 6, hunts: true, hops: true, box: { w: 1, h: 0.62 } },
  // Fog & Kelp (beach 6). A northern kelp crab: a small, timid spider crab, olive as the kelp it lives in.
  kelpcrab: { id: 'kelpcrab', name: 'kelp crab', speed: 0.85, sight: 4, hunts: false, box: { w: 1, h: 0.6 } },
  // A Dungeness crab: broad and purple-brown, it walks the sand after smaller crabs. Fog blinds it.
  dungeness: { id: 'dungeness', name: 'Dungeness crab', speed: 0.9, sight: 5, hunts: true, box: { w: 1.1, h: 0.6 } },
  // A raccoon: forages the strandline by smell, nose down. Slow, short-sighted, and the fog doesn't hide you from it.
  raccoon: { id: 'raccoon', name: 'raccoon', speed: 0.75, sight: 4, hunts: true, nose: true, box: { w: 1.35, h: 1 } },
  // Wreck Cove (beach 7). A porcelain crab: tiny, flat and timid, from under the rocks and the wreck's timbers.
  porcelaincrab: { id: 'porcelaincrab', name: 'porcelain crab', speed: 0.85, sight: 4, hunts: false, box: { w: 0.95, h: 0.55 } },
  // A Florida stone crab: slow, heavy, with great black-tipped crushing claws.
  stonecrab: { id: 'stonecrab', name: 'stone crab', speed: 0.7, sight: 5, hunts: true, box: { w: 1.1, h: 0.65 } },
  // A blue crab: a fast swimmer on the sand too, dashing in bursts.
  bluecrab: { id: 'bluecrab', name: 'blue crab', speed: 1.3, sight: 6, hunts: true, burst: { run: 0.6, rest: 0.7 }, box: { w: 1.2, h: 0.55 } },
  // A rival hermit crab: harmless, after the same shells you are (see logic/rivals.ts). Never food, never a hunter.
  // It clambers up and down steps a ghost crab turns back at, so a line of followers keeps up.
  hermit: { id: 'hermit', name: 'hermit crab', speed: 0.9, sight: 5, hunts: false, hops: true, box: { w: 0.95, h: 0.7 } },
  // Monsoon Harbour (beach 8). A sand bubbler crab: tiny and timid, it sifts the wet sand into little balls.
  bubbler: { id: 'bubbler', name: 'sand bubbler crab', speed: 0.9, sight: 4, hunts: false, box: { w: 0.95, h: 0.55 } },
  // A mud crab: a heavy, big-clawed hunter of the harbour mud. It hunts by sight, so the rain half-blinds it.
  mudcrab: { id: 'mudcrab', name: 'mud crab', speed: 0.85, sight: 6, hunts: true, box: { w: 1.15, h: 0.65 } },
  // A water monitor: a long lizard that hunts by tasting the air with its tongue, so the rain doesn't hide you from it. Slow, short-sighted.
  monitor: { id: 'monitor', name: 'water monitor', speed: 0.7, sight: 4, hunts: true, nose: true, box: { w: 1.5, h: 0.7 } },
  // Frost Shingle (beach 9). A sea spider: a slow, timid, spindly-legged creature of the cold shore, all legs and no body.
  seaspider: { id: 'seaspider', name: 'sea spider', speed: 0.6, sight: 4, hunts: false, box: { w: 1, h: 0.5 } },
  // A snow crab: long-legged and quick on the pebbles, it hunts by sight.
  snowcrab: { id: 'snowcrab', name: 'snow crab', speed: 1, sight: 6, hunts: true, box: { w: 1.25, h: 0.6 } },
  // An Arctic fox: noses along the strandline. It hunts by smell, so in a gust it smells you only from downwind.
  arcticfox: { id: 'arcticfox', name: 'Arctic fox', speed: 0.8, sight: 5, hunts: true, nose: true, box: { w: 1.4, h: 1 } },
  // Moonlit Bay (beach 10). A brittle star: out on the sand at night, slow and timid, five thin arms rowing it along.
  brittlestar: { id: 'brittlestar', name: 'brittle star', speed: 0.6, sight: 4, hunts: false, box: { w: 1, h: 0.4 } },
  // A horn-eyed ghost crab: the night beach's sprinter, dashing in bursts and hunting by sight, so the dark half-blinds it.
  horneyed: { id: 'horneyed', name: 'horn-eyed ghost crab', speed: 1.3, sight: 7, hunts: true, burst: { run: 0.7, rest: 0.6 }, box: { w: 1, h: 0.65 } },
  // A coconut crab: a huge, slow land hermit that hunts by smell, so the dark doesn't hide you from it. It clambers up steps.
  coconutcrab: { id: 'coconutcrab', name: 'coconut crab', speed: 0.7, sight: 5, hunts: true, nose: true, hops: true, box: { w: 1.35, h: 0.8 } },
  treecrab: { id: 'treecrab', name: 'tree crab', speed: 0.8, sight: 5, hunts: true, move: 'climb', box: { w: 0.95, h: 0.62 } },
};

export function movementOf(id: SpeciesId): Movement {
  return SPECIES[id].move ?? 'walk';
}
