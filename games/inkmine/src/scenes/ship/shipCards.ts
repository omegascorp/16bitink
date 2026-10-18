import type Phaser from 'phaser';
import { BROKEN_SHIP, shipLookOf } from '../../art/starship';
import { shipTexture, techTexture, TEX } from '../../art/textures';
import type { Profile } from '../../logic/economy';
import { wreckOf } from '../../logic/repairs';
import { landerLookOf } from '../../logic/ship';
import type { StoryCardSpec } from '../kit/storyCard';

/**
 * The story's cards aboard (storyCards.ts shows them), as specs: here, apart
 * from the scene, so the narration test can read every line
 * (test/narration.test.ts).
 */

/** The call that comes in the moment the radio works. */
export const callCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-call',
    title: 'Incoming call',
    subtitle: 'on the radio, the moment it warmed up',
    portrait: { key: techTexture(scene, { kind: 'repair', id: 'comms' }, 'mended'), h: 90 },
    voice: { words: 9, seed: 11 },
    text: "Not the guild. A voice, slow and low, in no language the suit knows: the same slow sounds over and over, then quiet, then again. The radio records it. The dish can't say where it's coming from, only that it's somewhere over the horizon. A handheld receiver could follow it: the stronger it gets, the closer you are.",
    button: 'Keep the recording',
  });

/** In orbit over Mycel, the first time. */
export const mycelOrbitCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-mycel-orbit',
    title: 'In orbit over Mycel',
    subtitle: 'the green moon',
    pictures: [{ key: shipTexture(scene, shipLookOf(p), 'small'), h: 70 }, { key: TEX.world('mycel'), h: 70 }],
    text: "Below, a haze the colour of moss hides the ground. Through gaps in it: white threads mapping the hills, caps the size of hills, and somewhere under it all, the Aster beacon's pulses, loud and clear up here. Down there the receiver can follow it. The suit's sensors light up at once: life, everywhere. Ice and graphite won't be found down there: you'll have to work with what Mycel has.",
    button: 'Take it in',
  });

/** In orbit over Brine, the first time. */
export const brineOrbitCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-brine-orbit',
    title: 'In orbit over Brine',
    subtitle: 'the sea world',
    pictures: [{ key: shipTexture(scene, shipLookOf(p), 'small'), h: 70 }, { key: TEX.world('brine'), h: 70 }],
    text: "Sea, from one edge of the window to the other, violet where the light goes into it. Islands of black rock lie scattered on it, crusted white. The radio hears nothing: no beacon, no pulses. But the telescope, turned on the reef east of the biggest island, picks out something bright just under the water: petals, glazed lilac, the shape of the craft in the Aster's pictures. The lander can only come down on rock: the big island it is.",
    button: 'Take it in',
  });

/** Docked with your ship, the first time. */
export const dockedCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-docked',
    title: 'Docked',
    subtitle: 'your ship, at last',
    pictures: [{ key: shipTexture(scene, BROKEN_SHIP, 'small'), h: 80 }],
    text: "It's cold and dark. The wormhole burnt out its power lines, cracked its telescope's mirror, split its fuel tank and killed its engine, and its jump drive is burnt black. Without the telescope you can't even see which star this is. Everything it needs to mend is down on the grey moon: copper, silver, quartz, graphite and ice, carried up in the lander a load at a time.",
    button: 'Get to work',
  });

/** The Aster's distress call, once the ship's power is back. */
export const distressCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-distress',
    title: 'Distress call',
    subtitle: "on the ship's radio, as the power comes back",
    voice: { words: 10, seed: 41 },
    pictures: [{ key: shipTexture(scene, shipLookOf(p), 'small'), h: 70 }, { key: TEX.world('mycel'), h: 70 }],
    text: "The lights come up, and the ship's radio picks something out of the hiss: not a voice, not the guild's codes. A pattern of pulses, the same phrase over and over, and folded into it a picture the screen can draw: an eight-pointed star falling into a green circle. Nobody needs a language for that. Someone else fell through the wormhole, came down on the green moon, and is calling for help. The Aster, you call them, for the star. The dish finds the source, Mycel, beside this moon, and the pulses' own count says they've been calling for years.",
    button: 'Mark where it comes from',
  });

/** First light: the mended telescope opens the star map. */
export const firstLightCard = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-first-light',
    title: 'First light',
    subtitle: 'the telescope sees again',
    portrait: { key: techTexture(scene, { kind: 'starship', id: 'telescope' }, 'mended'), h: 90 },
    text: 'The new mirror settles, the eyepiece clears, and for the first time since the wormhole you can see where you are.',
    button: 'Open the star map',
  });

/** Lift-off: the lander climbs off the grey moon to your ship. */
export const liftOffSpec = (scene: Phaser.Scene, p: Profile): StoryCardSpec => ({
  line: 'ship-lift-off',
  title: 'Lift-off',
  subtitle: 'up to your ship',
  pictures: [{ key: TEX.lander(landerLookOf(p.ship), 0, wreckOf(p)), h: 150 }],
  text: "The core hums, the tanks feed the thrusters, and the lander climbs off the grey moon. Down on the far rim, the Lamplighters' lanterns get small. Then, ahead, a dark shape against the stars, turning slowly: your ship, right where it braked into orbit before its systems died.",
  button: 'Fly up to it',
});
