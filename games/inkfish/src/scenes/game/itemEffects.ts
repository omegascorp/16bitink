import Phaser from 'phaser';
import type { ItemId } from '../../levels/items';
import type { LevelDef } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { chumSpots } from '../../logic/chum';
import { spawnSpecial, stunFish, type Fish } from './fish';
import type { Player } from './player';
import { TUNING } from './tuning';

/** What an item's effect may touch in the game scene. */
export interface ItemHost {
  readonly scene: Phaser.Scene;
  readonly level: LevelDef;
  readonly rng: Rng;
  player(): Player;
  fish(): readonly Fish[];
  addFish(fish: readonly Fish[]): void;
  /** Takes away a share of the growth goal, never dropping below the current size tier. */
  loseGrowth(share: number): void;
  /** Adds a share of the growth goal, stepping up size tiers as usual. */
  addGrowth(share: number): void;
  /** A lure's hidden hook: costs a life like any other hit. */
  snag(): void;
  /** Lets a rubber duck loose here: a decoy hunters chase instead of you. */
  releaseDuck(x: number, y: number): void;
  floatText(x: number, y: number, text: string, color: string, size?: number): void;
  burst(x: number, y: number, count: number): void;
}

const BLUE = '#1f3f8a';
const RED = '#a3342b';
const GOLD = '#b07a1a';

const within = (p: Player, f: Fish, r: number): boolean =>
  f.state !== 'hooked' && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, f.sprite.x, f.sprite.y) < r + f.size;

/** Applies the item the player just ate. */
export function applyItem(host: ItemHost, kind: ItemId, now: number): void {
  const p = host.player();
  const { x, y } = p.sprite;
  const say = (text: string, color: string, size = 34): void => host.floatText(x, y - 50, text, color, size);
  switch (kind) {
    case 'can':
      p.speedUntil = now + TUNING.speedBoostMs;
      return say('Energy rush!', GOLD);
    case 'chum':
      host.addFish(schoolAround(host, TUNING.chumSchool));
      return say('Chum! Dinner is coming', BLUE, 30);
    case 'battery':
      shock(host, now);
      return say('Zzzap!', '#6b3f99', 40);
    case 'tin':
      p.shield = true;
      return say('Tin can armour', BLUE, 30);
    case 'duck':
      host.releaseDuck(x, y);
      return say('Quack!', GOLD, 40);
    case 'firecracker':
      blast(host, now);
      return say('Boom!', RED, 48);
    case 'food':
      host.addGrowth(TUNING.foodGrowthShare);
      return say('Fish food! Growing', GOLD);
    case 'glowstick':
      p.glowUntil = now + TUNING.glowMs;
      return say('Glow stick!', '#3f8a3a');
    case 'bag':
      p.slowUntil = now + TUNING.sickMs;
      host.loseGrowth(0.12);
      return say('Yuck, plastic!', RED);
    case 'rings':
      p.slowUntil = now + TUNING.tangledMs;
      p.tangledUntil = now + TUNING.tangledMs;
      return say('Tangled!', RED);
    case 'lure':
      host.snag();
      return;
  }
}

/** A school of `count` of the level's smallest prey rushes in from all sides, within sight (chum, a bait ball). */
export function schoolAround(host: ItemHost, count: number): Fish[] {
  const p = host.player();
  const view = host.scene.cameras.main.worldView;
  const staple = host.level.spawns[0]!;
  const spots = chumSpots(p.sprite.x, p.sprite.y, view.width / 2, view.height / 2, count, p.size * 3, host.rng);
  return spots.map((s) => {
    const f = spawnSpecial(host.scene, staple.species, staple.size[0], 'normal', s.x, s.y, host.rng);
    f.vx = -s.dx * 90;
    return f;
  });
}

/** Battery: stuns every fish nearby; shocked fish up to a bit bigger than you can be eaten. */
function shock(host: ItemHost, now: number): void {
  const p = host.player();
  const g = host.scene.add.graphics().setDepth(31);
  g.lineStyle(2, 0x6b3f99, 0.9);
  for (const f of host.fish()) {
    if (!within(p, f, TUNING.shockRadius)) continue;
    stunFish(f, now, TUNING.shockMs);
    f.shockedUntil = now + TUNING.shockMs;
    zigzag(g, p.sprite.x, p.sprite.y, f.sprite.x, f.sprite.y, host.rng);
  }
  host.scene.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
}

function zigzag(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, rng: Rng): void {
  // A kink every ~22px, so every bolt crackles, short or long.
  const steps = Math.max(3, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 22));
  g.beginPath().moveTo(x0, y0);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    g.lineTo(x0 + (x1 - x0) * t + rangeOf(rng, -9, 9), y0 + (y1 - y0) * t + rangeOf(rng, -9, 9));
  }
  g.lineTo(x1, y1).strokePath();
}

/** Firecracker: knocks out fish around you (they float up, edible); the biggest are only dazed. */
function blast(host: ItemHost, now: number): void {
  const p = host.player();
  host.scene.cameras.main.shake(260, 0.012);
  host.burst(p.sprite.x, p.sprite.y, 16);
  for (const f of host.fish()) {
    if (!within(p, f, TUNING.blastRadius)) continue;
    // Level goals (marked fish, the giant) are only dazed, never knocked out.
    if (f.role === 'normal' && f.size <= p.size * TUNING.blastKillRatio) {
      Object.assign(f, { state: 'dead', stateUntil: now + TUNING.deadFloatMs, vx: f.vx * 0.3 });
    } else {
      stunFish(f, now, TUNING.shockMs);
    }
  }
}
