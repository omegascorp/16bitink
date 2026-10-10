import { clock } from './clock';
import type { HunterId } from './sim';

/** One of a level's three ink blots, and what earns it. */
export interface BlotReason {
  readonly label: string;
  readonly earned: boolean;
}

/**
 * Why each blot was or wasn't earned (see blotsFor): finishing, beating
 * par, and losing no lives. A missed one says what to aim for next time.
 */
export function blotReasons(time: number, parTime: number, livesLost: number): readonly BlotReason[] {
  const underPar = time <= parTime;
  return [
    { label: 'finished', earned: true },
    { label: underPar ? `under par ${clock(parTime)}` : `par ${clock(parTime)}`, earned: underPar },
    { label: livesLost === 0 ? 'no lives lost' : `${livesLost} ${livesLost === 1 ? 'life' : 'lives'} lost`, earned: livesLost === 0 },
  ];
}

/** A faster finish than the best before it; a first finish isn't a "new best". */
export function isNewBest(previousBest: number | undefined, time: number): boolean {
  return previousBest !== undefined && time < previousBest;
}

/** Advice after running out of lives: every way out of being caught. */
export const LOSS_TIPS: readonly string[] = [
  'Red ink means it can catch you. Hold Z to hide in your shell until it wanders off.',
  'Blue-inked creatures are no bigger than you, and the smaller ones are food.',
  'Moving house leaves you bare for a moment. Check for red ink before you swap.',
  'A bigger shell lets you grow bigger, and fewer hunters are bigger than you.',
  'Food is buried in the sand too, richer the deeper you dig. Look for highlighter.',
];

/** The tip for a given try, cycling through them so a retry shows a new one. */
export function lossTip(attempt: number): string {
  const n = LOSS_TIPS.length;
  return LOSS_TIPS[((Math.floor(attempt) % n) + n) % n]!;
}

/** Advice for getting away from what just caught the crab, where there's something particular to say. */
const HUNTER_TIPS: Partial<Readonly<Record<HunterId, string>>> = {
  kestrel: 'A red shadow on the sand is a kestrel about to stoop. Dig in under the sand, or hide in your shell: it strikes the shell and flies off.',
  gull: 'Gulls walk the shore at low water, but they can\'t reach you under water and fly off when the tide comes in.',
  octopus: 'An octopus reaches about three tiles out of its crevice. Go round it, or hide in your shell until it loses interest.',
  blenny: 'Fish only swim in water. At high tide, keep to dry ground, or out of reach of the big ones.',
  sculpin: 'Fish only swim in water. At high tide, keep to dry ground, or out of reach of the big ones.',
  antlion: 'On a pit\'s slope the sand slides you down to the jaws. Walk or jump out, or fill the pit with sand.',
  skink: 'A red ripple in the sand is a sandfish. Get back up into the open: it never hunts on the surface.',
  raven: 'Ravens hop up walls, but they\'re too big to follow you into a tunnel.',
  beetle: 'Tiger beetles dash in bursts and stop to rest. Move while they rest, or hide.',
  mudskipper: 'Mudskippers can\'t climb. Get up into the mangrove roots and they\'re left on the mud below.',
  heron: 'A heron freezes before it stabs. Get in among the mangrove roots, or hide in your shell: its bill can\'t reach you there.',
  sallycrab: 'Sally Lightfoot crabs are quick and hop up the rocks. Hide in your shell, or ride a steam vent up out of reach.',
  hawk: 'A red shadow on the sand is a hawk about to stoop. Get under the rock or the sand, or hide in your shell: it strikes the shell and flies off.',
  dungeness: 'In fog a Dungeness crab sees only what\'s right by it. Keep in the fog, get under the kelp, or hide in your shell.',
  raccoon: 'A raccoon hunts by smell, fog or no fog. Its nose can\'t find you under washed-up kelp, or hidden in your shell.',
  kingfisher: 'A red shadow on the sand is a kingfisher about to dive. It can\'t find you in thick fog or under kelp; or hide in your shell.',
  stonecrab: 'Stone crabs are slow, but their claws are strong. Keep moving, or hide in your shell till it loses interest.',
  bluecrab: 'Blue crabs dash in bursts and stop to rest. Move while they rest, or hide in your shell.',
  osprey: 'A red shadow on the sand is an osprey about to dive. Get under the sand, or hide in your shell: it strikes the shell and flies off.',
  mudcrab: 'Mud crabs hunt by sight, and in a downpour they can\'t see far. Wait for the rain, or hide in your shell.',
  monitor: 'A water monitor tastes the air: rain doesn\'t hide you from it. It\'s slow: outrun it, climb onto a boat, or hide in your shell.',
  brahminy: 'A red shadow on the sand is a Brahminy kite about to stoop. Shelter under a boat or a stilt house, or hide in your shell. It won\'t hunt in the rain.',
  snowcrab: 'Snow crabs hunt by sight and they\'re quick on the pebbles. Hide in your shell, or get the wind behind you and outrun them.',
  arcticfox: 'An Arctic fox hunts by smell. In a gust it smells you from far downwind, but not upwind: keep upwind of it, or hide in your shell.',
  snowyowl: 'A red shadow on the sand is a snowy owl about to stoop. Get under the sand or hide in your shell. It can\'t hover in a gust.',
  treecrab: 'Tree crabs climb as well as you do. Drop off the roots (jump, or hold down on a branch) and run for it, or hide.',
};

/** The tip after a loss: about what caught the crab when there's a particular one, otherwise the next general tip. */
export function catchTip(by: HunterId | null | undefined, attempt: number): string {
  return (by && HUNTER_TIPS[by]) || lossTip(attempt);
}
