import { createRng, type Rng } from '../logic/rng';
import { oval, pt, type Draw } from './kit';
import { mix, rgba, soft } from './paint';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';
import { ringedPlanet, sphere } from './skyArt';

/**
 * Mycel's sky and horizon (the planet's own, as skyArt.ts and ridgeArt.ts
 * are Graphite's): a moon with thick air has a day sky, so instead of
 * Graphite's black there's a haze of carbon dioxide and spores, green-grey
 * overhead and warm along the horizon. The orange star is a soft disc
 * through it, the ringed giant Sepia hangs huge and faded, Graphite (grey)
 * and Cardia (red) are faint beside it, and spores drift as specks of light.
 * Along the horizon, three ranges of fungal forest in aerial perspective:
 * giant caps (swollen bladders on stalks) and tall bare trunks, the far ones lost in the haze,
 * the near one violet and firmly inked. Both layers tile side to side.
 */

const TOP = '#6f8a72';
const MID = '#a9bb92';
const LOW = '#ddd9ac';
const HAZE = '#e9e3bd';
const SUN = '#fff1cf';

/** Draws `fn` at x, and again a canvas-width either side, so the layer tiles. */
function tiled(w: number, x: number, reach: number, fn: (ox: number) => void): void {
  for (const ox of [-w, 0, w]) if (x + ox + reach > 0 && x + ox - reach < w) fn(ox);
}

function blotch(ctx: CanvasRenderingContext2D, w: number, x: number, y: number, r: number, color: string, alpha: number): void {
  tiled(w, x, r, (ox) => {
    const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x + ox - r, y - r, r * 2, r * 2);
  });
}

export function drawMycelSky(d: Draw, w: number, h: number, horizon: number): void {
  const ctx = d.pen.ctx;
  const rng = createRng(212);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, TOP);
  g.addColorStop(0.5, MID);
  g.addColorStop(0.86, LOW);
  g.addColorStop(1, HAZE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = HAZE;
  ctx.fillRect(0, horizon - 1, w, h - horizon + 1);
  // Uneven pigment, darker high up, with lighter haze lying in bands.
  for (let i = 0; i < 30; i++) blotch(ctx, w, rng() * w, rng() * horizon * 0.55, 80 + rng() * 180, rng() < 0.6 ? '#4f6a57' : '#c7d1a4', 0.16);
  const sun = pt(w * 0.64, horizon * 0.3);
  blotch(ctx, w, sun.x, sun.y, horizon * 0.7, '#fff3d0', 0.5);
  ringedPlanet(d, pt(w * 0.3, horizon * 0.42), Math.min(110, horizon * 0.3));
  moon(d, pt(w * 0.86, horizon * 0.2), 9, '#d9d6cf', '#6e6c78');
  moon(d, pt(w * 0.08, horizon * 0.3), 7, '#ebb1a9', '#86424a');
  // The haze over everything, thicker towards the horizon, so the giant and the moons sit back in it.
  const veil = ctx.createLinearGradient(0, 0, 0, horizon);
  veil.addColorStop(0, rgba(MID, 0.25));
  veil.addColorStop(0.6, rgba(LOW, 0.4));
  veil.addColorStop(1, rgba(HAZE, 0.75));
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, horizon);
  for (let i = 0; i < 14; i++) {
    const y = horizon * (0.35 + rng() * 0.6);
    blotch(ctx, w, rng() * w, y, 120 + rng() * 260, HAZE, 0.22);
  }
  // The star through the haze: a soft disc, no hard edge.
  soft(ctx, 6, () => {
    ctx.fillStyle = SUN;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  grain(ctx, rng, w, horizon);
  spores(ctx, rng, w, horizon);
}

function moon(d: Draw, c: Pt, r: number, light: string, dark: string): void {
  const shape = oval(c.x, c.y, r, r, 24);
  sphere(d, c, r, shape, light, dark);
  d.pen.stroke([...shape, shape[0]!], 0.8, d.ink, 0.5, false);
}

function grain(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 7000; i++) {
    const y = rng() * horizon;
    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() < 0.5 ? '#3c5244' : '#f4efcf';
    ctx.fillRect(rng() * w, y, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
}

/** Spores drifting in the light: pale specks, some with a soft halo, thicker near the ground. */
function spores(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 320; i++) {
    const x = rng() * w;
    const y = horizon * (1 - rng() * rng());
    const r = 0.5 + rng() * 1.3;
    tiled(w, x, r * 6, (ox) => {
      if (rng() < 0.2) {
        const g = ctx.createRadialGradient(x + ox, y, 0, x + ox, y, r * 6);
        g.addColorStop(0, 'rgba(255, 250, 220, 0.35)');
        g.addColorStop(1, 'rgba(255, 250, 220, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r * 6, y - r * 6, r * 12, r * 12);
      }
      ctx.globalAlpha = 0.55 + rng() * 0.4;
      ctx.fillStyle = '#fffbe6';
      ctx.beginPath();
      ctx.arc(x + ox, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

interface Range {
  readonly base: number;
  readonly height: number;
  readonly color: string;
  /** Pen alpha on its outlines (0 for none). */
  readonly ink: number;
  /** How soft its edges are, by distance. */
  readonly blur: number;
  /** How much of the light falls on it: the far ranges are flattened by the haze. */
  readonly light: number;
}

/** One growth on the horizon: a giant cap on its stalk, a bare trunk, or a low mound of mycelium. */
interface Growth {
  readonly kind: 'cap' | 'trunk' | 'mound';
  readonly x: number;
  readonly h: number;
  readonly w: number;
  readonly lean: number;
}

function growths(rng: Rng, w: number, r: Range): Growth[] {
  const out: Growth[] = [];
  for (let x = rng() * 40; x < w; x += r.height * (0.18 + rng() * 0.32)) {
    const roll = rng();
    const kind = roll < 0.5 ? 'cap' : roll < 0.75 ? 'trunk' : 'mound';
    const h = r.height * (kind === 'mound' ? 0.12 + rng() * 0.14 : 0.35 + rng() * 0.65);
    out.push({ kind, x, h, w: kind === 'cap' ? h * (0.45 + rng() * 0.35) : kind === 'trunk' ? h * (0.08 + rng() * 0.05) : h * (2.2 + rng() * 1.6), lean: (rng() - 0.5) * h * 0.18 });
  }
  return out;
}

/** The outline of a growth standing on `base`. */
function shapeOf(g: Growth, base: number, ox: number): Pt[] {
  const x = g.x + ox;
  if (g.kind === 'mound') {
    const top = Array.from({ length: 17 }, (_, i) => {
      const a = Math.PI + (i / 16) * Math.PI;
      return pt(x + (Math.cos(a) * g.w) / 2, base + Math.sin(a) * g.h);
    });
    return [...top, pt(x + g.w / 2, base + 4), pt(x - g.w / 2, base + 4)];
  }
  const stalk = g.kind === 'cap' ? g.w * 0.16 : g.w;
  const top = pt(x + g.lean, base - g.h);
  const body: Pt[] = [pt(x - stalk * 0.65, base + 4), pt(x - stalk * 0.5 + g.lean * 0.5, base - g.h * 0.5), pt(top.x - stalk * 0.42, top.y), pt(top.x + stalk * 0.42, top.y), pt(x + stalk * 0.5 + g.lean * 0.5, base - g.h * 0.5), pt(x + stalk * 0.65, base + 4)];
  if (g.kind === 'trunk') {
    // A bare trunk ends in a blunt, rounded head.
    const head = oval(top.x, top.y, stalk * 0.55, stalk * 0.7, 12).filter((p) => p.y <= top.y);
    return [body[0]!, body[1]!, body[2]!, ...head.sort((a, b) => a.x - b.x), body[3]!, body[4]!, body[5]!];
  }
  return body;
}

/** A giant cap's bladder on the top of its stalk, as the near ones are drawn: a round belly hanging low, drawn up to a narrow, blunt crown. */
function capOf(g: Growth, base: number, ox: number): { dome: Pt[]; rim: Pt[] } {
  const R = g.w * 0.36;
  const c = pt(g.x + ox + g.lean, base - g.h - R * 0.3);
  const dome: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    const u = -Math.sin(a);
    dome.push(pt(c.x + Math.cos(a) * R * (1 - 0.5 * u ** 2.2), c.y - u * R * 1.35));
  }
  // The belly, from the right round under to the left.
  const rim: Pt[] = [];
  for (let i = 1; i < 16; i++) {
    const a = (i / 16) * Math.PI;
    rim.push(pt(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R * 0.7));
  }
  return { dome, rim };
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintRange(d: Draw, rng: Rng, w: number, h: number, r: Range): void {
  const ctx = d.pen.ctx;
  const gs = growths(rng, w, r);
  const lit = mix(r.color, '#fff4d6', 0.35 * r.light);
  const shade = mix(r.color, '#2b2340', 0.35 * r.light);
  soft(ctx, r.blur, () => {
    // The ground the range stands on, down to the bottom.
    ctx.fillStyle = r.color;
    ctx.fillRect(0, r.base, w, h - r.base);
    for (const g of gs) tiled(w, g.x, g.w + 40, (ox) => {
      const body = shapeOf(g, r.base, ox);
      fill(ctx, body, r.color);
      // Light on the left of each stalk or trunk, shadow on the right.
      fill(ctx, body.map((p) => pt(p.x - (p.x - (g.x + ox)) * 0.5 - 1, p.y)), lit, 0.35);
      if (g.kind !== 'cap') return;
      const { dome, rim } = capOf(g, r.base, ox);
      const cap = [...dome, ...rim];
      fill(ctx, cap, mix(r.color, '#8a5d93', 0.35 * r.light));
      // The bladder lit from the upper left, its frill in shadow.
      fill(ctx, dome.slice(0, 9).concat([pt(dome[8]!.x, dome[8]!.y + 6)]), lit, 0.3);
      fill(ctx, [...rim, ...rim.map((p) => pt(p.x, p.y - g.w * 0.05)).reverse()], shade, 0.6);
    });
  });
  // Spore haze lying along the range's foot, thickening down into the ground band, so a dip in the ground shows haze, not a flat wall.
  const foot = ctx.createLinearGradient(0, r.base - r.height * 0.25, 0, r.base + 60);
  foot.addColorStop(0, rgba(HAZE, 0));
  foot.addColorStop(0.55, rgba(HAZE, 0.45 - r.light * 0.15));
  foot.addColorStop(1, rgba(HAZE, 0.7 - r.light * 0.2));
  ctx.fillStyle = foot;
  ctx.fillRect(0, r.base - r.height * 0.25, w, h - r.base + r.height * 0.25);
  if (r.ink <= 0) return;
  for (const g of gs) tiled(w, g.x, g.w + 40, (ox) => {
    if (g.kind === 'mound') return;
    const body = shapeOf(g, r.base, ox);
    d.pen.stroke(body.slice(0, -1), 0.9, d.ink, r.ink * 0.7, false);
    if (g.kind === 'cap') {
      const { dome, rim } = capOf(g, r.base, ox);
      d.pen.stroke([...dome, ...rim, dome[0]!], 1.05, d.ink, r.ink, false);
      // Threads hanging from the frill, each tipped with a bead of light, and horns budding from the crown.
      for (let k = 1; k < rim.length - 1; k += 3) {
        const p = rim[k]!;
        const end = pt(p.x + g.w * 0.02, p.y + g.w * (0.18 + ((k * 7) % 5) * 0.05));
        d.pen.hair([p, end], 0.45, d.ink, r.ink * 0.6);
        ctx.globalAlpha = 0.7 * r.light;
        ctx.fillStyle = '#c9fbe9';
        ctx.beginPath();
        ctx.arc(end.x, end.y, Math.max(0.8, g.w * 0.025), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const crown = dome[8]!;
      for (const s of [-1, 0, 1]) d.pen.stroke([pt(crown.x + s * g.w * 0.12, crown.y + Math.abs(s) * g.w * 0.05), pt(crown.x + s * g.w * 0.17, crown.y - g.w * (s === 0 ? 0.16 : 0.1))], 1, d.ink, r.ink * 0.8, false);
    }
  });
  // The ground line along the foot of the near range.
  d.pen.stroke([pt(-20, r.base + 2), pt(w + 20, r.base + 2)], 1, d.ink, r.ink * 0.6, false);
}

export function drawMycelRidges(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const rng = createRng(233);
  const ranges: Range[] = [
    { base: horizon - 8, height: horizon * 0.8, color: '#b9c2a3', ink: 0, blur: 1.6, light: 0.3 },
    { base: horizon - 2, height: horizon * 0.58, color: '#9ea38f', ink: 0.3, blur: 0.6, light: 0.6 },
    { base: horizon + 3, height: horizon * 0.36, color: mix(style.soil, '#8d86a0', 0.35), ink: 0.85, blur: 0, light: 1 },
  ];
  for (const r of ranges) paintRange(d, rng, w, h, r);
}
