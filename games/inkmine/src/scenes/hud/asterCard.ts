import { TEX } from '../../art/textures';
import type { StoryCardSpec } from '../kit/storyCard';

/**
 * Reaching the Aster lander by its beacon (spec, "Mycel"): what's left of
 * it, and what its crew left behind for whoever came: not words you can
 * read, but pictures scratched into the shell, which say where their gear
 * went: all round the wreck, in the peat and the stone under it. Their
 * broken gear, alien technology, is what the suit learns Mk 2 from.
 */
export const ASTER_CARD: StoryCardSpec = {
  title: 'The Aster lander',
  subtitle: 'what the beacon was calling from',
  portrait: { key: TEX.asterWreck(0), h: 120 },
  text: "Nothing anyone you know would build: a ribbed shell like a seed pod, glazed white, lashed with cord, an eight-pointed star on its crown. It came in too fast from the west, ploughed a furrow through the peat and split open. Nobody's inside, and nobody has been for years. By the door, the crew scratched pictures into the shell for whoever followed the beacon: the pod falling in flames, its pieces flying out all round it, some sinking into the ground, and small figures walking away east. Their broken gear is still out there, close by. None of it works like yours, but the suit can study it.",
  button: 'Search the wreck site',
};
