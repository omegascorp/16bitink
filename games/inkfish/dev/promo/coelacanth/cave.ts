import { halo } from '../../../src/art/glowArt';
import { Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { cubic, type Pt, pt } from './shape';
import { DECK_Y } from './story';

/**
 * The sea: water darkening from the sunlit surface (under the trawler) to
 * the deep, and at the bottom of the dive (camera 0) a cave in a rock wall,
 * its mouth black, an overhang above it and a ledge below, sea fans on the
 * rock. World coordinates of the sea; the cave is drawn once per boil frame.
 */
const W = VIDEO.width;
const H = VIDEO.height;
/** The sea's surface, world y: at the bottom of the trawler's picture. */
export const WATERLINE = DECK_Y + 1150;
/** Metres of depth to world y, so that the fish swims at about 200 m. */
const PX_PER_M = (720 - WATERLINE) / 200;
export const depthY = (m: number): number => WATERLINE + m * PX_PER_M;

/** The cave's mouth, world: an irregular opening on the left. */
const MOUTH: readonly Pt[] = [
  ...cubic(pt(-40, 470), pt(120, 400), pt(420, 380), pt(560, 520), 10),
  ...cubic(pt(560, 520), pt(640, 640), pt(640, 900), pt(560, 1010), 10).slice(1),
  ...cubic(pt(560, 1010), pt(430, 1110), pt(140, 1120), pt(-40, 1060), 10).slice(1),
];

/** The rock round it: overhang above, wall on the left, a ledge along the bottom. */
const ROCK: readonly Pt[] = [
  pt(-40, 150),
  ...cubic(pt(-40, 150), pt(160, 90), pt(420, 120), pt(620, 220), 10),
  ...cubic(pt(620, 220), pt(760, 290), pt(780, 380), pt(700, 470), 8).slice(1),
  ...cubic(pt(700, 470), pt(760, 640), pt(740, 900), pt(660, 1040), 10).slice(1),
  ...cubic(pt(660, 1040), pt(780, 1070), pt(920, 1030), pt(1120, 1050), 10).slice(1),
  pt(1120, H + 40),
  pt(-40, H + 40),
];

const water = (ctx: CanvasRenderingContext2D, camY: number): CanvasGradient => {
  const g = ctx.createLinearGradient(0, WATERLINE - camY, 0, H - camY);
  const at = (y: number): number => (y - WATERLINE) / (H - WATERLINE);
  g.addColorStop(0, '#a9c4c6');
  g.addColorStop(at(-1500), '#6f93a6');
  g.addColorStop(at(-900), '#33577a');
  g.addColorStop(at(-300), '#142648');
  g.addColorStop(at(400), '#0a1430');
  g.addColorStop(1, '#050912');
  return g;
};

/** The water at camera height camY. */
export function drawWater(ctx: CanvasRenderingContext2D, camY: number): void {
  ctx.fillStyle = water(ctx, camY);
  ctx.fillRect(0, 0, W, H);
  // Sunlight slanting down from the surface, fading with depth.
  const top = WATERLINE - camY;
  if (top > H || top + 1400 < 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, w, a] of [[160, 90, 0.07], [420, 150, 0.06], [700, 70, 0.08], [900, 120, 0.05]] as const) {
    const g = ctx.createLinearGradient(0, top, 0, top + 1300);
    g.addColorStop(0, `rgba(230,245,255,${a})`);
    g.addColorStop(1, 'rgba(230,245,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, top);
    ctx.lineTo(x + w + 380, top + 1300);
    ctx.lineTo(x + 220, top + 1300);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A sea fan: a branching chalk tree rooted on the rock. */
function seaFan(pen: Pen, root: Pt, height: number, lean: number, rng: () => number, colour: string): void {
  const grow = (p: Pt, a: number, len: number, depth: number): void => {
    const q = pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
    pen.hair([p, pt((p.x + q.x) / 2 + (rng() - 0.5) * 4, (p.y + q.y) / 2), q], Math.max(1, 4 - depth), colour, 0.75);
    if (depth >= 4) return;
    grow(q, a - 0.35 - rng() * 0.2, len * 0.72, depth + 1);
    grow(q, a + 0.3 + rng() * 0.2, len * 0.72, depth + 1);
  };
  grow(root, -Math.PI / 2 + lean, height * 0.32, 0);
}

function drawCaveFrame(ctx: CanvasRenderingContext2D, frame: number): void {
  const pen = new Pen(ctx, 1200 + frame * 977, 2);
  const rng = createRng(4);
  const path = (pts: readonly Pt[]): void => {
    ctx.beginPath();
    pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };
  // The rock: dark slate, lit from the upper right.
  path(ROCK);
  const rock = ctx.createLinearGradient(800, 200, 100, 1200);
  rock.addColorStop(0, '#2b3850');
  rock.addColorStop(0.5, '#1a2338');
  rock.addColorStop(1, '#0d1322');
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.save();
  path(ROCK);
  ctx.clip();
  pen.hatch(ROCK, 15, 2.3, 1.6, { color: '#05080f', alpha: 0.45 });
  // Boulders and ledges: rounded shapes with lit tops.
  for (let k = 0; k < 16; k++) {
    const x = rng() * W;
    const y = 150 + rng() * 1700;
    const r = 50 + rng() * 110;
    // Rounded on top, flatter underneath, lumpy.
    const lumps = Array.from({ length: 4 }, () => rng() * 6);
    const blob = Array.from({ length: 22 }, (_, j) => {
      const a = (j / 22) * Math.PI * 2;
      const k = 1 + 0.12 * Math.sin(a * 2 + lumps[0]!) + 0.08 * Math.sin(a * 3 + lumps[1]!) + 0.05 * Math.sin(a * 5 + lumps[2]!);
      const flat = Math.sin(a) > 0 ? 0.55 : 0.7;
      return pt(x + Math.cos(a) * r * k, y + Math.sin(a) * r * flat * k);
    });
    pen.fill(blob, '#202b42', 0.6);
    pen.stroke([...blob, blob[0]!], 3, '#05080f', 0.8, false);
    pen.hair(blob.slice(13, 20).map((p) => pt(p.x, p.y + 5)), 2.4, '#7f93b6', 0.35);
  }
  // Cracks in the rock.
  for (let k = 0; k < 14; k++) {
    let p = pt(rng() * W, 150 + rng() * 1700);
    const pts = [p];
    for (let s = 0; s < 5; s++) {
      p = pt(p.x + (rng() - 0.5) * 70, p.y + 20 + rng() * 40);
      pts.push(p);
    }
    pen.hair(pts, 2, '#04060c', 0.7);
  }
  ctx.restore();
  pen.stroke([...ROCK.slice(0, -2)], 5, '#04060c', 1, false);
  // The light catching the overhang's top and the ledge.
  pen.hair(ROCK.slice(1, 18).map((p) => pt(p.x, p.y + 6)), 3.2, '#9fb6d8', 0.45);
  pen.hair(ROCK.slice(30, 40).map((p) => pt(p.x, p.y + 6)), 3.2, '#9fb6d8', 0.4);
  // The mouth: black, deepening inwards, its rim inked.
  path(MOUTH);
  const deep = ctx.createRadialGradient(240, 760, 40, 280, 760, 420);
  deep.addColorStop(0, '#000000');
  deep.addColorStop(0.7, '#03050a');
  deep.addColorStop(1, '#0c1424');
  ctx.fillStyle = deep;
  ctx.fill();
  pen.stroke([...MOUTH], 6, '#020309', 1, false);
  pen.hair(MOUTH.slice(10, 22).map((p) => pt(p.x + 6, p.y)), 2.6, '#7f93b6', 0.4);
  // Sea fans on the rock.
  for (const [x, y, h, lean] of [[760, 1052, 230, 0.15], [960, 1040, 170, -0.2], [690, 300, 150, 0.6], [880, 1046, 120, 0.05]] as const) {
    seaFan(pen, pt(x, y), h, lean, rng, '#c9b48e');
  }
}

export interface Cave {
  draw(ctx: CanvasRenderingContext2D, camY: number, boil: number): void;
  /** Clips drawing to the cave's mouth (world, at camera height camY). */
  clipMouth(ctx: CanvasRenderingContext2D, camY: number): void;
}

export function makeCave(): Cave {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    drawCaveFrame(canvas.getContext('2d')!, f);
    return canvas;
  });
  return {
    draw(ctx, camY, boil): void {
      if (camY < -H) return;
      ctx.drawImage(frames[boil % frames.length]!, 0, -camY);
    },
    clipMouth(ctx, camY): void {
      ctx.beginPath();
      MOUTH.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y - camY) : ctx.lineTo(p.x, p.y - camY)));
      ctx.closePath();
      ctx.clip();
    },
  };
}

/** The deep's light: a pool round the fish, as from a submersible's lamp up to the right. */
export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number): void {
  if (strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(W + 100, 0, x, y);
  beam.addColorStop(0, `rgba(140,190,255,${0.1 * strength})`);
  beam.addColorStop(1, 'rgba(140,190,255,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(W + 60, 60);
  ctx.lineTo(W + 60, 520);
  ctx.lineTo(x - 300, y + 380);
  ctx.lineTo(x - 360, y - 260);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  halo(ctx, x + 60, y - 20, 640, '#4f86c8', 0.22 * strength);
}

/** The depth ruler down the left side during the dive, every 10 m, labelled every 50. */
export function drawRuler(ctx: CanvasRenderingContext2D, camY: number, alpha: number, label: (text: string, x: number, y: number, a: number) => void): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = '#e8eef5';
  ctx.lineCap = 'round';
  for (let m = 10; m <= 250; m += 10) {
    const y = depthY(m) - camY;
    if (y < -20 || y > H + 20) continue;
    const big = m % 50 === 0;
    // Only in the safe area, fading at its edges.
    const fade = Math.max(0, Math.min(1, (y - 280) / 80, (1240 - y) / 80));
    ctx.globalAlpha = alpha * (0.35 + 0.65 * fade) * (big ? 0.9 : 0.5);
    ctx.lineWidth = big ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(big ? 110 : 76, y);
    ctx.stroke();
    if (big && fade > 0) label(`${m} m`, 190, y + 22, alpha * fade);
  }
  ctx.restore();
}
