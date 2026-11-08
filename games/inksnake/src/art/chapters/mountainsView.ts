import type Phaser from 'phaser';
import { Lure } from '../../logic/abilities/spidertail';
import { isBird } from '../../logic/chapters/mountainsBirds';
import { BOAR_LANE, WildBoar } from '../../logic/chapters/mountainsBoar';
import type { Prey } from '../../logic/preyTypes';
import type { World } from '../../logic/world';
import { BOIL, INK_HEX, RED_HEX } from '../palette';
import { SNAKE_W, type SpriteArt } from '../types';
import { bakeLure, lureKey, SPIDER_LURE } from './mountainsSnakeLure';
import type { ChapterView } from './types';

/** Depths: the spider just over the snake's body, fliers in the air, the lane, the haze, stars over the dazed boar. */
const DEPTH = { spider: 3.62, air: 6, lane: 6.5, haze: 6.6, stars: 6.9 } as const;
/** As crittersView lifts fliers off their shadows (board px at full height, and how much bigger they look). */
const LIFT = { x: -26, y: -44 } as const;
const LIFT_SCALE = 0.22;
const BOIL_FPS = 7;
const STALK = 0x9c917e;
const HAZE = 0xe9eef2;
const STAR = 0xd9a62b;
/** The spider's figure of eight: how far it swings, px, and how many loops a second (four times as fast when a bird is coming). */
const WAG = 5;
const WAG_RATE = 1.1;
const WAG_EXCITED = 4;
/** The spider drawn a little larger than life, so it reads at a glance. */
const LURE_SIZE = 1.25;

/**
 * The Mountains' own layer (the scree itself is painted with the board,
 * mountainsPlaceGround.ts): the viper's tail tip drawn as its "spider" (a
 * bulb fringed with long scales, mountainsSnakeLure.ts) that waves in a
 * figure of eight while it lures, faster when a bird is coming; the birds high in the air (out of reach, so the shared
 * critter view leaves them out); the boar's dotted charge lane and the
 * stars round its head when it's dazed; and a cold haze drifting over the
 * crags.
 */
class MountainsView implements ChapterView {
  private readonly spider: Phaser.GameObjects.Graphics;
  private readonly lure: Phaser.GameObjects.Image;
  private readonly lane: Phaser.GameObjects.Graphics;
  private readonly haze: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Graphics;
  private readonly fliers = new Map<number, Phaser.GameObjects.Image>();
  private wag = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly critters: Readonly<Record<string, SpriteArt>>) {
    this.spider = scene.add.graphics().setDepth(DEPTH.spider);
    bakeLure(scene);
    this.lure = scene.add.image(0, 0, lureKey('still', 0)).setDepth(DEPTH.spider + 0.001).setVisible(false);
    this.lane = scene.add.graphics().setDepth(DEPTH.lane);
    this.haze = scene.add.graphics().setDepth(DEPTH.haze);
    this.stars = scene.add.graphics().setDepth(DEPTH.stars);
  }

  update(world: World, time: number, dt: number): void {
    this.drawSpider(world, time, dt);
    this.drawFliers(world, time);
    this.drawBoar(world, time);
    this.drawHaze(time);
  }

  /** The tail tip's spider (a painted sprite: a bulb fringed with long scales), waving in a figure of eight while it lures, its legs flickering. */
  private drawSpider(world: World, time: number, dt: number): void {
    const g = this.spider.clear();
    const img = this.lure;
    const s = world.snake;
    const lure = world.ability instanceof Lure ? world.ability : null;
    const luring = lure?.active ?? false;
    const excited = luring && (lure?.excited ?? false);
    this.wag += dt * Math.PI * 2 * (luring ? WAG_RATE * (excited ? WAG_EXCITED : 1) : 0.15);
    const pts = s.trail.pts;
    const n = s.trail.count;
    const tip = pts[n - 1];
    const before = pts[Math.max(0, n - 3)];
    // It blinks with the snake after a hit.
    if (!tip || !before || (s.safe > 0 && Math.floor(time / 90) % 2 === 0)) {
      img.setVisible(false);
      return;
    }
    const a = Math.atan2(tip.y - before.y, tip.x - before.x);
    const swing = luring ? WAG : 0.8;
    const along = Math.sin(this.wag) * swing;
    const across = Math.sin(this.wag * 2) * swing * 0.6;
    const bx = tip.x + Math.cos(a) * (3 + along) - Math.sin(a) * across;
    const by = tip.y + Math.sin(a) * (3 + along) + Math.cos(a) * across;
    const k = s.width / SNAKE_W;
    // The last thin bit of tail bending out to the bulb (the sprite's own stalk covers most of it).
    g.lineStyle(Math.max(1.6, s.width * 0.11), STALK, 1).lineBetween(tip.x, tip.y, bx, by);
    const f = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    const pose = !luring ? 'still' : Math.floor(this.wag * (excited ? 1.2 : 2) / Math.PI) % 2 === 0 ? 'wave0' : 'wave1';
    const turn = Math.atan2(by - tip.y, bx - tip.x);
    img.setTexture(lureKey(pose, f)).setVisible(true).setPosition(bx, by).setRotation(turn).setScale((k * LURE_SIZE) / SPIDER_LURE.res);
  }

  /** Birds up in the air: out of reach (the critter view hides them), drawn lifted off their shadows. */
  private drawFliers(world: World, time: number): void {
    const f = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    const seen = new Set<number>();
    for (const p of world.prey) {
      if (!isBird(p.kind) || p.mode !== 'hidden' || p.alt <= 0 || p.data?.gone) continue;
      const img = this.flier(p, time, f);
      if (img) seen.add(p.id);
    }
    for (const [id, img] of this.fliers) {
      if (seen.has(id)) continue;
      img.destroy();
      this.fliers.delete(id);
    }
  }

  private flier(p: Prey, time: number, f: number): Phaser.GameObjects.Image | null {
    const art = this.critters[p.kind];
    const key = critterKey(p.kind, `fly${Math.floor((time / 1000) * 12 + p.id) % 2}`, f);
    if (!art || !this.scene.textures.exists(key)) return null;
    let img = this.fliers.get(p.id);
    if (!img) {
      img = this.scene.add.image(0, 0, key).setDepth(DEPTH.air);
      this.fliers.set(p.id, img);
    }
    const lift = p.alt;
    img.setTexture(key).setPosition(p.x + LIFT.x * lift, p.y + LIFT.y * lift).setRotation(p.heading).setScale((1 + lift * LIFT_SCALE) / art.res);
    return img;
  }

  /** The boar's lane while it paws and charges (darkening as it comes), and stars round it while it's dazed. */
  private drawBoar(world: World, time: number): void {
    const g = this.lane.clear();
    const st = this.stars.clear();
    const boar = world.boss instanceof WildBoar ? world.boss : null;
    if (!boar || boar.away) return;
    const l = boar.lane;
    if (l && (boar.mode === 'paw' || boar.mode === 'charge')) {
      const dx = l.to.x - l.from.x;
      const dy = l.to.y - l.from.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const flash = 0.5 + 0.5 * Math.sin(time / 70);
      g.fillStyle(RED_HEX, (0.3 + 0.5 * boar.pawing) * (0.7 + 0.3 * flash));
      for (const side of [-1, 1]) {
        for (let t = 0; t <= 1; t += 14 / len) g.fillCircle(l.from.x + dx * t + nx * BOAR_LANE * side, l.from.y + dy * t + ny * BOAR_LANE * side, 2);
      }
      // Where it ends: a burst against the rock it'll run into, or a bar at the edge.
      g.lineStyle(2, RED_HEX, 0.4 + 0.5 * boar.pawing);
      const ex = l.to.x;
      const ey = l.to.y;
      if (l.rock) for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + time / 400;
        g.lineBetween(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8, ex + Math.cos(a) * 15, ey + Math.sin(a) * 15);
      }
      else g.lineBetween(ex + nx * BOAR_LANE, ey + ny * BOAR_LANE, ex - nx * BOAR_LANE, ey - ny * BOAR_LANE);
    }
    if (boar.mode === 'dazed') {
      for (let i = 0; i < 3; i++) {
        const a = time / 260 + (i / 3) * Math.PI * 2;
        star(st, boar.x + Math.cos(a) * 22, boar.y - 30 + Math.sin(a) * 8, 5);
      }
    }
  }

  /** A cold haze: a few pale banks drifting slowly across the crags. */
  private drawHaze(time: number): void {
    const g = this.haze.clear();
    const t = time / 1000;
    for (let i = 0; i < 3; i++) {
      const x = ((t * (9 + i * 4) + i * 420) % 1400) - 220;
      const y = 90 + i * 170 + Math.sin(t * 0.2 + i) * 30;
      g.fillStyle(HAZE, 0.05 + 0.02 * Math.sin(t * 0.3 + i * 2));
      g.fillEllipse(x, y, 520, 120);
      g.fillEllipse(x + 120, y + 20, 360, 80);
    }
  }

  destroy(): void {
    for (const img of this.fliers.values()) img.destroy();
    this.fliers.clear();
    this.spider.destroy();
    this.lure.destroy();
    this.lane.destroy();
    this.haze.destroy();
    this.stars.destroy();
  }
}

/** A critter's baked texture key, as art/textures.ts's TEX.critter names it (not imported: textures.ts → places → chapters would make an import cycle). */
const critterKey = (kind: string, pose: string, f: number): string => `critter-${kind}-${pose}-${f}`;

/** A little five-pointed star, inked and washed gold. */
function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const k = i % 2 === 0 ? r : r * 0.45;
    return { x: x + Math.cos(a) * k, y: y + Math.sin(a) * k } as Phaser.Math.Vector2;
  });
  g.fillStyle(STAR, 0.95).fillPoints(pts, true);
  g.lineStyle(1, INK_HEX, 0.9).strokePoints(pts, true);
}

/**
 * The Mountains' layer for a level (see ChapterArt.view), given the
 * chapter's critter drawings (handed in, not imported from critters/index,
 * which would make an import cycle).
 */
export const mountainsView = (scene: Phaser.Scene, _world: World, critters: Readonly<Record<string, SpriteArt>>): ChapterView =>
  new MountainsView(scene, critters);
