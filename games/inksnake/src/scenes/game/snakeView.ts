import Phaser from 'phaser';
import { BOIL } from '../../art/palette';
import { snakeArt } from '../../art/snakes/index';
import { TEX } from '../../art/textures';
import { SNAKE_W, stripLength } from '../../art/types';
import type { Snake } from '../../logic/snake';
import type { Pt } from '../../logic/vec';

/** Most quads a body is drawn with: the longest snake the validator allows, plus room. */
const CAPACITY = 680;
/** The tail tapers over this share of the body, to this share of its width. */
const TAPER_FROM = 0.62;
const TIP = 0.12;
/** Where the snake's shadow falls, board px (light from the upper left). */
const SHADOW_OFF = { x: 3.5, y: 5 } as const;
const SHADOW_ALPHA = 0.2;
const SHADE = 'shade-px';
/** A gliding snake is drawn lifted this far off its shadow at full height, board px (as fliers are). */
const LIFT = { x: -18, y: -30 } as const;
/** The line boil, frames a second. */
const BOIL_FPS = 7;
/** The tongue flicks out this often, for this long, s. */
const TONGUE_EVERY = 1.7;
const TONGUE_FOR = 0.32;

/**
 * The player's snake: the body as one textured ribbon (a Mesh2D) laid along
 * the trail every frame, the strip's pattern wrapping every period; the tail
 * tapers and every lump swells it; a soft shadow under it; the head sprite
 * on top with its tongue flicking.
 */
export class SnakeView {
  private readonly body: Phaser.GameObjects.Mesh2D;
  private readonly shade: Phaser.GameObjects.Mesh2D;
  private readonly head: Phaser.GameObjects.Image;
  private readonly tongue: Phaser.GameObjects.Image;
  private readonly verts: number[];
  private readonly shadeVerts: number[];
  private readonly art: ReturnType<typeof snakeArt>;
  /** How long the mouth stays open after a gulp, s. */
  private gulp = 0;
  private tongueClock = 0.6;

  /** `layer`: where to draw it, if not straight on the scene (the map draws it in its world layer). */
  constructor(private readonly scene: Phaser.Scene, private readonly snake: Snake, layer?: Phaser.GameObjects.Layer) {
    this.art = snakeArt(snake.art);
    shadePixel(scene);
    this.verts = new Array<number>(CAPACITY * 16).fill(0);
    this.shadeVerts = new Array<number>(CAPACITY * 16).fill(0);
    const indices: number[] = [];
    for (let q = 0; q < CAPACITY; q++) {
      const v = q * 4;
      indices.push(v, v + 1, v + 2, 0, v + 1, v + 3, v + 2, 0);
    }
    this.shade = scene.add.mesh2d(0, 0, SHADE, this.shadeVerts, [...indices]).setDepth(3.4).setAlpha(SHADOW_ALPHA);
    this.body = scene.add.mesh2d(0, 0, TEX.strip(snake.art), this.verts, indices).setDepth(3.5);
    this.body.buildOrderedIndices(0, true);
    this.shade.buildOrderedIndices(0, true);
    this.tongue = scene.add.image(0, 0, TEX.tongue(snake.art, 0)).setDepth(3.55);
    this.head = scene.add.image(0, 0, TEX.head(snake.art, 'shut', 0)).setDepth(3.6);
    layer?.add([this.shade, this.body, this.tongue, this.head]);
  }

  /** A meal went down: the jaws open a moment. */
  gulped(): void {
    this.gulp = 0.18;
  }

  update(time: number, dt: number): void {
    const s = this.snake;
    const f = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    this.layBody();
    const k = s.width / SNAKE_W;
    const h = s.head;
    this.gulp = Math.max(0, this.gulp - dt);
    const pose = s.mode === 'swallow' || this.gulp > 0 ? 'open' : s.striking ? 'strike' : 'shut';
    this.head.setTexture(TEX.head(s.art, pose, f)).setPosition(h.x, h.y).setRotation(s.heading).setScale(k / this.art.head.res);
    // The tongue flicks now and then, and while it tastes the air on the hunt.
    this.tongueClock -= dt;
    if (this.tongueClock < -TONGUE_FOR) this.tongueClock = TONGUE_EVERY * (0.7 + Math.random() * 0.6);
    const out = this.tongueClock < 0 && pose === 'shut' && s.mode === 'move';
    const reach = this.art.snout * k;
    const wag = Math.sin(time / 28) * 0.18;
    this.tongue.setVisible(out).setTexture(TEX.tongue(s.art, f))
      .setPosition(h.x + Math.cos(s.heading) * reach, h.y + Math.sin(s.heading) * reach)
      .setRotation(s.heading + wag).setScale(k / this.art.tongue.res);
    // Blinking while it's safe after a hit; faint while buried or under water.
    const blink = s.safe > 0 && Math.floor(time / 90) % 2 === 0 ? 0.35 : 1;
    const veil = s.cloak === 'buried' ? 0.22 : s.cloak === 'submerged' ? 0.32 : 1;
    this.body.setAlpha(blink * veil);
    this.tongue.setAlpha(blink * veil);
    // The head peeks out of the sand or the water: only the eyes and snout show.
    this.head.setAlpha(blink * (veil < 1 ? 0.6 : 1));
    this.shade.setAlpha(SHADOW_ALPHA * blink * (veil < 1 ? 0 : 1 - s.alt * 0.5));
    // Playing dead: belly up, mouth open, tongue lolling.
    const bellyUp = s.cloak === 'dead' && this.scene.textures.exists(TEX.belly(s.art));
    const want = bellyUp ? TEX.belly(s.art) : TEX.strip(s.art);
    if (this.body.texture.key !== want) this.body.setTexture(want);
    if (s.cloak === 'dead') {
      this.head.setTexture(TEX.head(s.art, 'open', f)).setScale(k / this.art.head.res, -k / this.art.head.res);
      this.tongue.setVisible(true).setRotation(s.heading + 0.4);
    }
    const lift = s.alt;
    if (lift > 0) {
      this.head.setPosition(h.x + LIFT.x * lift, h.y + LIFT.y * lift).setScale((k * (1 + lift * 0.15)) / this.art.head.res);
      this.tongue.setVisible(false);
    }
  }

  /** Builds the ribbon's quads along the trail, and the shadow's under it. */
  private layBody(): void {
    const s = this.snake;
    const pts = s.trail.pts;
    const n = Math.min(s.trail.count, CAPACITY + 1);
    const base = s.width;
    const k = base / SNAKE_W;
    const period = this.art.period;
    const stripLen = stripLength(period);
    // Distance along the body of each sample, from the actual spacing (a squeezed coil bunches them).
    const along = new Array<number>(n);
    along[0] = 0;
    for (let i = 1; i < n; i++) along[i] = along[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    const total = Math.max(1, along[n - 1]!);
    const widths = along.map((d) => base * taper(d / total) + this.lumpAt(d, base));
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const half = widths[i]! / 2;
      const p = pts[i]!;
      left.push({ x: p.x + nx * half, y: p.y + ny * half });
      right.push({ x: p.x - nx * half, y: p.y - ny * half });
    }
    const v = this.verts;
    const sv = this.shadeVerts;
    // A gliding snake rises off its shadow (the strip's own lift; the head follows in update).
    const lift = { x: LIFT.x * s.alt, y: LIFT.y * s.alt };
    const texW = stripLen;
    let q = 0;
    for (let i = 0; i + 1 < n && q < CAPACITY; i++, q++) {
      // The pattern's place along the strip: wraps every period, never past the strip's spare quarter.
      const u0 = ((along[i]! / k) % period) / texW;
      const u1 = u0 + (along[i + 1]! - along[i]!) / k / texW;
      const o = q * 16;
      put(v, o, left[i]!, u0, 0);
      put(v, o + 4, right[i]!, u0, 1);
      put(v, o + 8, left[i + 1]!, u1, 0);
      put(v, o + 12, right[i + 1]!, u1, 1);
      for (let j = 0; j < 16; j += 4) {
        sv[o + j] = v[o + j]! + SHADOW_OFF.x;
        sv[o + j + 1] = v[o + j + 1]! + SHADOW_OFF.y;
        v[o + j] = v[o + j]! + lift.x;
        v[o + j + 1] = v[o + j + 1]! + lift.y;
        sv[o + j + 2] = 0.5;
        sv[o + j + 3] = 0.5;
      }
    }
    // Quads past the tail fold away to nothing.
    const tail = pts[n - 1]!;
    for (; q < CAPACITY; q++) {
      const o = q * 16;
      if (v[o] === tail.x && v[o + 1] === tail.y && v[o + 12] === tail.x) break;
      for (let j = 0; j < 16; j += 4) {
        v[o + j] = tail.x;
        v[o + j + 1] = tail.y;
        sv[o + j] = tail.x;
        sv[o + j + 1] = tail.y;
      }
    }
  }

  /** How much a lump swells the body `d` px back from the head. */
  private lumpAt(d: number, base: number): number {
    let extra = 0;
    for (const l of this.snake.lumps) {
      const reach = Math.max(l.size, base) * 1.15;
      const off = Math.abs(d - l.s);
      if (off >= reach) continue;
      const amp = Math.max(base * 0.32, l.size * 1.04 - base);
      const c = Math.cos((off / reach) * Math.PI * 0.5);
      extra = Math.max(extra, amp * c * c);
    }
    return extra;
  }

  setVisible(on: boolean): void {
    for (const o of [this.body, this.shade, this.head, this.tongue]) o.setVisible(on);
  }

  destroy(): void {
    for (const o of [this.body, this.shade, this.head, this.tongue]) o.destroy();
  }
}

/** Width share at `t` of the body's length (0 head .. 1 tail): full, then tapering smoothly to the tip. */
function taper(t: number): number {
  if (t <= TAPER_FROM) return 1;
  const x = (t - TAPER_FROM) / (1 - TAPER_FROM);
  const e = x * x * (3 - 2 * x);
  return 1 - (1 - TIP) * e;
}

function put(v: number[], o: number, p: Pt, u: number, w: number): void {
  v[o] = p.x;
  v[o + 1] = p.y;
  v[o + 2] = u;
  v[o + 3] = w;
}

/** A plain ink-blue texture, for the shadow. */
function shadePixel(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHADE)) return;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#26316a';
    ctx.fillRect(0, 0, 4, 4);
  }
  scene.textures.addImage(SHADE, c as unknown as HTMLImageElement);
}
