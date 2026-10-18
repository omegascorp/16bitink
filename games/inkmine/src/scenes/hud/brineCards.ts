import type Phaser from 'phaser';
import { holdEntries, type Hold } from '../../logic/hold';
import { ORES } from '../../logic/ore';
import { HEART, RAISE, REEF_TRADE, type CraftSays, type ReefSays } from '../../logic/story';
import type { StoryCardSpec } from '../kit/storyCard';
import { brinePictures } from './brinePictures';

/** "8 native copper", "6 manganese nodule and 4 brine pearl". */
const words = (h: Hold): string => holdEntries(h).map(([ore, n]) => `${n} ${ORES[ore].name}`).join(' and ');

/**
 * What happens at the Tidesingers' reef (story.ts reefVisit), as a card:
 * meeting them, their copper still to bring, paying it (and the design for
 * how they bore stone), the Aster crew in the air bell, the crew's hull
 * patch, and the craft floated up.
 */
export function reefSpec(scene: Phaser.Scene, says: Exclude<ReefSays, 'wait'>): StoryCardSpec {
  const pic = brinePictures(scene);
  switch (says) {
    case 'meet':
      return {
        line: 'reef-meet',
        title: 'The Tidesingers', subtitle: 'at the mouth of their reef', portrait: pic.singer, voice: { words: 6, seed: 301 },
        text: `They come out of the dark on wide wings, two of them, slow and huge: flat bodies that fly through the water, long lobes curled at the front, eyes along the wing's edge. The song you followed is theirs, and up close it fills the suit. They won't let you past. One lands on the sand and unrolls a lobe into three fine fingers and draws: a branching lump of copper, an arrow into a block of rock, and its own lobe beating on the rock to no use. It wants copper, from inside the stone they can't break. Behind them, through the water, a pale dome glows in the dark, and in it, three small shapes with stars on their shells. Bring them ${words(REEF_TRADE)}.`,
        pictures: [pic.copper],
        button: 'Copper, then',
      };
    case 'want':
      return {
        line: 'reef-want',
        title: 'The Tidesingers', portrait: pic.singer, voice: { words: 3, seed: 307 },
        text: `They circle you, singing low, and the one who drew taps the picture in the sand again. They're still waiting for ${words(REEF_TRADE)}, in your bag.`,
        button: 'Soon',
      };
    case 'paid':
      return {
        line: 'reef-paid',
        title: 'The Tidesingers', subtitle: 'copper for the reef', portrait: pic.singer, voice: { words: 8, seed: 311 },
        text: "They take the copper one lump at a time, turning each in their fingers, and the song rises. Then the one who drew shows you how they bore stone: a tube of copper, spun between its lobes on wet sand, the sand doing the cutting. It's how the Egyptians drilled granite, with copper tubes and sand, four and a half thousand years ago. The suit records it as a design: the Drill Mk 3, your way. Then they part, and lead you in.",
        pictures: [pic.tubeDrill],
        button: 'Follow them',
      };
    case 'crew':
      return {
        line: 'reef-crew',
        title: 'The Aster crew', subtitle: 'in the air bell', portrait: pic.bell, voice: { words: 7, seed: 317 },
        text: "Under the reef the Tidesingers keep a dome of woven fibre, sealed with wax, and full of air: they carry it down in bladders from the surface, a bubble at a time, as a diving bell spider fills its silk bell. In it, three Aster, thin and dull-shelled, their crowns flashing weakly. They know your suit from the pictures the last of them must have scratched for anyone who followed. They flash the story: their craft sank on the reef, the Tidesingers caught them as they swam and brought them here, and they have lived in this bubble ever since, their radio drowned with the craft. Radio dies in seawater; they could never call back. One of them shows you how they breathe out on the reef: a pouch of salt that scrubs the breath, so it can be breathed again. The suit records it: the rebreather.",
        button: 'Get them home',
      };
    case 'patch':
      return {
        line: 'reef-patch',
        title: 'The Aster crew', portrait: pic.bell, voice: { words: 5, seed: 331 },
        text: `They've drawn their craft on the dome's wall: its hull split along the keel. The Tidesingers can float it up with bladders, but it must hold air first. They need iron to patch it: ${words(RAISE)}, from the basalt, in your bag.`,
        button: 'Iron, then',
      };
    case 'raised':
      return {
        line: 'reef-raised',
        title: 'Up from the reef', subtitle: 'the craft floats', portrait: pic.craftRaised, voice: { words: 6, seed: 337 },
        text: "The crew hammer the iron into plates and lash them over the split with cord; the Tidesingers swim down with bladder after bladder of air and tie them under the hull. Slowly, then all at once, the craft lifts off the reef and rises, streaming, to bob on the surface. Real salvors raise wrecks just like this, with lift bags. But its glass stays dark: its cell drowned. It needs a new heart.",
        button: 'A new heart',
      };
  }
}

/** What happens at the Aster craft (story.ts craftVisit): finding it sunk, its heart still to bring, mended (but missing its drive crystal), and flying home. */
export function craftSpec(scene: Phaser.Scene, says: CraftSays): StoryCardSpec {
  const pic = brinePictures(scene);
  switch (says) {
    case 'found':
      return {
        line: 'craft-found',
        title: 'The Aster craft', subtitle: 'sunk on the reef', portrait: pic.craftSunk,
        text: "It's the craft from the pictures on Mycel, built from the lander's petals: tipped on the reef two metres down, cracked along its keel, purple slime over the glaze. Nobody inside. Its radio sits in the water, dead: radio waves die within a metre or two of seawater, which is why submarines can only hear the slowest ones, and why the crew never called back. Scratched inside the hull in their plum ink: the craft going down, three small figures swimming, and under them, great wide shapes rising out of the deep, carrying them down. Down, not up.",
        pictures: [pic.sinking],
        button: 'Down, then',
      };
    case 'heart':
      return {
        line: 'craft-heart',
        title: 'The Aster craft', portrait: pic.craftRaised,
        text: `It bobs over the reef, patched, its glass dark. Their cells are glass prisms on a cathode; bring it ${words(HEART)}, in your bag.`,
        button: 'Soon',
      };
    case 'mended':
      return {
        line: 'craft-mended',
        title: "The craft's heart", subtitle: 'it hums again', portrait: pic.craftMended,
        text: "The crew lift the old cell out, black with salt, and build the new one in its place: manganese for the cathode, nacre to case the prism. The glass catches, flickers and glows teal, and the hull hums. But it doesn't rise. They open the keel and show you an empty cradle: the drive crystal, the glass that turns the cell's power into lift, fell out through the split when it sank. One of them scratches it on the hull for you: the crystal tumbling down a crack in the reef, far down into a cave full of water, to lie beside a shape so big it fills the drawing, asleep. The Tidesingers never go down there. When they sing of it, they sing very quietly.",
        pictures: [pic.crystalFall],
        button: 'Down, quietly',
      };
    case 'flight':
      return {
        line: 'craft-flight',
        title: 'Home', subtitle: 'the craft flies', portrait: pic.craftFlying, voice: { words: 4, seed: 347 },
        text: "The crew slot the crystal into its cradle under the keel, and the craft lifts out of the sea, streaming, on a column of teal light. The Tidesingers rise all round it, singing the long song you followed here, and the crew answer in light, crown after crown. Then it climbs, and turns towards the ringed giant and its green moon: home to Mycel, where the last of them has been waiting all this time. As it goes, their crowns flash at you, slow and steady, the same pulses as the beacon: come.",
        button: 'Follow them',
      };
  }
}

/** Finding the craft's drive crystal in the Leviathan's cave (story.ts crystalVisit). */
export function crystalSpec(scene: Phaser.Scene): StoryCardSpec {
  const pic = brinePictures(scene);
  return {
    line: 'crystal',
    title: 'The drive crystal', subtitle: "in the Leviathan's cave", portrait: pic.crystal,
    text: "It lies in the silt at the far end of the cave, a prism of teal glass as long as your forearm, still faintly lit. At the other end, filling the dark, something sleeps: longer than your lander is tall, crusted with salt, a row of lights along its flank dimming and brightening with each slow breath. Real deep-sea animals light themselves like this, with photophores. You ease the crystal into the suit's pouch. Now back out, as quietly as you came: no drilling near it.",
    pictures: [pic.leviathan],
    button: 'Quietly',
  };
}
