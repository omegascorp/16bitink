import type Phaser from 'phaser';
import { LANE_HALF, Roadrunner } from '../../logic/chapters/dunesRoadrunner';
import { DUNES_PREY } from '../../logic/chapters/dunesPrey';
import type { World } from '../../logic/world';
import type { ChapterView } from './types';

const SAND_EDGE = 0xc9ab72;
const GRAIN = 0xb08a52;
const HEAT = 0xff8a3d;
const RED = 0xb3322b;
const BLUE = 0x27408b;
/**
 * Depths: sand kicked up under the critters, the burying ring over the
 * snake, the roadrunner's lane with the other warnings, and the heat glow
 * over the night (6.8), under the words.
 */
const DEPTH = { kicks: 2.55, bury: 3.7, lane: 6.5, heat: 6.9 } as const;
/** Soft edges: this many rings, each a little smaller and as faint. */
const SOFT = 5;
/** How far the warmth of a meal reaches past its body, px, and how bright its middle is. */
const HEAT_REACH = 26;
const HEAT_ALPHA = 0.16;

/**
 * The Dunes' own layer: the sand burying ring and the grains it throws up,
 * kangaroo rats' kicked sand, the Roadrunner's dotted lane as it lines up a
 * dash (and a blue ring while it skids, open to a strike), and on a night
 * level the warmth of prey glowing through the dark: a pit viper feels it.
 * (The dunes themselves are painted on the board: dunesPlace.ts.)
 */
class DunesView implements ChapterView {
  private readonly kicks: Phaser.GameObjects.Graphics;
  private readonly bury: Phaser.GameObjects.Graphics;
  private readonly lane: Phaser.GameObjects.Graphics;
  private readonly heat: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene, world: World) {
    this.kicks = scene.add.graphics().setDepth(DEPTH.kicks);
    this.bury = scene.add.graphics().setDepth(DEPTH.bury);
    this.lane = scene.add.graphics().setDepth(DEPTH.lane);
    this.heat = world.level.dark ? scene.add.graphics().setDepth(DEPTH.heat).setBlendMode(1) : null;
  }

  update(world: World, time: number): void {
    this.drawKicks(world, time);
    this.drawBury(world, time);
    this.drawLane(world, time);
    this.drawHeat(world, time);
  }

  /** Kangaroo rats kicking: a spray of sand thrown back at the snake. */
  private drawKicks(world: World, time: number): void {
    const g = this.kicks;
    g.clear();
    for (const p of world.prey) {
      if (p.kind !== 'kangaroo-rat' || (p.data?.kick ?? 0) <= 0) continue;
      const back = p.heading + Math.PI;
      for (let i = 0; i < 9; i++) {
        const k = ((time / 140 + i * 0.37) % 1 + 1) % 1;
        const spread = Math.sin(i * 2.3) * 0.7;
        const r = 14 + k * 34;
        g.fillStyle(GRAIN, 0.7 * (1 - k));
        g.fillCircle(p.x + Math.cos(back + spread) * r, p.y + Math.sin(back + spread) * r, 1.6);
      }
    }
  }

  /** Burying: a dotted ring of sand drawn in round the head, grains shivering; once under, a faint crater. */
  private drawBury(world: World, time: number): void {
    const g = this.bury;
    g.clear();
    const s = world.snake;
    if (!world.ability?.active || world.ability.id !== 'bury') return;
    const h = s.head;
    const under = s.cloak === 'buried';
    const r = s.width * (under ? 1.1 : 1.6 + Math.sin(time / 50) * 0.15);
    const n = 14;
    g.fillStyle(SAND_EDGE, under ? 0.45 : 0.8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (under ? 0 : time / 300);
      g.fillCircle(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, under ? 1.2 : 1.8);
    }
  }

  /** The Roadrunner's dash: a dotted lane from its feet to where it means to stop, darkening as it comes; a blue ring while it skids. */
  private drawLane(world: World, time: number): void {
    const g = this.lane;
    g.clear();
    const rr = world.boss;
    if (!(rr instanceof Roadrunner) || rr.away) return;
    if (rr.mode === 'skid') {
      const n = 16;
      const r = 34 + Math.sin(time / 90) * 2;
      g.fillStyle(BLUE, 0.8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.fillCircle(rr.x + Math.cos(a) * r, rr.y + Math.sin(a) * r, 1.8);
      }
      return;
    }
    const lane = rr.lane;
    if (!lane || (rr.mode !== 'aim' && rr.mode !== 'dash')) return;
    const dx = lane.to.x - lane.from.x;
    const dy = lane.to.y - lane.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const k = rr.aiming;
    const flash = 0.7 + 0.3 * Math.sin(time / 60);
    g.fillStyle(RED, (0.3 + 0.55 * k) * flash);
    for (const side of [-1, 1]) {
      for (let t = 24 / len; t <= 1; t += 15 / len) g.fillCircle(lane.from.x + dx * t + nx * LANE_HALF * side, lane.from.y + dy * t + ny * LANE_HALF * side, 1.9);
    }
    // A cross where it means to pull up.
    const e = lane.to;
    g.lineStyle(2, RED, 0.4 + 0.5 * k);
    g.lineBetween(e.x - 8, e.y - 8, e.x + 8, e.y + 8);
    g.lineBetween(e.x - 8, e.y + 8, e.x + 8, e.y - 8);
  }

  /** At night, each prey animal's warmth glows through the dark, softly pulsing. */
  private drawHeat(world: World, time: number): void {
    const g = this.heat;
    if (!g) return;
    g.clear();
    for (const p of world.prey) {
      if (p.mode === 'appear' || p.mode === 'hidden' || p.mode === 'caught') continue;
      const size = DUNES_PREY[p.kind]?.size ?? 14;
      const pulse = 1 + Math.sin(time / 380 + p.id) * 0.08;
      const reach = (size / 2 + HEAT_REACH) * pulse;
      // A sleeping (envenomed) meal is cooling a little, but still warm.
      const a = HEAT_ALPHA * (p.mode === 'sleep' ? 0.7 : 1);
      for (let i = 0; i < SOFT; i++) {
        g.fillStyle(HEAT, a);
        g.fillCircle(p.x, p.y, reach * (1 - i / SOFT) + 2);
      }
    }
  }

  destroy(): void {
    this.kicks.destroy();
    this.bury.destroy();
    this.lane.destroy();
    this.heat?.destroy();
  }
}

/** The Dunes' layer, made when a level starts. */
export function dunesView(scene: Phaser.Scene, world: World): ChapterView {
  return new DunesView(scene, world);
}
