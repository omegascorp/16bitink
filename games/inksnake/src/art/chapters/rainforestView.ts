import Phaser from 'phaser';
import type { ZoneDef } from '../../level/types';
import { Glide } from '../../logic/abilities/flying';
import type { Prey } from '../../logic/preyTypes';
import type { World } from '../../logic/world';
import { BOIL, BLUE_HEX, RED_HEX } from '../palette';
import type { SpriteArt } from '../types';
import type { ChapterView, PosePicker } from './types';

/** What the view needs from the chapter's art (passed in, so this file imports nothing that imports it back). */
export interface RainforestViewArt {
  readonly critters: Readonly<Record<string, SpriteArt>>;
  readonly poseOf: Readonly<Record<string, PosePicker>>;
}

/** Depths: dappled light over the painted board (rainforestPlace.ts), prey, fliers, the landing marker over the night. */
const DEPTH = { dapple: 1.7, prey: 2.6, air: 6, marker: 6.9 } as const;
/** A soft round blot, all haze: the sun's patches. */
const HAZE_KEY = 'rainforest-haze';
const SOFT_R = 64;
/** Patches of sun through the leaves: how many per crown, how bright. */
const DAPPLES_PER_CROWN = 2;
const DAPPLE_ALPHA = 0.16;
/** As crittersView draws fliers: lifted this far off their shadows at full height, and a little bigger. */
const LIFT = { x: -26, y: -44 } as const;
const LIFT_SCALE = 0.22;
/** The line boil, frames a second (as the critters view). */
const BOIL_FPS = 7;

interface Round {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * The Rainforest's own layer, over the painted canopy (the crowns and the
 * dim floor far below are the board's): patches of sun drifting over the
 * crowns' leaves.
 * While the snake glides, a dotted line runs ahead to where it will come
 * down (blue in a tree, red on the floor), with a tick where it lands if
 * let go now. It also draws the chapter's prey while it's out of reach
 * (bats up in the air, geckos pressed flat under a glide), which the
 * critters view leaves invisible.
 */
export class RainforestView implements ChapterView {
  private readonly crowns: readonly Round[];
  private readonly dapples: Phaser.GameObjects.Image[] = [];
  private readonly marker: Phaser.GameObjects.Graphics;
  private readonly hidden = new Map<number, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene, world: World, private readonly art: RainforestViewArt) {
    makeBlot(scene, HAZE_KEY, [[0, 1], [0.45, 0.6], [1, 0]]);
    this.crowns = crownsOf(world.level.zones ?? []);
    for (const c of this.crowns) {
      for (let i = 0; i < DAPPLES_PER_CROWN; i++) {
        this.dapples.push(scene.add.image(c.x, c.y, HAZE_KEY).setDepth(DEPTH.dapple).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1c4).setAlpha(DAPPLE_ALPHA));
      }
    }
    this.marker = scene.add.graphics().setDepth(DEPTH.marker);
  }

  update(world: World, time: number): void {
    this.drift(time);
    this.drawMarker(world);
    this.drawHidden(world.prey, time);
  }

  /** Sun through the leaves: each patch wanders slowly round its crown. */
  private drift(time: number): void {
    const t = time / 1000;
    this.dapples.forEach((d, i) => {
      const c = this.crowns[Math.floor(i / DAPPLES_PER_CROWN)]!;
      const k = i * 2.39;
      d.setPosition(c.x + Math.cos(t * 0.13 + k) * c.r * 0.4, c.y + Math.sin(t * 0.17 + k * 1.3) * c.r * 0.34)
        .setScale((c.r * (0.42 + 0.1 * Math.sin(t * 0.3 + k))) / SOFT_R)
        .setAlpha(DAPPLE_ALPHA * (0.75 + 0.25 * Math.sin(t * 0.5 + k)));
    });
  }

  /** While gliding: the line ahead to where it comes down if held, a tick where it comes down if let go. */
  private drawMarker(world: World): void {
    const g = this.marker;
    g.clear();
    const ab = world.ability;
    if (!(ab instanceof Glide) || !ab.active || world.state !== 'play') return;
    const s = world.snake;
    const cos = Math.cos(s.heading);
    const sin = Math.sin(s.heading);
    const at = (d: number): { x: number; y: number } => ({ x: s.head.x + cos * d, y: s.head.y + sin * d });
    const far = ab.leftIfHeld;
    const soon = ab.leftIfReleased;
    const end = at(far);
    const colour = (p: { x: number; y: number }): number => (world.inZone(p, 'tree') ? BLUE_HEX : RED_HEX);
    for (let d = 18; d < far - 8; d += 12) {
      const p = at(d);
      g.fillStyle(colour(p), 0.55);
      g.fillCircle(p.x, p.y, 1.6);
    }
    g.lineStyle(2, colour(end), 0.8);
    g.strokeCircle(end.x, end.y, 11);
    g.lineBetween(end.x - 5, end.y, end.x + 5, end.y);
    g.lineBetween(end.x, end.y - 5, end.x, end.y + 5);
    if (!ab.landing && far - soon > 12) {
      const p = at(soon);
      g.lineStyle(2, colour(p), 0.7);
      g.lineBetween(p.x - sin * 7, p.y + cos * 7, p.x + sin * 7, p.y - cos * 7);
    }
  }

  /** The chapter's prey while out of reach: drawn as the critters view would draw it. */
  private drawHidden(prey: readonly Prey[], time: number): void {
    const f = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    const seen = new Set<number>();
    for (const p of prey) {
      const art = this.art.critters[p.kind];
      if (p.mode !== 'hidden' || !art) continue;
      const want = this.art.poseOf[p.kind]?.({ mode: p.mode, age: p.timer, alt: p.alt, ...(p.data ? { data: p.data } : {}) }, time) ?? art.poses[0]!;
      const pose = art.poses.includes(want) ? want : art.poses[0]!;
      const key = `critter-${p.kind}-${pose}-${f}`;
      if (!this.scene.textures.exists(key)) continue;
      seen.add(p.id);
      let img = this.hidden.get(p.id);
      if (!img) {
        img = this.scene.add.image(0, 0, key);
        this.hidden.set(p.id, img);
      }
      img.setTexture(key).setPosition(p.x + LIFT.x * p.alt, p.y + LIFT.y * p.alt).setRotation(p.heading)
        .setScale((1 + p.alt * LIFT_SCALE) / art.res).setDepth(p.alt > 0.08 ? DEPTH.air : DEPTH.prey);
    }
    for (const [id, img] of this.hidden) {
      if (seen.has(id)) continue;
      img.destroy();
      this.hidden.delete(id);
    }
  }

  destroy(): void {
    for (const d of this.dapples) d.destroy();
    this.marker.destroy();
    for (const img of this.hidden.values()) img.destroy();
    this.hidden.clear();
  }
}

function crownsOf(zones: readonly ZoneDef[]): Round[] {
  return zones.flatMap((z) => (z.kind === 'tree' && z.shape === 'circle' ? [{ x: z.x, y: z.y, r: z.r }] : []));
}

/** A round blot fading out from its middle, at these (radius share, opacity) stops. */
function makeBlot(scene: Phaser.Scene, key: string, stops: readonly (readonly [number, number])[]): void {
  if (scene.textures.exists(key)) return;
  const size = SOFT_R * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = ctx.createRadialGradient(SOFT_R, SOFT_R, 0, SOFT_R, SOFT_R, SOFT_R);
  for (const [at, a] of stops) grad.addColorStop(at, `rgba(255,255,255,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}
