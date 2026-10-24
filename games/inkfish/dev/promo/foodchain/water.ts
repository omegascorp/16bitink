import { createRng } from '../../../src/logic/rng';
import { FRAME } from '../descent/frame';
import { makePaper } from '../descent/water';

/**
 * The water behind the climb: sunlit, plankton-green near the surface for
 * the small steps, deepening to open-ocean blue for the big ones (`tone`
 * 0 .. 1), on the game's sketchbook paper, with shafts of sunlight and
 * specks drifting past that show the zoom and the drift.
 */

const W = FRAME.width;
const H = FRAME.height;

type Rgb = readonly [number, number, number];

/** Top and bottom colours along the tone. */
const TONES: readonly (readonly [number, Rgb, Rgb])[] = [
  [0, [196, 226, 196], [128, 184, 160]],
  [0.35, [140, 200, 196], [70, 140, 160]],
  [0.65, [58, 128, 176], [26, 76, 130]],
  [1, [26, 74, 128], [10, 32, 70]],
];

function toneAt(tone: number): { top: Rgb; bottom: Rgb } {
  const t = Math.max(0, Math.min(1, tone));
  let i = 0;
  while (i < TONES.length - 2 && t > TONES[i + 1]![0]) i++;
  const [a, aTop, aBot] = TONES[i]!;
  const [b, bTop, bBot] = TONES[i + 1]!;
  const u = (t - a) / (b - a);
  const mix = (p: Rgb, q: Rgb): Rgb => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  return { top: mix(aTop, bTop), bottom: mix(aBot, bBot) };
}

const rgb = (c: Rgb, a = 1): string => `rgba(${c.map(Math.round).join(',')},${a})`;

/** How dark the water is behind the HUD (0 pale .. 1 deep): picks ink or paper text. */
export const darkOf = (tone: number): number => Math.max(0, Math.min(1, (tone - 0.45) / 0.3));

interface Speck {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly depth: number;
}

export interface Water {
  /** Fills the frame: `tone` 0 sunlit .. 1 deep, `drift` the camera's travel in screen widths (moves the specks), `zoom` its log zoom (grows them). */
  draw(ctx: CanvasRenderingContext2D, tone: number, drift: number, zoom: number, t: number): void;
}

export function createWater(): Water {
  const paper = makePaper();
  const rng = createRng(4242);
  const specks: Speck[] = Array.from({ length: 140 }, () => ({ x: rng(), y: rng(), r: 0.6 + rng() * 2.4, depth: 0.3 + rng() * 0.7 }));
  return {
    draw(ctx, tone, drift, zoom, t) {
      const { top, bottom } = toneAt(tone);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgb(top));
      g.addColorStop(1, rgb(bottom));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Paper grain through the wash.
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.22;
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
      // Sunlight: soft slanted shafts, fainter in deep water.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const light = 0.16 * (1 - 0.6 * tone);
      for (let i = 0; i < 7; i++) {
        const x0 = ((i * 331 + 120 + 40 * Math.sin(t * 0.13 + i)) % (W + 400)) - 200;
        const w = 70 + ((i * 53) % 90);
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(255,255,240,${light})`);
        grad.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + w, 0);
        ctx.lineTo(x0 + w + 260, H);
        ctx.lineTo(x0 + 260, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Specks: they stream outwards as the camera zooms out and slide as it drifts.
      ctx.save();
      ctx.fillStyle = tone > 0.5 ? 'rgba(220,235,255,0.55)' : 'rgba(255,255,245,0.6)';
      for (const s of specks) {
        // Zooming out pulls everything towards the centre: wrap the radial position by the zoom.
        const phase = (((zoom * 0.9 * s.depth) % 1) + 1) % 1;
        const k = 2 ** -phase;
        const sx = ((((s.x - drift * s.depth) % 1) + 1) % 1 - 0.5) * k * 2.2 + 0.5;
        const sy = (s.y - 0.5) * k * 2.2 + 0.5 + 0.01 * Math.sin(t * 0.4 + s.x * 9);
        if (sx < -0.05 || sx > 1.05 || sy < -0.05 || sy > 1.05) continue;
        ctx.globalAlpha = 0.25 + 0.5 * s.depth * (1 - Math.abs(phase - 0.5));
        ctx.beginPath();
        ctx.arc(sx * W, sy * H, s.r * (0.6 + k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
