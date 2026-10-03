import Phaser from 'phaser';
import { DARK_HOLE, DARK_TEX } from '../../art/twistArt';
import { ART_RES, boilKey } from '../../art/textures';
import type { LevelDef } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { touches } from '../../logic/sizing';
import { spawnSpecial, type Fish } from './fish';
import type { Player } from './player';

interface Drop {
  readonly sprite: Phaser.GameObjects.Image;
  readonly baseY: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const RED = 0xa3342b;
const INK = 0x1b1a1f;
/** Goals are placed at least this far from where the player starts. */
const GOAL_DISTANCE = 650;

/**
 * Runs the parts of a level's twists that live in the world: ink drops,
 * marked fish and the giant, the red pencil markers and edge arrows that
 * point at them, current streaks, and the darkness around the player.
 */
export class TwistRunner {
  /** Sideways drift in world units per second, 0 when there is no current. */
  readonly current: number;
  private drops: Drop[] = [];
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly streaks: Phaser.GameObjects.Graphics | null;
  private readonly dark: Phaser.GameObjects.Image | null;

  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDef, private readonly rng: Rng) {
    this.current = level.modifiers.current ?? 0;
    this.marks = scene.add.graphics().setDepth(37);
    this.streaks = this.current ? scene.add.graphics().setDepth(3) : null;
    this.dark = level.modifiers.dark ? scene.add.image(0, 0, 'darkness').setDepth(36) : null;
  }

  /** Places the level's goals away from the player. Returns goal fish to add to the shoal. */
  setup(start: Point): Fish[] {
    const o = this.level.objective;
    if (o.kind === 'collect') this.drops = this.spread(o.count, start, 280).map((p) => this.makeDrop(p));
    if (o.kind === 'bounty') {
      return this.spread(o.count, start, 500).map((p) =>
        spawnSpecial(this.scene, o.species, Math.round(rangeOf(this.rng, o.size[0], o.size[1])), 'bounty', p.x, p.y, this.rng));
    }
    if (o.kind === 'boss') {
      const [p] = this.spread(1, start, 0);
      return [spawnSpecial(this.scene, o.species, o.size, 'boss', p!.x, p!.y, this.rng)];
    }
    return [];
  }

  /** Random points across the world, apart from each other and from the start. */
  private spread(count: number, start: Point, gap: number): Point[] {
    const { width, height } = this.level.world;
    const points: Point[] = [];
    for (let tries = 0; points.length < count && tries < count * 60; tries++) {
      const p = { x: rangeOf(this.rng, 160, width - 160), y: rangeOf(this.rng, 220, height - 240) };
      const loose = tries > count * 40;
      const farFromStart = Phaser.Math.Distance.BetweenPoints(p, start) > (loose ? GOAL_DISTANCE / 2 : GOAL_DISTANCE);
      if (farFromStart && points.every((q) => Phaser.Math.Distance.BetweenPoints(p, q) > (loose ? gap / 2 : gap))) points.push(p);
    }
    return points;
  }

  private makeDrop(p: Point): Drop {
    const sprite = this.scene.add.image(p.x, p.y, boilKey('drop', 0)).setDepth(13).setScale(0.8 / ART_RES);
    return { sprite, baseY: p.y };
  }

  /** Picks up drops the player touches; returns where each one was. */
  collect(player: Player): Point[] {
    const ps = player.sprite;
    const got = this.drops.filter((d) => touches(ps.x, ps.y, player.size, d.sprite.x, d.sprite.y, 18, 0.9));
    if (got.length === 0) return [];
    this.drops = this.drops.filter((d) => !got.includes(d));
    return got.map((d) => {
      const at = { x: d.sprite.x, y: d.sprite.y };
      this.scene.tweens.add({ targets: d.sprite, scale: 0, alpha: 0, duration: 220, ease: 'Back.In', onComplete: () => d.sprite.destroy() });
      return at;
    });
  }

  /** Per-frame drawing: drops bob, goals get rings and arrows, current streaks drift, darkness follows. */
  update(now: number, frame: number, player: Player, goals: readonly Fish[]): void {
    for (const d of this.drops) d.sprite.setY(d.baseY + Math.sin(now / 400 + d.baseY) * 6).setTexture(boilKey('drop', frame));
    const view = this.scene.cameras.main.worldView;
    const zoom = this.scene.cameras.main.zoom;
    this.marks.clear();
    for (const f of goals) this.ring(f, now);
    const targets: Point[] = [...this.drops.map((d) => d.sprite), ...goals.map((f) => f.sprite)];
    const ps = player.sprite;
    const nearest = targets
      .filter((t) => !view.contains(t.x, t.y))
      .sort((a, b) => Phaser.Math.Distance.BetweenPoints(a, ps) - Phaser.Math.Distance.BetweenPoints(b, ps))[0];
    if (nearest) this.arrow(view, zoom, nearest);
    if (this.streaks) this.drawStreaks(view, now);
    if (this.dark) {
      const radius = 150 + player.drawSize * 2.6;
      this.dark.setPosition(ps.x, ps.y).setScale(radius / (DARK_TEX * DARK_HOLE));
    }
  }

  /** A red pencil circle, dashes slowly turning, around a goal fish. */
  private ring(f: Fish, now: number): void {
    const r = f.size * 1.4 + 6;
    const spin = now / 900;
    const passes = f.role === 'boss' ? 2 : 1;
    for (let k = 0; k < passes; k++) {
      this.marks.lineStyle(2.2 - k * 0.8, RED, 0.85);
      for (let a = 0; a < Math.PI * 2; a += 0.45) {
        this.marks.beginPath().arc(f.sprite.x, f.sprite.y, r + k * 7, a + spin, a + spin + 0.28).strokePath();
      }
    }
  }

  /** A red arrowhead at the edge of the screen, pointing at the nearest goal off-screen. */
  private arrow(view: Phaser.Geom.Rectangle, zoom: number, target: Point): void {
    const cx = view.centerX;
    const cy = view.centerY;
    const dx = target.x - cx;
    const dy = target.y - cy;
    // Keep clear of the HUD along the top of the screen.
    const side = 42 / zoom;
    const top = 120 / zoom;
    const halfH = (view.height - side - top) / 2;
    const midY = view.top + top + halfH;
    const t = Math.min((view.width / 2 - side) / Math.abs(dx || 1e-6), halfH / Math.abs(target.y - midY || 1e-6));
    const x = cx + dx * t;
    const y = midY + (target.y - midY) * t;
    const a = Math.atan2(dy, dx);
    const s = 16 / zoom;
    const pt = (ang: number, len: number): Point => ({ x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len });
    const tip = pt(a, s);
    const l = pt(a + 2.5, s);
    const r = pt(a - 2.5, s);
    this.marks.fillStyle(RED, 0.9).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
    this.marks.lineStyle(1.4 / zoom, INK, 0.8).strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  }

  /** Faint "~>" pen marks drifting with the current so you can see which way it pulls. */
  private drawStreaks(view: Phaser.Geom.Rectangle, now: number): void {
    const g = this.streaks!.clear();
    const w = view.width + 240;
    const h = view.height + 240;
    const dir = Math.sign(this.current);
    g.lineStyle(1.3, INK, 0.22);
    for (let i = 0; i < 34; i++) {
      const bx = ((i * 7919) % 1000) / 1000;
      const by = ((i * 104729) % 997) / 997;
      const x = view.left - 120 + Phaser.Math.Wrap(bx * w + (now / 1000) * this.current * 1.6, 0, w);
      const y = view.top - 120 + by * h + Math.sin(now / 700 + i) * 6;
      g.beginPath().moveTo(x - 26 * dir, y);
      for (let k = 1; k <= 4; k++) g.lineTo(x - 26 * dir + k * 9 * dir, y + (k % 2 ? -3 : 3));
      g.strokePath();
      g.lineBetween(x + 10 * dir, y, x + 4 * dir, y - 4).lineBetween(x + 10 * dir, y, x + 4 * dir, y + 4);
    }
  }
}
