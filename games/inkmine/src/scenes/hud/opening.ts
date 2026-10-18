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
      "The jump went wrong. Your ship struck a wild wormhole, one nobody had charted or steadied, and it tore through, out among stars no chart has. Before its systems died it braked into orbit and sent you down in the lander, for what it would need.",
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
