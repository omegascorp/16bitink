import type { GuardAnimal, Ruin } from '../logic/level';

/**
 * What the result card and the rewind say about a loss: a title and a line
 * that tells the player what to do differently. The guard that did it and
 * the ruin change the line: lava is no help against a salamander, and an
 * armadillo is never stomped.
 */
export interface LossText {
  readonly title: string;
  readonly line: string;
}

const JUNGLE: Record<string, LossText> = {
  burnt: { title: 'Too hot!', line: 'Nib walked into the lava. Cool it with water first.' },
  inked: { title: 'Caught!', line: 'A guard got Nib. Wash it away with water, or jump on a boar’s head.' },
  pricked: { title: 'Ouch, spikes!', line: 'Porcupines can’t be stomped. Wash them away, or drop a boulder on them.' },
  melted: { title: 'The gold melted!', line: 'Coins that touch lava are gone, and too few are left.' },
  drained: { title: 'Down the drain!', line: 'Too much gold washed away. Plug the drain first.' },
  crushed: { title: 'Bonk!', line: 'A boulder or a crate came down on Nib. Keep out from under it.' },
  fell: { title: 'Whoops!', line: 'Nib fell out of the temple.' },
};

/** The volcano's own lines, where they differ from the jungle's. */
const VOLCANO: Record<string, LossText> = {
  inked: { title: 'Caught!', line: 'A guard got Nib. Wash it away with water, or drop stone on it.' },
  crushed: { title: 'Bonk!', line: 'A boulder or a falling slab came down on Nib. Keep out from under ledges once he’s left them.' },
  fell: { title: 'Whoops!', line: 'Nib fell out of the shrine.' },
  melted: { title: 'The gold melted!', line: 'Coins that touch lava are gone, and too few are left. Rubies don’t mind lava; gold does.' },
};

/** The tomb's own lines. */
const TOMB: Record<string, LossText> = {
  gassed: { title: 'Cough, cough!', line: 'Nib breathed the tomb gas. Gas rises: vent it through the roof, or burn it, before he walks under it.' },
  blasted: { title: 'Kaboom!', line: 'The gas lit beside Nib. Keep him clear of gas near a flame or lava, or douse the bowl first.' },
  sealed: { title: 'Sealed in!', line: 'A door shut (or a wall stood) between Nib and the treasure. Think about what holds each plate down, and for how long.' },
  fell: { title: 'Whoops!', line: 'Nib fell out of the tomb.' },
  crushed: { title: 'Bonk!', line: 'A boulder or a falling slab came down on Nib. A blast cracks ledges too: keep out from under them.' },
};

/** By the guard that did it, whatever the ruin. */
const BY: Partial<Record<GuardAnimal, LossText>> = {
  salamander: { title: 'Caught!', line: 'Lava can’t hurt a salamander, it just has a warm bath. Only water washes it away (or stone dropped on it).' },
  armadillo: { title: 'Ouch, armour!', line: 'Never jump on an armadillo. Lava, water or falling stone beat it.' },
  frog: { title: 'Caught!', line: 'A rain frog got Nib. Wash it away, or make it drop where the gas leaves: into water, or far from Nib.' },
  toad: { title: 'Caught!', line: 'The old toad got Nib. Light its breath under the coffin lid.' },
};

export function lossText(cause: string | undefined, by?: GuardAnimal, ruin: Ruin = 'jungle'): LossText | undefined {
  if (!cause) return undefined;
  if (by && (cause === 'inked' || cause === 'pricked')) {
    const t = BY[by];
    if (t) return t;
  }
  return (ruin === 'volcano' ? VOLCANO[cause] : ruin === 'tomb' ? (TOMB[cause] ?? VOLCANO[cause]) : undefined) ?? JUNGLE[cause] ?? TOMB[cause];
}
