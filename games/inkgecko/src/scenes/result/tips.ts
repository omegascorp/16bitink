import type { LevelDef } from '../../level/types';

type ShooterKind = LevelDef['shooter']['kind'];

/** A tip for the card after a loss, worded for a mouse or a touch screen, maybe only for one way of standing. */
export interface Tip {
  readonly mouse: string;
  readonly touch: string;
  readonly only?: ShooterKind;
}

/** Gentle, useful things to know: one shows after each loss, in turn. */
export const TIPS: readonly Tip[] = [
  { mouse: 'Space or right-click swaps the marble on the gecko\'s tail for the one in its mouth.', touch: 'Tap the gecko to swap the marble on its tail for the one in its mouth.' },
  { mouse: 'Shoot into a gap with the same colour either side: the line rolls back to close it, and that\'s a combo.', touch: 'Shoot into a gap with the same colour either side: the line rolls back to close it, and that\'s a combo.' },
  { mouse: 'Pops that set off more pops roll the line back: chain them to buy time.', touch: 'Pops that set off more pops roll the line back: chain them to buy time.' },
  { mouse: 'Catch the charms that fall: Slow, Reverse and the Ink Pot can turn a level round.', touch: 'Catch the charms that fall: Slow, Reverse and the Ink Pot can turn a level round.' },
  { mouse: 'Work on the marbles nearest the well first: the rest can wait.', touch: 'Work on the marbles nearest the well first: the rest can wait.' },
  { mouse: 'Two of a colour side by side need just one more: look for pairs before singles.', touch: 'Two of a colour side by side need just one more: look for pairs before singles.' },
  { mouse: 'Once the bar is full no more marbles come: pop what\'s left to clear the level.', touch: 'Once the bar is full no more marbles come: pop what\'s left to clear the level.' },
  { mouse: 'On the branch the gecko only spits straight up: run under a gap before you shoot.', touch: 'On the branch the gecko only spits straight up: tap above a gap to run there.', only: 'rail' },
  { mouse: 'Hop to the pad nearest the danger (Q / E or click a pad): short shots are sure shots.', touch: 'Hop to the pad nearest the danger: short shots are sure shots.', only: 'hop' },
];

/** The tips that suit a level where the gecko stands as `kind`. */
export function tipsFor(kind: ShooterKind): readonly Tip[] {
  return TIPS.filter((t) => !t.only || t.only === kind);
}

/** The `turn`-th tip in rotation for a level of `kind`, worded for touch or mouse. */
export function pickTip(turn: number, kind: ShooterKind, touch: boolean): string {
  const tips = tipsFor(kind);
  const tip = tips[((Math.floor(turn) % tips.length) + tips.length) % tips.length]!;
  return touch ? tip.touch : tip.mouse;
}

/** A few kind words for how far the bar got (0..1) before a loss. */
export function closeness(progress: number): string {
  if (progress >= 0.85) return 'So close!';
  if (progress >= 0.5) return 'Over halfway there';
  if (progress >= 0.2) return 'A good start';
  return 'It takes a few goes';
}
