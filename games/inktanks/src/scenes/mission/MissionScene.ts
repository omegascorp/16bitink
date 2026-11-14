import Phaser from 'phaser';
import type { Match } from '../../logic/match/match';
import type { Tank, TankInput } from '../../logic/match/types';
import { GroundStream, preloadGround } from '../../render/ground';
import { preloadFx, WorldFx } from '../../render/fx';
import { RotBank, textureMegabytes, type RotMode } from '../../render/rotBank';
import { preloadStructures, StructLayer } from '../../render/structView';
import { preloadParts, tankKeys, TankView } from '../../render/tankView';

/**
 * The mission scene: draws a Match and steps it at a fixed 60 Hz. The HUD,
 * controls and win/fail panel live in the DOM (see dev/mission.ts); this scene
 * only knows the match, the player's input and the camera.
 * The game (src/app) and dev/mission.ts both drive it.
 */
export interface MissionHooks {
  readonly input: (player: Tank) => TankInput;
  readonly onEvents: (events: ReturnType<Match['drainEvents']>) => void;
  readonly onFrame: (dt: number) => void;
  readonly onOver: () => void;
}

const STEP = 1 / 60;

export function preloadMission(scene: Phaser.Scene): void {
  preloadParts(scene);
  preloadGround(scene);
  preloadStructures(scene);
  preloadFx(scene);
}

export class MissionScene extends Phaser.Scene {
  private ground: GroundStream | undefined;
  private structs!: StructLayer;
  private fx!: WorldFx;
  readonly bank: RotBank;
  private readonly views = new Map<number, TankView>();
  private acc = 0;
  private ended = false;
  /** A follow target other than the player (the stress page spectates). */
  follow: Tank | null = null;

  constructor(readonly match: Match, private readonly hooks: MissionHooks, rot: RotMode, key = 'Mission') {
    super(key);
    this.bank = new RotBank(this, rot);
  }

  preload(): void {
    preloadMission(this);
  }

  create(): void {
    const m = this.match;
    this.ground = new GroundStream(this, m.land);
    this.structs = new StructLayer(this, m.structs);
    this.fx = new WorldFx(this);
    if (this.bank.mode === 'rot32') this.warmAll();
    this.cameras.main.setBounds(0, 0, m.land.width, m.land.height).setRoundPixels(true);
    this.centre();
    // In the game one Phaser instance outlives each mission: hand back the ground chunks' textures.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ground?.destroy();
      this.ground = undefined;
    });
  }

  /** Stops stepping the match (the pause menu); drawing goes on. */
  paused = false;

  /** RotSprite: precompute only the parts in this match. */
  warmAll(): void {
    for (const t of this.match.tanks) {
      const k = tankKeys(t, this.bank);
      for (const key of [...k.drive, k.hull, k.turret]) this.bank.warm(key);
    }
  }

  private centre(): void {
    const t = this.follow ?? this.match.player;
    if (!t) return;
    const cam = this.cameras.main;
    cam.centerOn(Math.round(t.x), Math.round(t.y));
  }

  toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * this.scale.width;
    const y = ((clientY - r.top) / r.height) * this.scale.height;
    const p = this.cameras.main.getWorldPoint(x, y);
    return { x: p.x, y: p.y };
  }

  /** A world point in CSS px on the page (for the HUD's edge arrow). */
  toScreen(x: number, y: number): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    const v = cam.worldView;
    return { x: r.left + ((x - v.x) / v.width) * r.width, y: r.top + ((y - v.y) / v.height) * r.height };
  }

  update(_time: number, deltaMs: number): void {
    const m = this.match;
    const dt = Math.min(0.1, deltaMs / 1000);
    if (!this.paused) this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 4) {
      const input = m.player ? this.hooks.input(m.player) : undefined;
      m.step(STEP, input);
      this.acc -= STEP;
      steps++;
    }
    if (steps === 4) this.acc = 0;
    const events = m.drainEvents();
    for (const e of events) this.fx.onEvent(e);
    this.hooks.onEvents(events);
    this.centre();
    const view = this.cameras.main.worldView;
    this.ground!.update(view);
    this.structs.update(view, m.player);
    this.fx.update(m, dt, view);
    this.drawTanks(view);
    this.hooks.onFrame(dt);
    if (m.over && !this.ended) {
      this.ended = true;
      this.hooks.onOver();
    }
  }

  private drawTanks(view: Phaser.Geom.Rectangle): void {
    for (const t of this.match.tanks) {
      const near = t.x > view.x - 120 && t.x < view.right + 120 && t.y > view.y - 120 && t.y < view.bottom + 120;
      let v = this.views.get(t.id);
      const wreck = !t.alive && t.role === 'bossTurret';
      if (!near || (!t.alive && !wreck)) {
        if (v) {
          v.destroy();
          this.views.delete(t.id);
        }
        continue;
      }
      if (!v) {
        v = new TankView(this, this.bank, !t.isPlayer);
        this.views.set(t.id, v);
      }
      v.update(t, t.parent === null ? undefined : this.match.tank(t.parent));
    }
  }

  stats(): { chunks: number; groundMB: number; rotMB: number; sheets: number; texMB: number; views: number } {
    if (!this.ground) return { chunks: 0, groundMB: 0, rotMB: 0, sheets: 0, texMB: 0, views: 0 };
    return {
      chunks: this.ground.count,
      groundMB: this.ground.bytes / 1048576,
      rotMB: this.bank.bytes / 1048576,
      sheets: this.bank.sheets,
      texMB: textureMegabytes(this),
      views: this.views.size,
    };
  }
}
