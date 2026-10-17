import type Phaser from 'phaser';
import { techTexture, TEX } from '../../art/textures';
import { isRepaired, wreckOf } from '../../logic/repairs';
import { landerLookOf } from '../../logic/ship';
import { callDue, hasBeat, withBeat } from '../../logic/story';
import { storyCard } from '../kit/storyCard';
import type { ShipPage } from './panel';

/**
 * The story's moments aboard: the call that comes in the moment the radio
 * works (spec, "Story: chapter 1"), and lift-off once the drive core is in.
 * Each shows once; closing it saves that it was seen. Returns whether one
 * is up.
 */
export function shipStoryCard(page: ShipPage): boolean {
  const { scene, profile: p } = page;
  if (callDue(p)) {
    storyCard(scene, {
      title: 'Incoming call',
      subtitle: 'on the radio, the moment it warmed up',
      portrait: { key: techTexture(scene, { kind: 'repair', id: 'comms' }, 'mended'), h: 90 },
      knots: { words: 9, seed: 11 },
      text: "Not the guild. A voice, slow and low, in no language the suit knows: the same knotted sounds over and over, then quiet, then again. The radio records it. The dish can't say where it's coming from, only that it's somewhere over the horizon. A handheld receiver could follow it: the stronger it gets, the closer you are.",
      button: 'Keep the recording',
    }, () => page.commit(withBeat(page.profile, 'called'), { news: 'Call recorded' }));
    return true;
  }
  if (isRepaired(p, 'core') && !hasBeat(p, 'flown')) {
    liftOff(scene, page);
    return true;
  }
  return false;
}

function liftOff(scene: Phaser.Scene, page: ShipPage): void {
  const p = page.profile;
  storyCard(scene, {
    title: 'Lift-off',
    subtitle: 'the end of chapter 1, on Graphite',
    pictures: [{ key: TEX.lander(landerLookOf(p.ship), 0, wreckOf(p)), h: 150 }],
    text: "The core hums, the thrusters catch, and the lander lifts off the grey moon. Down on the far rim, the Lamplighters' lanterns get small. The drive works. Where to? The star chart, and the planets past Graphite, come in the next chapter.",
    button: 'Where to?',
  }, () => page.commit(withBeat(page.profile, 'flown')));
}
