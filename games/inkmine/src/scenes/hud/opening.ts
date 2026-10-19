import type { Arrival } from '../../level/types';
import type { WorldId } from '../../logic/worlds';
import type { StoryCardSpec } from '../kit/storyCard';

/** A world's first landing card: its world, its title (the world's name), and its words. */
export interface LandingCard {
  readonly world: WorldId;
  readonly title: string;
  readonly arrival: Arrival;
}

/** Graphite's opening card: how you got here, and the first thing to do (later worlds' first landings are their planets' `arrival`). */
export const OPENING: LandingCard = {
  world: 'graphite',
  title: 'Graphite',
  arrival: {
    subtitle: 'a grey moon, uncharted',
    paragraphs: [
      "You're a prospector for the mining guild, and you work alone: a mining ship with no guns, a lander folded in its belly, and a long job at the edge of the charts, to fill the hold with ore. Your people cross the dark only through wormholes they've found, charted and steadied, and the jump out was one you'd made a dozen times.",
      "This time it went wrong. Halfway through, a wild wormhole, one nobody had charted or steadied, tore across your course and took the ship with it. It threw you out among stars no chart has, somewhere your kind has never been. Before its systems died, the ship braked into orbit and sent you down in the lander, for what it would need.",
      "The lander came down hard on a small grey moon. The link to the guild is gone, the suit is still listing the damage, and the way back is gone from memory: which way home lies, even which star. Your ship is up there somewhere, dark. The lander will have to fly to reach it.",
      "Nothing can be mended without the printer, and the printer wants copper. There's copper in the crater walls.",
    ],
    button: 'Get up',
  },
};

/** A landing card as the narrator reads it: its paragraphs, one after another, as the line `arrival-<world>`. */
export const landingSpec = (card: LandingCard): StoryCardSpec => ({
  line: `arrival-${card.world}`,
  title: card.title,
  text: card.arrival.paragraphs.join('\n\n'),
  button: card.arrival.button,
});
