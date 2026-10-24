import type { BossKind, LevelDef } from './types';

/** How a level's twist is told: a few words on its card, a hint as it starts, and a tip after a loss. */
export interface TwistText {
  /** For the level card: what's different here. */
  readonly card: string;
  /** Shown over the board as the level starts. */
  readonly hint: string;
  /** Shown on the card after a loss. */
  readonly tip: string;
}

/** Each boss's rule, told three ways. */
const BOSSES: Readonly<Record<BossKind, TwistText>> = {
  mole: {
    card: 'Boss: the Mole pops up from its molehills',
    hint: 'The Mole! Hit it while it\'s up: each time it surfaces it shoves a line on',
    tip: 'Watch the molehills: the Mole comes up in a new one each time, and goes down when hit.',
  },
  frog: {
    card: 'Boss: the Bullfrog leaps from pad to pad',
    hint: 'The Bullfrog! While its throat puffs up it swallows shots and spits them into a line',
    tip: 'Hit the Bullfrog while it sits quietly: wait out the croak, and it can\'t be hit mid-leap.',
  },
  snail: {
    card: 'Boss: the Great Snail crawls the glasshouse',
    hint: 'The Great Snail! After each hit it hides in its shell for a moment',
    tip: 'The snail hides after each hit: use the wait to pop marbles, then hit it again as it comes out.',
  },
  magpie: {
    card: 'Boss: the Magpie drops buds into the lines',
    hint: 'The Magpie! Hit it while it perches: each time it lands it drops a bud into a line',
    tip: 'The Magpie can only be hit while perched: aim for where it lands.',
  },
  tortoise: {
    card: 'Boss: the Old Tortoise leads a line',
    hint: 'The Old Tortoise leads the line! Pop the marbles touching it to hurt it',
    tip: 'Shots bounce off the tortoise\'s shell: pop the marbles right behind it instead (combos hurt it twice).',
  },
  scarecrow: {
    card: 'Boss: the Scarecrow\'s sleeves stop shots',
    hint: 'The Scarecrow! Its turning sleeves stop shots: hit its hat between them',
    tip: 'Wait for the scarecrow\'s sleeves to turn aside, then hit its hat.',
  },
  chameleon: {
    card: 'Boss: the Great Chameleon changes colour',
    hint: 'The Great Chameleon! Only a marble of its colour hurts it',
    tip: 'Swap to the chameleon\'s colour before you shoot it: other colours just glance off.',
  },
  cat: {
    card: 'Boss: the Barn Cat swats shots back',
    hint: 'The Barn Cat swats straight shots! Bank them off the walls to hit it',
    tip: 'The cat only feels shots that come off a wall: bank them round to its side.',
  },
  lion: {
    card: 'Boss: the Stone Lion wakes',
    hint: 'The Stone Lion! Straight shots chip off it: glance them off a column into it',
    tip: 'Only shots that glance off a column hurt the lion: watch the faint aim line bend.',
  },
  owl: {
    card: 'Boss: the Owl in the dark',
    hint: 'The Owl! Hit it while it perches: each time it lands it hoots and the night closes in',
    tip: 'Look for the owl\'s eyes in the dark: it can only be hit while it\'s perched.',
  },
};

const goldLeft = (n: number): string => `${n} golden marble${n === 1 ? '' : 's'}`;

/** What's different about a level, told for its card, its start and a loss (none if it's plain). */
export function twistTexts(level: LevelDef): TwistText[] {
  const out: TwistText[] = [];
  const add = (card: string, hint: string, tip: string): void => {
    out.push({ card, hint, tip });
  };
  if (level.boss) out.push(BOSSES[level.boss.kind]);
  const mode = level.mode;
  if (mode?.kind === 'holdout') add(`Hold out for ${mode.seconds} seconds`, `Hold out for ${mode.seconds} seconds: the bar fills with time, not points`, 'On a hold-out, points don\'t matter: just keep every line away from its well.');
  if (mode?.kind === 'blitz') add(`Fill the bar in ${mode.seconds} seconds`, `Quick! Fill the bar within ${mode.seconds} seconds`, 'On a blitz, combos and gap shots fill the bar fastest.');
  if (mode?.kind === 'gold') add(`Pop ${goldLeft(mode.count)}`, `Pop ${goldLeft(mode.count)}: only they fill the bar`, 'Golden marbles fill the bar: match the colour round them first.');
  if (level.lives === 1) add('One life', 'One life: don\'t let a single marble into the well', 'One life here: deal with the line nearest its well before anything else.');
  if (level.wind) add('Gusts bend your shots', 'Gusts of wind bend your shots: aim into the wind', 'The wind changes side after each calm: shoot in the calms, or aim a little into it.');
  if (level.surge) add('The lines lurch on now and then', 'Now and then the lines lurch forward: watch for the shudder', 'A surge comes every few seconds: keep the line clear of its well before it does.');
  if (level.tide) add('The lines draw back now and then', 'Now and then the lines draw back by themselves', 'The tide pulls the lines back: use it to catch up, and line up gap shots.');
  if (level.tracks.some((t) => t.opensAt)) add('A late burrow', 'Another burrow opens once the bar fills a little', 'A second line comes out once the bar fills: leave room to deal with it.');
  if (level.tracks.some((t) => t.pace && t.pace !== 1)) add('Lines at different speeds', 'The lines roll at different speeds: watch the quick one', 'Keep an eye on the quicker line: it reaches its well first.');
  if (level.noSwap) add('No swapping', 'No swapping here: the marble on the tail waits its turn', 'No swaps: plan one shot ahead with the marble on the gecko\'s tail.');
  if (level.colourAt) add('A colour joins halfway', 'Another colour joins once the bar fills a little', 'A new colour joins partway: clear the line before it gets mixed.');
  if (level.leaves) add('Leaves drift across', 'Big leaves drift across and stop shots: shoot round them', 'Leaves stop shots dead: wait for them to drift past.');
  if (level.wander) add('The gecko paces', 'The gecko paces as it aims: lead your shots', 'The gecko keeps moving: shoot at what\'s close to it now.');
  if (level.restless) add('Pads tip you off', `Each pad tips you off after ${level.restless} seconds: hop on before it does`, 'Hop before the pad tips you: pick the pad you want, not the next one.');
  if (level.charmy) add('Charms galore', 'Charms turn up twice as often here', 'Charms come thick and fast here: use them all.');
  return out;
}

/** The boss's name and rule, for the card. */
export function bossText(kind: BossKind): TwistText {
  return BOSSES[kind];
}
