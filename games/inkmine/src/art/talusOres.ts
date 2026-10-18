import type { Rng } from '../logic/rng';
import { dab, disc, inked, inside, line, lumpy, restShadow, TAU, type P } from './oreKit';
import { mix } from './paint';
import { INK } from './palette';

/**
 * Talus's ores (chapter 4), drawn the way each really grows, with the same
 * layered light as Brine's: hematite in round spherules (the "blueberries"
 * a rover found on Mars), gypsum as a desert rose of sand-crusted blades,
 * native sulfur in pointed yellow crystals, nitre as a white crust of
 * needles, and opal as a milky lump flashing colour. Centred on the
 * origin, fitting a glyph of radius `r` (oreArt.ts).
 */

/** A ball lit from the upper left: its body, a rim of light bounced off the rock, a sharp highlight. */
function ball(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, body: string, dark: string, shine: string): void {
  const pts: P[] = Array.from({ length: 20 }, (_, i) => [x + Math.cos((i / 20) * TAU) * s, y + Math.sin((i / 20) * TAU) * s]);
  inside(ctx, pts, () => {
    const g = ctx.createRadialGradient(x - s * 0.35, y - s * 0.4, s * 0.05, x, y, s * 1.15);
    g.addColorStop(0, shine);
    g.addColorStop(0.3, body);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    // Light bounced up into its foot from the rock.
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = mix(body, '#f0c8b0', 0.5);
    ctx.lineWidth = Math.max(0.4, s * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, s * 0.86, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  dab(ctx, x - s * 0.34, y - s * 0.38, s * 0.5, '#ffffff', 0.35);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.9;
  disc(ctx, x - s * 0.36, y - s * 0.4, s * 0.16, s * 0.1);
  ctx.fill();
  ctx.globalAlpha = 1;
  line(ctx, [...pts, pts[0]!], INK, 0.75, 0.8);
}

/** Hematite spherules: a cluster of small dark balls with a steel sheen, half sunk in the rock, red ochre dust caught round their feet. */
function spherules(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const balls = [
    { x: -0.42, y: 0.28, s: 0.3 },
    { x: 0.1, y: 0.36, s: 0.34 },
    { x: 0.56, y: 0.16, s: 0.24 },
    { x: -0.12, y: -0.22, s: 0.27 },
    { x: 0.38, y: -0.4, s: 0.2 },
  ];
  for (const b of balls) {
    const x = (b.x + (rng() - 0.5) * 0.08) * r;
    const y = (b.y + (rng() - 0.5) * 0.08) * r;
    const s = b.s * r;
    restShadow(ctx, x + s * 0.2, y + s * 0.8, s * 1.2);
    ball(ctx, x, y, s, color, '#1f1418', '#c7c9d6');
    // Ochre dust in the crease where it meets the rock.
    dab(ctx, x + s * 0.1, y + s * 0.85, s * 0.7, '#b8553a', 0.55);
  }
  // Loose red grains: the spherules weathering out of their rock.
  ctx.fillStyle = '#a8462e';
  for (let k = 0; k < 7; k++) {
    ctx.globalAlpha = 0.5 + rng() * 0.4;
    disc(ctx, (rng() - 0.5) * r * 1.6, r * (0.5 + rng() * 0.3), r * (0.03 + rng() * 0.03));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A blade of gypsum seen at a slant: a thin lens, lit along its upper edge. */
function blade(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, turn: number, color: string, lit: number): void {
  const pts: P[] = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * TAU;
    const px = Math.cos(a) * rx;
    const py = Math.sin(a) * ry;
    return [x + px * Math.cos(turn) - py * Math.sin(turn), y + px * Math.sin(turn) + py * Math.cos(turn)];
  });
  inked(ctx, pts, mix(color, '#8a6a4c', 0.35 * (1 - lit)), 0.75);
  inside(ctx, pts, () => {
    // The face catches the light across its middle; sand clings to the edge.
    dab(ctx, x - Math.sin(turn) * ry * 0.3, y - Math.cos(turn) * ry * 0.3, rx * 0.8, '#fff6e6', 0.25 + 0.35 * lit);
    dab(ctx, x + Math.sin(turn) * ry, y + Math.cos(turn) * ry, rx * 0.9, '#a5784e', 0.35);
  });
  // A crisp rim of light along the blade's top edge.
  const rim = pts.slice(10, 17);
  line(ctx, rim, '#fffaf0', Math.max(0.5, ry * 0.18), 0.55 + 0.35 * lit);
}

/** Gypsum as a desert rose: blades grown through sand into a rosette, back ones in shade, sand grains caught between them. */
function rosette(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  restShadow(ctx, r * 0.05, r * 0.62, r * 0.95);
  const blades = [
    { x: -0.3, y: -0.12, turn: -0.5, lit: 0.2 },
    { x: 0.32, y: -0.18, turn: 0.55, lit: 0.3 },
    { x: 0.02, y: -0.34, turn: 0.05, lit: 0.4 },
    { x: -0.38, y: 0.22, turn: 0.35, lit: 0.6 },
    { x: 0.4, y: 0.2, turn: -0.4, lit: 0.7 },
    { x: 0.0, y: 0.18, turn: -0.08, lit: 1 },
  ];
  for (const b of blades) blade(ctx, b.x * r, b.y * r, r * (0.44 + rng() * 0.08), r * (0.13 + rng() * 0.04), b.turn + (rng() - 0.5) * 0.2, color, b.lit);
  ctx.fillStyle = '#9b7350';
  for (let k = 0; k < 12; k++) {
    ctx.globalAlpha = 0.45 + rng() * 0.4;
    disc(ctx, (rng() - 0.5) * r * 1.4, (rng() - 0.3) * r * 1.1, r * (0.02 + rng() * 0.025));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A sulfur crystal: a pointed double pyramid, its lit face lemon, its shaded face amber, a resinous gleam on its top. */
function pyramid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tilt: number, color: string): void {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const at = (px: number, py: number): P => [x + px * c - py * s, y + px * s + py * c];
  const top = at(0, -h);
  const foot = at(0, h * 0.7);
  const left = at(-w, 0);
  const right = at(w, 0);
  const mid = at(w * 0.18, -h * 0.05);
  inked(ctx, [top, right, foot, left], color, 0.85);
  // The shaded faces: right of the ridge, and under the waist.
  inside(ctx, [top, right, foot, mid], () => {
    ctx.fillStyle = mix(color, '#b8741a', 0.55);
    ctx.globalAlpha = 0.65;
    ctx.fillRect(x - w * 2, y - h * 2, w * 4, h * 4);
    ctx.globalAlpha = 1;
  });
  inside(ctx, [left, mid, foot], () => dab(ctx, x, y + h * 0.4, w, '#8d4f12', 0.35));
  line(ctx, [top, mid, foot], INK, 0.5, 0.55);
  line(ctx, [left, mid, right], INK, 0.45, 0.4);
  // The gleam on the lit face, near the point.
  line(ctx, [at(-w * 0.25, -h * 0.62), at(-w * 0.55, -h * 0.12)], '#fffbe0', Math.max(0.5, w * 0.12), 0.8);
}

/** Native sulfur: a little druse of bright crystals on a crust of paler sulfur. */
function sulfur(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  const crust = lumpy(0, r * 0.42, r * 0.7, 6, rng, 0.42);
  restShadow(ctx, 0, r * 0.62, r * 0.9);
  inked(ctx, crust, mix(color, '#f1e7b0', 0.45), 0.8);
  pyramid(ctx, -r * 0.36, r * 0.02, r * 0.22, r * 0.46, -0.32, color);
  pyramid(ctx, r * 0.38, r * 0.06, r * 0.2, r * 0.4, 0.38, color);
  pyramid(ctx, r * 0.02, -r * 0.12, r * 0.28, r * 0.6, 0.04, color);
}

/** Nitre: a low white crust, tufted with fine needles, cool shadow in its hollows and a glitter of crystal faces. */
function crust(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  restShadow(ctx, 0, r * 0.5, r);
  const mound = lumpy(0, r * 0.18, r * 0.82, 8, rng, 0.62);
  inked(ctx, mound, color, 0.85);
  inside(ctx, mound, () => {
    dab(ctx, r * 0.35, r * 0.45, r * 0.7, '#7d8fb4', 0.4);
    dab(ctx, -r * 0.3, -r * 0.15, r * 0.6, '#ffffff', 0.5);
  });
  // Needle tufts standing out of the crust, fanning from their roots.
  for (let k = 0; k < 6; k++) {
    const rx = (rng() - 0.5) * r * 1.2;
    const ry = -r * (0.05 + rng() * 0.3);
    for (let n = 0; n < 4; n++) {
      const a = -Math.PI / 2 + (n - 1.5) * 0.32 + (rng() - 0.5) * 0.2;
      const len = r * (0.18 + rng() * 0.16);
      line(ctx, [[rx, ry], [rx + Math.cos(a) * len, ry + Math.sin(a) * len]], n % 2 ? '#ffffff' : INK, n % 2 ? 0.9 : 0.4, n % 2 ? 0.9 : 0.5);
    }
  }
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) {
    ctx.globalAlpha = 0.6 + rng() * 0.4;
    disc(ctx, (rng() - 0.5) * r * 1.3, (rng() - 0.4) * r * 0.9, r * 0.035);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The colours opal flashes, as the light catches each patch of its stacked spheres. */
const FIRE = ['#3fd6a0', '#4aa8ff', '#ff8a3d', '#e05ad0', '#b4ff5a', '#5ae8ff'] as const;

/** Opal: a smooth milky lump in a seam of brown ironstone, flashing patches of colour, with a glassy shine over it. */
function opal(ctx: CanvasRenderingContext2D, color: string, r: number, rng: Rng): void {
  // The ironstone it fills a crack in.
  const host = lumpy(0, r * 0.08, r * 0.92, 7, rng, 0.7);
  inked(ctx, host, '#7a4a32', 0.9);
  const gem: P[] = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * TAU;
    const q = 1 + Math.sin(a * 3 + rng() * 0.6) * 0.06;
    return [Math.cos(a) * r * 0.62 * q, r * 0.04 + Math.sin(a) * r * 0.4 * q];
  });
  inked(ctx, gem, color, 0.85);
  inside(ctx, gem, () => {
    // Play of colour: soft patches, each a different flash.
    for (let k = 0; k < 9; k++) {
      const px = (rng() - 0.5) * r * 1.1;
      const py = r * 0.04 + (rng() - 0.5) * r * 0.7;
      dab(ctx, px, py, r * (0.16 + rng() * 0.14), FIRE[k % FIRE.length]!, 0.55 + rng() * 0.3);
    }
    // Milky depth: the colour sits under a pale skin.
    dab(ctx, -r * 0.1, -r * 0.05, r * 0.7, '#f4fbff', 0.3);
    dab(ctx, r * 0.4, r * 0.3, r * 0.5, '#5a6a8c', 0.25);
  });
  // A glassy window of light.
  ctx.save();
  ctx.translate(-r * 0.28, -r * 0.14);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  disc(ctx, 0, 0, r * 0.18, r * 0.06);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export const TALUS_GLYPHS = { spherule: spherules, rosette, sulfur, crust, opal } as const;
