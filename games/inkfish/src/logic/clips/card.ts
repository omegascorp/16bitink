import { SPECIES_INFO } from '../../levels/species';
import { BIRD_INFO } from '../birds';
import { deathText, type Death } from '../deaths';

/** The text written over the held frame of a clip. */
export interface ClipCard {
  readonly title: string;
  readonly lines: readonly string[];
}

export interface CardInput {
  readonly kind: 'win' | 'lose';
  readonly death?: Death;
  /** The player's fish, as players know it: "inkling", "young tuna". */
  readonly fishName: string;
  readonly levelName: string;
  readonly seconds: number;
  /** Fish (and birds) eaten. */
  readonly eaten: number;
  /** How grown the fish got, 0..1. */
  readonly progress: number;
}

/** Written along the bottom of every clip. */
export const CLIP_FOOTER = 'InkFish · play free at 16bit.ink';

/** Grown at least this much, a lost clip says how close it was. */
const SO_CLOSE = 0.75;

const clock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function clipCard(input: CardInput): ClipCard {
  const ate = `Ate ${input.eaten} fish`;
  if (input.kind === 'win') return { title: 'Full belly!', lines: [input.levelName, `${ate} in ${clock(input.seconds)}`] };
  const pct = Math.round(input.progress * 100);
  return {
    title: `R.I.P., little ${input.fishName}`,
    lines: [
      deathText(input.death ?? { cause: 'eaten' }).line,
      ...(input.progress >= SO_CLOSE ? [`${pct}% of the way to a full belly.`] : []),
      `${ate} · lasted ${clock(input.seconds)}`,
    ],
  };
}

const slug = (text: string): string => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** A download name that says what's in it: inkfish-tide-pool-3-eaten-by-pike.mp4. */
export function clipFileName(levelName: string, death?: Death): string {
  const by = death?.killer ? SPECIES_INFO[death.killer].name : death?.bird ? BIRD_INFO[death.bird].name : null;
  const ending = death ? [death.cause, ...(by ? ['by', by] : [])].join(' ') : 'full belly';
  return `inkfish-${slug(levelName)}-${slug(ending)}.mp4`;
}
