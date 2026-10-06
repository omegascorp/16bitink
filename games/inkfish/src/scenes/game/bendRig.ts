import Phaser from 'phaser';
import { C } from '../../art/fish/kit';
import { ANATOMY } from '../../art/fish/registry';
import { isCritter } from '../../art/critterArt';
import { fishBand, type FishShape } from '../../art/fishArt';
import { alongBody, bendOffset, bendStyleOf, swayAt, type BendStyle } from '../../logic/bend';
import { keepDepth } from './sync';

type Image = Phaser.GameObjects.Image;

/** Points along the body: enough for a smooth curve, few enough to cost nothing. */
const SEGMENTS = 24;
/** The frame on each fish texture that holds just the inked band (see fishBand). */
const BAND_FRAME = 'bend-band';
/** How quickly the bend's size follows the beat: smooths out jumps when the effort changes. */
const AMP_EASE = 0.35;

/**
 * Fish with no tail fin to swing (see tailCut) swim by bending their whole
 * body. The fish's own image stays in charge of where it is, its size, facing,
 * tint and fade, but is never drawn; a rope (the same drawing stretched along a
 * line of points) follows it every frame and ripples with the swim stroke.
 */
interface BendRig {
  readonly rope: Phaser.GameObjects.Rope;
  /** Each point's place along the body, 0 nose .. 1 tail tip, and how far it sways per radian of beat. */
  readonly along: readonly number[];
  readonly sway: readonly number[];
  readonly style: BendStyle;
  /** The inked rows in fish-texture px, and how far its middle sits below the drawing's centre, texture px. */
  readonly band: { readonly top: number; readonly bottom: number };
  readonly res: number;
  readonly drop: number;
  amp: number;
  phase: number;
  tint: number;
}

/**
 * Cuts `key`'s band of rows into a frame of its own (once per texture). A rope
 * stretches its whole frame across each segment; with the full square, bending
 * shears tall quads whose two triangles map the drawing differently, and the
 * fins show steps at every segment.
 */
function bandFrame(scene: Phaser.Scene, key: string, band: BendRig['band'], res: number): string {
  const texture = scene.textures.get(key);
  if (texture.has(BAND_FRAME)) return BAND_FRAME;
  const base = texture.get();
  texture.add(BAND_FRAME, base.sourceIndex, base.cutX, base.cutY + band.top * res, base.cutWidth, (band.bottom - band.top) * res);
  return BAND_FRAME;
}

const rigsByScene = new WeakMap<Phaser.Scene, Map<Image, BendRig>>();

function rigsOf(scene: Phaser.Scene): Map<Image, BendRig> {
  const existing = rigsByScene.get(scene);
  if (existing) return existing;
  const rigs = new Map<Image, BendRig>();
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

/** `res`: texture px per fish-texture px (see swim.ts setArtRes). */
export function attachBend(sprite: Image, shape: FishShape, res = 1): void {
  if (isCritter(shape)) return;
  const a = ANATOMY[shape];
  const style = bendStyleOf(a.hl, a.hh, Boolean(a.wave));
  // Evenly along the drawing's middle, centred on the fish like the image (origin 0.5).
  const half = sprite.frame.halfWidth;
  const band = fishBand(shape);
  const drop = ((band.top + band.bottom) / 2 - C) * res;
  const line = Array.from({ length: SEGMENTS }, (_, i) => ({ x: -half + (i * 2 * half) / (SEGMENTS - 1), y: drop }));
  const frame = bandFrame(sprite.scene, sprite.texture.key, band, res);
  const rope = sprite.scene.add.rope(sprite.x, sprite.y, sprite.texture.key, frame, line);
  const along = rope.points.map((p) => alongBody(p.x / res + C, C, a.hl));
  const rig: BendRig = {
    rope, along, sway: along.map((t) => swayAt(t, a.hl, style) * res), style, band, res, drop, amp: 0, phase: 0, tint: 0xffffff,
  };
  // The image keeps its place in the game (collisions, tweens, tints) but the rope is what's seen.
  sprite.willRender = () => false;
  const rigs = rigsOf(sprite.scene);
  rigs.set(sprite, rig);
  follow(rig, sprite);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    rigs.delete(sprite);
    rope.destroy();
  });
}

/** Swaps the rope's drawing (boil frame, ink weight). Returns false if the sprite doesn't bend. */
export function setBendTexture(sprite: Image, key: string): boolean {
  const rig = rigsByScene.get(sprite.scene)?.get(sprite);
  if (!rig) return false;
  sprite.setTexture(key);
  // A new texture (boil frame, or the same key re-made in another atlas slot) has new UVs.
  if (rig.rope.texture !== sprite.texture) rig.rope.setTexture(key, bandFrame(sprite.scene, key, rig.band, rig.res)).updateUVs();
  return true;
}

/**
 * Sets the bend from the tail beat: `angle` is sin(phase) times the beat's
 * size, so the size is recovered wherever sin(phase) isn't near zero.
 * Returns false if the sprite doesn't bend.
 */
export function setBendBeat(sprite: Image, angle: number, phase: number): boolean {
  const rig = rigsByScene.get(sprite.scene)?.get(sprite);
  if (!rig) return false;
  const s = Math.sin(phase);
  if (Math.abs(s) > 0.25) rig.amp += (angle / s - rig.amp) * AMP_EASE;
  rig.phase = phase;
  return true;
}

function follow(rig: BendRig, s: Image): void {
  // Mirrored by scale, not the rope's flip (which only mirrors the drawing), so the bend turns round with the fish.
  const r = rig.rope
    .setPosition(s.x, s.y)
    .setRotation(s.rotation)
    .setScale(s.scaleX * (s.flipX ? -1 : 1), s.scaleY * (s.flipY ? -1 : 1))
    .setAlpha(s.alpha)
    .setVisible(s.visible);
  keepDepth(r, s.depth);
  const tint = s.isTinted ? s.tintTopLeft : 0xffffff;
  if (tint !== rig.tint) {
    rig.tint = tint;
    r.setColors(tint);
  }
  const points = r.points;
  for (let i = 0; i < points.length; i++) points[i]!.y = rig.drop + bendOffset(rig.along[i]!, rig.sway[i]!, rig.amp, rig.phase, rig.style);
  r.setDirty();
}
