import Phaser from 'phaser';
import { CHAPTER_POSES } from '../../art/chapters/index';
import { CRITTER_ART, type CritterKind } from '../../art/critters/index';
import { BOIL } from '../../art/palette';
import { SHADOW_TEX_R, TEX } from '../../art/textures';
import type { SpriteArt } from '../../art/types';
import type { Enemy } from '../../logic/enemyTypes';
import { preySpec, type Prey } from '../../logic/prey';
import type { World } from '../../logic/world';

/** The line boil, frames a second. */
const BOIL_FPS = 7;
/** A flier this high is drawn lifted this far up and to the left of its shadow, board px. */
const LIFT = { x: -26, y: -44 } as const;
/** How much bigger a flier looks high up. */
const LIFT_SCALE = 0.22;
const DEPTH = { ground: 2.5, prey: 2.6, air: 6, shadow: 2.4 } as const;
/** How big each kind's shadow is, as a share of its frame (fliers cast a soft round one under them). */
const SHADOW_SIZE: Partial<Record<CritterKind, number>> = { crow: 0.3, hawk: 0.36, hen: 0.36, tomcat: 0.42, rat: 0.32, mouse: 0.3 };
const RED = 0xb3322b;

interface Shown {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image | null;
  readonly kind: CritterKind;
}

/**
 * Everything alive on the board but the snake: prey, enemies and the boss,
 * each a sprite whose pose follows what it's doing, in the line boil.
 * Things in the air are drawn lifted off their shadows. Marked prey (a
 * feast's) wears a red pencil ring.
 */
export class CrittersView {
  private readonly shown = new Map<number, Shown>();
  private readonly rings: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.rings = scene.add.graphics().setDepth(DEPTH.prey - 0.05);
  }

  update(world: World, time: number): void {
    const f = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    const seen = new Set<number>();
    this.rings.clear();
    for (const p of world.prey) {
      seen.add(p.id);
      this.drawPrey(p, f, time);
    }
    for (const e of world.enemies) {
      seen.add(e.id);
      this.drawEnemy(e, f, time);
    }
    if (world.boss) {
      seen.add(world.boss.id);
      this.drawEnemy(world.boss, f, time);
    }
    for (const [id, s] of this.shown) {
      if (seen.has(id)) continue;
      s.sprite.destroy();
      s.shadow?.destroy();
      this.shown.delete(id);
    }
  }

  /** The sprite (and shadow) showing critter `id`, made on first sight. */
  private get(id: number, kind: CritterKind, pose: string, f: number): Shown {
    let s = this.shown.get(id);
    if (!s) {
      const sprite = this.scene.add.image(0, 0, TEX.critter(kind, pose, f));
      const shadow = this.scene.add.image(0, 0, TEX.shadow).setDepth(DEPTH.shadow);
      s = { sprite, shadow, kind };
      this.shown.set(id, s);
    }
    return s;
  }

  private drawPrey(p: Prey, f: number, time: number): void {
    const art = CRITTER_ART[p.kind] as SpriteArt | undefined;
    if (!art) return;
    const pose = pickPose(art, CHAPTER_POSES[p.kind]?.({ mode: p.mode, age: p.timer, alt: p.alt, ...(p.data ? { data: p.data } : {}) }, time) ?? preyPose(p, time));
    const s = this.get(p.id, p.kind, pose, f);
    const shake = p.mode === 'caught' ? Math.sin(time / 22) * 1.6 : 0;
    const pop = p.mode === 'appear' ? 0.6 + 0.4 * p.shown : 1;
    const lift = p.alt;
    s.sprite.setTexture(TEX.critter(p.kind, pose, f)).setPosition(p.x + shake + LIFT.x * lift, p.y + LIFT.y * lift).setRotation(p.kind === 'egg' ? (p.id * 1.7) % 6.28 : p.heading)
      .setScale((pop * (1 + lift * LIFT_SCALE)) / art.res).setAlpha(p.mode === 'appear' ? p.shown : p.mode === 'hidden' ? 0 : 1).setDepth(lift > 0.08 ? DEPTH.air : DEPTH.prey);
    // A bitten one staggers, then lies asleep with a little z.
    if (p.mode === 'sleep') s.sprite.setRotation(p.heading + Math.sin(time / 600) * 0.05);
    this.shadowUnder(s, p.x, p.y, 0, art.frame, p.mode === 'appear' ? p.shown : 1);
    if (p.marked) {
      const r = preySpec(p.kind).size * 0.95 + 6;
      dottedRing(this.rings, p.x, p.y, r + Math.sin(time / 260) * 1.5, RED, 0.75, 1.6);
    }
  }

  private drawEnemy(e: Enemy, f: number, time: number): void {
    const kind = e.kind as CritterKind;
    const art = CRITTER_ART[kind] as SpriteArt | undefined;
    // Rival snakes are drawn by their own snake views.
    if (!art || 'snake' in e) return;
    const pose = pickPose(art, CHAPTER_POSES[kind]?.({ mode: e.mode, age: e.modeAge, alt: e.alt }, time) ?? enemyPose(e, time));
    const s = this.get(e.id, kind, pose, f);
    s.sprite.setVisible(!e.away);
    s.shadow?.setVisible(!e.away);
    if (e.away) return;
    const alt = e.alt;
    // The crouching cat's whole body quivers before it pounces.
    const wiggle = e.mode === 'crouch' ? Math.sin(time / 45) * 0.05 : 0;
    s.sprite.setTexture(TEX.critter(kind, pose, f))
      .setPosition(e.x + LIFT.x * alt, e.y + LIFT.y * alt)
      .setRotation(e.heading + wiggle)
      .setScale((1 + alt * LIFT_SCALE) / art.res)
      .setDepth(alt > 0.08 ? DEPTH.air : DEPTH.ground);
    this.shadowUnder(s, e.x, e.y, alt, art.frame, 1);
  }

  private shadowUnder(s: Shown, x: number, y: number, alt: number, frame: number, alpha: number): void {
    if (!s.shadow) return;
    const size = (SHADOW_SIZE[s.kind] ?? 0.3) * frame;
    s.shadow.setPosition(x + 3, y + 4).setScale((size * (1 - alt * 0.25)) / SHADOW_TEX_R, (size * 0.8 * (1 - alt * 0.25)) / SHADOW_TEX_R)
      .setAlpha(alpha * (0.55 - alt * 0.25));
  }

  destroy(): void {
    for (const s of this.shown.values()) {
      s.sprite.destroy();
      s.shadow?.destroy();
    }
    this.shown.clear();
    this.rings.destroy();
  }
}

/** Two legs' phases a second at a walk, more at a run. */
const step = (time: number, rate: number): 0 | 1 => (Math.floor((time / 1000) * rate) % 2 === 0 ? 0 : 1);

/** `want` if the art has that pose, else its first. */
function pickPose(art: SpriteArt, want: string): string {
  return art.poses.includes(want) ? want : art.poses[0]!;
}

function preyPose(p: Prey, time: number): string {
  if (p.kind === 'egg') return 'egg';
  if (p.kind === 'frog') return p.mode === 'hop' ? 'hop' : 'sit';
  if (p.mode === 'sleep') return 'sleep';
  if (p.mode === 'walk' || p.mode === 'flee' || p.mode === 'stagger') return `run${step(time + p.id * 97, p.mode === 'flee' ? 14 : 8)}`;
  return 'idle';
}

function enemyPose(e: Enemy, time: number): string {
  const m = e.mode;
  const t = time + e.id * 131;
  switch (e.kind) {
    case 'crow':
      if (m === 'fly' || m === 'flee') return `fly${step(t, 9)}`;
      if (m === 'peck') return 'peck';
      if (m === 'hop') return step(t, 4) ? 'hop' : 'stand';
      return 'stand';
    case 'hawk':
      if (m === 'dive') return 'stoop';
      if (m === 'ground') return 'ground';
      if (m === 'rise') return `flap${step(t, 7)}`;
      // Soaring, with a few wingbeats now and then.
      return Math.sin(t / 900) > 0.85 ? `flap${step(t, 6)}` : 'soar';
    case 'hen':
      if (m === 'peck') return 'peck';
      if (m === 'scared') return 'flap';
      return `walk${step(t, m === 'chase' ? 9 : 4)}`;
    case 'tomcat':
      if (m === 'crouch') return 'crouch';
      if (m === 'pounce') return 'leap';
      if (m === 'dazed') return 'dazed';
      if (m === 'startle') return 'startle';
      return `walk${step(t, m === 'retreat' ? 8 : 3)}`;
    default:
      return m;
  }
}

/** A dotted pencil ring. */
export function dottedRing(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, colour: number, alpha: number, dot: number): void {
  const n = Math.max(10, Math.round((r * Math.PI * 2) / (dot * 4.5)));
  g.fillStyle(colour, alpha);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, dot);
  }
}
