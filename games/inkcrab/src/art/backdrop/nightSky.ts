import { bezier, type Draw, makeDraw, oval, pt } from '../kit';
import { makeCanvas, type Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, FAR } from './common';
import { glow } from './estuary';
import { rgba } from './monsoonSky';

/**
 * The sky over a tropical Queensland bay on a summer night, painted as a
 * watercolourist paints the dark: deep indigo washes laid over the paper,
 * the full moon left as bare paper with a little warmth in it and a soft
 * ring round it, stars picked out in white, the Milky Way a pale, mottled
 * river with its dark rifts, the Southern Cross and its Pointers standing
 * in it; and clouds lit from behind by the moon, dark in their hearts with
 * a bright silver lining along their tops. Also the night's own tools:
 * `moonlit`, which glazes anything drawn into the night.
 */
const W = BACKDROP_W;
export const NIGHT = '#1c2654';
export const INDIGO = '#2b3a78';
export const NIGHT_BLUE = '#41609c';
export const HAZE = '#9fb2d2';
export const MOON = '#fbf4d6';
const MOON_RING = '#d3def0';
const MARE = '#a9b0c8';
const MILKY = '#c7cdea';
const CLOUD = '#46507e';
const CLOUD_DARK = '#262d55';
const SILVER = '#eef3fb';

/**
 * Draws `draw` into the night: onto a sheet of its own, then glazed over
 * with `color` at `alpha` wherever it put paint, as a watercolourist lays a
 * blue glaze over a finished passage to sink it into the dark, and laid
 * into the layer. `alpha` near 1 leaves a silhouette with its inking just
 * showing through.
 */
export function moonlit(t: Draw, color: string, alpha: number, draw: (t: Draw) => void): void {
  const { ctx } = t.pen;
  const { canvas, ctx: sheet } = makeCanvas(ctx.canvas.width, ctx.canvas.height);
  sheet.setTransform(ctx.getTransform());
  draw(makeDraw(sheet, Math.floor(t.pen.rng() * 1e9), t.f, t.g, t.ink));
  sheet.save();
  sheet.setTransform(1, 0, 0, 1, 0, 0);
  sheet.globalCompositeOperation = 'source-atop';
  sheet.globalAlpha = alpha;
  sheet.fillStyle = color;
  sheet.fillRect(0, 0, canvas.width, canvas.height);
  sheet.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

/**
 * Several closed shapes filled as one, so their overlaps don't darken: a
 * cloud's puffs, a canopy's crowns. With `clip`, runs it clipped to them instead.
 */
export function union(t: Draw, shapes: readonly (readonly Pt[])[], color: string, alpha: number, clip?: () => void): void {
  const { ctx } = t.pen;
  ctx.save();
  ctx.beginPath();
  for (const s of shapes) {
    s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  }
  if (clip) {
    ctx.clip('nonzero');
    clip();
  } else {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill('nonzero');
  }
  ctx.restore();
}

/**
 * The full moon: bare paper with a little warmth in it, its seas washed in
 * soft blue-grey, seen from the southern hemisphere so the face is upside
 * down from the northern one's; a broad pool of light round it, and a
 * faint ring further out where the humid air catches it.
 */
export function fullMoon(t: Draw, x: number, y: number, r: number, ring: number): void {
  const { pen } = t;
  glow(t, x, y, r * 11, r * 7, HAZE, 0.45);
  glow(t, x, y, r * 4.5, r * 4.2, MOON_RING, 0.55);
  glow(t, x, y, r * 2, r * 2, PAPER_FILL, 0.9);
  // The ring: a soft bright band in the haze, a faint warm edge just inside it.
  softRing(t, x, y, ring, ring * 0.16, MOON_RING, 0.4);
  softRing(t, x, y, ring * 0.94, ring * 0.05, '#e9cfa6', 0.18);
  const disc = oval(x, y, r, r, 40);
  pen.fill(disc, PAPER_FILL, 1);
  pen.fill(disc, MOON, 0.55);
  pen.clipped(disc, () => {
    // The maria, upside down as seen from Australia: Crisium low on the left, Imbrium and Procellarum low on the right.
    for (const [dx, dy, rx, ry, a] of [[-0.55, 0.3, 0.16, 0.13, 0.5], [-0.25, 0.05, 0.22, 0.2, 0.42], [0.05, 0.2, 0.2, 0.17, 0.45], [0.2, -0.2, 0.26, 0.2, 0.35], [0.5, 0.15, 0.3, 0.42, 0.3], [-0.35, -0.35, 0.2, 0.14, 0.3], [0.05, -0.55, 0.18, 0.12, 0.28]] as const) {
      glow(t, x + dx * r, y + dy * r, rx * r * 1.4, ry * r * 1.4, MARE, a);
    }
    // Tycho's rays, near the top now, and a soft shading round the limb.
    pen.dot(x - 0.15 * r, y - 0.72 * r, r * 0.05, PAPER_FILL, 0.9);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      pen.hair([pt(x - 0.15 * r, y - 0.72 * r), pt(x - 0.15 * r + Math.cos(a) * r * 0.5, y - 0.72 * r + Math.sin(a) * r * 0.5)], 0.35, PAPER_FILL, 0.5);
    }
    pen.fill(oval(x, y, r, r, 40).concat(oval(x, y, r * 0.86, r * 0.86, 40).reverse()), MARE, 0.12);
  });
  for (let i = 0; i < 40; i += 8) pen.hair(disc.slice(i, i + 6), 0.5, t.ink, FAR * 0.35);
}

/** A soft ring of light round (x, y), `r` out and `w` wide either side, brightest along its middle. */
function softRing(t: Draw, x: number, y: number, r: number, w: number, color: string, alpha: number): void {
  const { ctx } = t.pen;
  const n = parseInt(color.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r + w);
  g.addColorStop(Math.max(0, (r - w) / (r + w)), `rgba(${rgb},0)`);
  g.addColorStop(r / (r + w), `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x - r - w, y - r - w, (r + w) * 2, (r + w) * 2);
  ctx.restore();
}

/** One star: a white point, the brighter ones with a soft glow and a fine four-pointed glint. */
export function star(t: Draw, x: number, y: number, mag: number, tint = PAPER_FILL): void {
  const { pen } = t;
  if (mag > 0.6) glow(t, x, y, 3 + mag * 4, 3 + mag * 4, tint, 0.35 * mag);
  pen.dot(x, y, 0.3 + mag * 0.6, tint, 0.55 + mag * 0.45);
  if (mag > 0.75) {
    const l = 2 + mag * 4;
    pen.hair([pt(x - l, y), pt(x + l, y)], 0.35, tint, 0.6);
    pen.hair([pt(x, y - l), pt(x, y + l)], 0.35, tint, 0.6);
  }
}

/**
 * The stars, strewn across one tile from y0 down to y1: thick overhead,
 * thinning towards the hazy horizon and drowned out in the moon's light
 * within `moonR` of (moonX, moonY).
 */
export function stars(t: Draw, y0: number, y1: number, n: number, moonX: number, moonY: number, moonR: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const x = pen.rng() * W;
    const u = pen.rng() ** 1.4;
    const y = y0 + (y1 - y0) * u;
    const near = Math.hypot(x - moonX, (y - moonY) * 1.4) / moonR;
    if (near < 1 && pen.rng() > near * near) continue;
    if (pen.rng() < u * 0.6) continue;
    const mag = pen.rng() ** 5;
    star(t, x, y, mag, pen.rng() < 0.15 ? '#ffe9c4' : pen.rng() < 0.2 ? '#cfe0ff' : PAPER_FILL);
  }
}

/**
 * The Southern Cross with its two Pointers off to one side, `s` across:
 * Gacrux at the head, Acrux at the foot, the arms either side, little
 * Epsilon tucked in; the Coalsack lies dark beside it in the Milky Way.
 */
export function southernCross(t: Draw, x: number, y: number, s: number): void {
  glow(t, x - 14 * s, y + 9 * s, 9 * s, 7 * s, NIGHT, 0.5);
  for (const [dx, dy, mag, tint] of [[0, -11, 0.85, '#ffd9b0'], [1.5, 11, 1, PAPER_FILL], [-7, 0, 0.9, '#d9e6ff'], [6.5, -2.5, 0.78, PAPER_FILL], [3.8, 4.4, 0.45, PAPER_FILL], [-34, 13, 1, '#fff2d6'], [-23, 9, 0.92, '#d9e6ff']] as const) {
    star(t, x + dx * s, y + dy * s, mag, tint);
  }
}

/**
 * The Milky Way, a pale river winding across the tile along `mid(x)`
 * (which must repeat every tile): soft light thickest down its middle,
 * crowded with tiny stars, split by dark lanes of dust.
 */
export function milkyWay(t: Draw, mid: (x: number) => number, width: number): void {
  const { pen } = t;
  for (let x = 0; x < W; x += 22) {
    glow(t, x + pen.jitter(6), mid(x) + pen.jitter(width * 0.15), width * (0.9 + pen.rng() * 0.6), width * 0.45, MILKY, 0.14 + pen.rng() * 0.08);
    if (pen.rng() < 0.6) glow(t, x + pen.jitter(10), mid(x) + pen.jitter(width * 0.25), width * 0.4, width * 0.18, PAPER_FILL, 0.12);
  }
  // The dust lanes: dark rifts running along the band, off its middle.
  for (let x = 0; x < W; x += 30) {
    if (pen.rng() < 0.35) continue;
    glow(t, x, mid(x) + width * (0.08 + 0.1 * Math.sin(x / 70)), width * 0.7, width * 0.1, NIGHT, 0.35);
  }
  for (let k = 0; k < 1600; k++) {
    const x = pen.rng() * W;
    const off = (pen.rng() + pen.rng() + pen.rng() - 1.5) * width * 0.6;
    pen.dot(x, mid(x) + off, 0.25 + pen.rng() * 0.3, PAPER_FILL, 0.25 + pen.rng() * 0.45);
  }
}

/**
 * A cloud's puffs: rounded heads along its length, tallest in the middle,
 * smaller ones heaped on them, low ragged ones at its ends; then the base,
 * a row of flattened lumps. Heads first, base last.
 */
function puffsOf(t: Draw, x: number, base: number, w: number, h: number): Pt[][] {
  const { pen } = t;
  const n = Math.max(3, Math.round(w / (h * 0.75)));
  const lumpy = (cx: number, cy: number, rx: number, ry: number): Pt[] => oval(cx, cy, rx, ry, 26).map((p) => pt(p.x + pen.jitter(rx * 0.05), p.y + pen.jitter(ry * 0.05)));
  const heads: Pt[][] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const env = Math.sin(Math.PI * u) ** 0.8;
    const rx = (w / n) * (0.65 + pen.rng() * 0.4) + h * 0.1;
    const ry = h * (0.22 + 0.5 * env) * (0.75 + pen.rng() * 0.5);
    const cx = x - w / 2 + w * u + pen.jitter(h * 0.2);
    heads.push(lumpy(cx, base - ry * 0.85 - h * 0.12, rx, ry));
    if (env > 0.6 && pen.rng() < 0.7) heads.push(lumpy(cx + pen.jitter(rx * 0.4), base - ry * 1.55 - h * 0.12, rx * 0.5, ry * 0.5));
  }
  const foot: Pt[][] = [];
  for (let i = 0; i < n + 1; i++) {
    const u = i / n;
    foot.push(lumpy(x - w / 2 + w * u + pen.jitter(h * 0.2), base - h * 0.12, (w / n) * 0.75, h * (0.14 + pen.rng() * 0.06)));
  }
  return [...heads, ...foot];
}

const inside = (p: Pt, s: readonly Pt[]): boolean => {
  let hit = false;
  for (let i = 0, j = s.length - 1; i < s.length; j = i++) {
    const a = s[i]!;
    const b = s[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};

/**
 * A cloud by moonlight: a dark, soft-edged mass, deepest underneath, its
 * heads lit from behind with a bright silver lining that runs round its
 * skyline, `lit` (0..1) as bright as it is near the moon.
 */
export function moonCloud(t: Draw, x: number, base: number, w: number, h: number, lit = 1): void {
  const { pen } = t;
  const puffs = puffsOf(t, x, base, w, h);
  // A soft fringe of thinner cloud round it, then the body.
  glow(t, x, base - h * 0.45, w * 0.7, h * 1.1, CLOUD, 0.35);
  for (const p of puffs) {
    const ys = p.map((q) => q.y);
    const cx = p.reduce((a, q) => a + q.x, 0) / p.length;
    glow(t, cx, (Math.min(...ys) + Math.max(...ys)) / 2, (Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x))) * 0.65, (Math.max(...ys) - Math.min(...ys)) * 0.7, CLOUD, 0.3);
  }
  union(t, puffs, CLOUD, 0.82);
  union(t, puffs, '', 0, () => {
    // Darkening downwards to the belly, the moon catching the heads' tops.
    const g = pen.ctx.createLinearGradient(0, base - h, 0, base);
    g.addColorStop(0, rgba(CLOUD_DARK, 0));
    g.addColorStop(1, rgba(CLOUD_DARK, 0.75));
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(x - w, base - h * 1.4, w * 2, h * 1.5);
    for (const p of puffs) {
      const top = Math.min(...p.map((q) => q.y));
      const cx = p.reduce((a, q) => a + q.x, 0) / p.length;
      glow(t, cx - h * 0.08, top + h * 0.12, h * 0.55, h * 0.2, SILVER, 0.26 * lit);
      // Each billow's lower edge, where it bulges over the one below.
      const rim = p.slice(2, 11);
      pen.hair(rim, 0.45, t.ink, FAR * 0.3);
      pen.hair(rim.map((q) => pt(q.x, q.y - 0.8)), 0.6, SILVER, 0.18 * lit);
    }
    pen.hatch(puffs[0]!.map((p) => pt(p.x, base - h * 0.32 + (p.y - base) * 0.2)), 1.7, 0.4, 0.35, { color: t.ink, alpha: FAR * 0.35, onlyBelow: base - h * 0.3 });
  });
  // The silver lining: the part of each puff's rim that is the cloud's skyline.
  for (let i = 0; i < puffs.length; i++) {
    const rim = puffs[i]!;
    const cy = rim.reduce((a, q) => a + q.y, 0) / rim.length;
    let run: Pt[] = [];
    const flush = (): void => {
      if (run.length > 2) {
        pen.hair(run, 1.8, SILVER, 0.5 * lit);
        pen.hair(run.map((p) => pt(p.x, p.y + 0.5)), 0.7, PAPER_FILL, 0.95 * lit);
      }
      run = [];
    };
    for (const p of [...rim, rim[0]!]) {
      const edge = p.y < cy + 1 && !puffs.some((o, j) => j !== i && inside(p, o));
      if (edge) run.push(p);
      else flush();
    }
    flush();
  }
  for (let k = 0; k < 4; k++) {
    const sx = x - w * 0.45 + pen.rng() * w * 0.6;
    pen.hair([pt(sx, base - 0.5 + pen.jitter(1)), pt(sx + w * (0.12 + pen.rng() * 0.25), base - 0.8 + pen.jitter(1))], 0.45, t.ink, FAR * 0.35);
  }
}

/** A long, thin veil of cloud lying across the sky, lit along its upper edge. */
export function veil(t: Draw, x: number, y: number, w: number, h: number, lit = 1): void {
  const { pen } = t;
  for (let k = 0; k < 7; k++) glow(t, x - w / 2 + (w * (k + 0.5)) / 7 + pen.jitter(6), y + pen.jitter(1), w / 6, h * (0.6 + pen.rng() * 0.5), CLOUD, 0.5);
  const top = bezier(pt(x - w * 0.45, y - h * 0.2), pt(x, y - h * 0.9), pt(x + w * 0.45, y - h * 0.15), 18);
  pen.hair(top, 0.9, SILVER, 0.55 * lit);
  pen.hair(top.slice(3, 15).map((p) => pt(p.x, p.y + 0.5)), 0.4, PAPER_FILL, 0.85 * lit);
}
