import Phaser from 'phaser';
import { makeCanvas } from '../../art/pen';
import { BLUE, HIGHLIGHT, RED } from '../../art/palette';
import { createRng, type Rng } from '../../logic/rng';

/** Ink colours of the confetti: ballpoint blue, red, highlighter, and the lagoon's turquoise. */
const INKS = [BLUE, RED, HIGHLIGHT, '#3fb3b3'] as const;
const SHAPES = ['blot', 'squiggle', 'star'] as const;
type Shape = (typeof SHAPES)[number];
/** Texture px per confetti piece, drawn at 2x for sharp edges. */
const PIECE = 32;
const GRAVITY = 820;
/** Share of speed kept per second: paper flutters, it doesn't fall like a stone. */
const DRAG = 0.35;
const LIFE = 3.2;
const MAX_PIECES = 160;

const key = (shape: Shape, ink: string): string => `confetti-${shape}-${ink}`;

function drawPiece(ctx: CanvasRenderingContext2D, shape: Shape, ink: string, rng: Rng): void {
  const c = PIECE / 2;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shape === 'blot') {
    // A splat: a lumpy drop and a couple of flecks.
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 7 + rng() * 3;
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.arc(c + (rng() - 0.5) * 24, c + (rng() - 0.5) * 24, 1.5 + rng() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === 'squiggle') {
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 4; x <= PIECE - 4; x += 2) ctx.lineTo(x, c + Math.sin(x * 0.5) * 4);
    ctx.stroke();
  } else {
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + i * ((Math.PI * 4) / 5);
      ctx.lineTo(c + Math.cos(a) * 11, c + Math.sin(a) * 11);
    }
    ctx.stroke();
  }
}

function bakeConfetti(scene: Phaser.Scene): void {
  const rng = createRng(77);
  for (const shape of SHAPES) {
    for (const ink of INKS) {
      if (scene.textures.exists(key(shape, ink))) continue;
      const { canvas, ctx } = makeCanvas(PIECE, PIECE);
      drawPiece(ctx, shape, ink, rng);
      scene.textures.addCanvas(key(shape, ink), canvas);
    }
  }
}

interface Piece {
  readonly img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  readonly spin: number;
  age: number;
}

/** Ink confetti: bursts that fly up and out, then flutter down and fade. */
export class Confetti {
  private readonly pieces: Piece[] = [];
  private readonly rng = createRng(2026);

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    bakeConfetti(scene);
  }

  /** Throws `count` pieces from (x, y), fanned upwards around `spread` radians. */
  burst(x: number, y: number, count: number, power = 620, spread = 1.3): void {
    const r = this.rng;
    for (let i = 0; i < count && this.pieces.length < MAX_PIECES; i++) {
      const shape = SHAPES[Math.floor(r() * SHAPES.length)]!;
      const ink = INKS[Math.floor(r() * INKS.length)]!;
      const angle = -Math.PI / 2 + (r() - 0.5) * spread * 2;
      const speed = power * (0.45 + r() * 0.65);
      const img = this.scene.add.image(x, y, key(shape, ink)).setScale(0.5 + r() * 0.5).setRotation(r() * Math.PI * 2).setDepth(this.depth);
      this.pieces.push({ img, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: (r() - 0.5) * 10, age: 0 });
    }
  }

  update(dt: number): void {
    const keep = Math.pow(DRAG, dt);
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i]!;
      p.age += dt;
      p.vx *= keep;
      p.vy = p.vy * keep + GRAVITY * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      p.img.rotation += p.spin * dt;
      // Fluttering: the piece turns edge-on and back as it falls.
      p.img.scaleY = p.img.scaleX * Math.abs(Math.cos(p.age * 6 + p.spin));
      p.img.setAlpha(Math.min(1, (LIFE - p.age) / 0.6));
      if (p.age >= LIFE) {
        p.img.destroy();
        this.pieces.splice(i, 1);
      }
    }
  }
}
