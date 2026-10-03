import Phaser from 'phaser';
import { CRITTER_BODY, isCritter } from '../../art/critterArt';
import { FISH_RADIUS } from '../../art/fishArt';
import { SPECIES_INFO, type SpeciesInfo } from '../../levels/species';
import type { LevelDef, SpeciesId } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { pickSpawn, relationTo } from '../../logic/sizing';
import { makeFish, type Fish, type PlayerView } from './fish';

/**
 * Seabed crawlers: crabs, shrimp, snails and the deep-sea walkers. They are
 * Fish like any other (eaten by size, bite back when bigger, hunted by
 * hunters) but they walk the sand in stops and starts instead of swimming,
 * hold on against the current, and scuttle off when something big comes.
 */
export const isCrawler = (species: SpeciesId): boolean => (SPECIES_INFO[species] as SpeciesInfo).bottom === true;

/** How close a hungry fish gets before a crawler bolts. */
const SCARE_DISTANCE = 150;
/** Shrimp flick away in a burst; crabs just hurry. */
const BOLT = { shrimp: 4, other: 2.2 } as const;

/** Where a crawler's centre sits so its feet touch the sand at x. */
function standingY(f: Fish, floorAt: (x: number) => number): number {
  const foot = isCritter(f.species) ? CRITTER_BODY[f.species].foot : 40;
  return floorAt(f.sprite.x) - foot * (f.size / FISH_RADIUS);
}

/** A new crawler on the sand somewhere off screen, ambling across. */
export function spawnCrawler(
  scene: Phaser.Scene, level: LevelDef, playerSize: number, view: Phaser.Geom.Rectangle, floorAt: (x: number) => number, rng: Rng,
): Fish {
  const { entry, size } = pickSpawn(level.bottom, playerSize, rng);
  let x = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    x = rangeOf(rng, 40, level.world.width - 40);
    if (x < view.left - size * 2 || x > view.right + size * 2) break;
  }
  const speed = rangeOf(rng, ...SPECIES_INFO[entry.species].cruise);
  const f = makeFish(scene, entry.species, size, 'normal', x, 0, rng() < 0.5 ? speed : -speed, rng);
  f.sprite.setY(standingY(f, floorAt));
  return f;
}

/** Walks, pauses, bolts from danger and keeps its feet on the (sloping) seabed. */
export function updateCrawler(f: Fish, p: PlayerView, floorAt: (x: number) => number, now: number, dt: number): void {
  f.phase += dt;
  if (f.state === 'hooked') return;
  if (f.state !== 'cruise' && f.state !== 'dead' && now >= f.stateUntil) f.state = 'cruise';
  const [slow, fast] = SPECIES_INFO[f.species].cruise;
  const heading = f.turn < 0 ? -1 : 1;
  const dist = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.x, p.y);
  let target = 0;
  if (f.state === 'cruise') {
    if (!p.hidden && relationTo(p.size, f.size) === 'prey' && dist < SCARE_DISTANCE + p.size) {
      const away = Math.sign(f.sprite.x - p.x) || heading;
      target = away * fast * (f.species === 'shrimp' ? BOLT.shrimp : BOLT.other);
    } else {
      // Stop and go: pick at the sand a while, then wander on.
      const walking = Math.sin(f.phase * 0.9 + f.baseSize) > -0.35;
      target = walking ? heading * slow : 0;
    }
  }
  f.vx += (target - f.vx) * Math.min(1, dt * 6);
  f.vy = 0;
  f.sprite.x += f.vx * dt;
  f.sprite.y = standingY(f, floorAt);
  // Lean with the slope of the sand underfoot.
  f.tilt = Math.atan2(floorAt(f.sprite.x + 12) - floorAt(f.sprite.x - 12), 24);
}
