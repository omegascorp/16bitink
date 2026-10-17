import { oval, pt, ribbon, type Draw } from '../kit';
import { dab, glow, mix, SHADOW, soft, TO_LIGHT } from '../paint';
import { PAPER_FILL } from '../palette';
import { Pen, type Pt } from '../pen';
import { createRng, type Rng } from '../../logic/rng';

/**
 * What Mycel's creatures share: they're fungal flesh (rot eats the dead
 * here, and these are the rot grown big), so their skins are washed in
 * Mycel's dusky violets, roses and ochres, and their weapon is spores: dry
 * dust shed in clouds. A puff of spores is drawn as a painter dabs dust, soft
 * washes with pen specks over them, never as a cartoon cloud outline.
 */
export const FLESH = {
  /** The puffball's sac: buff ochre, gone dusty. */
  sac: '#c9a26b',
  /** A vent's lips and raw inner flesh. */
  raw: '#b65a6e',
  /** Violet veins of hyphae under a skin. */
  vein: '#7a4f8f',
  /** The tendril's muscle: madder violet. */
  whip: '#8e4a6e',
  /** Bone-pale threads and rings, as the caps' stalks are. */
  pale: '#efe4cf',
  /** The Mother's flesh: a deep rose. */
  heart: '#9b4f7a',
  /** Sulphur spores, dry and bright. */
  spore: '#d9c46f',
  /** Light in a pore. */
  pore: '#ffd68a',
  /** Teal light, as the caps' threads carry. */
  glowTeal: '#8ff0d8',
} as const;

/** Points round a blob: an oval whose rim wobbles by `lumps` (0..1) over `n` points, the same every frame for a `seed`. */
export function blob(c: Pt, rx: number, ry: number, lumps: number, seed: number, n = 22): Pt[] {
  const rng = createRng(seed);
  return oval(c.x, c.y, rx, ry, n).map((p) => {
    const k = 1 + (rng() - 0.5) * lumps;
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k);
  });
}

/** Below this alpha the sprite finish leaves a pixel out of the ink silhouette (paint.ts, `finishSprite`). */
const HAZE = 0.34;

/**
 * A cloud of spores round `c`, `r` across: soft dabs of dusty wash, a paler
 * heart, then specks of spore thinning outward. The washes are painted on a
 * scratch sheet and laid in at most a thin haze, so the sprite's silhouette
 * passes round the cloud: dust, not a cartoon cloud. `alpha` 0..1 scales it.
 */
export function sporeCloud(d: Draw, c: Pt, r: number, alpha = 1, color: string = FLESH.spore): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const a0 = Math.max(0, Math.min(1, alpha));
  const sheet = document.createElement('canvas');
  sheet.width = ctx.canvas.width;
  sheet.height = ctx.canvas.height;
  const sctx = sheet.getContext('2d');
  if (sctx) {
    sctx.setTransform(ctx.getTransform());
    const wash = new Pen(sctx, Math.floor(pen.rng() * 1e6), pen.wobble);
    const haze: Draw = { ...d, pen: wash };
    const puffs = 4 + Math.round(r / 5);
    for (let i = 0; i < puffs; i++) {
      const a = wash.rng() * Math.PI * 2;
      const k = Math.sqrt(wash.rng()) * r * 0.55;
      const pr = r * (0.3 + wash.rng() * 0.3);
      dab(haze, oval(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k, pr, pr * 0.85, 14), mix(color, '#9a8a70', 0.2), 0.5, pr * 0.4);
    }
    dab(haze, oval(c.x, c.y - r * 0.1, r * 0.45, r * 0.38, 14), mix(color, PAPER_FILL, 0.35), 0.6, r * 0.2);
    // The specks: denser at the heart of the cloud.
    const specks = Math.round(r * 2.6);
    for (let i = 0; i < specks; i++) {
      const a = wash.rng() * Math.PI * 2;
      const k = Math.pow(wash.rng(), 0.7) * r;
      wash.dot(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k, 0.3 + wash.rng() * 0.35, i % 2 === 0 ? mix(color, '#5a4a20', 0.6) : color, 1 - k / (r * 1.1));
    }
    // Laid in as one thin haze, under the silhouette's threshold.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = HAZE * a0;
    ctx.drawImage(sheet, 0, 0);
    ctx.restore();
  }
}

/** A pore: a small pit in flesh with light welling in it (`lit` 0..1, dark to bright), and a pale lip on its upper side. */
export function pore(d: Draw, c: Pt, r: number, lit: number, color: string = FLESH.pore): void {
  const { pen } = d;
  if (lit > 0) glow(pen.ctx, c, r * (2 + lit * 2.5), color, 0.25 + lit * 0.4);
  pen.fill(oval(c.x, c.y, r, r * 0.8, 10), mix('#2a1830', color, lit * 0.85), 0.95);
  if (lit > 0.3) pen.dot(c.x, c.y + r * 0.1, r * 0.45, mix(color, '#ffffff', 0.5), lit);
  pen.hair([pt(c.x - r, c.y - r * 0.2), pt(c.x, c.y - r * 0.95), pt(c.x + r, c.y - r * 0.2)], Math.max(0.25, r * 0.3), PAPER_FILL, 0.55);
}

/** Fine veins of hyphae branching from `a` towards `b` inside a skin, in `color`: the threads under the flesh, laid out the same every frame by `rng`. */
export function veins(d: Draw, a: Pt, b: Pt, color: string, w = 0.5, alpha = 0.6, depth = 2, rng: Rng = createRng(Math.round(a.x * 31 + a.y * 17 + b.x * 7))): void {
  const mid = pt((a.x + b.x) / 2 + (rng() - 0.5) * Math.abs(b.y - a.y) * 0.3, (a.y + b.y) / 2 + (rng() - 0.5) * Math.abs(b.x - a.x) * 0.3);
  d.pen.hair([a, mid, b], w, color, alpha);
  if (depth <= 0) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const s = rng() > 0.5 ? 1 : -1;
  veins(d, mid, pt(mid.x + dx * 0.35 - dy * 0.3 * s, mid.y + dy * 0.35 + dx * 0.3 * s), color, w * 0.7, alpha * 0.85, depth - 1, rng);
}

/**
 * A muscular tube along `pts`, painted as a cylinder: body colour, a soft
 * core shadow along its far side and a lit stripe along its near side, then
 * inked along both edges.
 */
export function tube(d: Draw, pts: readonly Pt[], w: (u: number) => number, wash: string): { top: Pt[]; bot: Pt[]; shape: Pt[] } {
  const r = ribbon(pts, w);
  const { pen } = d;
  const ctx = pen.ctx;
  pen.fill(r.shape, PAPER_FILL, 1);
  pen.fill(r.shape, wash, 0.92);
  const along = (k: number, color: string, width: number, alpha: number, blur: number): void => {
    pen.clipped(r.shape, () => soft(ctx, blur, () => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const u = i / (pts.length - 1);
        const ww = w(u);
        ctx.lineWidth = ww * width;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1]!.x + TO_LIGHT.x * ww * k, pts[i - 1]!.y + TO_LIGHT.y * ww * k);
        ctx.lineTo(pts[i]!.x + TO_LIGHT.x * ww * k, pts[i]!.y + TO_LIGHT.y * ww * k);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }));
  };
  along(-0.42, mix(wash, SHADOW, 0.6), 0.55, 0.7, 0.6);
  along(0.22, mix(wash, '#fff2d8', 0.5), 0.3, 0.75, 0.4);
  along(0.3, PAPER_FILL, 0.08, 0.6, 0.1);
  pen.stroke(r.top, 0.7, d.ink, 0.9, false);
  pen.stroke(r.bot, 0.8, d.ink, 0.9, false);
  return r;
}
