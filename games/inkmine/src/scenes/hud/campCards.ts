import type Phaser from 'phaser';
import { bakeAsterCamp, TEX } from '../../art/textures';
import { holdEntries } from '../../logic/hold';
import { ORES } from '../../logic/ore';
import { WAKE, type CampSays } from '../../logic/story';
import type { CardPicture, StoryCardSpec } from '../kit/storyCard';

/** What the pod needs, in words: "6 pyrite and 4 calcite". */
const charge = holdEntries(WAKE).map(([ore, n]) => `${n} ${ORES[ore].name}`).join(' and ');

/** What the crew scratched on the wall: three flying off in a craft of the lander's petals, one left asleep, and where they went. */
function story(): CardPicture[] {
  return [{ key: TEX.asterCraftPicture, h: 96 }, { key: TEX.asterBrinePicture, h: 96 }];
}

/**
 * What happens at the Aster's camp (story.ts campVisit), as a card: finding
 * it and the pictures on its wall, the pod still waiting for its charge,
 * and the last of the crew waking to show you where the others went.
 */
export function campSpec(scene: Phaser.Scene, says: Exclude<CampSays, 'awake'>): StoryCardSpec {
  bakeAsterCamp(scene);
  const pod = { key: TEX.asterPod('failing', 0), h: 84 };
  switch (says) {
    case 'camp':
      return {
        title: 'The Aster camp', subtitle: 'where the trail ended', pictures: story(),
        text: `Under a skin of peat, a shaft, and at its bottom a cave they sealed against the spores, every crack smeared shut with amber. Three bedrolls of woven cord lie along the wall, long empty. Above them, in their plum ink, the crew drew what happened: a small craft built from the lander's petals, three of them flying off in it towards a blue world, and one lying down in a pod to wait. The pod is here, in the middle of the cave. Through its glass you can make out someone asleep, in a faint teal glow that flickers. The suit reads its cell: nearly flat. Their cells are glass prisms on a pyrite cathode, like the pulse's, so you can make it a charge: ${charge}.`,
        button: 'Bring it power',
      };
    case 'pod':
      return {
        title: 'The sleep pod', portrait: pod,
        text: `The glow under the glass is fainter than when you left. Bring the pod its charge in your bag: ${charge}.`,
        button: 'Soon',
      };
    case 'woken':
      return {
        title: 'The last of the Aster', subtitle: 'awake after years', portrait: { key: TEX.asterPerson('speak', 0), h: 96 }, pictures: story(),
        text: "The ore goes into the pod's cell, and the glass brightens until it hurts to look at. The petals unfold. Something inside stirs and stands up on six thin legs: a shell glazed lilac, small eyes all the way round it, and a light pulsing in the glass on its crown, the same pulses as the distress call. It looks at you for a long time. Then it crouches and scratches in the peat, as its crew did on the wall: the three of them, the craft, the blue world. Brine, the sea world on your star map. It draws a line from Brine back to here and stops it halfway: they were going to call back, and never did. It taps your suit, then the blue world, and its crown flashes slow and steady, as the beacon has all these years.",
        button: 'Find them',
      };
  }
}
