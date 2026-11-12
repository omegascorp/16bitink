import { mix, rgba } from '../../../src/art/wash';
import type { Pt } from '../sprites';
import { lengths } from '../pythonbear/python';
import { COBRA } from './cobraArt';
import { edges, type Lay, outline, strokeLine } from './lay';

/**
 * The king cobra reared, as photographs of it show (Wikimedia Commons, many
 * of Thailand's Kaeng Krachan and of Singapore's Sungei Buloh): a slim
 * column standing up off the coils, the small head held level on top, and
 * the hood no separate shield but the neck itself spread flat right behind
 * the head, long and narrow, tapering away down the column. It faces its
 * threat, so from the side what shows is its front: the pale cream-yellow
 * throat crossed by the broad belly plates, one band under another, turning
 * greyer down the column; at its back edge the olive-brown back with the
 * hood's rim dark.
 */

/** The hood along the neck, px from the head: where it starts to spread, where it is widest, where it has narrowed back into the neck. */
const HOOD = { from: 36, widest: 130, to: 400, spread: 0.85 } as const;
/** Below this the body lies on the mud: no throat face, the strip's own belly carries on. */
const GROUND_Y = 1400;
/** The strip's own belly, as a share of the width (cobraArt.ts BELLY_Y / SNAKE_W). */
const STRIP_BELLY = 0.275;

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** How far the hood is out at `s` px down the neck (0 .. 1). */
export function hoodAt(s: number): number {
  if (s <= HOOD.from || s >= HOOD.to) return 0;
  if (s < HOOD.widest) return Math.sin(((s - HOOD.from) / (HOOD.widest - HOOD.from)) * (Math.PI / 2)) ** 0.8;
  return 1 - smooth((s - HOOD.widest) / (HOOD.to - HOOD.widest));
}

/** The reared body with its hood spread by `spread` (0 .. 1): the neck widened in place. */
export function withHood(l: Lay, spread: number): Lay {
  const s = lengths(l.spine);
  return { ...l, widths: l.widths.map((w, i) => w * (1 + HOOD.spread * spread * hoodAt(s[i]!))) };
}

/** How much of the width the pale front shows at `s`, `y`: the strip's own belly on the mud, more up the column, most across the spread hood. */
function frontShare(s: number, y: number, spread: number): number {
  const up = 1 - smooth((y - (GROUND_Y - 160)) / 160);
  return STRIP_BELLY + (0.12 * up) + 0.3 * spread * hoodAt(s);
}

/**
 * The throat's front over the reared body: a pale face from the front edge
 * in, crossed by the belly plates (each a band edged darker, lit along its
 * top), the hood's back rim dark; drawn over the laid strip.
 */
export function drawThroat(ctx: CanvasRenderingContext2D, l: Lay, spread: number): void {
  const n = l.spine.findIndex((p, i) => i > 4 && p.y > GROUND_Y);
  const last = n < 0 ? l.spine.length : n;
  if (last < 3) return;
  const s = lengths(l.spine);
  const { a, b } = edges(l, 0.985);
  const inner: Pt[] = [];
  for (let i = 0; i < last; i++) {
    const k = frontShare(s[i]!, l.spine[i]!.y, spread);
    inner.push({ x: b[i]!.x + (a[i]!.x - b[i]!.x) * k, y: b[i]!.y + (a[i]!.y - b[i]!.y) * k });
  }
  const front = [...b.slice(0, last), ...[...inner].reverse()];
  ctx.save();
  ctx.beginPath();
  outline(l).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  // The hood's back rim, dark, along the back edge where it is spread.
  for (let i = 1; i < last; i++) {
    const h = hoodAt(s[i]!) * spread;
    if (h <= 0.05) continue;
    strokeLine(ctx, [a[i - 1]!, a[i]!], l.widths[i]! * 0.28 * h, '#1f1b0e', 0.55 * h);
  }
  // The pale face: cream-yellow at the throat, greyer down the column.
  const top = l.spine[0]!.y;
  const g = ctx.createLinearGradient(0, top, 0, GROUND_Y);
  g.addColorStop(0, COBRA.throat);
  g.addColorStop(0.35, '#e2d49c');
  g.addColorStop(0.75, '#c2b483');
  g.addColorStop(1, mix('#a99a62', '#6b6040', 0.3));
  ctx.beginPath();
  front.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  // The belly plates: one band under another, each edged darker underneath and lit along its top.
  ctx.save();
  ctx.clip();
  let next = 14;
  for (let i = 1; i < last; i++) {
    if (s[i]! < next) continue;
    next += 13;
    const p = b[i]!;
    const q = inner[i]!;
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + 3 };
    const bow = [p, mid, q];
    strokeLine(ctx, bow, 2.6, mix(COBRA.bandDeep, '#3a3220', 0.4), 0.6);
    strokeLine(ctx, bow.map((v) => ({ x: v.x, y: v.y + 3 })), 2, '#fff6d6', 0.28);
  }
  // The face turning away towards its back edge.
  strokeLine(ctx, inner, 10, rgba(COBRA.shadow, 1), 0.35);
  ctx.restore();
  strokeLine(ctx, inner, 2.4, COBRA.line, 0.65);
  ctx.restore();
}
