import { bakeSystem } from '../../art/textures';
import { getSound, setProfile } from '../../host';
import { hasFlown, liftOff } from '../../logic/fuel';
import { mapOpen } from '../../logic/starship';
import { callDue, distressDue, hasBeat, withBeat } from '../../logic/story';
import { storyCard } from '../kit/storyCard';
import { brineOrbitCard, callCard, distressCard, dockedCard, firstLightCard, liftOffSpec, mycelOrbitCard, talusOrbitCard } from './shipCards';
import type { ShipPage } from './panel';

/**
 * The story's moments aboard: the call that comes in the moment the radio
 * works (spec, "Story: chapter 1"), docking with the starship for the
 * first time, the Aster's distress call once its power is back (what
 * sends you to Mycel), and its telescope's first light, which opens the
 * star map.
 * Each shows once; closing it saves that it was seen. Returns whether one
 * is up. Lift-off has its own card, from the Fuel panel (liftOffCard).
 */
export function shipStoryCard(page: ShipPage): boolean {
  const { scene, profile: p } = page;
  if (callDue(p)) {
    storyCard(scene, callCard(scene, p), () => page.commit(withBeat(page.profile, 'called'), { news: 'Call recorded' }));
    return true;
  }
  if (p.docked && p.at === 'mycel' && !hasBeat(p, 'mycelOrbit')) {
    storyCard(scene, mycelOrbitCard(scene, p), () => page.commit(withBeat(page.profile, 'mycelOrbit'), { tab: 'starship' }));
    return true;
  }
  if (p.docked && p.at === 'brine' && !hasBeat(p, 'brineOrbit')) {
    storyCard(scene, brineOrbitCard(scene, p), () => page.commit(withBeat(page.profile, 'brineOrbit'), { tab: 'starship' }));
    return true;
  }
  if (p.docked && p.at === 'talus' && !hasBeat(p, 'talusOrbit')) {
    storyCard(scene, talusOrbitCard(scene, p), () => page.commit(withBeat(page.profile, 'talusOrbit'), { tab: 'starship' }));
    return true;
  }
  if (p.docked && p.at === 'graphite' && !hasBeat(p, 'aboard')) {
    storyCard(scene, dockedCard(scene, p), () => page.commit(withBeat(page.profile, 'aboard'), { tab: 'starship' }));
    return true;
  }
  if (distressDue(p)) {
    bakeSystem(scene);
    storyCard(scene, distressCard(scene, p), () => page.commit(withBeat(page.profile, 'distress'), { tab: 'starship', news: 'Distress call recorded' }));
    return true;
  }
  if (p.docked && mapOpen(p) && !hasBeat(p, 'firstLight')) {
    storyCard(scene, firstLightCard(scene, p), () => {
      setProfile(scene, withBeat(page.profile, 'firstLight'));
      scene.scene.start('System', { arrived: true });
    });
    return true;
  }
  return false;
}

/**
 * Lift-off, from the Fuel panel's button: the climb burns the fuel and is
 * saved, and the lander flies on up to the ship in orbit. The first time,
 * off the grey moon, it's the end of chapter 1 and has its card (closing
 * it flies on up); after that, from any world, it just goes.
 */
export function liftOffCard(page: ShipPage): void {
  const { scene, profile: p } = page;
  const r = liftOff(p);
  if (!r.ok) return;
  getSound(scene)?.play('liftOff');
  const fly = (): void => {
    setProfile(scene, r.profile);
    scene.scene.start('Ship', { remote: false, tab: 'starship' });
  };
  if (hasFlown(p)) fly();
  else storyCard(scene, liftOffSpec(scene, p), fly);
}
