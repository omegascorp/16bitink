import { createRng } from '../../../src/logic/rng';
import { makeCanvas } from '../../../src/art/pen';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { dwarfLabel, redDimAt, redFlareAt, shareLabel, starfieldAt, SUN } from './story';

/**
 * "Most stars are red dwarfs, dim and red": the camera pulls out from the
 * red sun into a field of stars, three in four of them small dim red ones
 * (red dwarfs are about three-quarters of the Milky Way's stars), the rest
 * bigger yellow and white. On "red dwarfs" the red ones flare; on "dim"
 * they sink to a dim glow.
 */
interface Star {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly colour: string;
  readonly red: boolean;
  readonly ph: number;
}

const BRIGHT = ['#fff4d6', '#ffe08a', '#dfe9ff', '#fff9ef'] as const;
/** The red sun, back where it was, among them. */
const HOME: Star = { x: SUN.x, y: SUN.y, r: 7, colour: '#ff5a36', red: true, ph: 0 };

export const STARS: readonly Star[] = (() => {
  const rng = createRng(4321);
  const out: Star[] = [HOME];
  while (out.length < 420) {
    const x = -300 + rng() * 1680;
    const y = -300 + rng() * 2500;
    if (Math.hypot(x - SUN.x, y - SUN.y) < 40) continue;
    // Three in four are red dwarfs.
    const red = out.length % 4 !== 0;
    out.push({
      x, y, red, ph: rng() * Math.PI * 2,
      r: red ? 2.6 + rng() * 2.2 : 3.2 + rng() * 3.8,
      colour: red ? (rng() < 0.5 ? '#ff5a3c' : '#e8442f') : BRIGHT[Math.floor(rng() * BRIGHT.length)]!,
    });
  }
  return out;
})();

/** A soft round glow, baked once and tinted by drawing it in each star's colour. */
function bakeHalo(colour: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, colour);
  g.addColorStop(0.25, colour.replace(')', ', 0.5)').replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

export interface Starfield {
  draw(ctx: CanvasRenderingContext2D, t: number): void;
}

export function makeStarfield(): Starfield {
  const redHalo = bakeHalo('rgb(255, 80, 50)');
  const whiteHalo = bakeHalo('rgb(255, 240, 210)');
  return {
    draw(ctx, t): void {
      const cam = starfieldAt(t);
      if (cam.alpha <= 0) return;
      const flare = redFlareAt(t);
      const dim = redDimAt(t);
      ctx.save();
      ctx.globalAlpha = cam.alpha;
      ctx.fillStyle = '#05040a';
      ctx.fillRect(0, 0, 1080, 1920);
      // Stars spread apart as the camera nears them but stay points; only the home star (the one we fly into) swells.
      const grow = cam.zoom ** 0.3;
      for (const s of STARS) {
        const x = SUN.x + (s.x - SUN.x) * cam.zoom;
        const y = SUN.y + (s.y - SUN.y) * cam.zoom;
        const r = s === STARS[0] ? s.r * cam.zoom : s.r * grow;
        if (x < -r * 6 || x > 1080 + r * 6 || y < -r * 6 || y > 1920 + r * 6) continue;
        const tw = 0.85 + 0.15 * Math.sin(t * 5 + s.ph);
        const k = s.red ? (1 + 1.2 * flare) * (1 - 0.25 * dim) : 1;
        const halo = r * (s.red ? 5 : 4.5) * k;
        ctx.globalAlpha = cam.alpha * (s.red ? 0.55 : 0.6) * tw * Math.min(1.4, k);
        ctx.drawImage(s.red ? redHalo : whiteHalo, x - halo, y - halo, halo * 2, halo * 2);
        ctx.globalAlpha = cam.alpha * (s.red ? 0.95 - 0.2 * dim : 1);
        ctx.fillStyle = s.colour;
        ctx.beginPath();
        ctx.arc(x, y, r * (s.red ? 0.75 + 0.25 * k : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      drawTextLine(ctx, 'red dwarfs', 540, 420, 120, 700, dwarfLabel(t) * cam.alpha, { fill: '#ff7a55', halo: PAPER_ON_DARK.halo });
      drawTextLine(ctx, 'about 3 in 4 stars', 540, 520, 70, 700, shareLabel(t) * cam.alpha, PAPER_ON_DARK);
    },
  };
}
