import type Phaser from 'phaser';
import { shipLookOf } from '../../art/starship';
import { shipTexture, TEX } from '../../art/textures';
import type { Profile } from '../../logic/economy';
import { STAR, worldById } from '../../logic/starSystem';
import { FIRST_COURSE } from '../../logic/starship';
import { hasBeat } from '../../logic/story';
import type { WorldId } from '../../logic/worlds';
import type { StoryCardSpec } from '../kit/storyCard';

/**
 * The star map's story cards (SystemScene shows them), as specs: here,
 * apart from the scene, so the narration test can read every line
 * (test/narration.test.ts).
 */

/** First light: where you fell, on the star map. */
export const whereYouFellCard = (): StoryCardSpec => ({
  line: 'map-where-you-fell',
  title: 'Where you fell',
  subtitle: 'the star map, at first light',
  pictures: [{ key: TEX.star, h: 90 }, { key: TEX.world('sepia'), h: 90 }],
  text: `${STAR.name[0]!.toUpperCase()}${STAR.name.slice(1)}, and twelve worlds round it. The grey moon was never a planet: it's one of three moons round the ringed giant. Not one of these worlds is in any chart you remember. Home is somewhere past all of them.`,
  button: 'Look around',
});

/**
 * A trip made from `was` (the profile before it) to `to`: the first one
 * ends chapter 1, the first to Brine starts chapter 3, and following the
 * Aster crew home from Brine ends chapter 3's sea part. Each kind of trip
 * is its own line for the narrator; the others are per route.
 */
export function flightCard(scene: Phaser.Scene, was: Profile, to: WorldId): StoryCardSpec {
  const first = !hasBeat(was, 'course');
  const sea = to === 'brine' && !was.visited.includes('brine');
  // Following the Aster crew home from the sea world, at the end of chapter 3.
  const homeward = to === 'mycel' && was.at === 'brine' && hasBeat(was, 'craftFlown') && !hasBeat(was, 'asterReunion');
  const name = worldById(to)!.name;
  const from = worldById(was.at)!.name;
  const text = first
    ? `The engine hums for the first time since the wormhole, and the grey moon slides away below. ${name} grows ahead, green under its haze: a world with air, and with life in it. Whatever lives there has never seen anything like you.`
    : homeward
      ? `The engine hums and the sea world falls away behind. Somewhere ahead, a speck of teal light is crossing the same dark: the crew's craft, going home. Days on, the ringed giant fills the window, and beside it the green moon, where four of the Aster will be waiting.`
      : sea
        ? `The Aster tank takes the strain, and for the first time the ship leaves the ringed giant behind. ${from} shrinks to a ${was.at === 'mycel' ? 'green' : 'grey'} dot beside it, then is lost in its glare. Days on, a blue-violet world fills the window: sea from edge to edge, scattered with islands, and somewhere down there, three of the Aster.`
        : to === 'brine' || was.at === 'brine'
          ? `The engine hums and ${from} slides away below. The long crossing between the ringed giant and the sea world, and ${name} fills the window.`
          : `The engine hums and ${from} slides away below. A short hop round the ringed giant, and ${name} fills the window.`;
  return {
    line: first ? 'trip-first' : homeward ? 'trip-homeward' : sea ? `trip-sea-from-${was.at}` : `trip-${was.at}-${to}`,
    title: `Course set for ${name}`,
    subtitle: first ? 'the end of chapter 1' : sea ? 'the start of chapter 3' : `${from} to ${name}`,
    pictures: [{ key: shipTexture(scene, shipLookOf(was), 'small'), h: 70 }, { key: TEX.world(to), h: 70 }],
    text,
    button: `On to ${name}`,
  };
}

/** The first trip set without the full game: the end of chapter 1, and of the demo. */
export function firstCourseCard(scene: Phaser.Scene, p: Profile): StoryCardSpec {
  const to = worldById(FIRST_COURSE.to)!.name;
  return {
    line: 'trip-first-demo',
    title: `Course set for ${to}`,
    subtitle: 'the end of chapter 1',
    pictures: [{ key: shipTexture(scene, shipLookOf(p), 'small'), h: 70 }, { key: TEX.world(FIRST_COURSE.to), h: 70 }],
    text: `The engine hums for the first time since the wormhole, and the grey moon slides away below. ${to} grows ahead, green under its haze: a world with air, and with life in it. Somewhere under that haze, the Aster beacon is still calling.`,
    button: 'On to Mycel',
  };
}

/** Where the demo stops, with the full game offered; `price` as the site shows it, if it does. */
export const demoEndCard = (price: string | undefined, look: () => void): StoryCardSpec => ({
  line: 'demo-end',
  title: 'The end of the demo',
  subtitle: 'thank you for playing',
  pictures: [{ key: TEX.world(FIRST_COURSE.to), h: 80 }],
  text: `That's as far as the demo goes. ${worldById(FIRST_COURSE.to)!.name}, the green moon, is in the full game: follow an alien distress call down into a fungal jungle, find the wreck of the Aster's lander, and learn from their strange gear to print your own from the moon's ores. Then on to Brine, a purple sea world, to swim its reefs and find the Aster's lost crew. The worlds after it, and the long search for the way home, come as free updates.`,
  button: `Unlock the full game${price ? ` · ${price}` : ''}`,
  secondary: { label: 'Look at the map', press: look },
});
