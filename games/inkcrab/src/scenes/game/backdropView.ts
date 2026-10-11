import Phaser from 'phaser';
import { BACKDROP_SCALE, BACKDROP_W, BOAT_BOX, type BoatSpec, type LayerId, type MoverSpec, THEME_BOATS, THEME_MOVERS, THEMES, type ThemeId } from '../../art/backdrop';
import { ART_RES } from '../../art/palette';
import { TEX } from '../../art/textures';
import { sailAt } from '../../logic/sailing';

/** World px left of the level where the backdrop starts, so it covers the view at any scroll. */
const LEFT = -1200;
const DEPTH = 0.1;
const DEPTH_STEP = 0.1;

interface Boat {
  readonly spec: BoatSpec;
  readonly sprites: readonly Phaser.GameObjects.Image[];
  readonly y: number;
  readonly phase: number;
}

interface Mover {
  readonly spec: MoverSpec;
  readonly theme: ThemeId;
  readonly index: number;
  readonly sprites: readonly Phaser.GameObjects.Image[];
  readonly y: number;
  readonly phase: number;
}

/**
 * The faraway beach: parallax layers anchored above the beach's typical
 * surface height, each sliding slower than the world the further off it
 * is; clouds drifting on the wind; and the boats, birds and the like
 * moving on them. Those repeat every backdrop tile, as the layers do, so
 * they line up with the scenery wherever the camera is.
 */
export class BackdropView {
  private readonly boats: Boat[] = [];
  private readonly movers: Mover[] = [];
  private readonly drifting: { readonly sprite: Phaser.GameObjects.TileSprite; readonly drift: number }[] = [];

  /** `skip`: layers to leave out (a still scene shows the sky's repeating sun too plainly). */
  constructor(scene: Phaser.Scene, theme: ThemeId, ground: number, span: number, skip: readonly LayerId[] = []) {
    const layers = THEMES[theme];
    const tops = new Map<string, number>();
    layers.forEach((layer, i) => {
      const h = layer.height * BACKDROP_SCALE;
      tops.set(layer.id, ground - layer.lift - h);
      if (skip.includes(layer.id)) return;
      const sprite = scene.add.tileSprite(LEFT, ground - layer.lift - h, span, h, TEX.backdrop(theme, layer.id))
        .setOrigin(0)
        .setTileScale(BACKDROP_SCALE / ART_RES)
        .setScrollFactor(layer.scroll, 1)
        .setDepth(DEPTH + i * DEPTH_STEP);
      if (layer.drift) this.drifting.push({ sprite, drift: layer.drift });
    });
    const tile = BACKDROP_W * BACKDROP_SCALE;
    THEME_BOATS[theme].forEach((spec, i) => {
      if (skip.includes(spec.layer)) return;
      const at = layers.findIndex((l) => l.id === spec.layer);
      const layer = layers[at]!;
      const box = BOAT_BOX[spec.kind];
      const depth = DEPTH + (at + (spec.front ? 1 : 0)) * DEPTH_STEP + DEPTH_STEP / 2;
      const sprites = Array.from({ length: Math.ceil(span / tile) + 1 }, () =>
        scene.add.image(0, 0, TEX.boat(theme, i))
          .setOrigin(-box.left / (box.right - box.left), -box.top / (box.bottom - box.top))
          .setScale(BACKDROP_SCALE / ART_RES)
          .setScrollFactor(layer.scroll, 1)
          .setDepth(depth));
      this.boats.push({ spec, sprites, y: tops.get(spec.layer)! + spec.water * BACKDROP_SCALE, phase: i * 1.7 });
    });
    THEME_MOVERS[theme].forEach((spec, i) => {
      if (skip.includes(spec.layer)) return;
      const at = layers.findIndex((l) => l.id === spec.layer);
      const { box } = spec;
      // Just over its own layer, under the next.
      const depth = DEPTH + at * DEPTH_STEP + DEPTH_STEP / 2;
      const sprites = Array.from({ length: Math.ceil(span / tile) + 1 }, () =>
        scene.add.image(0, 0, TEX.mover(theme, i, 0))
          .setOrigin(-box.left / (box.right - box.left), -box.top / (box.bottom - box.top))
          .setScale(BACKDROP_SCALE / ART_RES)
          .setScrollFactor(layers[at]!.scroll, 1)
          .setDepth(depth));
      this.movers.push({ spec, theme, index: i, sprites, y: tops.get(spec.layer)! + spec.y * BACKDROP_SCALE, phase: i * 2.3 });
    });
  }

  /** Drifts the clouds, sails the boats on with a gentle bob and roll on the swell, and flies the birds. */
  update(time: number): void {
    const t = time / 1000;
    // Texture px: the layer's drawing is baked at ART_RES.
    for (const d of this.drifting) d.sprite.tilePositionX = -d.drift * t * ART_RES;
    for (const m of this.movers) this.move(m, t);
    for (const b of this.boats) {
      const { x, heading } = sailAt(b.spec, t, BACKDROP_W);
      const bob = Math.sin(t * 1.6 + b.phase) * 0.35;
      const roll = Math.sin(t * 1.1 + b.phase) * 0.012;
      b.sprites.forEach((s, k) => {
        s.setPosition(LEFT + (x + k * BACKDROP_W) * BACKDROP_SCALE, b.y + bob).setFlipX(heading < 0).setRotation(roll);
      });
    }
  }

  /** One mover: along its lane, round its circle if it soars, bobbing, beating its wings (or dipping its rod). */
  private move(m: Mover, t: number): void {
    const { spec } = m;
    const at = this.place(m, t);
    const f = Math.floor(t * spec.fps + m.phase) % spec.frames;
    const key = TEX.mover(m.theme, m.index, f);
    // Facing the way it's actually going: round a circle that changes, so look a moment ahead.
    // (Its lane wraps round the tile: take the short way between the two places.)
    const ahead = this.place(m, t + 0.1);
    const dx = ((ahead.x - at.x + BACKDROP_W * 1.5) % BACKDROP_W) - BACKDROP_W / 2;
    const heading = Math.abs(dx) > 1e-3 ? Math.sign(dx) : at.heading;
    m.sprites.forEach((s, k) => {
      s.setTexture(key)
        .setPosition(LEFT + (at.x + k * BACKDROP_W) * BACKDROP_SCALE, m.y + at.y * BACKDROP_SCALE)
        .setFlipX(spec.turns === true && heading < 0);
    });
  }

  /** Where a mover is at `t`, in design px: x along the tile, y from its anchor height. */
  private place(m: Mover, t: number): { x: number; y: number; heading: 1 | -1 } {
    const { spec } = m;
    const { x, heading } = sailAt(spec, t, BACKDROP_W);
    const turn = spec.circle ? ((t + m.phase) / spec.circle.period) * Math.PI * 2 : 0;
    const cx = spec.circle ? Math.cos(turn) * spec.circle.r : 0;
    // A circle seen from the side: flattened.
    const cy = spec.circle ? Math.sin(turn) * spec.circle.r * 0.3 : 0;
    const bob = Math.sin(t * 1.3 + m.phase) * (spec.bob ?? 0);
    return { x: x + cx, y: cy + bob, heading };
  }
}
