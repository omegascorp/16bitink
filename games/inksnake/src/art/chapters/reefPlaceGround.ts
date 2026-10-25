import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import type { Pt } from '../../logic/vec';
import { blob, edgeWash, polar, SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { PAPER } from '../palette';
import { specks } from '../places/farmGroundParts';
import { type Busy, busyOf, keepsOf, noiseOf, perArea, seedOf, smoothstep, strokes } from '../places/farmKit';
import { mix, rgba } from '../wash';
import { paintCay, paintShallows } from './reefPlaceCay';
import {
  ALGAE, type Cay, caysOf, coralsOf, DEEP, DEEP_DARK, FOAM, glazeAt, H, MID, RUBBLE, RUBBLE_DEEP, rngAt, SAND_UNDER, SHALLOW, shoreDist, TEAL, W, WATER_INK,
} from './reefPlaceKit';
import { paintSeabed } from './reefPlaceSeabed';

/**
 * The reef's ground (chapter 6), seen from above through clear water: deep
 * blue-teal sea, paling to turquoise over the reef flats and round the sand
 * cays; under the water, pale sand patches with ripple marks, darker reef
 * with algae and small coral clumps, a blue starfish or two; each coral
 * head's foot in an apron of pale sand and rubble, with the dead-coral rock
 * of the eels' holes; the shallows and the cays (reefPlaceCay.ts); on top,
 * small wavelets and glints in ink and white, the board's edges deepening.
 * Each level lies differently (seeded from its id).
 */

/** The water's depth wash: deep everywhere, shallowing towards the cays and over drifting reef flats. */
function sea(d: Draw, cays: readonly Cay[], rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = mix(DEEP, MID, 0.35);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const flats = noiseOf(rng, 260);
  const channels = noiseOf(rng, 140);
  // Reef flats (paler, greener) and deep channels (darker, bluer), as broad soft glazes laid wet into wet.
  for (let k = 0; k < perArea(420); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const f = flats(x, y);
    const near = Math.max(0, 1 - shoreDist(cays, x, y) / 260);
    const r = 30 + rng() * 80;
    const rot = rng() * TAU;
    if (f + near * 0.8 > 0.25) glazeAt(ctx, x, y, r, r * (0.5 + rng() * 0.5), rot, mix(MID, rng() < 0.5 ? SHALLOW : TEAL, rng() * 0.6), 0.1 + 0.12 * near);
    else if (channels(x, y) < -0.1) glazeAt(ctx, x, y, r, r * (0.45 + rng() * 0.4), rot, mix(DEEP, DEEP_DARK, rng()), 0.2);
    else glazeAt(ctx, x, y, r * 0.7, r * 0.5, rot, rng() < 0.5 ? TEAL : mix(DEEP, MID, 0.5), 0.1);
  }
  // The paper's tooth, catching pigment.
  specks(d, DEEP_DARK, 0.18, Array.from({ length: perArea(9000) }, () => [rng() * W, rng() * H, 0.3 + rng() * 0.35] as const));
  specks(d, FOAM, 0.16, Array.from({ length: perArea(4000) }, () => [rng() * W, rng() * H, 0.3 + rng() * 0.35] as const));
  // Round each cay the water pales: the reef flat it stands on.
  for (const k of cays) {
    const g = ctx.createRadialGradient(k.c.x, k.c.y, k.r, k.c.x, k.c.y, k.shallows + 150);
    g.addColorStop(0, rgba(SHALLOW, 0.75));
    g.addColorStop(0.3, rgba(mix(SHALLOW, MID, 0.4), 0.45));
    g.addColorStop(0.65, rgba(MID, 0.18));
    g.addColorStop(1, rgba(MID, 0));
    ctx.fillStyle = g;
    ctx.fillRect(k.c.x - k.shallows - 160, k.c.y - k.shallows - 160, (k.shallows + 160) * 2, (k.shallows + 160) * 2);
  }
}

/** Pale sand round a coral head's foot, swept clean by the current, with coral rubble scattered over it. */
function apron(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 3);
  glazeAt(d.pen.ctx, c.x, c.y, r + 36, r + 32, rng() * TAU, mix(SAND_UNDER, SHALLOW, 0.25), 0.5, 0.6);
  for (let i = 0; i < 5; i++) {
    const q = polar(c, rng() * TAU, r + 8 + rng() * 12);
    glazeAt(d.pen.ctx, q.x, q.y, 12 + rng() * 10, 8 + rng() * 8, rng() * TAU, SAND_UNDER, 0.3);
  }
  specks(d, mix(RUBBLE, MID, 0.2), 0.7, Array.from({ length: Math.round(r * 2.2) }, () => {
    const q = polar(c, rng() * TAU, r + 4 + rng() * 22);
    return [q.x, q.y, 0.5 + rng() * 1.3] as const;
  }));
  specks(d, mix(RUBBLE_DEEP, DEEP, 0.3), 0.45, Array.from({ length: Math.round(r * 1.2) }, () => {
    const q = polar(c, rng() * TAU, r + 2 + rng() * 20);
    return [q.x, q.y, 0.4 + rng() * 0.8] as const;
  }));
}

/** A low outcrop of dead coral rock round an eel's hole (the hole itself is drawn by the reef's view, on top). */
function outcrop(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 5);
  const shape = blob(p, 15, 13, rng, 0.25, 22, rng() * TAU);
  pen.fill(shape.map((q) => pt(q.x + SHADOW.x * 4, q.y + SHADOW.y * 4)), DEEP_DARK, 0.3);
  pen.fill(shape, mix('#8a8170', MID, 0.15), 0.95);
  pen.crescent(shape, pt(-SHADOW.x * 5, -SHADOW.y * 5), () => pen.fill(shape, DEEP_DARK, 0.4));
  glazeAt(pen.ctx, p.x - 4, p.y - 4, 7, 5, 0, FOAM, 0.25);
  specks(d, mix(RUBBLE_DEEP, DEEP_DARK, 0.4), 0.55, Array.from({ length: 26 }, () => {
    const q = polar(p, rng() * TAU, Math.sqrt(rng()) * 12);
    return [q.x, q.y, 0.4 + rng() * 0.7] as const;
  }));
  specks(d, ALGAE, 0.4, Array.from({ length: 12 }, () => {
    const q = polar(p, rng() * TAU, 8 + rng() * 6);
    return [q.x, q.y, 0.6 + rng() * 0.9] as const;
  }));
  pen.hair([...shape, shape[0]!], 0.7, d.ink, 0.45);
}

/** Ink hatching over the deepest water, as an engraver darkens a sea: short diagonal strokes in drifting patches. */
function deepHatch(d: Draw, cays: readonly Cay[], busy: Busy, rng: Rng): void {
  const deep = noiseOf(rng, 120);
  strokes(d, WATER_INK, 0.2, 0.6, perArea(3400), () => {
    const x = rng() * W;
    const y = rng() * H;
    const v = deep(x, y) + 0.35 * smoothstep((shoreDist(cays, x, y) - 120) / 200) - 0.25 * (1 - busy(x, y));
    if (v < 0.08 || shoreDist(cays, x, y) < 90) return null;
    return [x, y, -0.62 + (rng() - 0.5) * 0.1, 6 + rng() * 6, (rng() - 0.5) * 1.2];
  });
}

/** The surface: wavelets in ink and glints of white, thicker out in deep water, a deeper blue pooled at the board's edges. */
function surface(d: Draw, cays: readonly Cay[], busy: Busy, rng: Rng): void {
  const { ctx } = d.pen;
  edgeWash(d, W, H, DEEP_DARK, 0.4, 170);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, alpha, width] of [[WATER_INK, 0.22, 0.8], [FOAM, 0.4, 1]] as const) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < perArea(colour === FOAM ? 300 : 420); k++) {
      const x = rng() * W;
      const y = rng() * H;
      const s = shoreDist(cays, x, y);
      if (s < 40 || rng() > 0.25 + 0.75 * busy(x, y)) continue;
      const l = 4 + rng() * 7 * smoothstep(s / 160);
      const off = colour === FOAM ? -1.2 : 0;
      ctx.moveTo(x - l, y + off);
      ctx.quadraticCurveTo(x, y - 2.2 + off, x + l, y + off);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function paintReefGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const cays = caysOf(level);
  const busy = busyOf(keepsOf(level), 60);
  sea(d, cays, rng);
  paintSeabed(d, cays, busy, rng);
  for (const s of coralsOf(level)) apron(d, pt(s.x, s.y), s.r);
  for (const p of level.spots ?? []) outcrop(d, p);
  for (const k of cays) paintShallows(d, k);
  for (const k of cays) paintCay(d, k, level);
  deepHatch(d, cays, busy, createRng(seedOf(level.id) + 23));
  surface(d, cays, busy, createRng(seedOf(level.id) + 17));
}
