import Phaser from 'phaser';
import { ART_RES, BOIL_FPS, BOIL_FRAMES, boilKey, ensureFishTextures, releaseFishTextures, weedKey } from '../art/textures';
import { getChapters } from '../host';
import type { LevelDef, SpeciesId } from '../levels/types';
import { drainFrenzy, feedFrenzy, frenzyLabel, frenzyMultiplier, initialFrenzy, type FrenzyState } from '../logic/frenzy';
import { addGrowth, growthProgress, initialGrowth, playerSizeFor, type GrowthState } from '../logic/growth';
import { canHunt, HUNT_COOLDOWN_MS } from '../logic/ecosystem';
import { causeOfBite, deathText, hitText, type Death, type DeathCause } from '../logic/deaths';
import { initialProgress, objectiveLine, objectiveOutcome, type ObjectiveProgress } from '../logic/objective';
import { createRng, type Rng } from '../logic/rng';
import { waterTop } from '../logic/water';
import { growthPointsFor, relationTo, scoreFor } from '../logic/sizing';
import { targetZoom } from './game/camera';
import { playEaten, playSpiked, spikeMarks } from './game/deathFx';
import { isHelpless, isOffWorld, renderFish, spawnFish, stunFish, updateFish, type Decoy, type Fish } from './game/fish';
import {
  destroyHook, hangPoint, hookCatch, hookRelease, hookTip, spawnHook, spawnJellies, updateHook, updateJelly, type Hook, type Jelly,
} from './game/hazards';
import {
  createControls, createPlayer, desiredDirection, movePlayer, renderPlayer, tryDash, type Controls, type Player,
} from './game/player';
import { applyItem, type ItemHost } from './game/itemEffects';
import { spawnItem, updateItem, type FallingItem } from './game/items';
import { bodyOf, gulp, mouthOf } from './game/swim';
import { capsulesTouch, capsuleTouchesCircle } from '../logic/body';
import { TUNING } from './game/tuning';
import { TwistRunner } from './game/twistRunner';
import { drawWorld, swayWeeds } from './game/world';
import { buildCover } from './game/coverPatches';
import { Hideout } from './game/hideout';
import { planCover } from '../levels/cover';
import { isCrawler, spawnCrawler, updateCrawler } from './game/crawlers';
import { seabedFor, type Seabed } from '../logic/water';
import { describeLevel, levelNumber } from '../levels/twists';
import { PLAYER_FISH_NAMES } from '../levels/zones';
import { allLevels, chapterOf } from '../levels/chapters';
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
  /** The level goal's progress line, e.g. "Ink drops 3/10". */
  readonly objective: string;
  readonly urgent: boolean;
}

export interface GameSceneData {
  readonly levelIndex: number;
}

export const HUD_EVENT = 'hud';

/** Every species a level can put in the water, goals included. */
function levelSpecies(level: LevelDef): SpeciesId[] {
  const o = level.objective;
  const goal = o.kind === 'bounty' || o.kind === 'boss' ? [o.species] : [];
  return [...level.spawns.map((s) => s.species), ...level.bottom.map((s) => s.species), ...goal];
}

export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private levelIndex = 0;
  private rng!: Rng;
  private player!: Player;
  private controls!: Controls;
  private fish: Fish[] = [];
  private jellies: Jelly[] = [];
  private hooks: Hook[] = [];
  /** What each hook is reeling in, if it caught a fish. */
  private hookedFish = new Map<Hook, Fish>();
  /** The hook the player is on, if any. */
  private playerHook: Hook | null = null;
  private releaseAt = 0;
  private items: FallingItem[] = [];
  private itemHost!: ItemHost;
  private decoy: Decoy | null = null;
  private shieldG!: Phaser.GameObjects.Graphics;
  /** Weed and coral to hide in. */
  private hideout!: Hideout;
  private weeds: Phaser.GameObjects.Image[] = [];
  /** This level's sand: crawlers walk on it, swimmers can't go below it. */
  private seabed!: Seabed;
  private growth: GrowthState = initialGrowth;
  private frenzy: FrenzyState = initialFrenzy;
  private score = 0;
  private lives: number = TUNING.lives;
  private elapsedMs = 0;
  private nextHookAt = 0;
  private nextItemAt = 0;
  private boilFrame = 0;
  private boilClock = 0;
  private ended = false;
  private death: Death | null = null;
  private twist!: TwistRunner;
  private progress: ObjectiveProgress = initialProgress;

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
      fish: [], jellies: [], hooks: [], hookedFish: new Map(), playerHook: null, releaseAt: 0, items: [], decoy: null, growth: initialGrowth, frenzy: initialFrenzy,
      score: 0, elapsedMs: 0, boilFrame: 0, boilClock: 0, ended: false, death: null, progress: initialProgress,
      lives: level.modifiers.lives ?? TUNING.lives,
    });
    this.nextHookAt = level.hazards.hookEverySec * 1000;
    this.nextItemAt = TUNING.itemEverySec * 600;
  }

  create(): void {
    const { world } = this.level;
    this.cameras.main.setBounds(0, 0, world.width, world.height).setBackgroundColor('#f4eddc');
    const chapter = chapterOf(this.level);
    const residents = levelSpecies(this.level);
    releaseFishTextures(this, residents);
    ensureFishTextures(this, residents);
    this.seabed = seabedFor(this.level.id, world);
    this.weeds = drawWorld(this, this.level, chapter.zone, this.seabed);
    const covers = buildCover(this, planCover(this.level.id, levelNumber(this.level), chapter.zone, world.width), this.seabed.floorAt, levelNumber(this.level) * 31 + 7);
    this.weeds.push(...covers.flatMap((c) => c.weeds));
    this.hideout = new Hideout(this, covers, this.seabed.floorAt);
    this.player = createPlayer(this, this.level, chapter.player);
    this.twist = new TwistRunner(this, this.level, this.rng);
    this.itemHost = this.makeItemHost();
    this.shieldG = this.add.graphics().setDepth(21);
    this.fish = [...this.fish, ...this.twist.setup(this.player.sprite)];
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

    this.scene.launch('Hud', {
      levelName: this.level.name, player: chapter.player, touch: this.controls.touch,
      intro: describeLevel(this.level, {
        // A new chapter means a new fish to swim as.
        newPlayer: chapter.id > 1 && this.level.id.endsWith('-l1') ? PLAYER_FISH_NAMES[chapter.player] : undefined,
      }),
      dark: this.level.modifiers.dark ?? false,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('Hud'));
    this.emitHud();
  }

  /** Public so the HUD's touch button can trigger it. */
  dash(): void {
    if (this.ended || this.player.hooked) return;
    const dir = desiredDirection(this, this.controls, this.player);
    if (tryDash(this.player, dir, this.time.now)) this.burst(this.player.sprite.x, this.player.sprite.y, 5);
  }

  private zoomFor(size: number): number {
    const { width, height } = this.scale;
    return targetZoom(width, height, this.level.world.width, this.level.world.height, size, this.level.playerSizes[0]);
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const now = this.time.now;
    this.tickBoil(deltaMs);
    swayWeeds(this.weeds, this.twist.current, this.time.now);
    if (this.ended) {
      // The sea carries on while the ending plays; the player's sprite belongs to the death animation.
      this.updateFishes(now, dt);
      this.updateHazards(now, deltaMs, dt);
      return;
    }
    this.elapsedMs += deltaMs;

    if (!this.player.hooked) {
      movePlayer(this.player, desiredDirection(this, this.controls, this.player), this.level, now, dt, this.seabed.floorAt);
      this.drift(this.player.sprite, this.player.size, 0.85, dt);
    }
    this.hideout.update(this.player, now, deltaMs, dt, () => {
      this.floatText(this.player.sprite.x, this.player.sprite.y - 40, 'Spotted!', '#a3342b', 36);
    });
    renderPlayer(this.player, now, this.boilFrame, dt);
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, this.zoomFor(this.player.size), Math.min(1, dt * 2)));

    this.frenzy = drainFrenzy(this.frenzy, dt);
    this.updateFishes(now, dt);
    this.updateHazards(now, deltaMs, dt);
    this.updateItems(now, dt);
    this.drawShield();
    this.updateObjective(now);
    this.emitHud();
  }

  private tickBoil(deltaMs: number): void {
    this.boilClock += deltaMs;
    if (this.boilClock < 1000 / BOIL_FPS) return;
    this.boilClock = 0;
    this.boilFrame = (this.boilFrame + 1) % BOIL_FRAMES;
    for (const w of this.weeds) w.setTexture(weedKey(w.getData('kind') as 0 | 1 | 2, this.boilFrame));
  }

  private updateFishes(now: number, dt: number): void {
    const p = this.player;
    const view = { x: p.sprite.x, y: p.sprite.y, size: p.size, hidden: p.hidden };
    const camView = this.cameras.main.worldView;
    const floorAt = this.seabed.floorAt;
    const crawlers = this.fish.filter((f) => isCrawler(f.species)).length;
    for (let n = this.fish.length - crawlers; n < this.level.maxFish; n++) this.fish.push(spawnFish(this, this.level, p.size, camView, this.rng));
    if (this.level.bottom.length) {
      for (let n = crawlers; n < this.level.maxCrawlers; n++) this.fish.push(spawnCrawler(this, this.level, p.size, camView, floorAt, this.rng));
    }
    const sea = { ...this.level.world, floorAt };
    this.fish = this.fish.filter((f) => {
      const crawler = isCrawler(f.species);
      if (crawler) updateCrawler(f, view, floorAt, now, dt);
      else updateFish(f, view, sea, now, dt, this.decoy);
      // Knocked-out fish that nobody ate sink out of the story.
      if (f.state === 'dead' && now > f.stateUntil) {
        f.sprite.destroy();
        return false;
      }
      // Ordinary fish ride the current off the map and get replaced; goal fish stay in play.
      // Crawlers hold on to the seabed against the current.
      if (f.state !== 'hooked' && !crawler) this.drift(f.sprite, f.size, 0.7, dt, f.role !== 'normal');
      renderFish(f, p.size, this.boilFrame, dt);
      if (f.state !== 'hooked' && isOffWorld(f, this.level)) {
        f.sprite.destroy();
        return false;
      }
      // A fish on the line belongs to the angler now.
      // Hidden in cover: you can't be bitten, and you can't eat.
      if (this.ended || p.hooked || p.hidden || f.state === 'hooked') return true;
      if (!capsulesTouch(bodyOf(p.sprite, p.shape), bodyOf(f.sprite, f.species))) return true;
      const rel = relationTo(p.size, f.size);
      // Knocked out or shocked (and not much bigger than you): dinner, whatever its size.
      const shocked = f.state === 'stunned' && now < f.shockedUntil && f.role !== 'boss' && f.size <= p.size * TUNING.shockEdibleRatio;
      if (rel === 'prey' || f.state === 'dead' || shocked) {
        this.eat(f);
        return false;
      }
      // A stung predator can't bite back.
      if (rel === 'predator' && !isHelpless(f)) this.hurt(causeOfBite(f.species), f);
      else this.bump(f);
      return true;
    });
    this.huntPrey(now);
  }

  /** The food chain doesn't wait for the player: hunters snap up smaller fish they bump into. */
  private huntPrey(now: number): void {
    const eaten = new Set<Fish>();
    for (const hunter of this.fish) {
      if (isHelpless(hunter) || now < hunter.fullUntil || eaten.has(hunter)) continue;
      const prey = this.fish.find((f) =>
        f !== hunter && !eaten.has(f) && f.state !== 'hooked' && f.role === 'normal' && canHunt(hunter.species, hunter.size, f.size) &&
        capsulesTouch(bodyOf(hunter.sprite, hunter.species), bodyOf(f.sprite, f.species), 0.8));
      if (!prey) continue;
      eaten.add(prey);
      hunter.fullUntil = now + HUNT_COOLDOWN_MS;
      this.burst(prey.sprite.x, prey.sprite.y, 4);
      gulp(prey.sprite, mouthOf(hunter.sprite, hunter.size, hunter.turn));
    }
    if (eaten.size) this.fish = this.fish.filter((f) => !eaten.has(f));
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
    gulp(f.sprite, mouthOf(this.player.sprite, this.player.size, this.player.turn));
    this.player.chompAt = this.time.now;
    if (this.growth.tier > before) this.growUp();
    this.progress = {
      ...this.progress,
      grown: this.growth.complete,
      bounties: this.progress.bounties + (f.role === 'bounty' ? 1 : 0),
      bossEaten: this.progress.bossEaten || f.role === 'boss',
    };
    if (f.role === 'boss') this.floatText(f.sprite.x, f.sprite.y - f.size * 1.6, 'Giant eaten!', '#a3342b', 48);
    if (f.role === 'bounty' && this.level.objective.kind === 'bounty') {
      this.floatText(f.sprite.x, f.sprite.y - f.size * 1.6, `Marked ${this.progress.bounties}/${this.level.objective.count}`, '#a3342b', 36);
    }
  }

  /** The current pushes a swimmer sideways; `contain` keeps it inside the world's edges. */
  private drift(sprite: Phaser.GameObjects.Image, radius: number, strength: number, dt: number, contain = true): void {
    const c = this.twist.current;
    if (!c) return;
    const x = sprite.x + c * strength * dt;
    sprite.x = contain ? Phaser.Math.Clamp(x, radius, this.level.world.width - radius) : x;
  }

  /** Twist bookkeeping: drops, goal markers, the clock, and whether the level is decided. */
  private updateObjective(now: number): void {
    const goals = this.fish.filter((f) => f.role !== 'normal');
    this.twist.update(now, this.boilFrame, this.player, goals);
    const picked = this.player.hooked ? [] : this.twist.collect(this.player);
    for (const at of picked) {
      this.score += 150;
      this.burst(at.x, at.y, 6);
      if (this.level.objective.kind === 'collect') {
        this.floatText(at.x, at.y - 30, `${this.progress.collected + 1}/${this.level.objective.count}`, '#1f3f8a', 34);
      }
      this.progress = { ...this.progress, collected: this.progress.collected + 1 };
    }
    this.progress = { ...this.progress, seconds: this.elapsedMs / 1000 };
    const outcome = objectiveOutcome(this.level, this.progress);
    if (outcome === 'won') this.finish('win');
    else if (outcome === 'lost') this.die({ cause: 'timeout' });
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

  /** A bigger fish got you: lose a life, or the level if it was the last one. */
  private hurt(cause: DeathCause, by?: Fish): void {
    const p = this.player;
    const now = this.time.now;
    if (now < p.invulnerableUntil || this.ended) return;
    if (this.absorbHit(now)) return;
    this.lives -= 1;
    this.frenzy = initialFrenzy;
    this.cameras.main.shake(260, 0.01);
    if (this.lives <= 0) {
      this.die({ cause, killer: by?.species });
      if (cause === 'spiked') playSpiked(this, p, waterTop(p.size));
      else if (by) playEaten(this, p, by, { burst: (x, y, n) => this.burst(x, y, n) });
      return;
    }
    if (cause === 'spiked') spikeMarks(this, p.sprite.x, p.sprite.y, p.size);
    else this.burst(p.sprite.x, p.sprite.y, 14);
    this.floatText(p.sprite.x, p.sprite.y - 40, hitText(cause), '#a3342b', 40);
    p.invulnerableUntil = now + TUNING.invulnerableMs;
    p.sprite.setPosition(p.sprite.x, Math.max(160, p.sprite.y - 220));
  }

  /** Ends the level with a cause, announced where the player can see it. */
  private die(death: Death): void {
    this.death = death;
    const view = this.cameras.main.worldView;
    const p = this.player.sprite;
    const x = Phaser.Math.Clamp(p.x, view.left + 120, view.right - 120);
    const y = Phaser.Math.Clamp(p.y - 60, view.top + 80, view.bottom - 80);
    this.floatText(x, y, deathText(death).title, '#a3342b', 52);
    this.finish('lose');
  }

  private updateHazards(now: number, deltaMs: number, dt: number): void {
    const p = this.player;
    for (const j of this.jellies) {
      updateJelly(j, this.level, dt, this.boilFrame);
      j.sprite.x += this.twist.current * 0.5 * dt;
      if (!this.ended && !p.hooked && now > p.stunnedUntil + 600 && now > p.invulnerableUntil &&
        capsuleTouchesCircle(bodyOf(p.sprite, p.shape), j.sprite.x, j.sprite.y, j.radius, 0.8)) {
        p.stunnedUntil = now + TUNING.stunMs;
        this.floatText(p.sprite.x, p.sprite.y - 30, 'zzap!', '#6b3f99');
      }
      this.stingFish(j, now);
    }
    if (!this.ended && this.level.hazards.hookEverySec > 0 && this.elapsedMs > this.nextHookAt) {
      this.nextHookAt = this.elapsedMs + this.level.hazards.hookEverySec * 1000;
      this.hooks.push(spawnHook(this, this.level, p.sprite.x, p.sprite.y, this.rng));
    }
    this.hooks = this.hooks.filter((h) => {
      const alive = updateHook(h, deltaMs, this.boilFrame, this.twist.current);
      if (alive) this.biteHook(h, now);
      this.carry(h, now);
      if (!alive) this.landCatch(h);
      return alive;
    });
  }

  /** Jellyfish sting any fish that brushes them, not just the player. */
  private stingFish(j: Jelly, now: number): void {
    const view = this.cameras.main.worldView;
    for (const f of this.fish) {
      if (isHelpless(f) || !capsuleTouchesCircle(bodyOf(f.sprite, f.species), j.sprite.x, j.sprite.y, j.radius, 0.8)) continue;
      stunFish(f, now, TUNING.fishStunMs);
      if (view.contains(f.sprite.x, f.sprite.y)) this.floatText(f.sprite.x, f.sprite.y - f.size, 'zzap!', '#6b3f99', 22);
    }
  }

  /** An empty, lowered hook snags the first fish (or player) that touches the barb. */
  private biteHook(h: Hook, now: number): void {
    const tip = hookTip(h);
    if (!tip.active) return;
    const p = this.player;
    if (!this.ended && !p.hooked && now > p.invulnerableUntil &&
      capsuleTouchesCircle(bodyOf(p.sprite, p.shape), tip.x, tip.y, 12, 0.9)) {
      if (!this.absorbHit(now)) this.hookPlayer(h, now);
      return;
    }
    const fish = this.fish.find((f) => f.state !== 'hooked' && f.role === 'normal' && capsuleTouchesCircle(bodyOf(f.sprite, f.species), tip.x, tip.y, 12, 0.9));
    if (!fish) return;
    fish.state = 'hooked';
    hookCatch(h, fish.size);
    this.hookedFish.set(h, fish);
    this.burst(tip.x, tip.y, 4);
  }

  /** Whatever is on the hook rides up with it. */
  private carry(h: Hook, now: number): void {
    const fish = this.hookedFish.get(h);
    if (fish) {
      const pt = hangPoint(h, fish.size, fish.phase);
      fish.sprite.setPosition(pt.x, pt.y);
    }
    if (this.playerHook !== h) return;
    const p = this.player;
    const pt = hangPoint(h, p.size, now / 1000);
    p.sprite.setPosition(pt.x, pt.y);
    // With a life to spare the player thrashes free; with none they're hauled out of the water.
    if (this.lives > 0 && (now >= this.releaseAt || pt.y < waterTop(p.size) + p.size)) this.wriggleFree(h, now);
  }

  private hookPlayer(h: Hook, now: number): void {
    const p = this.player;
    hookCatch(h, p.size);
    this.playerHook = h;
    this.releaseAt = now + TUNING.hookStruggleMs;
    Object.assign(p, { hooked: true, vx: 0, vy: 0 });
    this.lives -= 1;
    this.frenzy = initialFrenzy;
    this.burst(p.sprite.x, p.sprite.y, 10);
    this.cameras.main.shake(220, 0.008);
    this.floatText(p.sprite.x, p.sprite.y - 40, hitText('hooked'), '#a3342b', 40);
  }

  private wriggleFree(h: Hook, now: number): void {
    const p = this.player;
    hookRelease(h);
    this.playerHook = null;
    Object.assign(p, { hooked: false, vx: 0, vy: 180, invulnerableUntil: now + TUNING.invulnerableMs });
    this.burst(p.sprite.x, p.sprite.y - p.size, 6);
    this.floatText(p.sprite.x, p.sprite.y - 40, 'Wriggled free!', '#1f3f8a', 32);
  }

  /** The hook left the water: its catch is gone for good. */
  private landCatch(h: Hook): void {
    const fish = this.hookedFish.get(h);
    if (fish) {
      fish.sprite.destroy();
      this.fish = this.fish.filter((f) => f !== fish);
      this.hookedFish.delete(h);
    }
    if (this.playerHook === h) {
      this.playerHook = null;
      this.player.sprite.setVisible(false);
      this.die({ cause: 'hooked' });
    }
    destroyHook(h);
  }

  /** Human-made things sinking through the water; eating one applies its effect. */
  private updateItems(now: number, dt: number): void {
    if (this.elapsedMs > this.nextItemAt) {
      this.nextItemAt = this.elapsedMs + TUNING.itemEverySec * 1000;
      const it = spawnItem(this, this.level, this.cameras.main.worldView, this.rng);
      if (it) this.items.push(it);
    }
    const p = this.player;
    this.items = this.items.filter((it) => {
      if (!updateItem(it, now, dt, this.boilFrame, this.seabed.floorAt)) return false;
      if (p.hooked || !capsuleTouchesCircle(bodyOf(p.sprite, p.shape), it.sprite.x, it.sprite.y, 22)) return true;
      this.burst(it.sprite.x, it.sprite.y, 5);
      it.sprite.destroy();
      applyItem(this.itemHost, it.kind, now);
      return false;
    });
  }

  /** What item effects may reach into; see game/itemEffects.ts. */
  private makeItemHost(): ItemHost {
    return {
      scene: this, level: this.level, rng: this.rng,
      player: () => this.player,
      fish: () => this.fish,
      addFish: (fish) => {
        this.fish = [...this.fish, ...fish];
      },
      addScore: (points) => {
        this.score += points;
      },
      loseGrowth: (share) => {
        const floor = this.growth.tier === 0 ? 0 : this.level.tiers[this.growth.tier - 1]!;
        this.growth = { ...this.growth, points: Math.max(floor, this.growth.points - this.level.tiers[2] * share) };
      },
      snag: () => this.hurt('snagged'),
      setDecoy: (d) => {
        this.decoy = d;
      },
      floatText: (x, y, text, color, size) => this.floatText(x, y, text, color, size),
      burst: (x, y, n) => this.burst(x, y, n),
    };
  }

  /** The tin can: a dashed silver ring around you while it lasts. */
  private drawShield(): void {
    const g = this.shieldG.clear();
    const p = this.player;
    if (!p.shield || !p.sprite.visible) return;
    const r = p.drawSize * 1.45;
    g.lineStyle(2, 0x8d939a, 0.85);
    for (let a = 0; a < Math.PI * 2; a += 0.5) g.beginPath().arc(p.sprite.x, p.sprite.y, r, a + this.time.now / 800, a + 0.3 + this.time.now / 800).strokePath();
  }

  /** The tin can takes a hit for you. Returns true if it did. */
  private absorbHit(now: number): boolean {
    const p = this.player;
    if (!p.shield) return false;
    p.shield = false;
    p.invulnerableUntil = now + 1200;
    this.burst(p.sprite.x, p.sprite.y, 8);
    this.floatText(p.sprite.x, p.sprite.y - 40, 'Clang!', '#4a463e', 40);
    return true;
  }

  private finish(kind: 'win' | 'lose'): void {
    if (this.ended) return;
    this.ended = true;
    this.emitHud();
    this.time.delayedCall(kind === 'win' ? 700 : 1900, () => {
      this.scene.pause();
      this.scene.launch('Result', {
        kind, levelIndex: this.levelIndex, score: this.score, seconds: this.elapsedMs / 1000,
        death: this.death ?? undefined, player: this.player.shape,
      });
    });
  }

  private emitHud(): void {
    const mult = frenzyMultiplier(this.frenzy);
    const now = this.time.now;
    const line = objectiveLine(this.level, this.progress);
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
      objective: line.text,
      urgent: line.urgent,
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
      const b = this.add.image(x, y, 'bubble').setDepth(30).setScale((0.6 + this.rng() * 0.8) / ART_RES);
      this.tweens.add({
        targets: b, x: x + (this.rng() - 0.5) * 90, y: y - 30 - this.rng() * 80, alpha: 0,
        duration: 600 + this.rng() * 500, ease: 'Sine.Out', onComplete: () => b.destroy(),
      });
    }
  }

}
