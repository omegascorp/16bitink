import Phaser from 'phaser';
import { getSound } from '../../host';
import { Snake } from '../../logic/snake';
import type { SnakeId } from '../../logic/species';
import { SnakeView } from '../game/snakeView';
import { pathPoint, type MapLayout } from './layout';

/** The snake on the map, this long, world px. */
const LENGTH = 150;
/** It waits with its head this far back down the trail from its level's nest. */
const WAIT_BEHIND = 70;
/** Slithering speed up the trail, world px/s; long trips are capped in time. */
const SPEED = 420;
const MAX_S = 2.4;
const STEP_EVERY_S = 0.28;
/** How finely the body is laid along the trail, world px. */
const LAY_STEP = 3;

/**
 * The snake waiting by the level it's up to, lying along the trail below
 * the nest, its tongue flicking; after a win it slithers up the trail to
 * the next level (the camera follows, see MenuScene).
 */
export class SnakeWalker {
  private readonly snake: Snake;
  private readonly view: SnakeView;
  private s: number;
  private walk: { from: number; to: number; t: number; dur: number; onDone: () => void } | null = null;
  private stepClock = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layout: MapLayout, nodeS: number, id: SnakeId, layer: Phaser.GameObjects.Layer) {
    this.s = nodeS - WAIT_BEHIND;
    const tail = Math.max(0, this.s - LENGTH);
    const at = pathPoint(layout, tail);
    this.snake = new Snake(id, at, this.headingAt(tail), LENGTH);
    // Laid along the trail up to where it waits.
    for (let d = tail; d <= this.s; d += LAY_STEP) this.snake.trail.moveHead(pathPoint(layout, d));
    this.snake.heading = this.headingAt(this.s);
    this.view = new SnakeView(scene, this.snake, layer);
  }

  /** Where the snake's head is now, world px. */
  get position(): { x: number; y: number } {
    return pathPoint(this.layout, this.s);
  }

  get walking(): boolean {
    return this.walk !== null;
  }

  /** Slithers up the trail to wait below the nest at `nodeS`. */
  walkTo(nodeS: number, onDone: () => void): void {
    const to = nodeS - WAIT_BEHIND;
    const dur = Math.max(0.4, Math.min(MAX_S, Math.abs(to - this.s) / SPEED));
    this.walk = { from: this.s, to, t: 0, dur, onDone };
  }

  update(time: number, dt: number): void {
    const w = this.walk;
    if (w) {
      w.t = Math.min(1, w.t + dt / w.dur);
      const k = w.t < 0.5 ? 2 * w.t * w.t : 1 - (-2 * w.t + 2) ** 2 / 2;
      const next = w.from + (w.to - w.from) * k;
      for (let d = this.s + LAY_STEP; d < next; d += LAY_STEP) this.snake.trail.moveHead(pathPoint(this.layout, d));
      this.s = next;
      this.snake.trail.moveHead(pathPoint(this.layout, this.s));
      this.snake.heading = this.headingAt(this.s);
      this.stepClock -= dt;
      if (this.stepClock <= 0) {
        this.stepClock = STEP_EVERY_S;
        getSound(this.scene)?.play('steps', { gain: 0.6 });
      }
      if (w.t >= 1) {
        this.walk = null;
        w.onDone();
      }
    }
    this.view.update(time, dt);
  }

  private headingAt(s: number): number {
    const p = pathPoint(this.layout, s);
    const q = pathPoint(this.layout, s + 12);
    return Math.atan2(q.y - p.y, q.x - p.x);
  }
}
