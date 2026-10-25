import { type Draw, pt } from '../kit';
import type { SpriteArt } from '../types';
import { shadowOf, swish } from '../critters/birdKit';
import { dorsal, jaws, pectorals, pelvics, tail } from './reefBossFins';
import { sharkHead, sharkSkin } from './reefBossPaint';
import { MID, type SharkPose, SHARK_POSES, sharkBody } from './reefBossShape';

/**
 * The Tiger Shark, chapter 6's boss (tiger sharks eat sea snakes), seen
 * from above facing +x: about 150 long, the broad blunt snout MID px ahead
 * of its middle, blue-grey with dark broken bars across the back, broad
 * sickle pectorals and the tall first dorsal over its middle.
 *  - 'swim0', 'swim1': cruising, the tail beating one way and the other;
 *  - 'tell': turning to face the snake, the body bent;
 *  - 'charge': straight, pectorals swept back, the tail driving;
 *  - 'turn': a slow heavy turn, the body curved;
 *  - 'struck': thrashing, the jaws thrust out wide open.
 */
function draw(d: Draw, pose: SharkPose): void {
  const { z, spine } = sharkBody(pose);
  shadowOf(d, [z.shape], 7, 0.14);
  if (pose === 'charge') {
    for (const side of [-1, 1]) swish(d, pt(-20, side * 26), Math.PI, 30, side * 2, 0.5);
    swish(d, pt(-56, 0), Math.PI, 24, 0, 0.4);
  }
  if (pose === 'struck') {
    for (const [x, y, a] of [[30, -34, -2.4], [34, 34, 2.4], [-60, -30, -2], [-62, 32, 2]] as const) swish(d, pt(x, y), a, 14, 3, 0.55);
  }
  tail(d, spine, pose);
  pelvics(d, z);
  pectorals(d, z, pose);
  if (pose === 'struck') jaws(d, z);
  sharkSkin(d, z);
  sharkHead(d, z, pose === 'struck');
  dorsal(d, z, MID - 9, MID + 13, 7);
  dorsal(d, z, 88, 96, 3.2);
}

export const SHARK_ART: SpriteArt<SharkPose> = { frame: 220, res: 2, poses: SHARK_POSES, draw };
