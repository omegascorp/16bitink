import Phaser from 'phaser';
import { BOIL, SAND_GRAIN } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { TilePos } from '../../logic/dig';
import { centre } from '../../logic/items';
import type { Beach } from '../../logic/sim';
import { movementOf } from '../../logic/species';
import { surfaceRow } from '../../logic/terrain';

/** A grain of sand in flight: sliding down a slope, or tossed and falling. */
interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly max: number;
  /** Slides along the surface towards a pit's bottom; otherwise ballistic. */
  readonly slide: boolean;
  /** Column a sliding grain stops at. */
  readonly stop: number;
}

const GRAIN_HEX = Phaser.Display.Color.HexStringToColor(SAND_GRAIN).color;
const GRAVITY = 520;
/** Most grains at once, so a big avalanche stays cheap. */
const MAX_GRAINS = 260;
/** Grains a second running down each pit's slopes while nothing disturbs it. */
const PIT_TRICKLE = 12;
/** Grains a second streaming from under a crab the slope is pulling. */
const PULLED_STREAM = 40;
/** Seconds between the antlion's flicks of sand at a crab in its pit. */
const FLICK_EVERY = 0.55;
/** Slide speed (px/s) of grains down a pit wall. */
const SLIDE = 42;

/**
 * What makes moving sand readable: grains and a puff of dust where dune
 * sand pours; in an antlion pit, grains forever trickling down the walls,
 * a stream of them (and dust) from under a crab that's sliding in, and
 * sand the antlion flicks up at it, as real antlions do.
 */
export class SandFxView {
  private readonly grains: Grain[] = [];
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly trickle: number[];
  private flickIn = 0;
  private dustIn = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly beach: Beach) {
    this.g = scene.add.graphics().setDepth(3.6);
    this.trickle = beach.pits.map(() => 0);
  }

  /** Dune sand that just ran: a few grains falling the way it went, and dust where it lands. */
  poured(pairs: readonly TilePos[]): void {
    const T = this.beach.tileSize;
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      const [fx, fy] = pairs[i]!;
      const [tx, ty] = pairs[i + 1]!;
      for (let k = 0; k < 2; k++) {
        this.add({
          x: (fx + 0.2 + Math.random() * 0.6) * T, y: (fy + Math.random()) * T,
          vx: (tx - fx) * 40 + (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40,
          life: 0, max: 0.35 + Math.random() * 0.2, slide: false, stop: 0,
        });
      }
      if (Math.random() < 0.18) this.dust((tx + 0.5) * T, ty * T, T * 0.9);
    }
  }

  update(dt: number, time: number): void {
    this.spawnPits(dt);
    this.step(dt);
    this.draw(time);
  }

  private spawnPits(dt: number): void {
    const b = this.beach;
    const T = b.tileSize;
    const crab = b.crab.body;
    const pull = b.pitPull(crab);
    b.pits.forEach(([col, reach], i) => {
      const bottom = surfaceRow(b.terrain, col);
      const rim = Math.min(surfaceRow(b.terrain, col - reach), surfaceRow(b.terrain, col + reach));
      if (bottom <= rim) return;
      // A steady trickle down both walls, so a pit always reads as running sand.
      this.trickle[i]! += dt * PIT_TRICKLE;
      for (; this.trickle[i]! >= 1; this.trickle[i]! -= 1) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.slider((col + 0.5 + side * (reach - Math.random() * reach * 0.5)) * T, col);
      }
    });
    if (pull === 0) return;
    // The crab is sliding in: sand streams from under its feet, with dust.
    const at = centre(crab);
    const pitCol = Math.floor(at.x / T) + Math.sign(pull) * 2;
    const target = b.pits.reduce((best, p) => (Math.abs(p[0] - pitCol) < Math.abs(best[0] - pitCol) ? p : best), b.pits[0]!)[0];
    for (let n = 0; n < Math.ceil(dt * PULLED_STREAM); n++) this.slider(at.x + (Math.random() - 0.5) * crab.w, target, SLIDE * 1.6);
    this.dustIn -= dt;
    if (this.dustIn <= 0) {
      this.dust(at.x - Math.sign(pull) * crab.w * 0.3, crab.y + crab.h, crab.w * 0.8);
      this.dustIn = 0.35;
    }
    // The antlion flicks sand up at it.
    this.flickIn -= dt;
    if (this.flickIn > 0) return;
    this.flickIn = FLICK_EVERY;
    for (const k of b.critters.values()) {
      if (movementOf(k.species) !== 'lurk' || Math.floor(centre(k).x / T) !== target) continue;
      const from = centre(k);
      for (let n = 0; n < 6; n++) {
        const aim = Math.sign(at.x - from.x) || 1;
        this.add({ x: from.x, y: k.y, vx: aim * (40 + Math.random() * 70), vy: -(150 + Math.random() * 90), life: 0, max: 0.9, slide: false, stop: 0 });
      }
    }
  }

  private slider(x: number, stop: number, speed = SLIDE): void {
    const T = this.beach.tileSize;
    const dir = (stop + 0.5) * T > x ? 1 : -1;
    this.add({ x, y: this.groundAt(x), vx: dir * speed * (0.7 + Math.random() * 0.6), vy: 0, life: 0, max: 3, slide: true, stop });
  }

  private add(gr: Grain): void {
    if (this.grains.length >= MAX_GRAINS) this.grains.shift();
    this.grains.push(gr);
  }

  /** A puff of sand dust, as the crab's digging makes. */
  private dust(x: number, y: number, size: number): void {
    const p = this.scene.add.image(x, y, TEX.puff(Math.floor(Math.random() * BOIL))).setDepth(3.7).setAlpha(0.7);
    p.setScale(size / p.width);
    this.scene.tweens.add({ targets: p, scale: (size * 1.6) / p.width, alpha: 0, y: y - size * 0.3, duration: 500, onComplete: () => p.destroy() });
  }

  /** The sand surface under world x, eased between columns so slides follow the slope. */
  private groundAt(x: number): number {
    const T = this.beach.tileSize;
    const t = this.beach.terrain;
    const c = x / T - 0.5;
    const c0 = Math.floor(c);
    const f = c - c0;
    return (surfaceRow(t, c0) * (1 - f) + surfaceRow(t, c0 + 1) * f) * T;
  }

  private step(dt: number): void {
    const T = this.beach.tileSize;
    for (let i = this.grains.length - 1; i >= 0; i--) {
      const gr = this.grains[i]!;
      gr.life += dt;
      if (gr.slide) {
        gr.x += gr.vx * dt;
        gr.y = this.groundAt(gr.x) - 1;
        const done = gr.vx > 0 ? gr.x >= (gr.stop + 0.5) * T : gr.x <= (gr.stop + 0.5) * T;
        if (done) gr.life = gr.max;
      } else {
        gr.vy += GRAVITY * dt;
        gr.x += gr.vx * dt;
        gr.y += gr.vy * dt;
      }
      if (gr.life >= gr.max) this.grains.splice(i, 1);
    }
  }

  private draw(time: number): void {
    const g = this.g.clear();
    for (const gr of this.grains) {
      const fade = 1 - (gr.life / gr.max) ** 3;
      g.lineStyle(gr.slide ? 1.4 : 1.5, GRAIN_HEX, fade);
      if (gr.slide) {
        // A short streak back up the slope it's running down.
        const bx = gr.x - Math.sign(gr.vx) * 4;
        const wob = Math.sin(time / 60 + gr.x) * 0.5;
        g.lineBetween(bx, this.groundAt(bx) - 1 + wob, gr.x, gr.y + wob);
        continue;
      }
      const sp = Math.hypot(gr.vx, gr.vy) || 1;
      g.lineBetween(gr.x, gr.y, gr.x - (gr.vx / sp) * 3.5, gr.y - (gr.vy / sp) * 3.5);
    }
  }
}
