import type { Rng } from '../logic/rng';
import { INK } from './palette';
import type { Pen, Pt } from './pen';
import { dabs, groundShade, strokes, type Dab } from './terrainBrush';
import { LEAF, ROCK } from './terrainGround';
import { mix } from './wash';

/**
 * A mountain on the map: a jagged massif of two or three summits in warm
 * dark stone. Each summit's face towards the light is lit and creased with
 * gullies; the face turned away is in deep hatched shadow, split from it by
 * a ridge; snow lies on the tallest; scrub and scree at its foot.
 */
interface Summit {
  readonly x: number;
  readonly h: number;
}

/** The ridgeline from left to right: the highest of the summits' slopes, roughened. */
function ridgeline(rng: Rng, base: Pt, half: number, summits: readonly Summit[], s: number): Pt[] {
  const n = 22;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const x = base.x - half + u * half * 2;
    const edge = Math.min(1, Math.min(u, 1 - u) * 5);
    const y = Math.max(...summits.map((p) => p.h * Math.max(0, 1 - (Math.abs(x - p.x) / (half * 0.9)) ** 0.85)));
    return { x, y: base.y + 2 - Math.max(0, (y + (rng() - 0.4) * 4 * s) * edge) };
  });
}

function fillPath(pen: Pen, pts: readonly Pt[], style: string | CanvasGradient, alpha: number): void {
  const { ctx } = pen;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.beginPath();
  pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** One summit's two faces, its ridge, its gullies and snow, clipped to the massif. */
function summitFaces(pen: Pen, rng: Rng, base: Pt, body: readonly Pt[], p: Summit, half: number, s: number): void {
  const top = { x: p.x, y: base.y + 2 - p.h };
  // The ridge from the summit down: it wanders a little right as it falls.
  const ridge = [top, { x: p.x + 1.5 * s, y: top.y + p.h * 0.3 }, { x: p.x + 1 * s, y: top.y + p.h * 0.6 }, { x: p.x + 4 * s, y: base.y + 3 }];
  const wide = half * 1.2;
  const shade = [...ridge, { x: p.x + wide, y: base.y + 3 }, { x: p.x + wide, y: top.y - 2 }];
  const lit = [...ridge, { x: p.x - wide, y: base.y + 3 }, { x: p.x - wide, y: top.y - 2 }];
  pen.clipped(body, () => {
    const g = pen.ctx.createLinearGradient(p.x - 8 * s, top.y, p.x, base.y);
    g.addColorStop(0, ROCK.lit);
    g.addColorStop(0.6, mix(ROCK.lit, ROCK.mid, 0.6));
    g.addColorStop(1, mix(ROCK.mid, ROCK.dark, 0.4));
    fillPath(pen, lit, g, 0.9);
    // Gullies down the lit face: narrow dark creases with a lit lip on their left.
    for (let i = 0; i < 4; i++) {
      const t = 0.15 + i * 0.2 + rng() * 0.08;
      const a = { x: p.x - p.h * t * 0.55, y: top.y + p.h * t };
      const len = (8 + rng() * 10) * s;
      const b = { x: a.x + len * 0.25, y: Math.min(base.y + 2, a.y + len) };
      fillPath(pen, [a, { x: a.x + 2.2 * s, y: a.y + len * 0.5 }, b, { x: a.x + 0.6 * s, y: a.y + len * 0.45 }], ROCK.dark, 0.6);
      strokes(pen.ctx, [[{ x: a.x - 0.8, y: a.y + 0.5 }, { x: b.x - 1.4, y: b.y - 0.5 }]], ROCK.lit, 0.45, 0.6);
    }
    fillPath(pen, shade, ROCK.dark, 0.95);
    pen.hatch(shade, 1.8, 1.05, 0.38, { color: ROCK.deep, alpha: 0.55 });
    // Spurs catching a little light inside the shadow.
    for (let i = 0; i < 2; i++) {
      const a = { x: p.x + (4 + i * 7) * s, y: top.y + p.h * (0.35 + i * 0.2) };
      strokes(pen.ctx, [[a, { x: a.x + 5 * s, y: a.y + 9 * s }]], ROCK.mid, 0.7, 1.2);
    }
    if (p.h > 40 * s) {
      const cap = [{ x: p.x - 8 * s, y: top.y + 10 * s }, { x: p.x - 3 * s, y: top.y + 3 * s }, top, { x: p.x + 4 * s, y: top.y + 5 * s }, { x: p.x + 7 * s, y: top.y + 9 * s }, { x: p.x + 3 * s, y: top.y + 8 * s }, { x: p.x + 0.5 * s, y: top.y + 12 * s }, { x: p.x - 2 * s, y: top.y + 8 * s }, { x: p.x - 5 * s, y: top.y + 12 * s }];
      fillPath(pen, cap, ROCK.snow, 0.9);
      fillPath(pen, [top, { x: p.x + 4 * s, y: top.y + 5 * s }, { x: p.x + 7 * s, y: top.y + 9 * s }, { x: p.x + 3 * s, y: top.y + 8 * s }, { x: p.x + 1.4 * s, y: top.y + 9 * s }, { x: p.x + 1.5 * s, y: top.y + 3 * s }], ROCK.snowShade, 0.95);
    }
  });
  pen.hair(ridge, 0.55, INK, 0.7);
}

/** Scrub at the foot: little dark bushes lit on top, and loose stones. */
function foot(pen: Pen, rng: Rng, base: Pt, half: number, s: number): void {
  const bushes: Dab[] = Array.from({ length: 4 }, () => ({ x: base.x - half * 0.85 + rng() * half * 1.7, y: base.y - rng() * 3 * s, rx: (2.4 + rng() * 2) * s, ry: (1.7 + rng()) * s }));
  const sprigs = bushes.flatMap((b) => [-1, 0, 1].map((k) => ({ x: b.x + k * b.rx * 0.55, y: b.y - Math.abs(k) * -0.4 * s - (k === 0 ? b.ry * 0.4 : 0), rx: b.rx * 0.55, ry: b.ry * 0.7 })));
  dabs(pen.ctx, sprigs.map((d) => ({ ...d, x: d.x + 0.5 * s, y: d.y + 0.6 * s })), LEAF.void, 1);
  dabs(pen.ctx, sprigs, LEAF.dark, 1);
  dabs(pen.ctx, sprigs.map((d) => ({ x: d.x - d.rx * 0.25, y: d.y - d.ry * 0.35, rx: d.rx * 0.55, ry: d.ry * 0.45 })), LEAF.mid, 0.9);
  const stones: Dab[] = Array.from({ length: 5 }, () => {
    const r = (0.8 + rng() * 1.2) * s;
    return { x: base.x - half + rng() * half * 2, y: base.y + 1 + rng() * 2 * s, rx: r * 1.3, ry: r };
  });
  dabs(pen.ctx, stones.map((d) => ({ ...d, x: d.x + 0.5, y: d.y + 0.5 })), ROCK.deep, 0.8);
  dabs(pen.ctx, stones, ROCK.mid, 1);
  dabs(pen.ctx, stones.map((d) => ({ x: d.x - d.rx * 0.3, y: d.y - d.ry * 0.3, rx: d.rx * 0.5, ry: d.ry * 0.45 })), ROCK.lit, 0.8);
}

export function drawMountain(pen: Pen, rng: Rng, base: Pt, tile: number, leftKin: boolean, rightKin: boolean): void {
  const s = tile / 48;
  const h = (36 + rng() * 18) * s;
  const half = (leftKin || rightKin ? 31 : 27) * s;
  const px = base.x + (rng() - 0.5) * 10 * s;
  const side = rng() < 0.5 ? -1 : 1;
  const summits: Summit[] = [
    { x: px + side * (12 + rng() * 5) * s, h: h * (0.55 + rng() * 0.15) },
    { x: px - side * (14 + rng() * 4) * s, h: h * (0.35 + rng() * 0.12) },
    { x: px, h },
  ];
  groundShade(pen.ctx, base.x + half * 0.3, base.y + 2, half * 1.1, 6 * s, '#0c0907', 0.55);
  const body = ridgeline(rng, base, half, summits, s);
  body.push({ x: base.x + half, y: base.y + 3 }, { x: base.x - half, y: base.y + 3 });
  fillPath(pen, body, ROCK.mid, 1);
  // Lower summits first: the highest stands in front of their shoulders.
  for (const p of summits) summitFaces(pen, rng, base, body, p, half, s);
  pen.clipped(body, () => groundShade(pen.ctx, base.x, base.y + 2, half * 1.2, 7 * s, ROCK.deep, 0.6));
  const ridge = body.slice(0, -2);
  pen.stroke(ridge.filter((q) => q.x <= px), 0.5, INK, 0.6, false);
  pen.stroke(ridge.filter((q) => q.x >= px), 0.8, INK, 0.85, false);
  foot(pen, rng, base, half, s);
}
