import Phaser from 'phaser';
import { BOIL } from '../../art/palette';
import { PROSPECTOR_GROUND, type Pose } from '../../art/prospector';
import { PROSPECTOR_RES, TEX } from '../../art/textures';
import type { ProspectorLook } from '../../logic/gear';
import type { Mine } from '../../logic/mine';
import type { Ring } from './ring';

/** World px per drawing unit: the drawing stands a little over a tile tall. */
export const SCALE = 0.82;
/** Line-boil frames a second (as InkFish), faster for the walk and the spinning bit. */
const BOIL_FPS = 8;
const WALK_FPS = 10;
const DRILL_FPS = 20;

/** The prospector's sprite: pose from what the sim is doing, frame from the clock. */
export class ProspectorView {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, private readonly look: ProspectorLook) {
    this.sprite = scene.add.image(0, 0, TEX.prospector('idle', look, 0)).setScale(SCALE / PROSPECTOR_RES).setDepth(5);
  }

  get object(): Phaser.GameObjects.Image {
    return this.sprite;
  }

  update(mine: Mine, iy: number, now: number, ring: Ring): void {
    const p = mine.player;
    const pose = this.pose(mine, iy);
    const fps = pose.startsWith('drill') ? DRILL_FPS : pose === 'walk' || (pose === 'climb' && (p.vx !== 0 || iy !== 0)) ? WALK_FPS : BOIL_FPS;
    const f = Math.floor((now / 1000) * fps) % BOIL;
    this.sprite.setTexture(TEX.prospector(pose, this.look, f));
    this.sprite.setFlipX(mine.facing < 0);
    this.sprite.setPosition(ring.near(p.x + p.w / 2), p.y + p.h - PROSPECTOR_GROUND * SCALE);
    // Blink through the grace after a hit.
    const grace = mine.time < mine.suit.graceUntil;
    this.sprite.setAlpha(grace && Math.floor(now / 90) % 2 === 0 ? 0.35 : 1);
  }

  private pose(mine: Mine, iy: number): Pose {
    if (mine.drilling) {
      const [, ty] = mine.drilling.tile;
      const row = Math.floor((mine.player.y + mine.player.h / 2) / mine.tile);
      return ty > row ? 'drillDown' : ty < row ? 'drillUp' : 'drillSide';
    }
    if (mine.climbing) return 'climb';
    if (mine.jetting) return 'fly';
    if (iy > 0 && mine.player.onGround) return 'drillDown';
    return mine.player.onGround && Math.abs(mine.player.vx) > 1 ? 'walk' : 'idle';
  }
}
