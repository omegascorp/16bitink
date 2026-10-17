import { shipTexture, techTexture, TEX } from '../../art/textures';
import { BROKEN_SHIP, shipLookOf } from '../../art/starship';
import { getSound, setProfile } from '../../host';
import { liftOff } from '../../logic/fuel';
import { wreckOf } from '../../logic/repairs';
import { landerLookOf } from '../../logic/ship';
import { mapOpen } from '../../logic/starship';
import { callDue, hasBeat, withBeat } from '../../logic/story';
import { storyCard } from '../kit/storyCard';
import type { ShipPage } from './panel';

/**
 * The story's moments aboard: the call that comes in the moment the radio
 * works (spec, "Story: chapter 1"), docking with the starship for the
 * first time, and its telescope's first light, which opens the star map.
 * Each shows once; closing it saves that it was seen. Returns whether one
 * is up. Lift-off has its own card, from the Fuel panel (liftOffCard).
 */
export function shipStoryCard(page: ShipPage): boolean {
  const { scene, profile: p } = page;
  if (callDue(p)) {
    storyCard(scene, {
      title: 'Incoming call',
      subtitle: 'on the radio, the moment it warmed up',
      portrait: { key: techTexture(scene, { kind: 'repair', id: 'comms' }, 'mended'), h: 90 },
      voice: { words: 9, seed: 11 },
      text: "Not the guild. A voice, slow and low, in no language the suit knows: the same slow sounds over and over, then quiet, then again. The radio records it. The dish can't say where it's coming from, only that it's somewhere over the horizon. A handheld receiver could follow it: the stronger it gets, the closer you are.",
      button: 'Keep the recording',
    }, () => page.commit(withBeat(page.profile, 'called'), { news: 'Call recorded' }));
    return true;
  }
  if (p.docked && p.at === 'mycel' && !hasBeat(p, 'mycelOrbit')) {
    storyCard(scene, {
      title: 'In orbit over Mycel',
      subtitle: 'the green moon',
      pictures: [{ key: shipTexture(scene, shipLookOf(p), 'small'), h: 70 }, { key: TEX.world('mycel'), h: 70 }],
      text: "Below, a haze the colour of moss hides the ground. Through gaps in it: white threads mapping the hills, caps the size of hills, and something metal glinting in a swamp. The suit's sensors light up at once: life, everywhere. Ice and graphite won't be found down there: you'll have to work with what Mycel has.",
      button: 'Take it in',
    }, () => page.commit(withBeat(page.profile, 'mycelOrbit'), { tab: 'starship' }));
    return true;
  }
  if (p.docked && p.at === 'graphite' && !hasBeat(p, 'aboard')) {
    storyCard(scene, {
      title: 'Docked',
      subtitle: 'your ship, at last',
      pictures: [{ key: shipTexture(scene, BROKEN_SHIP, 'small'), h: 80 }],
      text: "It's cold and dark. The wormhole burnt out its power lines, cracked its telescope's mirror, split its fuel tank and killed its engine, and its jump drive is burnt black. Without the telescope you can't even see which star this is. Everything it needs to mend is down on the grey moon: copper, silver, quartz, graphite and ice, carried up in the lander a load at a time.",
      button: 'Get to work',
    }, () => page.commit(withBeat(page.profile, 'aboard'), { tab: 'starship' }));
    return true;
  }
  if (p.docked && mapOpen(p) && !hasBeat(p, 'firstLight')) {
    storyCard(scene, {
      title: 'First light',
      subtitle: 'the telescope sees again',
      portrait: { key: techTexture(scene, { kind: 'starship', id: 'telescope' }, 'mended'), h: 90 },
      text: 'The new mirror settles, the eyepiece clears, and for the first time since the wormhole you can see where you are.',
      button: 'Open the star map',
    }, () => {
      setProfile(scene, withBeat(page.profile, 'firstLight'));
      scene.scene.start('System', { arrived: true });
    });
    return true;
  }
  return false;
}

/**
 * Lift-off, from the Fuel panel's button: the climb burns the fuel and is
 * saved, and closing the card flies on up to the ship in orbit (the star
 * map). The end of chapter 1.
 */
export function liftOffCard(page: ShipPage): void {
  const { scene, profile: p } = page;
  const r = liftOff(p);
  if (!r.ok) return;
  getSound(scene)?.play('liftOff');
  storyCard(scene, {
    title: 'Lift-off',
    subtitle: 'up to your ship',
    pictures: [{ key: TEX.lander(landerLookOf(p.ship), 0, wreckOf(p)), h: 150 }],
    text: "The core hums, the tanks feed the thrusters, and the lander climbs off the grey moon. Down on the far rim, the Lamplighters' lanterns get small. Then, ahead, a dark shape against the stars, turning slowly: your ship, right where it braked into orbit before its systems died.",
    button: 'Fly up to it',
  }, () => {
    setProfile(scene, r.profile);
    scene.scene.start('Ship', { remote: false, tab: 'starship' });
  });
}
