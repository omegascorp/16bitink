import Phaser from 'phaser';
import { BOIL_FPS, BOIL_FRAMES, boilKey } from '../art/textures';
import { getChapters } from '../host';
import type { LevelDef } from '../levels/types';
import { drainFrenzy, feedFrenzy, frenzyLabel, frenzyMultiplier, initialFrenzy, type FrenzyState } from '../logic/frenzy';
import { addGrowth, growthProgress, initialGrowth, playerSizeFor, type GrowthState } from '../logic/growth';
import { createRng, type Rng } from '../logic/rng';
import { growthPointsFor, relationTo, scoreFor, touches } from '../logic/sizing';
import { targetZoom } from './game/camera';
import { isOffWorld, renderFish, spawnFish, updateFish, type Fish } from './game/fish';
import { destroyHook, hookTip, spawnHook, spawnJellies, updateHook, updateJelly, type Hook, type Jelly } from './game/hazards';
import {
  createControls, createPlayer, desiredDirection, movePlayer, renderPlayer, tryDash, type Controls, type Player,
} from './game/player';
import { spawnPowerUp, updatePowerUp, type PowerUp } from './game/powerups';
import { TUNING } from './game/tuning';
import { drawWorld } from './game/world';
import { allLevels } from './MenuScene';
import { HAND_FONT } from './ui';

export interface HudSnapshot {
  readonly levelName: string;
  readonly progress: number;
  readonly tierMarks: readonly number[];
  readonly score: number;
  readonly lives: number;
  readonly frenzyMeter: number;
  readonly multiplier: number;
  readonly frenzyLabel: string;
  readonly dashReady: boolean;
  readonly speedLeft: number;
}

export interface GameSceneData {
  readonly levelIndex: number;
}

export const HUD_EVENT = 'hud';

export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private levelIndex = 0;
  private rng!: Rng;
  private player!: Player;
  private controls!: Controls;
  private fish: Fish[] = [];
  private jellies: Jelly[] = [];
  private hooks: Hook[] = [];
  private powerUps: PowerUp[] = [];
  private weeds: Phaser.GameObjects.Image[] = [];
  private growth: GrowthState = initialGrowth;
  private frenzy: FrenzyState = initialFrenzy;
  private score = 0;
  private lives: number = TUNING.lives;
  private elapsedMs = 0;
  private nextHookAt = 0;
  private nextPowerUpAt = 0;
  private boilFrame = 0;
  private boilClock = 0;
  private ended = false;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    const levels = allLevels(getChapters(this));
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, levels.length - 1);
    const level = levels[this.levelIndex];
    if (!level) throw new Error(`Level ${data.levelIndex} not found`);
    this.level = level;
    this.rng = createRng(Date.now());
    Object.assign(this, {
      fish: [], jellies: [], hooks: [], powerUps: [], growth: initialGrowth, frenzy: initialFrenzy,
      score: 0, lives: TUNING.lives, elapsedMs: 0, boilFrame: 0, boilClock: 0, ended: false,
    });
    this.nextHookAt = level.hazards.hookEverySec * 1000;
    this.nextPowerUpAt = TUNING.powerUpEverySec * 600;
  }

  create(): void {
    const { world } = this.level;
    this.cameras.main.setBounds(0, 0, world.width, world.height).setBackgroundColor('#f4eddc');
    this.weeds = drawWorld(this, this.level);
    this.player = createPlayer(this, this.level);
    this.controls = createControls(this);
    this.jellies = spawnJellies(this, this.level, this.rng);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.zoomFor(this.player.size));

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.dash());
    kb?.on('keydown-SHIFT', () => this.dash());
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.dash();
    });
    this.input.mouse?.disableContextMenu();

    this.scene.launch('Hud', { levelName: this.level.name, tiers: this.level.tiers, touch: this.controls.touch });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('Hud'));
    this.emitHud();
  }

  /** Public so the HUD's touch button can trigger it. */
  dash(): void {
    if (this.ended) return;
    const dir = desiredDirection(this, this.controls, this.player);
    if (tryDash(this.player, dir, this.time.now)) this.burst(this.player.sprite.x, this.player.sprite.y, 5);
  }

  private zoomFor(size: number): number {
    const { width, height } = this.scale;
    return targetZoom(width, height, this.level.world.width, this.level.world.height, size, this.level.playerSizes[0]);
  }

  update(_time: number, deltaMs: number): void {
    if (this.ended) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const now = this.time.now;
    this.elapsedMs += deltaMs;
    this.tickBoil(deltaMs);

    movePlayer(this.player, desiredDirection(this, this.controls, this.player), this.level, now, dt);
    renderPlayer(this.player, now, this.boilFrame, dt);
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, this.zoomFor(this.player.size), Math.min(1, dt * 2)));

    this.frenzy = drainFrenzy(this.frenzy, dt);
    this.updateFishes(now, dt);
    this.updateHazards(now, deltaMs, dt);
    this.updatePowerUps(now);
    this.emitHud();
  }

  private tickBoil(deltaMs: number): void {
    this.boilClock += deltaMs;
    if (this.boilClock < 1000 / BOIL_FPS) return;
    this.boilClock = 0;
    this.boilFrame = (this.boilFrame + 1) % BOIL_FRAMES;
    for (const w of this.weeds) w.setTexture(boilKey('weed', this.boilFrame));
  }

  private updateFishes(now: number, dt: number): void {
    const p = this.player;
    const view = { x: p.sprite.x, y: p.sprite.y, size: p.size };
    const camView = this.cameras.main.worldView;
    while (this.fish.length < this.level.maxFish) {
      this.fish.push(spawnFish(this, this.level, p.size, camView, this.rng));
    }
    this.fish = this.fish.filter((f) => {
      updateFish(f, view, now, dt);
      renderFish(f, p.size, this.boilFrame);
      if (isOffWorld(f, this.level)) {
        f.sprite.destroy();
        return false;
      }
      if (this.ended || !touches(p.sprite.x, p.sprite.y, p.size, f.sprite.x, f.sprite.y, f.size)) return true;
      const rel = relationTo(p.size, f.size);
      if (rel === 'prey') {
        this.eat(f);
        return false;
      }
      if (rel === 'predator') this.hurt(f.sprite.x, f.sprite.y);
      else this.bump(f);
      return true;
    });
  }

  private eat(f: Fish): void {
    if (this.ended) return;
    const mult = frenzyMultiplier(this.frenzy);
    const gained = scoreFor(f.size, mult);
    this.score += gained;
    this.frenzy = feedFrenzy(this.frenzy);
    const before = this.growth.tier;
    this.growth = addGrowth(this.level, this.growth, growthPointsFor(f.size));
    this.floatText(f.sprite.x, f.sprite.y - f.size, mult > 1 ? `+${gained} ×${mult}` : `+${gained}`, '#1f3f8a');
    this.burst(f.sprite.x, f.sprite.y, 6);
    f.sprite.destroy();
    this.player.chompAt = this.time.now;
    if (this.growth.tier > before) this.growUp();
    if (this.growth.complete) this.finish('win');
  }

  private growUp(): void {
    const size = playerSizeFor(this.level, this.growth.tier);
    this.player.size = size;
    this.floatText(this.player.sprite.x, this.player.sprite.y - size * 2, 'Bigger!', '#a3342b', 44);
    this.cameras.main.shake(180, 0.004);
  }

  private bump(f: Fish): void {
    const p = this.player;
    const a = Phaser.Math.Angle.Between(f.sprite.x, f.sprite.y, p.sprite.x, p.sprite.y);
    p.vx += Math.cos(a) * 160;
    p.vy += Math.sin(a) * 160;
    f.vx -= Math.cos(a) * 60;
  }

  private hurt(x: number, y: number): void {
    const p = this.player;
    const now = this.time.now;
    if (now < p.invulnerableUntil || this.ended) return;
    this.lives -= 1;
    this.frenzy = initialFrenzy;
    this.burst(x, y, 14);
    this.cameras.main.shake(260, 0.01);
    if (this.lives <= 0) {
      p.sprite.setVisible(false);
      this.finish('lose');
      return;
    }
    p.invulnerableUntil = now + TUNING.invulnerableMs;
    p.sprite.setPosition(p.sprite.x, Math.max(160, p.sprite.y - 220));
    this.floatText(p.sprite.x, p.sprite.y - 40, 'Gulp!', '#a3342b', 40);
  }

  private updateHazards(now: number, deltaMs: number, dt: number): void {
    const p = this.player;
    for (const j of this.jellies) {
      updateJelly(j, this.level, dt, this.boilFrame);
      if (now > p.stunnedUntil + 600 && now > p.invulnerableUntil &&
        touches(p.sprite.x, p.sprite.y, p.size, j.sprite.x, j.sprite.y, j.radius, 0.7)) {
        p.stunnedUntil = now + TUNING.stunMs;
        this.floatText(p.sprite.x, p.sprite.y - 30, 'zzap!', '#6b3f99');
      }
    }
    if (this.level.hazards.hookEverySec > 0 && this.elapsedMs > this.nextHookAt) {
      this.nextHookAt = this.elapsedMs + this.level.hazards.hookEverySec * 1000;
      this.hooks.push(spawnHook(this, this.level, p.sprite.x, p.sprite.y, this.rng));
    }
    this.hooks = this.hooks.filter((h) => {
      const alive = updateHook(h, deltaMs, this.boilFrame);
      const tip = hookTip(h);
      if (alive && tip.active && touches(p.sprite.x, p.sprite.y, p.size, tip.x, tip.y, 12, 0.8)) {
        this.hurt(tip.x, tip.y);
      }
      if (!alive) destroyHook(h);
      return alive;
    });
  }

  private updatePowerUps(now: number): void {
    if (this.elapsedMs > this.nextPowerUpAt) {
      this.nextPowerUpAt = this.elapsedMs + TUNING.powerUpEverySec * 1000;
      const pu = spawnPowerUp(this, this.level, this.cameras.main.worldView, now, this.rng);
      if (pu) this.powerUps.push(pu);
    }
    const p = this.player;
    this.powerUps = this.powerUps.filter((pu) => {
      if (!updatePowerUp(pu, now, this.boilFrame)) return false;
      if (!touches(p.sprite.x, p.sprite.y, p.size, pu.sprite.x, pu.sprite.y, 26, 0.9)) return true;
      this.collect(pu, now);
      return false;
    });
  }

  private collect(pu: PowerUp, now: number): void {
    const p = this.player;
    if (pu.kind === 'speed') {
      p.speedUntil = now + TUNING.speedBoostMs;
      this.floatText(pu.sprite.x, pu.sprite.y, 'Quick quill!', '#b07a1a');
    } else {
      this.inkCloud(p.sprite.x, p.sprite.y);
      for (const f of this.fish) {
        const d = Phaser.Math.Distance.Between(f.sprite.x, f.sprite.y, p.sprite.x, p.sprite.y);
        if (d < TUNING.shrinkRadius) f.shrinkUntil = now + TUNING.shrinkMs;
      }
      this.floatText(pu.sprite.x, pu.sprite.y, 'Shrink-ink!', '#1b1a1f');
    }
    pu.sprite.destroy();
  }

  private finish(kind: 'win' | 'lose'): void {
    if (this.ended) return;
    this.ended = true;
    this.emitHud();
    this.time.delayedCall(kind === 'win' ? 700 : 1000, () => {
      this.scene.pause();
      this.scene.launch('Result', {
        kind, levelIndex: this.levelIndex, score: this.score, seconds: this.elapsedMs / 1000,
      });
    });
  }

  private emitHud(): void {
    const mult = frenzyMultiplier(this.frenzy);
    const now = this.time.now;
    const snapshot: HudSnapshot = {
      levelName: this.level.name,
      progress: growthProgress(this.level, this.growth),
      tierMarks: [this.level.tiers[0] / this.level.tiers[2], this.level.tiers[1] / this.level.tiers[2]],
      score: this.score,
      lives: this.lives,
      frenzyMeter: this.frenzy.meter,
      multiplier: mult,
      frenzyLabel: frenzyLabel(mult),
      dashReady: now >= this.player.dashReadyAt,
      speedLeft: Math.max(0, this.player.speedUntil - now),
    };
    this.events.emit(HUD_EVENT, snapshot);
  }

  private floatText(x: number, y: number, text: string, color: string, size = 30): void {
    const t = this.add
      .text(x, y, text, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, stroke: '#f4eddc', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  private burst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const b = this.add.image(x, y, 'bubble').setDepth(30).setScale(0.6 + this.rng() * 0.8);
      this.tweens.add({
        targets: b, x: x + (this.rng() - 0.5) * 90, y: y - 30 - this.rng() * 80, alpha: 0,
        duration: 600 + this.rng() * 500, ease: 'Sine.Out', onComplete: () => b.destroy(),
      });
    }
  }

  private inkCloud(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics().setDepth(35);
      g.fillStyle(0x1b1a1f, 0.55);
      g.fillCircle(0, 0, 30 + this.rng() * 40);
      g.setPosition(x + (this.rng() - 0.5) * 60, y + (this.rng() - 0.5) * 60).setScale(0.2);
      this.tweens.add({
        targets: g, scale: 2.2 + this.rng() * 1.5, alpha: 0, x: g.x + (this.rng() - 0.5) * 260,
        y: g.y + (this.rng() - 0.5) * 200, duration: 1100 + this.rng() * 500, ease: 'Cubic.Out', onComplete: () => g.destroy(),
      });
    }
  }
}
