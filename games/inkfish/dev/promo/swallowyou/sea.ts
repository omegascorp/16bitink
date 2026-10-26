import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../descent/water';
import { H, W } from './layout';

/**
 * The water behind each animal, on the game's sketchbook paper: Florida's
 * murky green for the grouper, tropical blue for the tiger shark, cold blue
 * for the great white, an estuary's brown-green for the crocodile, the
 * Arctic's green-black under ice for the Greenland shark, plankton-bright
 * water for the whale shark, Cape Cod's grey-green for the humpback, and the
 * black deep for the sperm whale. Shafts of light from above and drifting
 * specks that slide as the camera moves.
 */

export type Look = 'florida' | 'tropic' | 'cold' | 'estuary' | 'arctic' | 'plankton' | 'capecod' | 'deep' | 'paper' | 'night';

type Rgb = readonly [number, number, number];

interface Palette {
  readonly top: Rgb;
  readonly bottom: Rgb;
  /** Light shafts' strength, and the specks' colour. */
  readonly rays: number;
  readonly speck: string;
}

const PALETTES: Readonly<Record<Look, Palette>> = {
  florida: { top: [70, 118, 104], bottom: [14, 40, 38], rays: 0.14, speck: '220,235,210' },
  tropic: { top: [64, 160, 186], bottom: [14, 66, 108], rays: 0.18, speck: '230,250,255' },
  cold: { top: [58, 112, 158], bottom: [10, 30, 62], rays: 0.15, speck: '220,235,255' },
  estuary: { top: [110, 116, 74], bottom: [34, 40, 26], rays: 0.1, speck: '235,225,190' },
  arctic: { top: [36, 66, 70], bottom: [3, 10, 14], rays: 0.08, speck: '210,240,245' },
  plankton: { top: [96, 176, 160], bottom: [22, 86, 112], rays: 0.2, speck: '240,250,225' },
  capecod: { top: [92, 128, 108], bottom: [20, 44, 42], rays: 0.12, speck: '225,240,225' },
  deep: { top: [14, 22, 44], bottom: [1, 3, 9], rays: 0.03, speck: '190,210,240' },
  paper: { top: [236, 228, 208], bottom: [214, 204, 178], rays: 0, speck: '120,110,90' },
  night: { top: [24, 30, 48], bottom: [6, 8, 16], rays: 0.02, speck: '200,210,240' },
};

const rgb = (c: Rgb, a = 1): string => `rgba(${c.map(Math.round).join(',')},${a})`;

export interface Sea {
  /** Fills the frame with `look`; `pan` slides the specks (feet of camera travel, any unit), `zoom` grows them. */
  draw(ctx: CanvasRenderingContext2D, look: Look, t: number, pan?: number, zoom?: number): void;
  /** The paper's grain over the finished frame: it also breaks up the gradients' banding. */
  grain(ctx: CanvasRenderingContext2D, alpha: number): void;
}

export function createSea(): Sea {
  const paper = makePaper();
  const rng = createRng(31337);
  const specks = Array.from({ length: 160 }, () => ({ x: rng(), y: rng(), r: 0.6 + rng() * 2.6, depth: 0.3 + rng() * 0.7, ph: rng() * 6 }));
  return {
    grain(ctx, alpha) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
    },
    draw(ctx, look, t, pan = 0, zoom = 1) {
      const p = PALETTES[look];
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgb(p.top));
      g.addColorStop(1, rgb(p.bottom));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = look === 'paper' ? 0.9 : 0.24;
      ctx.drawImage(paper, 0, 0);
      ctx.restore();
      if (p.rays > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 8; i++) {
          const x0 = ((i * 297 + 90 + 50 * Math.sin(t * 0.17 + i)) % (W + 500)) - 250;
          const w = 60 + ((i * 61) % 110);
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, `rgba(255,255,235,${p.rays * (0.7 + 0.3 * Math.sin(t * 0.5 + i * 2))})`);
          grad.addColorStop(1, 'rgba(255,255,235,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 + w, 0);
          ctx.lineTo(x0 + w + 300, H);
          ctx.lineTo(x0 + 300, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (look === 'paper') return;
      ctx.save();
      ctx.fillStyle = `rgb(${p.speck})`;
      for (const s of specks) {
        const sx = ((((s.x - pan * 0.002 * s.depth + t * 0.004 * s.depth) % 1) + 1) % 1) * W;
        const sy = ((((s.y + t * 0.006 * (1 - s.depth) + 0.01 * Math.sin(t * 0.5 + s.ph)) % 1) + 1) % 1) * H;
        ctx.globalAlpha = 0.2 + 0.45 * s.depth;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * Math.min(3, Math.sqrt(zoom)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

/** A vignette: the frame's edges darkened. */
export function vignette(ctx: CanvasRenderingContext2D, strength: number, colour = '0,0,0'): void {
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, `rgba(${colour},0)`);
  g.addColorStop(1, `rgba(${colour},${Math.min(1, strength)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A colour laid over the whole frame with a blend mode. */
export function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
