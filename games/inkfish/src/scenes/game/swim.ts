import Phaser from 'phaser';
import { C } from '../../art/fish/kit';
import type { FishShape } from '../../art/fishArt';
import { tailCut } from '../../art/textures';

/**
 * Swimming animation for any fish sprite: the tail is a second image hinged
 * on the tail stalk that beats side to side, and turning round squashes the
 * fish through edge-on instead of flipping in one frame.
 *
 * The tail follows its body every frame (after tweens and death animations
 * have moved it), so callers only set the texture and the beat angle.
 */
interface Rig {
  readonly tail: Phaser.GameObjects.Image;
  /** Hinge offset from the body's origin in texture px (negative: behind the centre). */
  readonly hinge: number;
  beat: number;
}

type Image = Phaser.GameObjects.Image;

const rigsByScene = new WeakMap<Phaser.Scene, Map<Image, Rig>>();

function rigsOf(scene: Phaser.Scene): Map<Image, Rig> {
  const existing = rigsByScene.get(scene);
  if (existing) return existing;
  const rigs = new Map<Image, Rig>();
  const sync = (): void => rigs.forEach(follow);
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    rigs.clear();
    rigsByScene.delete(scene);
  });
  rigsByScene.set(scene, rigs);
  return rigs;
}

/** Gives a fish sprite a swinging tail. Fish that bend their whole body (eels) are left as one image. */
export function attachTail(sprite: Image, shape: FishShape): void {
  const cut = tailCut(shape);
  if (cut === null) return;
  const rigs = rigsOf(sprite.scene);
  sprite.setFrame('body');
  const tail = sprite.scene.add.image(sprite.x, sprite.y, sprite.texture.key, 'tail');
  const rig: Rig = { tail, hinge: cut - C, beat: 0 };
  rigs.set(sprite, rig);
  follow(rig, sprite);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    rigs.delete(sprite);
    tail.destroy();
  });
}

/** Swaps the texture (boil frame, ink weight) on body and tail alike. */
export function setSwimTexture(sprite: Image, key: string): void {
  const rig = rigsByScene.get(sprite.scene)?.get(sprite);
  if (!rig) {
    sprite.setTexture(key);
    return;
  }
  sprite.setTexture(key, 'body');
  rig.tail.setTexture(key, 'tail');
}

/** Sets how far the tail is swung, in radians. */
export function setTailBeat(sprite: Image, angle: number): void {
  const rig = rigsByScene.get(sprite.scene)?.get(sprite);
  if (rig) rig.beat = angle;
}

function follow(rig: Rig, s: Image): void {
  const fx = s.flipX ? -1 : 1;
  const along = rig.hinge * s.scaleX * fx;
  rig.tail
    .setPosition(s.x + Math.cos(s.rotation) * along, s.y + Math.sin(s.rotation) * along)
    .setRotation(s.rotation + rig.beat)
    .setScale(s.scaleX, s.scaleY)
    .setFlip(s.flipX, s.flipY)
    .setAlpha(s.alpha)
    .setVisible(s.visible)
    .setDepth(s.depth - 0.01)
    .setTint(s.tintTopLeft)
    .setTintMode(s.tintMode);
}

/** A swimmer's tail clock and facing, advanced by `stroke`. */
export interface SwimState {
  /** Tail-beat phase, radians. */
  swim: number;
  /** Facing, eased between -1 (left) and 1 (right); near 0 the fish is edge-on mid-turn. */
  turn: number;
}

/** How fast and wide the tail beats for a speed (world units/s); `effort` > 1 for dashes and struggles. */
export function stroke(state: SwimState, speed: number, dt: number, effort = 1): number {
  state.swim += dt * (5 + Math.min(speed, 400) / 22) * effort;
  const amp = (0.16 + Math.min(0.22, speed / 700)) * Math.min(effort, 1.8);
  return Math.sin(state.swim) * amp;
}

/** Eases the facing towards `dir` and returns the x-scale factor: 1 facing, ~0.2 edge-on. */
export function turnToward(state: SwimState, dir: -1 | 1 | 0, dt: number): number {
  if (dir) state.turn += (dir - state.turn) * Math.min(1, dt * 9);
  return Math.max(0.2, Math.abs(state.turn));
}

/** Where a swimmer's mouth is: at the nose, on whichever side it faces. */
export function mouthOf(sprite: Image, radius: number, turn: number): { x: number; y: number } {
  return { x: sprite.x + Math.sign(turn || 1) * radius * 0.85, y: sprite.y };
}

/** Swallowed: the fish is sucked into the eater's mouth, shrinking, then gone. */
export function gulp(sprite: Image, into: { x: number; y: number }): void {
  sprite.scene.tweens.add({
    targets: sprite, x: into.x, y: into.y, scaleX: 0, scaleY: 0, alpha: 0.4,
    duration: 130, ease: 'Quad.In', onComplete: () => sprite.destroy(),
  });
}
