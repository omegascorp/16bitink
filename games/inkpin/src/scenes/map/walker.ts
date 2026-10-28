import Phaser from 'phaser';
import { ART_RES } from '../../art/palette';
import { nibKey } from '../textures';
import { trailPoint, type MapLayout } from './layout';

/** Nib's walking speed along the trail (world px per second). */
const SPEED = 260;
/** Nib stands this far above its stop's centre (world px), on top of the ring rather than over the number. */
const NIB_LIFT = 52;
/** Nib on the map, a little bigger than in the levels. */
const SCALE = 0.62 / ART_RES;

/** Nib on the Atlas: stands at its level, and after a win walks the trail up to the next one. */
export class NibWalker {
  private readonly img: Phaser.GameObjects.Image;
  private s: number;
  private goal: number;
  private done: (() => void) | null = null;
  private clock = 0;

  constructor(scene: Phaser.Scene, private readonly layout: MapLayout, s: number, layer: Phaser.GameObjects.Layer) {
    this.s = s;
    this.goal = s;
    const p = trailPoint(layout, s);
    this.img = scene.add.image(p.x, p.y - NIB_LIFT, nibKey('stand', 0)).setScale(SCALE);
    layer.add(this.img);
  }

  get walking(): boolean {
    return this.s !== this.goal;
  }

  get position(): { x: number; y: number } {
    return { x: this.img.x, y: this.img.y };
  }

  walkTo(s: number, done: () => void): void {
    this.goal = s;
    this.done = done;
  }

  update(dt: number): void {
    this.clock += dt;
    const boil = Math.floor(this.clock * 7) % 3;
    if (!this.walking) {
      this.img.setTexture(nibKey('stand', boil));
      return;
    }
    const step = SPEED * dt;
    const before = trailPoint(this.layout, this.s);
    this.s = this.goal > this.s ? Math.min(this.goal, this.s + step) : Math.max(this.goal, this.s - step);
    const p = trailPoint(this.layout, this.s);
    if (Math.abs(p.x - before.x) > 0.05) this.img.setFlipX(p.x < before.x);
    this.img.setPosition(p.x, p.y - NIB_LIFT).setTexture(nibKey((['walk0', 'walk1', 'walk2', 'walk3'] as const)[Math.floor(this.clock * 9) % 4]!, boil));
    if (!this.walking) {
      this.done?.();
      this.done = null;
    }
  }
}
