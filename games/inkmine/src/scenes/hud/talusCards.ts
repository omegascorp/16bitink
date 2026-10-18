import type { StoryCardSpec } from '../kit/storyCard';

/**
 * Talus's story moments (spec, "Talus: The story"), as cards: reaching the
 * search party's ship, dug free of the rock at the big mesa's foot. Its
 * recorder speaks your own language, the first words you've understood
 * since the wormhole.
 */
export const SEARCH_SHIP_CARD: StoryCardSpec = {
  line: 'search-ship',
  title: 'A guild ship',
  subtitle: 'the search party',
  portrait: { key: 'search-hatch', h: 90 },
  text: "The hatch opens to the suit's touch, as if it knew you. Inside it's dark and dry, red dust on every ledge, and the recorder still has a little power. It speaks in your own language: the first words you've understood since the wormhole. This is a search party, sent through the wild wormhole after your ship went missing. They came looking for you. And their first log is dated years before you ever fell.",
  button: 'Listen to the logs',
};
