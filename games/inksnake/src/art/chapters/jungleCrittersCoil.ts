import { closed, type Draw, makeDraw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import { type Pt, withScratch } from '../pen';
import { SNAKE_W, type SnakeArt, type SpriteArt, stripLength } from '../types';
import { onLayer } from '../critters/tomcatKit';
import { JUNGLE_RIVALS } from './jungleRivals';

/**
 * A rival snake as a meal ('coil'): coiled up small and seen from above,
 * for the moment the king cobra swallows it; a rock python lies asleep from
 * venom like this. It is painted from the rival's own drawings (its body
 * strip laid slice by slice round a flat spiral, tail tip at the middle,
 * and its head resting at the outer end), so it always looks like the snake
 * it was on the board. `wide` is its body width, board px.
 */
const STRIP_RES = 3;
/** Board px between slices round the coil (each slice is drawn a little longer, so they overlap). */
const STEP = 0.6;

interface Coil {
  /** From the neck (0) round to the tail tip. */
  readonly spine: Pt[];
  readonly widths: number[];
  readonly shape: Pt[];
}

/** Two turns of a flat spiral, outer end at the neck, its rings just clear of each other. */
function coil(wide: number): Coil {
  const turns = 2;
  const gap = wide * 1.06;
  const r0 = wide * 0.55;
  const n = 180;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = -t * turns * Math.PI * 2;
    const r = r0 + gap * turns * (1 - t);
    return pt(Math.cos(a) * r, Math.sin(a) * r);
  });
  // Width along it: full at the neck, tapering through the inner turn to a fine tip.
  const widths = pts.map((_, i) => {
    const t = i / n;
    const k = t < 0.45 ? 1 : 1 - ((t - 0.45) / 0.55) ** 1.4 * 0.88;
    return wide * k;
  });
  const shape = ribbon(pts, (u) => widths[Math.round(u * n)]!).shape;
  return { spine: pts, widths, shape };
}

/** The rival's strip, laid round the spiral a slice at a time, its pattern scaled to the body's width there. */
function layStrip(d: Draw, art: SnakeArt, c: Coil): void {
  const len = stripLength(art.period);
  withScratch(Math.ceil(len * STRIP_RES), SNAKE_W * STRIP_RES, (sctx, strip) => {
    sctx.scale(STRIP_RES, STRIP_RES);
    art.drawStrip(makeDraw(sctx, 7101 + d.f, d.f, 0), len);
    const { ctx } = d.pen;
    let along = 0;
    let carry = 0;
    for (let i = 1; i < c.spine.length; i++) {
      const a = c.spine[i - 1]!;
      const b = c.spine[i]!;
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (let s = carry; s < seg; s += STEP) {
        const w = c.widths[i]!;
        const k = w / SNAKE_W;
        const x = ((along + s / k) % art.period + art.period) % art.period;
        ctx.save();
        ctx.translate(a.x + Math.cos(ang) * s, a.y + Math.sin(ang) * s);
        ctx.rotate(ang);
        ctx.scale(k, k);
        ctx.drawImage(strip, x * STRIP_RES, 0, Math.max(1, (STEP / k) * 2.2 * STRIP_RES), SNAKE_W * STRIP_RES, 0, -SNAKE_W / 2, (STEP / k) * 2.2, SNAKE_W);
        ctx.restore();
      }
      along += seg / c.widths[i]! * SNAKE_W;
      carry = (Math.ceil((seg - carry) / STEP) * STEP + carry) - seg;
    }
  });
}

/** The head at the outer end, turned on round the coil, its neck tucked over the body's start. */
function layHead(d: Draw, art: SnakeArt, c: Coil): void {
  const p0 = c.spine[0]!;
  const p1 = c.spine[3]!;
  const fwd = Math.atan2(p0.y - p1.y, p0.x - p1.x);
  const k = c.widths[0]! / SNAKE_W;
  const at = pt(p0.x + Math.cos(fwd) * (SNAKE_W / 2) * k, p0.y + Math.sin(fwd) * (SNAKE_W / 2) * k);
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(fwd + 0.25);
  ctx.scale(k, k);
  // Only the head: its own neck (drawn to meet a strip running straight back) is left to the coil.
  const f = art.head.frame / 2;
  ctx.beginPath();
  ctx.rect(-SNAKE_W / 2 - 1, -f, f + SNAKE_W / 2 + 1, f * 2);
  ctx.clip();
  art.head.draw(d, 'shut');
  ctx.restore();
}

/** A sleeper's tiny "z"s, drifting up from by its head. */
function snooze(d: Draw, at: Pt, size: number): void {
  for (const [dx, dy, k] of [[0, 0, 1], [size * 1.6, -size * 1.8, 0.75]] as const) {
    const s = size * k;
    const o = pt(at.x + dx, at.y + dy);
    const z = [pt(o.x - s, o.y - s), pt(o.x + s, o.y - s), pt(o.x - s, o.y + s), pt(o.x + s, o.y + s)];
    d.pen.hair(z, s * 0.5 + 0.2, PAPER_FILL, 0.9);
    d.pen.hair(z, s * 0.28, d.ink, 0.8);
  }
}

function drawCoil(d: Draw, art: SnakeArt, wide: number, asleep: boolean): void {
  const c = coil(wide);
  onLayer(d, (l) => l.pen.fill(c.shape.map((q) => pt(q.x + wide * 0.18, q.y + wide * 0.26)), d.ink, 1), 0.2, wide * 0.08);
  layStrip(d, art, c);
  // The rings round each other: a shadow where one turn meets the next, the outer edge inked.
  d.pen.clipped(c.shape, () => d.pen.crescent(c.shape, pt(-wide * 0.1, -wide * 0.14), () => d.pen.fill(c.shape, d.ink, 0.18)));
  d.pen.stroke(closed(c.shape), Math.max(0.5, wide * 0.05), d.ink, 0.75, false);
  layHead(d, art, c);
  if (asleep) snooze(d, pt(c.spine[0]!.x + wide * 0.6, c.spine[0]!.y - wide * 1.6), Math.max(1.4, wide * 0.12));
}

function coilArt(kind: string, wide: number, asleep: boolean): SpriteArt<'coil'> | undefined {
  const art = JUNGLE_RIVALS[kind];
  if (!art) return undefined;
  return { frame: Math.ceil(wide * 7.5), res: 2, poses: ['coil'], draw: (d) => drawCoil(d, art, wide, asleep) };
}

/** The rivals as meals, by kind (each only once its snake is painted). */
const MEALS: readonly (readonly [string, number, boolean])[] = [['ratsnake', 12, false], ['banded-krait', 14, false], ['big-krait', 20, false], ['rock-python', 28, true]];

export const JUNGLE_COILS: Readonly<Record<string, SpriteArt>> = Object.fromEntries(
  MEALS.flatMap(([kind, wide, asleep]) => {
    const art = coilArt(kind, wide, asleep);
    return art ? [[kind, art] as const] : [];
  }),
);
