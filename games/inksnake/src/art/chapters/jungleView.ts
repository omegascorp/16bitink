import type Phaser from 'phaser';
import { HOOD_REACH, isHood } from '../../logic/abilities/cobra';
import { JungleRival } from '../../logic/chapters/jungleRival';
import type { World } from '../../logic/world';
import { SNAKE_W } from '../types';
import { JUNGLE_ART } from './jungle';
import { bakeCritter, bakeSprite } from './jungleBake';
import { COBRA_HOOD, type HoodPose } from './jungleHood';
import type { ChapterView } from './types';

/** Depths: rings over the prey, the reared head's shadow under the body (3.5), the hood just over the head (3.6). */
const DEPTH = { rings: 2.65, hoodShadow: 3.45, hood: 3.61, pulse: 6.4 } as const;
const INK = 0x27408b;
const RED = 0xb3322b;
/** The hood's reach shows as a ring spreading out to it over this long, s. */
const PULSE_TIME = 0.45;
/** The meal kinds whose pictures go down the cobra's throat (painted here: on the board they're snakes). */
const MEALS = ['ratsnake', 'banded-krait', 'big-krait', 'rock-python'] as const;

const hoodKey = (pose: HoodPose): string => `jungle-hood-${pose}`;

/** A dotted pencil ring. */
function dotted(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, colour: number, alpha: number, dot: number): void {
  const n = Math.max(10, Math.round((r * Math.PI * 2) / (dot * 4.5)));
  g.fillStyle(colour, alpha);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, dot);
  }
}

/** Traces a closed polygon, to fill or stroke. */
function trace(g: Phaser.GameObjects.Graphics, pts: readonly { readonly x: number; readonly y: number }[]): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
}

/**
 * The Jungle's own layer: the king cobra's hood, spread wide behind its
 * head while it rears (with a ring spreading out to the hood's reach), a
 * red ring round the head of every rival wider than you (it bites), a blue
 * one round the rat snakes a feast asks for (the stream is the place's own
 * painting, junglePlaceStream.ts).
 */
class JungleView implements ChapterView {
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly hood: Phaser.GameObjects.Image;
  private readonly hoodShadow: Phaser.GameObjects.Graphics;
  private readonly pulse: Phaser.GameObjects.Graphics;
  /** Seconds since the hood last spread, or -1; and how many spreads have been shown. */
  private pulseAge = -1;
  private seen = 0;
  private pulseAt = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    // The rivals' meal pictures (the gulp, a sleeping python going down) aren't baked with the level: they're snakes there.
    for (const kind of MEALS) bakeCritter(scene, kind, JUNGLE_ART.critters?.[kind]);
    this.rings = scene.add.graphics().setDepth(DEPTH.rings);
    for (const pose of COBRA_HOOD.poses) bakeSprite(scene, hoodKey(pose), COBRA_HOOD, pose, 0, 500);
    this.hood = scene.add.image(0, 0, hoodKey('spread')).setDepth(DEPTH.hood).setVisible(false);
    this.hoodShadow = scene.add.graphics().setDepth(DEPTH.hoodShadow);
    this.pulse = scene.add.graphics().setDepth(DEPTH.pulse);
  }

  update(world: World, time: number, dt: number): void {
    const a = world.ability;
    if (a && isHood(a) && a.spreads !== this.seen) {
      this.seen = a.spreads;
      this.pulseAge = 0;
      this.pulseAt = { x: world.snake.head.x, y: world.snake.head.y };
    }
    this.drawRings(world, time);
    this.drawHood(world);
    this.drawPulse(dt);
  }

  private drawRings(world: World, time: number): void {
    const g = this.rings;
    g.clear();
    const me = world.snake;
    const g0 = world.level.goal;
    const feast = g0?.kind === 'feast' && world.feasted < g0.count ? g0.food : null;
    for (const e of world.enemies) {
      if (!(e instanceof JungleRival) || e.away) continue;
      const h = e.snake.head;
      if (e.dangerTo(me)) dotted(g, h.x, h.y, e.snake.width * 0.9 + 10 + Math.sin(time / 120) * 1.5, RED, 0.7, 1.6);
      else if (feast === e.own.meal) dotted(g, h.x, h.y, e.snake.width * 0.9 + 9 + Math.sin(time / 260) * 1.5, INK, 0.65, 1.5);
    }
  }

  /**
   * The hood (painted, jungleHood.ts): laid over the head in its own frame as
   * the cobra rears, the head cut out of it so it lies in front; its long
   * shadow thrown on the ground, the front third of the body up off it.
   */
  private drawHood(world: World): void {
    const g = this.hoodShadow;
    g.clear();
    const a = world.ability;
    const k = a && isHood(a) ? a.open : 0;
    if (k <= 0) {
      this.hood.setVisible(false);
      return;
    }
    const s = world.snake;
    const h = s.head;
    const pose: HoodPose = k < 0.45 ? 'rise' : k < 0.8 ? 'half' : 'spread';
    const scale = s.width / SNAKE_W;
    this.hood.setTexture(hoodKey(pose)).setVisible(true).setPosition(h.x, h.y).setRotation(s.heading).setScale(scale / COBRA_HOOD.res);
    const back = s.heading + Math.PI;
    const cx = h.x + Math.cos(back) * s.width * 1.2 + 9 * k;
    const cy = h.y + Math.sin(back) * s.width * 1.2 + 12 * k;
    const along = s.width * 1.9;
    const across = s.width * (0.6 + 0.5 * k);
    g.fillStyle(0x26316a, 0.16 * k);
    trace(g, Array.from({ length: 28 }, (_, i) => {
      const t = (i / 28) * Math.PI * 2;
      const u = Math.cos(t) * along;
      const v = Math.sin(t) * across;
      return { x: cx + u * Math.cos(s.heading) - v * Math.sin(s.heading), y: cy + u * Math.sin(s.heading) + v * Math.cos(s.heading) };
    }));
    g.fillPath();
  }

  /** The hood's reach, a ring spreading out from the head as it spreads. */
  private drawPulse(dt: number): void {
    const g = this.pulse;
    g.clear();
    if (this.pulseAge < 0 || this.pulseAge >= PULSE_TIME) return;
    this.pulseAge += dt;
    const t = Math.min(1, this.pulseAge / PULSE_TIME);
    dotted(g, this.pulseAt.x, this.pulseAt.y, HOOD_REACH * (0.35 + 0.65 * t), INK, 0.6 * (1 - t), 1.7);
  }

  destroy(): void {
    this.rings.destroy();
    this.hood.destroy();
    this.hoodShadow.destroy();
    this.pulse.destroy();
  }
}

export const jungleView = (scene: Phaser.Scene): ChapterView => new JungleView(scene);
