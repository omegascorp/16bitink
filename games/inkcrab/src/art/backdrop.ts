import { bezier, type Draw, pt } from './kit';
import type { Pt } from './pen';
import { PAPER_FILL } from './palette';

/**
 * The faraway beach behind a level, in three parallax layers drawn faintly
 * so the sand and creatures in front always read first. Each beach has its
 * own theme; layers tile horizontally (everything near an edge is drawn
 * again a width over).
 */
export type ThemeId = 'driftline';
export type LayerId = 'sky' | 'sea' | 'dunes';

/** World px across one tile of a layer. */
export const BACKDROP_W = 1024;

export interface LayerSpec {
  readonly id: LayerId;
  /** World px tall. */
  readonly height: number;
  /** How much of the camera's sideways motion it follows: far layers move least. */
  readonly scroll: number;
  /** Where its bottom sits, in world px above the beach's typical surface (negative: below), at BACKDROP_SCALE. */
  readonly lift: number;
  readonly draw: (d: Draw) => void;
}

/** Faint ink for distant things. */
const FAR = 0.5;
const SEA = '#cfe1e6';
const DUNE = '#efe3c2';
const GRASS = '#7f8f5e';
const HEADLAND = '#b9c2a6';

/** Draws `f` at x, and again a tile-width either side, so the layer wraps seamlessly. */
function wrapped(f: (dx: number) => void): void {
  for (const dx of [-BACKDROP_W, 0, BACKDROP_W]) f(dx);
}

/** A scalloped cumulus outline of `n` puffs. */
function cloud(d: Draw, x: number, y: number, w: number, n: number): void {
  const puffs: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = x - w / 2 + w * t;
    const r = (w / n) * (0.7 + 0.5 * Math.sin(t * Math.PI));
    for (let a = Math.PI; a <= Math.PI * 2.001; a += Math.PI / 6) puffs.push(pt(cx + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.55));
  }
  const base = [pt(x + w / 2 + 6, y), pt(x - w / 2 - 6, y)];
  d.pen.fill([...puffs, ...base], PAPER_FILL, 0.7);
  d.pen.stroke(puffs, 1.2, d.ink, FAR, false);
  d.pen.hair(base, 0.8, d.ink, FAR * 0.6);
}

function sky(d: Draw): void {
  const { pen } = d;
  wrapped((dx) => {
    pen.circle(780 + dx, 70, 24, 1.3, d.ink);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pen.hair([pt(780 + dx + Math.cos(a) * 32, 70 + Math.sin(a) * 32), pt(780 + dx + Math.cos(a) * 42, 70 + Math.sin(a) * 42)], 1, d.ink, FAR);
    }
    cloud(d, 140 + dx, 90, 150, 5);
    cloud(d, 470 + dx, 60, 110, 4);
    cloud(d, 640 + dx, 150, 90, 3);
    cloud(d, 960 + dx, 120, 130, 4);
  });
}

function sea(d: Draw): void {
  const { pen } = d;
  const horizon = 56;
  const H = 130;
  pen.fill([pt(-BACKDROP_W, horizon), pt(BACKDROP_W * 2, horizon), pt(BACKDROP_W * 2, H), pt(-BACKDROP_W, H)], SEA, 0.55);
  // Waves: short wavy dashes, closer together towards the shore.
  for (let row = 0; row < 7; row++) {
    const y = horizon + 6 + row * row * 1.6 + row * 4;
    for (let x = (row * 37) % 60; x < BACKDROP_W; x += 46 - row * 3) {
      wrapped((dx) => pen.hair(bezier(pt(x + dx, y), pt(x + dx + 6, y - 2), pt(x + dx + 12, y), 5), 0.8, d.ink, FAR * (0.4 + row * 0.08)));
    }
  }
  pen.hair([pt(0, horizon), pt(BACKDROP_W, horizon)], 1.1, d.ink, FAR);
  wrapped((dx) => {
    // A headland with a lighthouse.
    const hill = [pt(40 + dx, horizon), ...bezier(pt(40 + dx, horizon), pt(150 + dx, 4), pt(330 + dx, horizon), 16)];
    pen.fill(hill, HEADLAND, 0.6);
    pen.stroke(hill.slice(1), 1.2, d.ink, FAR, false);
    const lx = 176 + dx;
    const tower = [pt(lx - 5, 30), pt(lx + 5, 30), pt(lx + 3, 6), pt(lx - 3, 6)];
    pen.fill(tower, PAPER_FILL, 0.9);
    for (const y of [12, 20, 27]) pen.hair([pt(lx - 4.5, y), pt(lx + 4.5, y)], 1.6, d.ink, FAR * 0.8);
    pen.stroke([...tower, tower[0]!], 1, d.ink, FAR, false);
    pen.stroke([pt(lx - 4, 6), pt(lx, 0), pt(lx + 4, 6)], 1, d.ink, FAR, false);
    // A sailboat on the horizon.
    const bx = 640 + dx;
    pen.stroke([pt(bx - 12, horizon - 3), pt(bx + 12, horizon - 3), pt(bx + 8, horizon + 1), pt(bx - 9, horizon + 1)], 1, d.ink, FAR, false);
    pen.stroke([pt(bx, horizon - 4), pt(bx, horizon - 26), pt(bx + 11, horizon - 6), pt(bx, horizon - 6)], 1, d.ink, FAR, false);
  });
}

/** A tuft of marram grass: blades fanning up from one root. */
function grass(d: Draw, x: number, y: number, h: number): void {
  for (let i = -3; i <= 3; i++) {
    const lean = i * 3 + d.pen.jitter(2);
    d.pen.hair(bezier(pt(x + i, y), pt(x + i + lean * 0.4, y - h * 0.6), pt(x + i + lean, y - h - d.pen.jitter(3)), 6), 0.8, GRASS, 0.75);
  }
}

function dunes(d: Draw): void {
  const { pen } = d;
  const H = 170;
  const ridge = (x: number, phase: number, amp: number, base: number): number => base - amp * (0.5 + 0.5 * Math.sin((x / BACKDROP_W) * Math.PI * 2 * 2 + phase));
  for (const [phase, amp, base, alpha] of [[0.6, 50, 110, 0.35], [2.1, 40, 135, 0.6]] as const) {
    const top: Pt[] = [];
    for (let x = 0; x <= BACKDROP_W; x += 16) top.push(pt(x, ridge(x, phase, amp, base)));
    const shape = [...top, pt(BACKDROP_W, H), pt(0, H)];
    // Opaque paper first, so the sea behind never shows through a dune.
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, DUNE, alpha);
    pen.stroke(top, 1.2, d.ink, FAR * (alpha + 0.3), false);
    for (let x = 30; x < BACKDROP_W; x += 70 + ((x * 7) % 50)) grass(d, x, ridge(x, phase, amp, base) + 2, 10 + (x % 9));
  }
  // A snow fence wandering over the near dune.
  for (let x = 560; x < 820; x += 18) {
    const y = ridge(x, 2.1, 40, 135) + 4;
    pen.hair([pt(x, y), pt(x + 1, y - 14)], 1.1, d.ink, FAR);
  }
  // Fade out at the bottom, so nothing shows under the sand.
  const ctx = pen.ctx;
  const fade = ctx.createLinearGradient(0, H - 40, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(-BACKDROP_W, H - 40, BACKDROP_W * 3, 40);
  ctx.restore();
}

/** Layers are drawn at this share of their design size: far things stay small next to the crab. */
export const BACKDROP_SCALE = 0.5;

export const THEMES: Readonly<Record<ThemeId, readonly LayerSpec[]>> = {
  driftline: [
    { id: 'sky', height: 200, scroll: 0.08, lift: 120, draw: sky },
    { id: 'sea', height: 130, scroll: 0.2, lift: 30, draw: sea },
    { id: 'dunes', height: 170, scroll: 0.4, lift: -14, draw: dunes },
  ],
};
