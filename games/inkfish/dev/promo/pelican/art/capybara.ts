import { CAPY_HEAD, type CapybaraPose, type Pt } from '../rig';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { fillShape, inkLine, seeded, unitPx, within } from './ink';

/**
 * The capybara in profile, lying low on the grass like a loaf, painted to the
 * bar of ../../seal/art/capeFurSeal.ts: a long barrel body with no tail and
 * the legs tucked under (one front paw peeking out), a big blunt box of a head
 * about a third of the body's length with a deep square muzzle, a dark nose
 * and a slit nostril at the front, a tiny round ear and a small glossy eye
 * set high near the top line under a heavy, half-shut lid (the famous
 * deadpan). Coarse reddish-brown coat laid in washes (darker along the back,
 * warm on the flank, sandy under the chin and belly) with hair strokes over it
 * that break the outline. The same drawing serves the pups (a touch rounder,
 * with a bigger head) and, bigger, their mother.
 *
 * Own units: facing right (+x), lying on the ground at 0,0, y down; about 300
 * long and 130 tall. The head's middle is at CAPY_HEAD (../rig.ts).
 */

const FUR = { dark: '#5a2f19', back: '#7a4224', mid: '#9a5830', warm: '#b8743f', light: '#d39a62', belly: '#c79a6a' } as const;

const BODY = smoothLoop([
  { x: 74, y: -98 }, { x: 30, y: -114 }, { x: -30, y: -120 }, { x: -86, y: -110 }, { x: -124, y: -84 }, { x: -140, y: -48 }, { x: -134, y: -16 },
  { x: -110, y: -3 }, { x: -50, y: 2 }, { x: 10, y: 1 }, { x: 56, y: -6 }, { x: 84, y: -24 }, { x: 96, y: -58 },
], 6);

/** Head, in its own frame (the middle at 0,0, muzzle to +x). */
const HEAD = smoothLoop([
  { x: -52, y: -24 }, { x: -36, y: -40 }, { x: -6, y: -44 }, { x: 30, y: -41 }, { x: 56, y: -33 }, { x: 68, y: -20 }, { x: 70, y: 2 },
  { x: 66, y: 22 }, { x: 52, y: 34 }, { x: 18, y: 38 }, { x: -18, y: 34 }, { x: -44, y: 22 }, { x: -56, y: 0 },
], 6);
const MUZZLE = smoothLoop([{ x: 26, y: -36 }, { x: 56, y: -33 }, { x: 68, y: -20 }, { x: 70, y: 2 }, { x: 66, y: 22 }, { x: 52, y: 34 }, { x: 30, y: 32 }, { x: 22, y: 0 }], 5);
const EYE: Pt = { x: -2, y: -27 };
const EAR: Pt = { x: -36, y: -40 };

interface Hair { readonly p: Pt; readonly len: number; readonly a: number; readonly dark: boolean }

function inside(shape: readonly Pt[], q: Pt): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [a, b] = [shape[i]!, shape[j]!];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Hair strokes inside a shape, lying back along the body and a little down, the same every frame. */
function hairsIn(shape: readonly Pt[], n: number, seed: number, len: number, lie: number): Hair[] {
  const rng = seeded(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const out: Hair[] = [];
  while (out.length < n) {
    const p = { x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0) };
    if (!inside(shape, p)) continue;
    const down = (p.y - y0) / (y1 - y0 || 1);
    out.push({ p, len: len * (0.6 + rng() * 0.8), a: Math.PI - lie + down * 0.9 + (rng() - 0.5) * 0.4, dark: rng() < 0.55 });
  }
  return out;
}

/** Coarse hairs over the top line, lying back: the shaggy edge. */
function fringe(shape: readonly Pt[], from: number, to: number, seed: number, len: number): Hair[] {
  const rng = seeded(seed);
  const n = shape.length;
  const out: Hair[] = [];
  for (let i = from; i !== to; i = (i + 1) % n) {
    const p = shape[i]!;
    out.push({ p: { x: p.x + 3, y: p.y + 2 }, len: len * (0.7 + rng() * 0.7), a: Math.PI + 0.25 + (rng() - 0.5) * 0.5, dark: rng() < 0.45 });
  }
  return out;
}

const BODY_HAIR = hairsIn(BODY, 560, 7, 13, 0.25);
const BODY_FRINGE = [...fringe(BODY, 0, 30, 11, 11), ...fringe(BODY, 30, 44, 12, 9)];
const HEAD_HAIR = hairsIn(HEAD, 240, 19, 7, 0.1);
const HEAD_FRINGE = fringe(HEAD, 6, 26, 23, 6);

function paintHairs(ctx: CanvasRenderingContext2D, hairs: readonly Hair[], dark: string, light: string, w: number, alpha: number): void {
  for (const h of hairs) {
    const tip = { x: h.p.x + Math.cos(h.a) * h.len, y: h.p.y + Math.sin(h.a) * h.len };
    const mid = { x: (h.p.x + tip.x) / 2, y: (h.p.y + tip.y) / 2 - h.len * 0.08 };
    taper(ctx, [h.p, mid, tip], w, 0.3, h.dark ? dark : light, alpha);
  }
}

function paintBody(ctx: CanvasRenderingContext2D, mother: boolean, boil: number): void {
  const dark = mother ? '#4a2513' : FUR.dark;
  within(ctx, BODY, () => {
    const g = ctx.createLinearGradient(0, -122, 0, 4);
    g.addColorStop(0, FUR.back);
    g.addColorStop(0.35, FUR.mid);
    g.addColorStop(0.7, FUR.warm);
    g.addColorStop(1, FUR.belly);
    ctx.fillStyle = g;
    ctx.fillRect(-150, -130, 260, 140);
    // Sun along the back, the round haunch, the shadow under the belly on the grass.
    softLine(ctx, [{ x: -110, y: -94 }, { x: -40, y: -116 }, { x: 40, y: -108 }], 16, '#e0a66c', 0.4, 5);
    dab(ctx, -96, -46, 46, '70,34,16', 0.4);
    dab(ctx, -84, -66, 26, '214,150,96', 0.25);
    dab(ctx, 40, -60, 36, '70,36,18', 0.3);
    softLine(ctx, [{ x: -120, y: -4 }, { x: -20, y: 2 }, { x: 60, y: -6 }], 14, '#4a2a14', 0.45, 5);
    dab(ctx, -20, 0, 90, '120,170,90', 0.12);
  });
  paintHairs(ctx, BODY_HAIR, dark, FUR.light, 1.9, 0.32);
  paintHairs(ctx, BODY_FRINGE, FUR.back, FUR.mid, 2.8, 0.9);
  inkLine(ctx, BODY.slice(18, BODY.length - 4), 1.2, 0.42, boil);
}

/** The front paw peeking out from under the chest. */
function paintPaw(ctx: CanvasRenderingContext2D, boil: number): void {
  const paw = smoothLoop([{ x: 52, y: -16 }, { x: 80, y: -12 }, { x: 92, y: -4 }, { x: 88, y: 2 }, { x: 54, y: 2 }], 4);
  const g = ctx.createLinearGradient(0, -16, 0, 2);
  g.addColorStop(0, FUR.mid);
  g.addColorStop(1, FUR.dark);
  fillShape(ctx, paw, g);
  for (const dx of [80, 86]) taper(ctx, [{ x: dx, y: -2 }, { x: dx + 5, y: 1 }], 3.4, 1.6, '#2a160c', 0.85);
  inkLine(ctx, paw.slice(3), 1, 0.45, boil);
}

function paintEye(ctx: CanvasRenderingContext2D, r: number, lid: number, boil: number): void {
  const { x, y } = EYE;
  dab(ctx, x, y + 1, r * 2.2, '60,30,16', 0.35);
  ctx.fillStyle = '#160d08';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  dab(ctx, x + r * 0.3, y + r * 0.35, r * 0.8, '130,76,40', 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y + r * (lid > 0.4 ? 0.2 : -0.3), r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // The heavy upper lid, its edge nearly level: the unbothered look.
  const edge = y - r + 2 * r * lid;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.28, r * 1.08, 0, 0, Math.PI * 2);
  ctx.clip();
  fillShape(ctx, [{ x: x - r * 1.6, y: y - r * 1.6 }, { x: x + r * 1.6, y: y - r * 1.6 }, { x: x + r * 1.6, y: edge + r * 0.12 }, { x: x - r * 1.6, y: edge + r * 0.04 }], '#8a4a28');
  dab(ctx, x, edge - r * 0.5, r, '60,30,16', 0.4);
  ctx.restore();
  inkLine(ctx, [{ x: x - r * 1.3, y: edge }, { x, y: edge + r * 0.1 }, { x: x + r * 1.3, y: edge + r * 0.14 }], 1.5, 0.9, boil);
  inkLine(ctx, [{ x: x - r * 0.9, y: y + r * 0.9 }, { x: x + r, y: y + r * 0.95 }], 0.9, 0.4, boil);
}

function paintHead(ctx: CanvasRenderingContext2D, lid: number, boil: number): void {
  const px = unitPx(ctx);
  // The tiny round ear, behind the crown.
  const ear = smoothLoop([{ x: EAR.x - 10, y: EAR.y + 4 }, { x: EAR.x - 8, y: EAR.y - 8 }, { x: EAR.x + 2, y: EAR.y - 12 }, { x: EAR.x + 10, y: EAR.y - 6 }, { x: EAR.x + 10, y: EAR.y + 4 }], 4);
  fillShape(ctx, ear, FUR.back);
  dab(ctx, EAR.x, EAR.y - 3, 7, '40,20,10', 0.7);
  inkLine(ctx, ear, 1.1, 0.6, boil, true);
  within(ctx, HEAD, () => {
    const g = ctx.createLinearGradient(0, -46, 0, 40);
    g.addColorStop(0, FUR.back);
    g.addColorStop(0.4, FUR.mid);
    g.addColorStop(0.8, FUR.warm);
    g.addColorStop(1, FUR.belly);
    ctx.fillStyle = g;
    ctx.fillRect(-60, -50, 140, 95);
    softLine(ctx, [{ x: -40, y: -38 }, { x: 10, y: -42 }, { x: 56, y: -32 }], 9, '#e2a86e', 0.4, 4);
    dab(ctx, -20, 6, 30, '214,156,100', 0.4);
    dab(ctx, -46, 6, 22, '60,30,16', 0.35);
  });
  // The deep square muzzle, a shade darker, the dark nose on its front.
  within(ctx, MUZZLE, () => {
    const g = ctx.createLinearGradient(20, 0, 72, 0);
    g.addColorStop(0, 'rgba(110,58,30,0)');
    g.addColorStop(0.5, 'rgba(110,58,30,0.35)');
    g.addColorStop(1, 'rgba(70,36,18,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(10, -50, 70, 95);
    dab(ctx, 46, -24, 16, '236,186,130', 0.35);
  });
  paintHairs(ctx, HEAD_HAIR, FUR.dark, FUR.light, 1.4, 0.3);
  paintHairs(ctx, HEAD_FRINGE, FUR.back, FUR.mid, 2, 0.8);
  const nose = smoothLoop([{ x: 58, y: -26 }, { x: 68, y: -20 }, { x: 71, y: -6 }, { x: 66, y: -2 }, { x: 58, y: -10 }], 4);
  const n = ctx.createLinearGradient(58, -26, 70, -2);
  n.addColorStop(0, '#5a3626');
  n.addColorStop(1, '#22130b');
  fillShape(ctx, nose, n);
  taper(ctx, [{ x: 60, y: -18 }, { x: 65, y: -14 }, { x: 68, y: -9 }], 3.6, 1.6, '#0c0604', 0.95);
  // The split lip and the small, flat, unbothered mouth under the muzzle.
  inkLine(ctx, [{ x: 70, y: 2 }, { x: 66, y: 12 }], 1.2, 0.7, boil);
  inkLine(ctx, [{ x: 66, y: 14 }, { x: 54, y: 17 }, { x: 44, y: 16 }], 1.3, 0.75, boil);
  for (let i = 0; i < 3; i++) softLine(ctx, [{ x: 54, y: -2 + i * 5 }, { x: 80 + i * 4, y: -10 + i * 9 }], 0.9 * px, '#2a1a12', 0.55, 1);
  inkLine(ctx, HEAD.slice(0, 40), 1.3, 0.5, boil);
  paintEye(ctx, 5.6, lid, boil);
}

/** The painted capybara, placed. */
export function drawCapybara(ctx: CanvasRenderingContext2D, c: CapybaraPose, boil: number): void {
  const mother = c.tone > 0.5;
  // Pups are rounder, with a bigger head for their size.
  const [sx, sy, head] = mother ? [1, 1, 1] : [0.94, 1.06, 1.16];
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.face * c.k, c.k);
  dab(ctx, -20, 2, 150, '36,56,26', 0.32);
  ctx.save();
  ctx.scale(sx, sy);
  paintBody(ctx, mother, boil);
  paintPaw(ctx, boil);
  ctx.restore();
  ctx.translate(CAPY_HEAD.x, CAPY_HEAD.y);
  ctx.scale(head, head);
  paintHead(ctx, c.lid, boil);
  ctx.restore();
}
