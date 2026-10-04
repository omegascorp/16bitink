import Phaser from 'phaser';
import { screenZoom } from '../hidpi';
import { DARK_HOLE, DARK_TEX } from '../../art/twistArt';
import type { LevelDef } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { spawnSpecial, type Fish } from './fish';
import { InkBottles } from './inkBottles';
import type { Player } from './player';
import { bodyOf } from './swim';
import { TUNING } from './tuning';

interface Point {
  readonly x: number;
  readonly y: number;
}

const RED = 0xa3342b;
const INK = 0x1b1a1f;
/** Goals are placed at least this far from where the player starts. */
const GOAL_DISTANCE = 650;
/** Current marks: world tile size, marks per tile, lifetimes (s), speed as a multiple of the current. */
const FLOW = { tile: 300, perTile: 7, minLife: 2.2, maxLife: 4, speed: 1.6 } as const;

/** Stable pseudo-random 0..1 for a seed, no state. */
const hash = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Runs the parts of a level's twists that live in the world: ink bottles,
 * marked fish and the giant, the red pencil markers and edge arrows that
 * point at them, current streaks, and the darkness around the player.
 */
export class TwistRunner {
  /** Sideways drift in world units per second, 0 when there is no current. */
  readonly current: number;
  private bottles: InkBottles | null = null;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly streaks: Phaser.GameObjects.Graphics | null;
  private readonly dark: Phaser.GameObjects.Image | null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelDef,
    private readonly floorAt: (x: number) => number,
    private readonly rng: Rng,
  ) {
    this.current = level.modifiers.current ?? 0;
    this.marks = scene.add.graphics().setDepth(37);
    this.streaks = this.current ? scene.add.graphics().setDepth(3) : null;
    this.dark = level.modifiers.dark ? scene.add.image(0, 0, 'darkness').setDepth(36) : null;
  }

  /** Places the level's goals away from the player. Returns goal fish to add to the shoal. */
  setup(start: Point): Fish[] {
    const o = this.level.objective;
    if (o.kind === 'collect') this.bottles = new InkBottles(this.scene, o.count, this.level.world, this.floorAt, this.rng);
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

  /** Catches the ink bottles the player touches; returns where each one was. */
  collect(player: Player): Point[] {
    return this.bottles?.collect(bodyOf(player.sprite, player.shape)) ?? [];
  }

  /**
   * Per-frame: bottles sink, goals get rings and arrows, current streaks drift,
   * darkness follows. Returns where any bottle smashed on the seabed.
   */
  update(now: number, dt: number, frame: number, player: Player, goals: readonly Fish[]): Point[] {
    const smashed = this.bottles?.update(now, dt, frame, player.sprite.x, this.current) ?? [];
    const view = this.scene.cameras.main.worldView;
    const zoom = screenZoom(this.scene.cameras.main);
    this.marks.clear();
    for (const f of goals) this.ring(f, now);
    const targets: Point[] = [...(this.bottles?.targets ?? []), ...goals.map((f) => f.sprite)];
    const ps = player.sprite;
    const nearest = targets
      .filter((t) => !view.contains(t.x, t.y))
      .sort((a, b) => Phaser.Math.Distance.BetweenPoints(a, ps) - Phaser.Math.Distance.BetweenPoints(b, ps))[0];
    if (nearest) this.arrow(view, zoom, nearest);
    if (this.streaks) this.drawStreaks(view, now);
    if (this.dark) {
      const glow = now < player.glowUntil ? TUNING.glowFactor : 1;
      const radius = (150 + player.drawSize * 2.6) * glow;
      this.dark.setPosition(ps.x, ps.y).setScale(radius / (DARK_TEX * DARK_HOLE));
    }
    return smashed;
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

  /**
   * The current, made visible: wavy flow lines and specks of sea dust anchored
   * in the world (so they slide past as you swim), carried downstream faster
   * than you drift. Each one fades in, travels, fades out, and respawns somewhere
   * new in its tile, so nothing pops or repeats in step.
   */
  private drawStreaks(view: Phaser.Geom.Rectangle, now: number): void {
    const g = this.streaks!.clear();
    const t = now / 1000;
    const dir = Math.sign(this.current);
    const speed = Math.abs(this.current) * FLOW.speed;
    // Upstream tiles too: their streaks travel into view.
    const reach = speed * FLOW.maxLife;
    const left = dir > 0 ? view.left - reach : view.left - 120;
    const right = dir > 0 ? view.right + 120 : view.right + reach;
    for (let tx = Math.floor(left / FLOW.tile); tx <= Math.floor(right / FLOW.tile); tx++) {
      for (let ty = Math.floor((view.top - 60) / FLOW.tile); ty <= Math.floor((view.bottom + 60) / FLOW.tile); ty++) {
        for (let i = 0; i < FLOW.perTile; i++) this.flowMark(g, view, tx, ty, i, t, dir, speed);
      }
    }
  }

  private flowMark(g: Phaser.GameObjects.Graphics, view: Phaser.Geom.Rectangle, tx: number, ty: number, i: number, t: number, dir: number, speed: number): void {
    const seed = tx * 73.13 + ty * 191.7 + i * 12.97;
    const life = FLOW.minLife + hash(seed) * (FLOW.maxLife - FLOW.minLife);
    const clock = t + hash(seed + 1) * life;
    const cycle = Math.floor(clock / life);
    const age = clock - cycle * life;
    const r = (k: number): number => hash(seed + cycle * 31.7 + k);
    const x = (tx + r(2)) * FLOW.tile + dir * speed * age;
    const y = (ty + r(3)) * FLOW.tile + Math.sin(t * 1.3 + seed) * 8;
    if (x < view.left - 140 || x > view.right + 140 || y < view.top - 40 || y > view.bottom + 40) return;
    const fade = Math.sin(Math.PI * (age / life));
    if (i % 3 === 2) {
      // Sea dust: a speck tumbling along.
      g.fillStyle(INK, 0.3 * fade).fillCircle(x, y, 1.2 + r(4) * 1.4);
      return;
    }
    // A flow line: one long, shallow swell, tapered evenly at both ends (no
    // heavy head and no wiggling tail), its curve rolling slowly downstream.
    const len = 90 + r(4) * 110;
    const amp = 2 + r(5) * 2.5;
    const steps = 12;
    let px = x;
    let py = y + Math.sin(-t * 1.6 + seed) * amp;
    for (let k = 1; k <= steps; k++) {
      const s = k / steps;
      const nx = x - dir * len * s;
      const ny = y + Math.sin(s * Math.PI * 1.2 - t * 1.6 + seed) * amp;
      const body = Math.sin(Math.PI * (s - 0.5 / steps));
      g.lineStyle(0.6 + body * 0.9, INK, 0.3 * fade * body).lineBetween(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }
}
