import type Phaser from 'phaser';
import { techTexture, TEX } from '../../art/textures';
import type { Says } from '../../logic/story';
import type { CardPicture, StoryCardSpec } from '../kit/storyCard';

/** What the Lamplighters draw in the dust: ten lumps of silver, then a drive core. */
function trade(scene: Phaser.Scene): CardPicture[] {
  return [{ key: TEX.piece('silver'), h: 60, caption: '× 10' }, { key: techTexture(scene, { kind: 'repair', id: 'core' }, 'mended'), h: 90 }];
}

/** Your lander as they draw it: the torn hull and the crumpled bell, and then the core. */
function notYet(scene: Phaser.Scene): CardPicture[] {
  return [
    { key: techTexture(scene, { kind: 'repair', id: 'hull' }, 'broken'), h: 76, caption: 'mend' },
    { key: techTexture(scene, { kind: 'repair', id: 'thrusters' }, 'broken'), h: 76, caption: 'mend' },
    { key: techTexture(scene, { kind: 'repair', id: 'core' }, 'mended'), h: 90 },
  ];
}

/**
 * What a Lamplighter says when you come to them (story.ts), as a card:
 * their voice as the suit records it, which nobody understands yet, and
 * the pictures they draw in the dust, which anybody can.
 */
export function talkSpec(scene: Phaser.Scene, says: Exclude<Says, 'thanks'>): StoryCardSpec {
  const portrait = { key: TEX.lamplighter(0), h: 130 };
  switch (says) {
    case 'meet':
      return {
        line: 'talk-meet',
        title: 'A Lamplighter', subtitle: "on the crater's far rim", portrait, voice: { words: 7, seed: 21 }, pictures: trade(scene),
        text: 'Tall and slow, a lantern held out on a crook: the voice from the radio. Not a word of it makes sense, but the suit records it all. Then they crouch and draw in the dust: ten lumps of silver, the kind that lies deep down, and beside it something you know at once. A drive core.',
        button: 'Nod',
      };
    case 'want':
      return {
        line: 'talk-want',
        title: 'The Lamplighter waits', portrait, voice: { words: 4, seed: 22 }, pictures: trade(scene),
        text: 'They draw it again, patiently: ten lumps of silver, then the core. Bring the silver in your bag.',
        button: 'Nod',
      };
    case 'paid':
      return {
        line: 'talk-paid',
        title: 'The silver', portrait, voice: { words: 6, seed: 23 }, pictures: notYet(scene),
        text: "They take the silver piece by piece, weigh each one in a gloved hand, and nod. Then they draw your lander: the torn hull, the crumpled engine bell. They tap the drawing and shake their lantern. Not yet: mend the hull and the thrusters first.",
        button: 'Nod',
      };
    case 'waitShip':
      return {
        line: 'talk-wait-ship',
        title: 'Not yet', portrait, voice: { words: 3, seed: 24 }, pictures: notYet(scene),
        text: 'They draw your lander again, torn hull and crumpled bell, and shake their lantern. Mend the hull and the thrusters, then come back.',
        button: 'Nod',
      };
    case 'core':
      return {
        line: 'talk-core',
        title: 'The drive core', portrait, voice: { words: 8, seed: 25 }, pictures: [{ key: techTexture(scene, { kind: 'repair', id: 'core' }, 'mended'), h: 110 }],
        text: 'They go into the big dome and come back with something wrapped in cloth, warm through the glove: a drive core, whole. They press it into your hands and raise their lantern. Take it back to the lander and fit it.',
        button: 'Take it',
      };
  }
}
