import { clock } from './clock';

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
