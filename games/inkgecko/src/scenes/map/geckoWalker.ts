import Phaser from 'phaser';
import { GECKO_RES } from '../../art/geckoArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { getSound } from '../../host';
import { pathPoint, type MapLayout } from './layout';

/** The gecko on the map, this long, world px. */
const LENGTH = 84;
/** It waits this far back down the path from its level's pocket. */
const WAIT_BEHIND = 88;
/** Walking speed up the path, world px/s; long walks are capped in time. */
const WALK_SPEED = 420;
const WALK_MAX_S = 2.4;
const STEP_EVERY_S = 0.3;

/**
 * The gecko waiting by the level it's up to, on the path below the pocket
 * and facing up it, breathing and glancing about; after a win it walks up
 * the groove to the next level (the camera follows, see MenuScene).
 */
export class GeckoWalker {
  readonly root: Phaser.GameObjects.Container;
  private readonly skin: Phaser.GameObjects.Image;
  private readonly lines: Phaser.GameObjects.Image;
  private s: number;
  private walk: { from: number; to: number; t: number; dur: number; onDone: () => void } | null = null;
  private stepClock = 0;
  private tint: number;
  private colour: Phaser.Display.Color;

  constructor(private readonly scene: Phaser.Scene, private readonly layout: MapLayout, nodeS: number, tint: number, layer: Phaser.GameObjects.Layer) {
    const scale = LENGTH / 160 / GECKO_RES * 1.4;
    this.skin = scene.add.image(0, 0, TEX.geckoSkin('idle', 0)).setScale(scale).setTint(tint);
    this.lines = scene.add.image(0, 0, TEX.geckoLines('idle', 0)).setScale(scale);
    this.root = scene.add.container(0, 0, [this.skin, this.lines]);
    this.tint = tint;
    this.colour = Phaser.Display.Color.IntegerToColor(tint);
    layer.add(this.root);
    this.s = nodeS - WAIT_BEHIND;
    this.place(0);
  }

  /** Where the gecko is now, world px. */
  get position(): { x: number; y: number } {
    return { x: this.root.x, y: this.root.y };
  }

  get walking(): boolean {
    return this.walk !== null;
  }

  /** Walks up the path to wait below the pocket at `nodeS`, its skin turning to `tint` on the way. */
  walkTo(nodeS: number, tint: number, onDone: () => void): void {
    const to = nodeS - WAIT_BEHIND;
    const dur = Math.max(0.4, Math.min(WALK_MAX_S, Math.abs(to - this.s) / WALK_SPEED));
    this.walk = { from: this.s, to, t: 0, dur, onDone };
    this.tint = tint;
  }

  update(time: number, dt: number): void {
    const w = this.walk;
    if (w) {
      w.t = Math.min(1, w.t + dt / w.dur);
      const k = w.t < 0.5 ? 2 * w.t * w.t : 1 - (-2 * w.t + 2) ** 2 / 2;
      this.s = w.from + (w.to - w.from) * k;
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
    // The skin eases towards its new colour.
    const want = Phaser.Display.Color.IntegerToColor(this.tint);
    const k = Math.min(1, dt * 3);
    this.colour = Phaser.Display.Color.ObjectToColor({
      r: this.colour.red + (want.red - this.colour.red) * k,
      g: this.colour.green + (want.green - this.colour.green) * k,
      b: this.colour.blue + (want.blue - this.colour.blue) * k,
    });
    this.skin.setTint(this.colour.color);
    this.place(time);
  }

  private place(time: number): void {
    const p = pathPoint(this.layout, this.s);
    const q = pathPoint(this.layout, this.s + 12);
    const heading = Math.atan2(q.y - p.y, q.x - p.x);
    // Idle: a slow look from side to side; walking: a waddle.
    const look = this.walk ? Math.sin(time / 90) * 0.12 : Math.sin(time / 1300) * 0.25;
    this.root.setPosition(p.x, p.y).setRotation(heading + Math.PI / 2 + look);
    const f = Math.floor(time / (this.walk ? 70 : 220)) % BOIL;
    this.skin.setTexture(TEX.geckoSkin('idle', f));
    this.lines.setTexture(TEX.geckoLines('idle', f));
    const breathe = this.walk ? 1 : 1 + Math.sin(time / 600) * 0.02;
    this.root.setScale(breathe);
  }
}
