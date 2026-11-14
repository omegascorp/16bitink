import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import type { MatchEvent } from '../logic/match/types';
import blastUrl from '../art/pixel/world/fx/blast.png?url';
import bombUrl from '../art/pixel/world/fx/bomb.png?url';
import planeUrl from '../art/pixel/world/fx/plane.png?url';
import { WORLD_URLS } from './worldArt';

/**
 * Air raids and blasts (owner, Nov 14: "real air bombs falling instead of
 * just growing circles"). A bomber's shadow sweeps over each mark, the bomb
 * drops out of the sky onto it with its shadow closing in, and it lands as
 * the blast sheet; a bomb leaves a crater. Every other blast (rocket splash,
 * mines) plays the same sheet scaled to its radius, with no crater.
 */
const KEY = { blast: 'fx:blast', bomb: 'fx:bomb', plane: 'fx:plane', anim: 'fx:blast-play' } as const;
/** The blast sheet: 138×160 frames, the fireball centred at (69, 69), 14 frames of fire then smoke. */
const BLAST = { w: 138, h: 160, cx: 69, cy: 69, frames: 14, fps: 14, radius: 66 } as const;
const CRATERS = ['world:decals/crater1', 'world:decals/crater2', 'world:decals/crater3'] as const;
/** A blast this big is a bomb: it leaves a crater. */
const CRATER_MIN_R = 60;
/** Craters kept on the ground at once; the oldest fades out. */
const CRATER_MAX = 14;
/** The bomb is seen for this last part of the warning, falling from FALL_H px up. */
const FALL_T = 0.9;
const FALL_H = 420;
const BOMB_SCALE = 1.3;
/** The bomber flies over the mark as the bomb comes into view, high up: only its shadow is seen. */
const PLANE = { speed: 760, scale: 2.2, alpha: 0.26, life: 2.6 } as const;
const DEPTH = { crater: 10, bombShadow: 22, planeShadow: 5900, bomb: 7600, blast: 7550 } as const;

interface Pass {
  x: number;
  y: number;
  angle: number;
  /** Match time the shadow is over the mark. */
  over: number;
  img: Phaser.GameObjects.Image;
}

export function preloadBombs(scene: Phaser.Scene): void {
  scene.load.spritesheet(KEY.blast, blastUrl, { frameWidth: BLAST.w, frameHeight: BLAST.h });
  scene.load.image(KEY.bomb, bombUrl);
  scene.load.image(KEY.plane, planeUrl);
  for (const k of CRATERS) {
    const url = WORLD_URLS.get(k);
    if (url && !scene.textures.exists(k)) scene.load.image(k, url);
  }
}

export class BombLayer {
  private readonly bombs: Phaser.GameObjects.Image[] = [];
  private readonly shadows: Phaser.GameObjects.Image[] = [];
  private readonly craters: Phaser.GameObjects.Image[] = [];
  private passes: Pass[] = [];
  /** Marks seen, so each gets one pass. */
  private readonly seen = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.anims.exists(KEY.anim)) {
      scene.anims.create({ key: KEY.anim, frames: scene.anims.generateFrameNumbers(KEY.blast, { start: 0, end: BLAST.frames - 1 }), frameRate: BLAST.fps, repeat: 0 });
    }
  }

  onEvent(e: MatchEvent, now: number): void {
    if (e.kind === 'explode') this.blast(e.x, e.y, e.r);
    else if (e.kind === 'mark') this.pass(e.x, e.y, e.at - FALL_T, now);
  }

  update(m: Match): void {
    this.drawBombs(m);
    this.passes = this.passes.filter((p) => {
      const dt = m.t - p.over;
      if (Math.abs(dt) > PLANE.life / 2) {
        p.img.setVisible(false);
        if (dt > 0) p.img.destroy();
        return dt <= 0;
      }
      const d = dt * PLANE.speed;
      p.img.setVisible(true).setPosition(p.x + Math.cos(p.angle) * d, p.y + Math.sin(p.angle) * d);
      return true;
    });
  }

  /** The blast sheet at (x, y), sized to the radius; a bomb's leaves a crater. */
  private blast(x: number, y: number, r: number): void {
    const s = Math.max(0.4, r / BLAST.radius);
    const sp = this.scene.add.sprite(x, y, KEY.blast, 0).setOrigin(BLAST.cx / BLAST.w, BLAST.cy / BLAST.h).setScale(s).setDepth(DEPTH.blast + y * 1e-4);
    sp.play(KEY.anim);
    sp.once('animationcomplete', () => sp.destroy());
    if (r >= CRATER_MIN_R) this.crater(x, y, r);
  }

  private crater(x: number, y: number, r: number): void {
    const key = CRATERS[Math.abs(Math.round(x * 7 + y * 13)) % CRATERS.length]!;
    if (!this.scene.textures.exists(key)) return;
    const img = this.scene.add.image(x, y, key).setDepth(DEPTH.crater).setScale((r * 1.5) / 100).setRotation(((x + y) % 628) / 100);
    this.craters.push(img);
    if (this.craters.length > CRATER_MAX) {
      const old = this.craters.shift()!;
      this.scene.tweens.add({ targets: old, alpha: 0, duration: 800, onComplete: () => old.destroy() });
    }
  }

  /** A bomber's shadow crossing the mark at `over`, on a heading of its own. */
  private pass(x: number, y: number, over: number, now: number): void {
    const id = `${Math.round(x)}:${Math.round(y)}:${over.toFixed(2)}`;
    if (this.seen.has(id)) return;
    this.seen.add(id);
    const angle = -0.45 + (((Math.round(x) * 31 + Math.round(y) * 17) % 60) / 60 - 0.5) * 0.8;
    const img = this.scene.add.image(x, y, KEY.plane).setTint(0x000000).setAlpha(PLANE.alpha).setScale(PLANE.scale).setRotation(angle).setDepth(DEPTH.planeShadow).setVisible(false);
    this.passes.push({ x, y, angle, over: Math.max(over, now), img });
  }

  /** Each artillery mark's bomb, falling for the last FALL_T s, and its shadow closing in on the ground. */
  private drawBombs(m: Match): void {
    let i = 0;
    for (const k of m.objective.marks()) {
      if (k.kind !== 'artillery' || k.progress === undefined || !k.warn) continue;
      const left = (1 - k.progress) * k.warn;
      const q = 1 - left / FALL_T;
      const bomb = (this.bombs[i] ??= this.scene.add.image(0, 0, KEY.bomb).setDepth(DEPTH.bomb));
      const shadow = (this.shadows[i] ??= this.scene.add.image(0, 0, KEY.bomb).setTint(0x000000).setDepth(DEPTH.bombShadow));
      i++;
      if (q <= 0) {
        bomb.setVisible(false);
        shadow.setVisible(true).setPosition(k.x, k.y).setScale(0.35).setAlpha(0.12);
        continue;
      }
      const h = FALL_H * (1 - q * q);
      bomb.setVisible(true).setPosition(k.x, k.y - h).setScale(BOMB_SCALE).setRotation(Math.sin(m.t * 18 + k.x) * 0.06);
      shadow.setVisible(true).setPosition(k.x + h * 0.08, k.y + 4).setScale(0.35 + 0.65 * q).setAlpha(0.12 + 0.3 * q);
    }
    for (let j = i; j < this.bombs.length; j++) {
      this.bombs[j]!.setVisible(false);
      this.shadows[j]!.setVisible(false);
    }
  }

  destroy(): void {
    for (const o of [...this.bombs, ...this.shadows, ...this.craters, ...this.passes.map((p) => p.img)]) o.destroy();
  }
}
