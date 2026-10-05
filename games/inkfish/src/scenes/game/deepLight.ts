import Phaser from 'phaser';
import { GLOW_TEX } from '../../art/glowArt';
import { decorGlowKey, GLOW_KEY } from '../../art/textures';
import { GlowTwins, type GlowOpts } from './glowTwins';
import { isGlowDecor } from '../../art/decorGlow';
import type { PlacedDecor } from './seabedDecor';
import { fishLights, type FishShape } from '../../art/fishArt';
import type { ZoneId } from '../../levels/types';
import { ZONE_NIGHT } from '../../levels/zones';
import { createRng, rangeOf } from '../../logic/rng';
import { CULL_MARGIN, inView } from './culler';

/**
 * Below the reach of sunlight the only light is living light. In the deep
 * zones the whole scene sits under a layer of night, and anything that glows
 * (fish lights, jellyfish, glowing plants, vents) gets a glow twin drawn on
 * top of the night with additive blending. Marine snow drifts down through
 * it, and a soft light travels with the player.
 */

const PALE_LIGHT = 0xc8d8ff;
/** Above the seabed and its scenery, below every creature. */
export const NIGHT_DEPTH = 5;
const SNOW_DEPTH = 5.2;
const PLAYER_LIGHT_DEPTH = 5.4;
/** One flake of marine snow per this much water, px². */
const SNOW_AREA = 9000;

interface Flake {
  readonly sprite: Phaser.GameObjects.Image;
  readonly fall: number;
  readonly sway: number;
  readonly phase: number;
}

export class DeepLight {
  readonly active: boolean;
  private readonly glows: GlowTwins | null = null;
  private readonly snow: Flake[] = [];
  private playerLight: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene, zone: ZoneId, private readonly world: { width: number; height: number }, seed: number) {
    const night = ZONE_NIGHT[zone];
    this.active = night.alpha > 0;
    if (!this.active) return;
    scene.add.rectangle(-200, -200, world.width + 400, world.height + 400, night.color, night.alpha).setOrigin(0).setDepth(NIGHT_DEPTH);
    const rng = createRng(seed);
    const count = Math.min(1100, Math.round((world.width * world.height) / SNOW_AREA));
    for (let i = 0; i < count; i++) {
      const size = rangeOf(rng, 0.8, 2.2);
      const sprite = scene.add.image(rng() * world.width, rng() * world.height, GLOW_KEY)
        .setScale((size * 2.4) / GLOW_TEX).setAlpha(rangeOf(rng, 0.12, 0.38)).setTint(0xdfe8ff)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(SNOW_DEPTH);
      this.snow.push({ sprite, fall: rangeOf(rng, 6, 18), sway: rangeOf(rng, 4, 12), phase: rng() * Math.PI * 2 });
    }
    this.glows = new GlowTwins(scene);
  }

  /** A soft pool of light around the player, coloured like its own lights. */
  lightPlayer(sprite: Phaser.GameObjects.Image, shape: FishShape, tint: number): void {
    if (!this.active) return;
    this.playerLight = this.scene.add.image(sprite.x, sprite.y, GLOW_KEY).setTint(tint).setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(PLAYER_LIGHT_DEPTH);
    this.trackFish(sprite, shape);
  }

  /** Gives a fish its glow layer, once; fish without lights are skipped. */
  trackFish(sprite: Phaser.GameObjects.Image, shape: FishShape): void {
    this.glows?.trackFish(sprite, shape);
  }

  /** Lays a glow twin over `sprite`, following it until it's destroyed (deep zones only). */
  attach(sprite: Phaser.GameObjects.Image, key: string, opts: GlowOpts = {}): void {
    this.glows?.attach(sprite, key, opts);
  }

  /** Lights the seabed scenery that glows (above the night, which darkens the rest of the seabed). */
  lightDecor(decor: readonly PlacedDecor[]): void {
    for (const d of decor) {
      if (isGlowDecor(d.kind)) this.attach(d.sprite, decorGlowKey(d.kind), { alpha: 0.9, pulse: 0.12, depth: NIGHT_DEPTH + 0.1 });
    }
  }

  /** Drifts the marine snow (drawing only the flakes in `view`) and moves the player's light. */
  update(dt: number, now: number, player: { x: number; y: number }, radius: number, view: Phaser.Geom.Rectangle | null): void {
    if (!this.active) return;
    const t = now / 1000;
    for (const f of this.snow) {
      const s = f.sprite;
      s.y += f.fall * dt;
      s.x += Math.sin(t * 0.6 + f.phase) * f.sway * dt;
      if (s.y > this.world.height) s.setPosition(Math.random() * this.world.width, -10);
      const seen = !view || inView(view, s.x, s.y, CULL_MARGIN);
      if (s.visible !== seen) s.setVisible(seen);
    }
    this.playerLight?.setPosition(player.x, player.y).setScale((radius * 2) / GLOW_TEX);
  }
}

/** The player's light takes the colour of its own lights (pale blue for fish without any). */
export function playerGlowTint(shape: FishShape): number {
  const first = fishLights(shape)[0];
  const own = first ? parseInt(first.color.slice(1), 16) : PALE_LIGHT;
  // Half its own colour, half pale: a hint of colour without flooding the screen.
  return Phaser.Display.Color.ObjectToColor(
    Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(own), Phaser.Display.Color.ValueToColor(PALE_LIGHT), 100, 50),
  ).color;
}
