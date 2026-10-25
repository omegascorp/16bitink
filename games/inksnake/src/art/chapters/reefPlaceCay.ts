import type { Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import type { Pt } from '../../logic/vec';
import { polar, SHADOW, wash } from '../groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { specks } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';
import {
  ALGAE, ALGAE_DEEP, type Cay, FOAM, glazeAt, LAGOON, rngAt, SAND, SAND_DEEP, SAND_DRY, SAND_UNDER, SAND_WET, SHALLOW, WATER_INK, wobblyRing,
} from './reefPlaceKit';

/**
 * A sand cay and its shallows (the level's land zone and the sand zone round
 * it), from above: turquoise shallows over bright sand, rings of light where
 * the swell bends round the cay; a band of wet sand and a broken line of
 * swash foam at the water's edge; the dry coral sand, warm and gently
 * domed, with its wrack line of washed-up weed and shells, a crab's
 * tracks, and on the bigger cays a few tufts of beach grass and creeping
 * vine back from the snake's start.
 */

/** The shallows round a cay: the pale lagoon over sand, its outer edge pooled, rings of refracted swell. */
export function paintShallows(d: Draw, k: Cay): void {
  const rng = rngAt(k.c.x, k.c.y, 1);
  const { ctx } = d.pen;
  const outer = wobblyRing(k.c, k.shallows + 6, rng, 0.07, 48);
  wash(d, outer, mix(LAGOON, SHALLOW, 0.4), 0.5, 0.5);
  const inner = wobblyRing(k.c, k.r + (k.shallows - k.r) * 0.55, rng, 0.08, 44);
  wash(d, inner, SAND_UNDER, 0.45, 0.2);
  glazeAt(ctx, k.c.x, k.c.y, k.r + 20, k.r + 20, 0, LAGOON, 0.5, 0.75);
  // Rings of light and shade where the swell wraps round the cay.
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const r = k.r + 9 + i * ((k.shallows - k.r) / 4.2);
    const ring = wobblyRing(k.c, r, rng, 0.05, 60);
    for (const [colour, a, off] of [[FOAM, 0.38 - i * 0.06, -0.8], [WATER_INK, 0.12, 0.9]] as const) {
      ctx.strokeStyle = rgba(colour, a);
      ctx.lineWidth = 1.1 - i * 0.15;
      ctx.beginPath();
      let on = rng() < 0.5;
      ring.forEach((p, j) => {
        if (j % 6 === 0) on = rng() < 0.7;
        const q = pt(p.x, p.y + off);
        if (on) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A broken pen line along a closed ring: a contour that comes and goes. */
function brokenRing(d: Draw, ring: readonly Pt[], w: number, alpha: number, rng: Rng, keep = 0.7): void {
  const pts = [...ring, ring[0]!];
  for (let i = 0; i < pts.length - 2; ) {
    const n = 3 + Math.floor(rng() * 6);
    if (rng() < keep) d.pen.hair(pts.slice(i, i + n + 1), w, d.ink, alpha);
    i += n;
  }
}

/** Washed-up weed and bits of shell along the wrack line, a ring inside the shore. */
function wrack(d: Draw, k: Cay, rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(ALGAE_DEEP, 0.55);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  const n = Math.round(k.r * 0.9);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const p = polar(k.c, a, k.r * (0.8 + rng() * 0.1));
    const l = 2 + rng() * 4;
    const t = a + Math.PI / 2 + (rng() - 0.5) * 0.8;
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + Math.cos(t) * l * 0.5 + 1, p.y + Math.sin(t) * l * 0.5 - 1, p.x + Math.cos(t) * l, p.y + Math.sin(t) * l);
  }
  ctx.stroke();
  ctx.restore();
  specks(d, ALGAE, 0.4, Array.from({ length: n }, () => {
    const p = polar(k.c, rng() * TAU, k.r * (0.78 + rng() * 0.12));
    return [p.x, p.y, 0.6 + rng() * 0.8] as const;
  }));
  // Shells and coral bits: white with a pen dot of shadow.
  for (let i = 0; i < Math.round(k.r / 5); i++) {
    const p = polar(k.c, rng() * TAU, k.r * (0.55 + rng() * 0.38));
    const s = 0.9 + rng() * 1.2;
    d.pen.dot(p.x + SHADOW.x * 0.8, p.y + SHADOW.y * 0.8, s, SAND_DEEP, 0.5);
    d.pen.dot(p.x, p.y, s, rng() < 0.3 ? '#f2c9b8' : PAPER_FILL, 0.95);
    if (rng() < 0.5) d.pen.hair([pt(p.x - s, p.y), pt(p.x + s, p.y + s * 0.4)], 0.35, d.ink, 0.5);
  }
}

/** A ghost crab's tracks across the sand: a wandering double row of tiny pricks. */
function crabTrack(d: Draw, k: Cay, rng: Rng): void {
  const pts: (readonly [number, number, number])[] = [];
  const a = rng() * TAU;
  let p = polar(k.c, a, k.r * 0.75);
  let h = a + Math.PI + (rng() - 0.5) * 1.2;
  for (let i = 0; i < k.r * 0.5; i++) {
    h += (rng() - 0.5) * 0.35;
    p = polar(p, h, 2.4);
    if (Math.hypot(p.x - k.c.x, p.y - k.c.y) > k.r * 0.85) break;
    for (const s of [-1, 1]) for (const o of [0, 1.1]) pts.push([p.x + Math.cos(h + Math.PI / 2) * (2.4 + o) * s, p.y + Math.sin(h + Math.PI / 2) * (2.4 + o) * s, 0.4]);
  }
  specks(d, SAND_DEEP, 0.6, pts);
}

/** A tuft of beach grass from above: blades fanning out from a root, with their shadow. */
function grassTuft(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { ctx } = d.pen;
  const blades = Array.from({ length: 9 }, () => [rng() * TAU, s * (0.6 + rng() * 0.5), (rng() - 0.5) * 3] as const);
  for (const [colour, dx, dy, w] of [[d.ink, SHADOW.x * 2.5, SHADOW.y * 2.5, 1.2], ['#7f9a4e', 0, 0, 1.1], ['#c3c97c', -0.5, -0.5, 0.5]] as const) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = colour === d.ink ? rgba(d.ink, 0.16) : colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [a, l, b] of blades) {
      ctx.moveTo(c.x + dx, c.y + dy);
      ctx.quadraticCurveTo(c.x + dx + Math.cos(a) * l * 0.5 - Math.sin(a) * b, c.y + dy + Math.sin(a) * l * 0.5 + Math.cos(a) * b, c.x + dx + Math.cos(a) * l, c.y + dy + Math.sin(a) * l);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** A mat of beach morning glory creeping over the sand: runners, and round two-lobed leaves along them, shaded and outlined. */
function vine(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const leaves: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    let p = polar(c, rng() * TAU, rng() * r * 0.4);
    let h = rng() * TAU;
    const runner: Pt[] = [p];
    for (let j = 0; j < 8; j++) {
      h += (rng() - 0.5) * 0.9;
      p = polar(p, h, r * 0.18);
      runner.push(p);
      if (j % 2 === 1) leaves.push(polar(p, h + (rng() < 0.5 ? 1.4 : -1.4), 2.2));
    }
    pen.hair(runner, 0.6, '#6b7a3a', 0.8);
  }
  for (const l of leaves) {
    const leaf = oval(l.x, l.y, 2.6, 2.2, 12);
    pen.fill(leaf.map((q) => pt(q.x + SHADOW.x * 1.4, q.y + SHADOW.y * 1.4)), d.ink, 0.18);
    pen.fill(leaf, rng() < 0.3 ? '#8fae5a' : '#5f8a45', 0.95);
    pen.crescent(leaf, pt(-SHADOW.x, -SHADOW.y), () => pen.fill(leaf, '#2f5130', 0.35));
    pen.hair([pt(l.x - 1.6, l.y - 1.2), pt(l.x, l.y), pt(l.x + 1.6, l.y - 1.2)], 0.35, '#2f5130', 0.7);
    pen.hair(closed(leaf), 0.4, d.ink, 0.6);
  }
}

/** The cay itself: the wet sand and swash at its edge, the dry sand domed in the sun, its wrack line, tracks and a few plants. */
export function paintCay(d: Draw, k: Cay, level: LevelDef): void {
  const { pen } = d;
  const rng = rngAt(k.c.x, k.c.y, 2);
  const wet = wobblyRing(k.c, k.r + 5, rng, 0.06, 48);
  pen.fill(wet, PAPER_FILL, 0.5);
  wash(d, wet, mix(SAND_WET, SHALLOW, 0.2), 0.75, 0.45);
  const dry = wobblyRing(k.c, k.r - 1, rng, 0.06, 48);
  pen.fill(dry, PAPER_FILL, 1);
  wash(d, dry, SAND, 0.62, 0.3);
  pen.clipped(dry, () => {
    glazeAt(pen.ctx, k.c.x - k.r * 0.25, k.c.y - k.r * 0.3, k.r * 0.75, k.r * 0.6, 0, SAND_DRY, 0.8);
    pen.crescent(dry, pt(-SHADOW.x * k.r * 0.25, -SHADOW.y * k.r * 0.25), () => pen.fill(dry, SAND_DEEP, 0.16));
    // Blooms where the wash dried unevenly.
    for (let i = 0; i < 6; i++) {
      const p = polar(k.c, rng() * TAU, rng() * k.r * 0.7);
      glazeAt(pen.ctx, p.x, p.y, 6 + rng() * 12, 4 + rng() * 8, rng() * TAU, rng() < 0.5 ? SAND_DEEP : SAND_DRY, 0.12);
    }
  });
  pen.clipped(dry, () => {
    // Wind ripples on the dry sand, faint, all one way.
    const wind = rng() * TAU;
    for (let i = -4; i <= 4; i++) {
      const o = polar(k.c, wind + Math.PI / 2, i * k.r * 0.2 + (rng() - 0.5) * 4);
      const line = Array.from({ length: 9 }, (_, j) => polar(polar(o, wind, (j / 8 - 0.5) * k.r * 1.6), wind + Math.PI / 2, Math.sin(j * 1.3 + i) * 2.2));
      pen.hair(line, 0.6, SAND_DEEP, 0.22);
      pen.hair(line.map((p) => pt(p.x - 0.8, p.y - 0.8)), 0.6, PAPER_FILL, 0.4);
    }
  });
  shade(d, dry, 0.2);
  specks(d, SAND_DEEP, 0.32, Array.from({ length: Math.round(k.r * k.r * 0.14) }, () => {
    const p = polar(k.c, rng() * TAU, Math.sqrt(rng()) * k.r * 0.95);
    return [p.x, p.y, 0.25 + rng() * 0.45] as const;
  }));
  wrack(d, k, rng);
  if (Math.hypot(level.start.x - k.c.x, level.start.y - k.c.y) > k.r + 40) crabTrack(d, k, rng);
  // Swash: foam lacing the water's edge, and a pen line that comes and goes along the shore.
  const foam = wobblyRing(k.c, k.r + 3, rng, 0.06, 60);
  pen.ctx.save();
  pen.ctx.strokeStyle = rgba(FOAM, 0.85);
  pen.ctx.lineWidth = 1.8;
  pen.ctx.lineCap = 'round';
  pen.ctx.beginPath();
  [...foam, foam[0]!].forEach((p, j) => (j === 0 || (j % 5 === 0 && rng() < 0.35) ? pen.ctx.moveTo(p.x, p.y) : pen.ctx.lineTo(p.x, p.y)));
  pen.ctx.stroke();
  pen.ctx.restore();
  brokenRing(d, dry, 0.9, 0.65, rng);
  brokenRing(d, wobblyRing(k.c, k.r + 8, rng, 0.06, 60), 0.5, 0.3, rng, 0.45);
  if (k.r >= 50) {
    const startNear = Math.hypot(level.start.x - k.c.x, level.start.y - k.c.y) < k.r;
    const back = startNear ? Math.atan2(k.c.y - level.start.y, k.c.x - level.start.x) - Math.PI * 0.75 : rng() * TAU;
    vine(d, polar(k.c, back, k.r * 0.62), k.r * 0.24, rng);
    for (let i = 0; i < 5; i++) grassTuft(d, polar(k.c, back + (rng() - 0.5) * 1.4, k.r * (0.5 + rng() * 0.3)), 5 + rng() * 3, rng);
  }
}
