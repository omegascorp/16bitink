import { createRng, type Rng } from '../logic/rng';
import { makeDraw, oval, pt, type Draw } from './kit';
import { mix, rgba, soft } from './paint';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';
import { sphere } from './skyArt';

/**
 * Brine's sky and horizon (as mycelSky.ts is Mycel's): a sea world under
 * air of nitrogen and carbon dioxide, so a hazy day sky, lilac overhead and
 * warming to a peach-pink glow along the horizon, with the orange dwarf a
 * soft disc through the haze, high cirrus combed across it and Sepia, the
 * ringed giant, small and faded low in the sky. Along the horizon, the sea:
 * purple with the retinal-pigmented microbes floating in it, pale where it
 * mirrors the sky far off and deeper close to, glinting, and on it three
 * ranges of low islands of basalt in aerial perspective, salt crusting
 * their shoulders, each mirrored in the water under it. Both layers tile
 * side to side.
 */

const TOP = '#9d8cba';
const MID = '#c8aecb';
const LOW = '#eccac6';
const HAZE = '#f6dfcf';
const SUN = '#fff0d6';
const SUN_GLOW = '#ffcf98';
const CLOUD = '#fff6ef';
const CLOUD_SHADE = '#9a84b2';

/** The sea: pale where it mirrors the hazy sky far off, a deeper purple close to (less sky in it, more of the water's own colour). */
const SEA_FAR = '#cdb0cf';
const SEA_MID = '#9a72ad';
const SEA_NEAR = '#6c4689';
const SEA_DEEP = '#583a78';
const GLINT = '#fff4e6';
const SALT = '#fbf7f5';

/** Draws `fn` at x, and again a canvas-width either side, so the layer tiles. */
function tiled(w: number, x: number, reach: number, fn: (ox: number) => void): void {
  for (const ox of [-w, 0, w]) if (x + ox + reach > 0 && x + ox - reach < w) fn(ox);
}

function blotch(ctx: CanvasRenderingContext2D, w: number, x: number, y: number, r: number, color: string, alpha: number, squash = 1): void {
  tiled(w, x, r, (ox) => {
    ctx.save();
    ctx.translate(x + ox, y);
    ctx.scale(1, squash);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  });
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string | CanvasGradient, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawBrineSky(d: Draw, w: number, h: number, horizon: number): void {
  const ctx = d.pen.ctx;
  const rng = createRng(317);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, TOP);
  g.addColorStop(0.45, MID);
  g.addColorStop(0.82, LOW);
  g.addColorStop(1, HAZE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = mix(HAZE, SEA_FAR, 0.5);
  ctx.fillRect(0, horizon - 1, w, h - horizon + 1);
  // Uneven pigment: deeper lilac pooled high up, rose and cream lying lower down.
  for (let i = 0; i < 30; i++) blotch(ctx, w, rng() * w, rng() * horizon * 0.55, 90 + rng() * 200, rng() < 0.55 ? '#8673a8' : '#e2bfd0', 0.15);
  for (let i = 0; i < 12; i++) blotch(ctx, w, rng() * w, horizon * (0.55 + rng() * 0.4), 140 + rng() * 260, '#f3c9b8', 0.18, 0.5);
  const sun = pt(w * 0.62, horizon * 0.3);
  // The star's warmth spread wide through the haze.
  blotch(ctx, w, sun.x, sun.y, horizon * 0.85, SUN_GLOW, 0.32);
  blotch(ctx, w, sun.x, sun.y, horizon * 0.35, '#ffe9c8', 0.45);
  sepia(d, pt(w * 0.2, horizon * 0.64), Math.min(30, horizon * 0.085));
  // The haze over everything, thicker towards the horizon, so Sepia sits back in it.
  const veil = ctx.createLinearGradient(0, 0, 0, horizon);
  veil.addColorStop(0, rgba(MID, 0.15));
  veil.addColorStop(0.6, rgba(LOW, 0.35));
  veil.addColorStop(1, rgba(HAZE, 0.75));
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, w, horizon);
  cirrus(ctx, rng, w, horizon);
  // The star through the haze: a soft warm disc with a paler heart, no hard edge.
  soft(ctx, 5, () => {
    ctx.fillStyle = '#ffdcae';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SUN;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(sun.x - 2, sun.y - 2, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  grain(ctx, rng, w, horizon);
}

/** Sepia, the ringed giant, small and far: a pale washed disc behind its thin ring, faded by the haze laid over it after. */
function sepia(d: Draw, c: Pt, r: number): void {
  const ctx = d.pen.ctx;
  const tilt = -0.28;
  const ring = (k: number, half: 'back' | 'front'): Pt[] =>
    Array.from({ length: 33 }, (_, i) => {
      const a = (half === 'back' ? Math.PI : 0) + (i / 32) * Math.PI;
      const x = Math.cos(a) * r * k;
      const y = Math.sin(a) * r * k * 0.24;
      return pt(c.x + x * Math.cos(tilt) - y * Math.sin(tilt), c.y + x * Math.sin(tilt) + y * Math.cos(tilt));
    });
  const band = (half: 'back' | 'front', alpha: number): void => {
    fill(ctx, [...ring(2, half), ...ring(1.5, half).reverse()], '#efdcc4', alpha * 0.5);
    d.pen.hair(ring(1.5, half), 0.5, '#7b6a95', alpha);
    d.pen.hair(ring(2, half), 0.6, '#7b6a95', alpha);
  };
  band('back', 0.45);
  const globe = oval(c.x, c.y, r, r, 32);
  sphere(d, c, r, globe, '#f2e2cc', '#b49fb4');
  d.pen.clipped(globe, () => {
    for (const [k, col] of [[-0.35, '#dcc3a8'], [0.15, '#d1b59c'], [0.5, '#dcc3a8']] as const) fill(ctx, [pt(c.x - r, c.y + r * k), pt(c.x + r, c.y + r * (k - 0.12)), pt(c.x + r, c.y + r * (k - 0.02)), pt(c.x - r, c.y + r * (k + 0.1))], col, 0.5);
  });
  // Far off through the haze: its night side is lilac, never dark.
  fill(ctx, globe, LOW, 0.35);
  d.pen.stroke([...globe, globe[0]!], 0.7, '#6f5f8c', 0.5, false);
  band('front', 0.7);
}

/** High cirrus combed across the sky: long thin soft streaks, lit on top, a faint lilac shade under, some with hooked tails. */
function cirrus(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 16; i++) {
    const x = rng() * w;
    const y = horizon * (0.08 + rng() * 0.5);
    const len = 180 + rng() * 520;
    const th = 2 + rng() * 6;
    const lean = (rng() - 0.5) * 0.08;
    // Drawn from fixed numbers, so the copies either side of the seam match.
    const fibres = Array.from({ length: 3 }, () => ({ dy: (rng() - 0.5) * th, from: -len * (0.1 + rng() * 0.35), len: len * (0.25 + rng() * 0.35), hook: rng() < 0.4 ? -th * 1.5 : 0 }));
    tiled(w, x, len, (ox) => {
      const streak = (dy: number, k: number): Pt[] => {
        const top: Pt[] = [];
        const bot: Pt[] = [];
        for (let j = 0; j <= 16; j++) {
          const u = j / 16;
          const px = x + ox - len / 2 + u * len;
          const py = y + dy + (u - 0.5) * len * lean + Math.sin(u * Math.PI * 2 + i) * th * 0.6;
          const half = th * k * Math.sin(u * Math.PI) ** 0.7;
          top.push(pt(px, py - half));
          bot.push(pt(px, py + half * 0.6));
        }
        return [...top, ...bot.reverse()];
      };
      soft(ctx, th * 0.8, () => {
        fill(ctx, streak(th * 0.9, 0.7), CLOUD_SHADE, 0.12);
        fill(ctx, streak(0, 1), CLOUD, 0.42);
      });
      // A few fibres combed through it, crisper.
      ctx.strokeStyle = CLOUD;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.18;
      for (const f of fibres) {
        const f0 = x + ox + f.from;
        const f1 = f0 + f.len;
        ctx.beginPath();
        ctx.moveTo(f0, y + f.dy + f.from * lean);
        ctx.quadraticCurveTo((f0 + f1) / 2, y + f.dy - th * 0.5, f1, y + f.dy + (f.from + f.len) * lean + f.hook);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }
}

function grain(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 7000; i++) {
    ctx.globalAlpha = 0.04 + rng() * 0.06;
    ctx.fillStyle = rng() < 0.5 ? '#5d4c7c' : '#fff3e8';
    ctx.fillRect(rng() * w, rng() * horizon, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
}

/** The sea from its horizon down: a graded wash, long streaks of lighter and deeper water, rose blooms of the microbes, glints of light. */
function paintSea(d: Draw, rng: Rng, w: number, h: number, sea: number): void {
  const ctx = d.pen.ctx;
  const g = ctx.createLinearGradient(0, sea, 0, h);
  const at = (px: number): number => Math.min(1, px / Math.max(1, h - sea));
  g.addColorStop(0, SEA_FAR);
  g.addColorStop(at(18), SEA_MID);
  g.addColorStop(at(70), SEA_NEAR);
  g.addColorStop(1, SEA_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, sea, w, h - sea);
  // Long streaks: lighter where wind ruffles the water and mirrors the sky, deeper in the calm lanes.
  for (let i = 0; i < 70; i++) {
    const depth = rng() ** 1.6;
    const y = sea + 2 + depth * (h - sea - 2);
    const len = 120 + rng() * 420 * (0.4 + depth);
    blotch(ctx, w, rng() * w, y, len, rng() < 0.5 ? '#dcc0da' : '#4e2f6e', 0.16 + depth * 0.08, (1.2 + depth * 5) / len);
  }
  // Blooms of the purple microbes, rose-magenta, in the nearer water.
  for (let i = 0; i < 10; i++) blotch(ctx, w, rng() * w, sea + 40 + rng() * (h - sea - 40), 60 + rng() * 140, '#b4529c', 0.13, 0.18);
  // The bright sheen just under the horizon line, and the line itself.
  const sheen = ctx.createLinearGradient(0, sea - 1, 0, sea + 7);
  sheen.addColorStop(0, rgba('#f7e4dc', 0.9));
  sheen.addColorStop(1, rgba('#f7e4dc', 0));
  ctx.fillStyle = sheen;
  ctx.fillRect(0, sea - 1, w, 8);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = d.ink;
  ctx.fillRect(0, sea - 0.3, w, 0.6);
  ctx.globalAlpha = 1;
  glints(ctx, rng, w, h, sea);
  // A few ripple marks in pen on the near water.
  for (let i = 0; i < 40; i++) {
    const depth = 0.35 + rng() * 0.65;
    const y = sea + depth * (h - sea);
    const x = rng() * w;
    const len = 6 + depth * 18;
    const seed = Math.floor(rng() * 1e6);
    tiled(w, x, len, (ox) => makeDraw(ctx, seed, 0, 0, d.ink).pen.hair([pt(x + ox - len / 2, y), pt(x + ox, y - 0.8), pt(x + ox + len / 2, y)], 0.5, d.ink, 0.18));
  }
}

/** Light glinting on the water: tiny and crowded far off, longer and sparser close to, some with a soft halo. */
function glints(ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number, sea: number): void {
  for (let i = 0; i < 520; i++) {
    const depth = rng() ** 2.2;
    const y = sea + 2 + depth * (h - sea - 4);
    const x = rng() * w;
    const len = 2 + depth * 16 + rng() * 4;
    const halo = rng() < 0.08;
    const alpha = 0.45 + rng() * 0.4;
    if (halo) blotch(ctx, w, x, y, len * 1.4, GLINT, 0.25, 0.3);
    tiled(w, x, len * 2, (ox) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = GLINT;
      ctx.beginPath();
      ctx.ellipse(x + ox, y, len / 2, 0.45 + depth * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

/** How far the ground's surface sits above the ridge strip's horizon, px (GameScene sets the strip half a tile low). */
/** How far under this strip's horizon (half a tile over the islands' ground) the far sea's horizon lies: just over the near sea's surface, two tiles down. */
const SEA_BELOW = 40;

interface Range {
  /** The waterline its islands stand on (nearer ones lower, below the sea's horizon). */
  readonly water: number;
  readonly height: number;
  readonly color: string;
  /** Pen alpha on its outlines (0 for none). */
  readonly ink: number;
  readonly blur: number;
  /** How much of the light falls on it: the far ranges are flattened by the haze. */
  readonly light: number;
  /** How wide the open sea between its groups of islands is (1 for the usual). */
  readonly spread: number;
}

interface Island {
  readonly x: number;
  /** Its crest, left foot to right foot, in px relative to (x, waterline). */
  readonly crest: readonly Pt[];
  readonly w: number;
  readonly h: number;
  /** Its own seed, so its details come out the same in each copy across the seam. */
  readonly seed: number;
}

/** The crest of one island: a basalt plateau with cliffs, a rounded old volcano, or a lone stack. */
function crestOf(rng: Rng, W: number, H: number): Pt[] {
  const roll = rng();
  const ctrl: Pt[] =
    roll < 0.5
      ? [pt(-W / 2, 0), pt(-W * 0.44, -H * 0.55), pt(-W * 0.38, -H * (0.85 + rng() * 0.15)), pt(-W * 0.1, -H * (0.8 + rng() * 0.15)), pt(W * 0.15, -H * (0.85 + rng() * 0.15)), pt(W * 0.3, -H * 0.62), pt(W * 0.38, -H * 0.5), pt(W * 0.43, -H * 0.2), pt(W / 2, 0)]
      : roll < 0.85
        ? Array.from({ length: 11 }, (_, i) => {
            const u = i / 10;
            const v = (u - 0.42) / (u < 0.42 ? 0.42 : 0.58);
            return pt(-W / 2 + u * W, -H * (1 - v * v) ** 1.2);
          })
        : [pt(-W / 2, 0), pt(-W * 0.36, -H * 0.9), pt(-W * 0.2, -H), pt(W * 0.25, -H * 0.96), pt(W * 0.36, -H * 0.7), pt(W / 2, 0)];
  // Broken up between its points, so basalt reads as rock and not a ruled line.
  const out: Pt[] = [ctrl[0]!];
  for (let i = 1; i < ctrl.length; i++) {
    const a = ctrl[i - 1]!;
    const b = ctrl[i]!;
    const n = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    for (let k = 1; k < n; k++) out.push(pt(a.x + (b.x - a.x) * (k / n) + (rng() - 0.5) * 2, a.y + (b.y - a.y) * (k / n) + (rng() - 0.4) * H * 0.05));
    out.push(b);
  }
  return out;
}

function islands(rng: Rng, w: number, r: Range): Island[] {
  const out: Island[] = [];
  for (let x = rng() * 200; x < w - 60; ) {
    const stack = rng() < 0.15;
    const h = r.height * (stack ? 0.5 + rng() * 0.3 : 0.35 + rng() * 0.65);
    const iw = stack ? h * (0.35 + rng() * 0.2) : h * (2 + rng() * 3.5);
    out.push({ x: x + iw / 2, crest: crestOf(rng, iw, h), w: iw, h, seed: Math.floor(rng() * 1e6) });
    // Islands lie in groups with open sea between, not evenly spaced.
    x += iw + r.height * (rng() < 0.45 ? 0.1 + rng() * 0.5 : (2 + rng() * 4.5) * r.spread);
  }
  return out;
}

function placed(i: Island, ox: number, water: number): Pt[] {
  return i.crest.map((p) => pt(p.x + i.x + ox, p.y + water));
}

/** The nearer islands' rock, painted: granulated pigment, the basalt's columns hatched in the shadow, ledges with lit lips and a rim of light down the sunlit cliff. */
function paintRock(d: Draw, rng: Rng, i: Island, body: readonly Pt[], x0: number, r: Range, lit: string, shade: string): void {
  const ctx = d.pen.ctx;
  const top = r.water - i.h;
  // Granulation: pigment settled in the paper's tooth, dark and light.
  d.pen.stipple(body, Math.round(i.w * i.h * 0.07 * r.light), () => 0.5, 0.35, mix(shade, r.color, 0.3));
  d.pen.stipple(body, Math.round(i.w * i.h * 0.05 * r.light), (x) => 0.7 * (1 - (x - x0) / i.w), 0.35, lit);
  // A wash bloom or two, where the water pooled as it dried.
  d.pen.clipped(body, () => {
    for (let k = 0; k < 2; k++) {
      const bx = x0 + i.w * (0.2 + rng() * 0.6);
      const by = top + i.h * (0.4 + rng() * 0.4);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, i.h * 0.6);
      g.addColorStop(0, rgba(shade, 0));
      g.addColorStop(0.8, rgba(shade, 0.18));
      g.addColorStop(1, rgba(shade, 0));
      ctx.fillStyle = g;
      ctx.fillRect(bx - i.h, by - i.h, i.h * 2, i.h * 2);
    }
  });
  // Basalt's columns: fine vertical strokes all over, firmer in the shadow.
  d.pen.hatch(body, Math.max(2.4, i.h * 0.07), Math.PI / 2 + 0.03, 0.35, { color: d.ink, alpha: r.ink * 0.16 });
  d.pen.crescent(body, pt(-Math.min(i.w * 0.3, i.h * 1.2), -i.h * 0.3), () => d.pen.hatch(body, Math.max(1.8, i.h * 0.05), Math.PI / 2 + 0.03, 0.45, { color: d.ink, alpha: r.ink * 0.45 }));
  // Ledges: lava flows stacked one on another, each with a lit lip and a shadow under.
  d.pen.clipped(body, () => {
    for (const k of [0.38, 0.62]) {
      const y = top + i.h * (k + (rng() - 0.5) * 0.08);
      const pts = Array.from({ length: 9 }, (_, j) => pt(x0 + (j / 8) * i.w, y + Math.sin(j * 1.7 + i.seed) * i.h * 0.03));
      d.pen.hair(pts.map((p) => pt(p.x, p.y - 0.9)), 0.8, mix(lit, SALT, 0.4), 0.45 * r.light);
      d.pen.hair(pts, 0.45, d.ink, r.ink * 0.4);
    }
  });
  // Rim light down the sunlit side: the crest from the left foot to its first summit.
  let peak = 1;
  while (peak < body.length - 1 && body[peak + 1]!.y <= body[peak]!.y + 0.5) peak++;
  d.pen.clipped(body, () => d.pen.hair(body.slice(0, peak + 2).map((p) => pt(p.x + 1, p.y + 1)), 1.6, '#ffeede', 0.55 * r.light));
}

function paintIsland(base: Draw, i: Island, ox: number, r: Range): void {
  // Its own pen and numbers, so each copy across the seam is drawn stroke for stroke the same.
  const d = makeDraw(base.pen.ctx, i.seed, 0, 0, base.ink);
  const ctx = d.pen.ctx;
  const rng = createRng(i.seed);
  const body = placed(i, ox, r.water);
  const x0 = i.x + ox - i.w / 2;
  const lit = mix(r.color, '#ffe7d4', 0.4 * r.light);
  const shade = mix(r.color, '#2a1f45', 0.45 * r.light);
  // Its mirror in the water first: squashed, softened, a little darker, broken by ripples.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 4, r.water, i.w + 8, i.h);
  ctx.clip();
  soft(ctx, 1.2 + r.blur, () => fill(ctx, body.map((p) => pt(p.x, r.water + (r.water - p.y) * 0.55)), mix(r.color, SEA_NEAR, 0.35), 0.45));
  ctx.strokeStyle = mix(SEA_FAR, GLINT, 0.4);
  ctx.lineWidth = 0.7;
  for (let y = r.water + 2; y < r.water + i.h * 0.55; y += 2 + rng() * 2.5) {
    const a = x0 + rng() * i.w * 0.5;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(a, y);
    ctx.lineTo(a + i.w * (0.15 + rng() * 0.4), y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  soft(ctx, r.blur, () => {
    fill(ctx, body, r.color);
    // Lit on the left, in cool shadow on the right, as the star stands to the upper left.
    const g = ctx.createLinearGradient(x0, 0, x0 + i.w, 0);
    g.addColorStop(0, lit);
    g.addColorStop(0.35, mix(r.color, lit, 0.4));
    g.addColorStop(0.6, shade);
    g.addColorStop(1, mix(shade, '#2a1f45', 0.2 * r.light));
    fill(ctx, body, g, 0.85);
  });
  if (r.light >= 0.5) paintRock(d, rng, i, body, x0, r, lit, shade);
  // Salt crusting the shoulders: soft white crust on the flatter stretches of the crest, brightest in the light, with drips down.
  d.pen.clipped(body, () => {
    ctx.lineCap = 'round';
    for (let k = 1; k < i.crest.length - 1; k++) {
      const a = body[k - 1]!;
      const b = body[k]!;
      const slope = Math.abs(b.y - a.y) / Math.max(0.5, Math.abs(b.x - a.x));
      if (slope > 0.6 || rng() < 0.15) continue;
      const u = (b.x - x0) / i.w;
      const alpha = (0.6 + 0.4 * r.light) * (1 - u * 0.5);
      const width = Math.max(2, i.h * 0.16) * (0.6 + rng() * 0.7);
      ctx.strokeStyle = SALT;
      // The crust's soft body, then its crisp upper edge.
      soft(ctx, width * 0.35, () => {
        ctx.globalAlpha = alpha * 0.7;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + width * 0.35);
        ctx.lineTo(b.x, b.y + width * 0.35);
        ctx.stroke();
      });
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.8, width * 0.35);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 0.6);
      ctx.lineTo(b.x, b.y + 0.6);
      ctx.stroke();
      if (rng() < 0.35) {
        ctx.lineWidth = Math.max(0.6, i.h * 0.03);
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 1);
        ctx.lineTo(b.x + 0.5, b.y + i.h * (0.15 + rng() * 0.25));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
  // Sea mist lying along the waterline, and the surf's broken white line.
  const mist = ctx.createLinearGradient(0, r.water - i.h * 0.35, 0, r.water);
  mist.addColorStop(0, rgba(HAZE, 0));
  mist.addColorStop(1, rgba(mix(HAZE, SEA_FAR, 0.4), 0.55 - r.light * 0.25));
  fill(ctx, body, mist);
  if (r.ink > 0) {
    d.pen.stroke(body.slice(1, -1), 0.9, d.ink, r.ink, false);
    for (let s = x0; s < x0 + i.w; s += 6 + rng() * 10) d.pen.hair([pt(s, r.water + 0.6), pt(s + 3 + rng() * 6, r.water + 0.6)], 1, SALT, 0.8 * r.light);
    d.pen.hair([pt(x0 - 2, r.water + 0.5), pt(x0 + i.w + 2, r.water + 0.5)], 0.5, d.ink, r.ink * 0.5);
  }
}

export function drawBrineRidges(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const rng = createRng(347);
  // The sea's horizon lies just over the near sea's own surface (two tiles under the islands' ground, a tile and a half under this strip's horizon), so out at sea the far water meets the near; on an island, its ground hides it, as it would.
  const sea = horizon + SEA_BELOW;
  paintSea(d, rng, w, h, sea);
  const ranges: Range[] = [
    { water: sea + 1, height: horizon * 0.26, color: '#b9a5c2', ink: 0, blur: 1.4, light: 0.3, spread: 0.8 },
    { water: sea + 5, height: horizon * 0.22, color: '#8f7b9d', ink: 0.3, blur: 0.5, light: 0.6, spread: 1 },
    { water: sea + 12, height: horizon * 0.2, color: mix(style.stone, '#4d4560', 0.55), ink: 0.85, blur: 0, light: 1, spread: 1.8 },
  ];
  ranges.forEach((r, k) => {
    for (const i of islands(rng, w, r)) tiled(w, i.x, i.w, (ox) => paintIsland(d, i, ox, r));
    // The haze thickening over the far water once each far range is down.
    if (k < 2) {
      const veil = d.pen.ctx.createLinearGradient(0, sea - r.height, 0, sea + 14);
      veil.addColorStop(0, rgba(HAZE, 0));
      veil.addColorStop(0.75, rgba(HAZE, 0.22));
      veil.addColorStop(1, rgba(HAZE, 0));
      d.pen.ctx.fillStyle = veil;
      d.pen.ctx.fillRect(0, sea - r.height, w, r.height + 14);
    }
  });
}
