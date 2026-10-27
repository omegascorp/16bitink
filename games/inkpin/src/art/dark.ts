import type { Room } from '../logic/level';

/**
 * Lights out: night inside the rooms (the jungle outside keeps its day),
 * with holes of light cut in it, redrawn each frame at a quarter of the
 * board's resolution (light is soft, so it needs no more).
 */

export const DARK_RES = 0.25;
const NIGHT = 'rgba(12, 11, 22, 0.94)';

export interface Light {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** How fully it lights (1 = clear). */
  readonly power: number;
}

export class DarkPainter {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rooms: Path2D;

  /** Covers the board area from (ox, oy), `bw` × `bh` board px; only the rooms go dark. */
  constructor(private readonly ox: number, private readonly oy: number, bw: number, bh: number, rooms: readonly Room[]) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.ceil(bw * DARK_RES);
    this.canvas.height = Math.ceil(bh * DARK_RES);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.rooms = new Path2D();
    for (const room of rooms) {
      room.forEach(([x, y], i) => {
        const px = (x - ox) * DARK_RES;
        const py = (y - oy) * DARK_RES;
        if (i === 0) this.rooms.moveTo(px, py);
        else this.rooms.lineTo(px, py);
      });
      this.rooms.closePath();
    }
  }

  paint(lights: readonly Light[]): void {
    const { ctx, canvas } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = NIGHT;
    ctx.fill(this.rooms);
    ctx.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const x = (l.x - this.ox) * DARK_RES;
      const y = (l.y - this.oy) * DARK_RES;
      const r = l.r * DARK_RES;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${l.power})`);
      g.addColorStop(0.55, `rgba(0,0,0,${l.power * 0.75})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}
