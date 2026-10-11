import Phaser from 'phaser';
import { BIRD_SPAN } from '../../art/birds/spans';
import { CRITTER_RES } from '../../art/critterArt';
import { BOIL, RED_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { shadowY, type Bird } from '../../logic/birds';
import type { Terrain } from '../../logic/terrain';

/** Where the drawing's middle (wings included) sits in its frame: left of the body, which is at the frame centre. */
const ART_MIDDLE = 0.5 - 16.5 / 128;
/** Wingbeats per second while hovering. */
const FLAP_FPS = 10;
/** Line boil while gliding on patrol. */
const GLIDE_MS = 260;

/**
 * Birds in the sky, red while they can catch the player. Over a crab it
 * means to stoop on, a kestrel casts a red shadow on the sand that
 * tightens as its aim settles: the warning to get under cover.
 */
export class BirdsView {
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly shadows: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.shadows = scene.add.graphics().setDepth(3.5);
  }

  sync(birds: ReadonlyMap<number, Bird>, playerSize: number, time: number): void {
    for (const [id, s] of this.sprites) {
      if (birds.has(id)) continue;
      s.destroy();
      this.sprites.delete(id);
    }
    const g = this.shadows.clear();
    for (const b of birds.values()) {
      const danger = b.size > playerSize;
      const dive = b.phase === 'dive';
      const hovering = b.phase === 'hover';
      const f = Math.floor(time / (hovering ? 1000 / FLAP_FPS : GLIDE_MS) + b.id) % BOIL;
      const s = this.sprites.get(b.id) ?? this.create(b);
      const k = b.w / BIRD_SPAN[b.species] / CRITTER_RES;
      s.setTexture(TEX.bird(b.species, dive, danger, f)).setScale(k * b.dir, k).setPosition(b.x + b.w / 2, b.y + b.h / 2);
      if (danger && (hovering || dive)) this.shadow(g, b, time);
    }
  }

  /** A dashed red ellipse on the ground under the bird, tighter the closer it is to stooping. */
  private shadow(g: Phaser.GameObjects.Graphics, b: Bird, time: number): void {
    const y = shadowY(this.terrain, b, this.tile);
    const cx = b.x + b.w / 2;
    const settle = b.phase === 'dive' ? 1 : Math.min(1, b.lock / 1.3);
    const rx = b.w * (0.75 - 0.35 * settle);
    const ry = Math.max(2, rx * 0.22);
    const pulse = 0.55 + 0.3 * Math.sin(time / 90);
    g.fillStyle(RED_HEX, 0.12 + 0.18 * settle).fillEllipse(cx, y - 1, rx * 2, ry * 2);
    g.lineStyle(1.4, RED_HEX, pulse);
    const dashes = 14;
    for (let i = 0; i < dashes; i++) {
      const a0 = (i / dashes) * Math.PI * 2 + time / 900;
      const a1 = a0 + (Math.PI * 2) / dashes / 2;
      g.lineBetween(cx + Math.cos(a0) * rx, y - 1 + Math.sin(a0) * ry, cx + Math.cos(a1) * rx, y - 1 + Math.sin(a1) * ry);
    }
  }

  private create(b: Bird): Phaser.GameObjects.Image {
    const s = this.scene.add.image(0, 0, TEX.bird(b.species, false, false, 0)).setOrigin(ART_MIDDLE, 0.5).setDepth(6);
    this.sprites.set(b.id, s);
    return s;
  }
}
