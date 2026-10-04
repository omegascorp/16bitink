import Phaser from 'phaser';
import { screenZoom } from '../hidpi';
import { SENSE, sensedPrey } from '../../logic/sense';
import type { Fish } from './fish';
import type { Player } from './player';

/** Electric blue: strong enough for the paper-pale shallows, bright enough for the dark. */
const SPARK = 0x3d9cf0;
/** How long the ripple takes to spread to the edge of the sense, ms. */
const RIPPLE_MS = 650;
/** Above the "lights out" darkness (36), with the goal markers. */
const DEPTH = 37;

interface Felt {
  readonly fish: Fish;
  readonly phase: number;
}

/**
 * The mako's electric sense, made visible: every so often a faint ripple
 * spreads from the shark, and the prey it could eat nearby flicker with
 * little sparks for a moment, through the dark and through cover. Prey that
 * is off screen gets a spark at the edge of the screen, pointing the way.
 */
export class SharkSense {
  private readonly g: Phaser.GameObjects.Graphics;
  private pulseAt = -Infinity;
  private felt: Felt[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH);
  }

  update(now: number, player: Player, fish: readonly Fish[]): void {
    const p = player.sprite;
    if (now - this.pulseAt >= SENSE.everyMs) {
      this.pulseAt = now;
      const live = fish.filter((f) => f.sprite.active && f.state !== 'hooked');
      const near = sensedPrey(
        { x: p.x, y: p.y, size: player.size },
        live.map((f) => ({ x: f.sprite.x, y: f.sprite.y, size: f.size, fish: f })),
      );
      this.felt = near.map((n, i) => ({ fish: n.fish, phase: i * 0.7 }));
    }
    const g = this.g.clear();
    const age = now - this.pulseAt;
    if (!p.visible) return;
    this.ripple(g, p.x, p.y, age);
    if (age > SENSE.showMs) return;
    const fade = 1 - age / SENSE.showMs;
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    for (const { fish, phase } of this.felt) {
      if (!fish.sprite.active) continue;
      const { x, y } = fish.sprite;
      if (view.contains(x, y)) this.sparks(g, x, y, fish.size, now / 140 + phase, fade);
      else this.edgeSpark(g, view, screenZoom(cam), x, y, fade);
    }
  }

  /** A thin ring spreading out to the edge of the sense, fading as it goes. */
  private ripple(g: Phaser.GameObjects.Graphics, x: number, y: number, age: number): void {
    if (age > RIPPLE_MS) return;
    const t = age / RIPPLE_MS;
    const r = SENSE.range * (1 - (1 - t) * (1 - t));
    g.lineStyle(2, SPARK, 0.35 * (1 - t));
    for (let a = 0; a < Math.PI * 2; a += 0.34) g.beginPath().arc(x, y, r, a, a + 0.2).strokePath();
  }

  /** Little zig-zag sparks crackling round a sensed fish. */
  private sparks(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, spin: number, fade: number): void {
    const r = size * 1.25 + 8;
    g.lineStyle(2.2, SPARK, 0.95 * fade);
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * Math.PI * 2;
      g.beginPath();
      for (let k = 0; k < 4; k++) {
        const along = r + k * 4;
        const jag = (k % 2 ? 1 : -1) * 2.4;
        const px = x + Math.cos(a) * along - Math.sin(a) * jag;
        const py = y + Math.sin(a) * along + Math.cos(a) * jag;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }
    g.lineStyle(1.2, SPARK, 0.5 * fade).strokeCircle(x, y, r);
  }

  /** A spark at the screen edge, towards sensed prey out of view. */
  private edgeSpark(g: Phaser.GameObjects.Graphics, view: Phaser.Geom.Rectangle, zoom: number, x: number, y: number, fade: number): void {
    const margin = 26 / zoom;
    const ex = Phaser.Math.Clamp(x, view.left + margin, view.right - margin);
    const ey = Phaser.Math.Clamp(y, view.top + 110 / zoom, view.bottom - margin);
    g.fillStyle(SPARK, 0.8 * fade).fillCircle(ex, ey, 4 / zoom);
    g.lineStyle(1.2 / zoom, SPARK, 0.45 * fade).strokeCircle(ex, ey, 9 / zoom);
  }
}
