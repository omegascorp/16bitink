import { createRng } from '../logic/rng';
import { capsule, edge, oval, pt, type Draw } from './kit';
import { BOUNCE, dab, gleam, glow, LIGHT, mix, paint, rgba, SHADOW } from './paint';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { part, rivets, roundRect, seam, WASH } from './prospector/parts';

/**
 * The lander's materials and fittings, painted (landerArt.ts puts them
 * together): enamelled hull plate rolled round a cylinder, crinkled gold
 * foil on the descent stage, charcoal heat-shield tiles, a heat-tinted
 * engine bell, and the porthole, hatch, ladder, dish, thrusters and hopper.
 * Units as landerArt.ts: origin at the feet's middle, up is negative y.
 */
export const ENAMEL = '#dcdcd6';
export const FOIL = '#bf9547';
export const TILE_INK = '#3d3c46';
const SCORCH = '#2f2b36';

/**
 * A body of revolution in hull plate, lit from the upper left: across it the
 * light runs from a dark rim to a bright band a third of the way in, falls
 * to a core shadow and lifts again with light bounced off the ground; down
 * it, the top catches the sky and the base is scorched from the landing.
 */
export function hullPlate(d: Draw, shape: readonly Pt[], color: string, x0: number, x1: number, y0: number, y1: number, scorch = 0.5): void {
  const { pen } = d;
  const ctx = pen.ctx;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, mix(color, SHADOW, 0.35));
    g.addColorStop(0.12, color);
    g.addColorStop(0.3, mix(color, LIGHT, 0.65));
    g.addColorStop(0.42, mix(color, LIGHT, 0.25));
    g.addColorStop(0.72, mix(color, SHADOW, 0.25));
    g.addColorStop(0.9, mix(color, SHADOW, 0.48));
    g.addColorStop(1, mix(color, BOUNCE, 0.4));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    const v = ctx.createLinearGradient(0, y0, 0, y1);
    v.addColorStop(0, rgba(LIGHT, 0.25));
    v.addColorStop(0.35, rgba(LIGHT, 0));
    v.addColorStop(0.8, rgba(SCORCH, 0));
    v.addColorStop(1, rgba(SCORCH, scorch * 0.6));
    ctx.fillStyle = v;
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  });
  // Light hatching down the shadow side, as an engraver models a cylinder.
  const sx = x0 + (x1 - x0) * 0.74;
  pen.clipped([pt(sx, y0), pt(x1 + 2, y0), pt(x1 + 2, y1), pt(sx, y1)], () => pen.hatch(shape, 2.4, Math.PI / 2 + 0.08, 0.4, { color: d.ink, alpha: 0.18 }));
}

/** Weathering on hull plate: grime streaked down from the seams and rivets, and chips in the enamel. */
export function weather(d: Draw, shape: readonly Pt[], x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const rng = createRng(seed);
  d.pen.clipped(shape, () => {
    for (let k = 0; k < 14; k++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0) * 0.8;
      const len = 4 + rng() * 12;
      dab(d, [pt(x - 0.7, y), pt(x + 0.7, y), pt(x + 0.3, y + len), pt(x - 0.3, y + len)], '#5a5560', 0.12 + rng() * 0.1, 0.6);
    }
    for (let k = 0; k < 10; k++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      const r = 0.5 + rng() * 1.1;
      d.pen.fill(oval(x, y, r * 1.3, r, 7), '#6d6a72', 0.55);
      d.pen.fill(oval(x - 0.3, y - 0.4, r * 0.8, r * 0.5, 7), PAPER_FILL, 0.5);
    }
  });
}

/**
 * Crinkled gold foil, as wrapped round a descent stage: an ochre wash lit
 * across like the hull, broken into small facets that each catch the light
 * or fall into shade.
 */
export function foil(d: Draw, shape: readonly Pt[], x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  hullPlate(d, shape, FOIL, x0, x1, y0, y1, 0.3);
  const rng = createRng(seed);
  pen.clipped(shape, () => {
    for (let k = 0; k < 90; k++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      const s = 1.2 + rng() * 2.6;
      const a = rng() * Math.PI;
      const facet = [pt(x, y), pt(x + Math.cos(a) * s, y + Math.sin(a) * s), pt(x + Math.cos(a + 1.9) * s * 0.8, y + Math.sin(a + 1.9) * s * 0.8)];
      const lit = rng() < 0.5;
      // Facets on the shadow side mostly stay dark.
      const across = (x - x0) / (x1 - x0);
      pen.fill(facet, lit && rng() > across * 0.8 ? '#fff0b6' : '#5e3f12', lit ? 0.32 : 0.22);
    }
    ctx.globalAlpha = 1;
    // A few long creases where the foil folds.
    for (let k = 0; k < 7; k++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      const pts = [pt(x, y), pt(x + 3 + rng() * 4, y + (rng() - 0.5) * 4), pt(x + 7 + rng() * 5, y + (rng() - 0.5) * 6)];
      pen.hair(pts, 0.35, '#5e3f12', 0.6);
      pen.hair(pts.map((p) => pt(p.x - 0.3, p.y - 0.4)), 0.3, '#fff0b6', 0.5);
    }
  });
  edge(d, shape, 0.9, 0.9);
}

/** A band of heat-shield tiles round the hull's base: charcoal, each tile edged in light above and dark below. */
export function heatShield(d: Draw, x0: number, x1: number, y0: number, y1: number, torn?: readonly [number, number]): void {
  const band = [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
  hullPlate(d, band, '#55535e', x0, x1, y0, y1, 0.2);
  const rows = 2;
  const h = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 === 0 ? 0 : 2.6;
    for (let x = x0 + off; x < x1; x += 5.2) {
      if (torn && x > torn[0] && x < torn[1]) continue;
      const y = y0 + r * h;
      d.pen.hair([pt(x, y + 0.2), pt(x + 0.1, y + h - 0.2)], 0.35, '#1d1c24', 0.8);
      d.pen.hair([pt(x + 0.5, y + 0.4), pt(x + 4.6, y + 0.4)], 0.3, '#a9a6b0', 0.45);
    }
    if (r > 0) d.pen.hair([pt(x0, y0 + r * h), pt(x1, y0 + r * h)], 0.4, '#1d1c24', 0.75);
  }
  edge(d, band, 0.8, 0.9);
}

/** The engine bell: dark metal blued and bronzed by heat in bands towards its mouth. */
export function bell(d: Draw, x: number, top: number, bottom: number, w: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = [pt(x - w * 0.55, top), pt(x + w * 0.55, top), pt(x + w, bottom), pt(x - w, bottom)];
  hullPlate(d, b, '#6d6874', x - w, x + w, top, bottom, 0);
  pen.clipped(b, () => {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(160, 120, 70, 0.35)');
    g.addColorStop(0.45, 'rgba(110, 80, 150, 0.32)');
    g.addColorStop(0.75, 'rgba(70, 90, 160, 0.3)');
    g.addColorStop(1, 'rgba(30, 28, 44, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, top, w * 2, bottom - top);
  });
  for (let k = 1; k < 4; k++) {
    const y = top + ((bottom - top) * k) / 4;
    const half = w * (0.55 + 0.45 * (k / 4));
    pen.hair([pt(x - half, y), pt(x, y + 0.8), pt(x + half, y)], 0.4, '#1d1c24', 0.6);
  }
  gleam(d, [pt(x - w * 0.42, top + 1.5), pt(x - w * 0.7, bottom - 1.5)], 0.7, 0.55);
  edge(d, b, 0.9);
  edge(d, oval(x, bottom, w, 1.4, 18), 0.7, 0.9);
}

/** The bell after the crash: one rim pushed in, the wall creased, scorched black round the throat. */
export function crumpledBell(d: Draw, x: number, top: number, bottom: number, w: number): void {
  const h = bottom - top;
  const b = [pt(x - w * 0.6, top), pt(x + w * 0.55, top), pt(x + w * 0.7, top + h * 0.5), pt(x + w * 0.95, bottom), pt(x + w * 0.1, bottom - h * 0.25), pt(x - w * 0.9, bottom + h * 0.05)];
  hullPlate(d, b, '#5f5a66', x - w, x + w, top, bottom, 0.7);
  dab(d, [pt(x - w * 0.6, top), pt(x + w * 0.55, top), pt(x + w * 0.3, top + h * 0.45), pt(x - w * 0.5, top + h * 0.5)], SCORCH, 0.6, 1.2);
  d.pen.stroke([pt(x + w * 0.7, top + h * 0.5), pt(x + w * 0.2, top + h * 0.65), pt(x + w * 0.1, bottom - h * 0.25)], 0.6, d.ink, 0.85, false);
  // A burnt wire hanging loose.
  d.pen.stroke([pt(x - w * 0.3, top), pt(x - w * 0.6, top + h * 0.4), pt(x - w * 0.4, top + h * 0.75)], 0.55, d.ink, 0.85, false);
  edge(d, b, 0.9);
}

/** Smoke from the dead engine: soft grey plumes curling up and away to the right. */
export function smoke(d: Draw, x: number, y: number, seed: number): void {
  const rng = createRng(seed);
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const cx = x + t * 34 + Math.sin(t * 5 + rng()) * 3;
    const cy = y - t * 58 - rng() * 3;
    const r = 3.4 + t * 8 + rng() * 2;
    // Each puff dark in its core, its top lit by the glow.
    dab(d, oval(cx, cy, r, r * 0.8, 14), mix('#4a4654', '#bdb8c6', t * 0.7), 0.75 * (1 - t * 0.5), r * 0.35);
    dab(d, oval(cx - r * 0.25, cy - r * 0.3, r * 0.55, r * 0.35, 12), '#f3e6cf', 0.25 * (1 - t * 0.5), r * 0.3);
  }
}

/** Where the lander's shadow falls on the ground, soft at its edges. */
export function groundShadow(d: Draw, x0: number, x1: number): void {
  dab(d, oval((x0 + x1) / 2 + 4, -0.6, (x1 - x0) / 2, 2.4, 24), '#1e1d2c', 0.32, 1.6);
}

/** The porthole: a bolted ring, glass reflecting the night sky, or the printer's warm light behind it, or dead and cracked. */
export function porthole(d: Draw, c: Pt, r: number, state: 'plain' | 'lit' | 'dark' = 'plain'): void {
  const ring = oval(c.x, c.y, r + 2.8, r + 2.8, 28);
  part(d, ring, WASH.metal, { shadow: 0.6, line: 0.7, gloss: true });
  const glass = oval(c.x, c.y, r, r, 28);
  const base = state === 'dark' ? '#3c4254' : state === 'lit' ? '#f2c477' : '#33406a';
  paint(d, glass, base, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.7, gloss: true });
  if (state === 'lit') {
    glow(d.pen.ctx, pt(c.x + r * 0.15, c.y + r * 0.25), r * 1.1, '#fff1c0', 0.75);
    // The printer's bed behind the glass, a dark shelf in the light.
    d.pen.clipped(glass, () => d.pen.fill([pt(c.x - r, c.y + r * 0.45), pt(c.x + r, c.y + r * 0.35), pt(c.x + r, c.y + r), pt(c.x - r, c.y + r)], '#7c5a32', 0.45));
  }
  if (state === 'dark') {
    d.pen.hair([pt(c.x - r * 0.7, c.y - r * 0.3), pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.5, c.y - r * 0.5)], 0.5, PAPER_FILL, 0.7);
    d.pen.hair([pt(c.x - r * 0.1, c.y + r * 0.1), pt(c.x + r * 0.2, c.y + r * 0.75)], 0.5, PAPER_FILL, 0.7);
  }
  // The reflection of the sky's glow across the glass, and a hard glint.
  d.pen.clipped(glass, () => dab(d, oval(c.x - r * 0.35, c.y - r * 0.45, r * 0.7, r * 0.35, 16), PAPER_FILL, state === 'lit' ? 0.3 : 0.5, r * 0.12));
  d.pen.dot(c.x - r * 0.45, c.y - r * 0.5, Math.max(0.6, r * 0.12), PAPER_FILL, 0.95);
  rivets(d, Array.from({ length: 10 }, (_, i) => pt(c.x + Math.cos((i / 10) * Math.PI * 2) * (r + 1.5), c.y + Math.sin((i / 10) * Math.PI * 2) * (r + 1.5))), 0.42);
}

/** The hatch: a sunk door frame, the door with its wheel and small window; `open` hangs it ajar. */
export function hatch(d: Draw, x: number, top: number, bottom: number, open = false): void {
  const w = 14;
  const frame = roundRect(x - 1.4, top - 1.4, x + w + 1.4, bottom + 1.4, 2.8);
  paint(d, frame, mix(ENAMEL, SHADOW, 0.35), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.8 });
  if (open) {
    // A black doorway with the door swung out to the right, seen edge-on.
    paint(d, roundRect(x, top, x + w, bottom, 2), '#1f1d2a', { alpha: 1, shadow: 0, hatch: 0, line: 0.7 });
    glow(d.pen.ctx, pt(x + w * 0.4, bottom - 4), 6, '#6c6aa0', 0.3);
    const door = [pt(x + w, top), pt(x + w + 5, top + 2), pt(x + w + 5, bottom + 2), pt(x + w, bottom)];
    part(d, door, ENAMEL, { shadow: 0.5, line: 0.8 });
    return;
  }
  const door = roundRect(x, top, x + w, bottom, 2);
  hullPlate(d, door, ENAMEL, x, x + w, top, bottom, 0.2);
  edge(d, door, 0.8);
  const win = roundRect(x + 3.4, top + 3, x + w - 3.4, top + 9, 1.4);
  paint(d, win, '#33406a', { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6, gloss: true });
  d.pen.clipped(win, () => dab(d, oval(x + 5.2, top + 4.6, 2.6, 1.2, 12), PAPER_FILL, 0.5, 0.3));
  // The locking wheel.
  const c = pt(x + w / 2, top + (bottom - top) * 0.62);
  part(d, oval(c.x, c.y, 2.8, 2.8, 16), WASH.metal, { shadow: 0.5, line: 0.6, gloss: true, hatch: 0 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    d.pen.hair([pt(c.x - Math.cos(a) * 2.6, c.y - Math.sin(a) * 2.6), pt(c.x + Math.cos(a) * 2.6, c.y + Math.sin(a) * 2.6)], 0.4, d.ink, 0.8);
  }
  seam(d, [pt(x + 1.5, bottom - 4), pt(x + w - 1.5, bottom - 4)], 0.35);
}

/** The ladder from the hatch to the ground: two rails and rungs, each lit along its top. */
export function ladder(d: Draw, x0: number, x1: number, top: number, lean: number): void {
  for (const lx of [x0, x1]) {
    const rail = capsule(pt(lx, top), pt(lx + lean, -0.5), 1.2, 1.2);
    part(d, rail, WASH.metal, { shadow: 0.5, line: 0.5, gloss: true, hatch: 0 });
  }
  for (let y = top + 4; y < -1; y += 5) {
    const t = (y - top) / -top;
    const a = pt(x0 + lean * t + 0.6, y);
    const b = pt(x1 + lean * t - 0.6, y);
    d.pen.stroke([a, b], 1, d.ink, 0.85, false);
    d.pen.stroke([pt(a.x, a.y - 0.35), pt(b.x, b.y - 0.35)], 0.4, '#e9ecf2', 0.8, false);
  }
}

/** An RCS quad: a small block with three bell nozzles, sooted round them. */
export function rcs(d: Draw, x: number, y: number, side: 1 | -1): void {
  const block = roundRect(x - 2.6, y - 2.6, x + 2.6, y + 2.6, 0.7);
  part(d, block, WASH.metal, { shadow: 0.55, line: 0.6, gloss: true, hatch: 0 });
  for (const [dx, dy] of [[side, 0], [0, -1], [0, 1]] as const) {
    const base = pt(x + dx * 2.6, y + dy * 2.6);
    const tip = pt(x + dx * 5.2, y + dy * 5.2);
    const nx = dy === 0 ? 0 : 1;
    const ny = dy === 0 ? 1 : 0;
    const n = [pt(base.x + nx * 0.8, base.y + ny * 0.8), pt(tip.x + nx * 1.4, tip.y + ny * 1.4), pt(tip.x - nx * 1.4, tip.y - ny * 1.4), pt(base.x - nx * 0.8, base.y - ny * 0.8)];
    part(d, n, WASH.darkMetal, { shadow: 0.3, line: 0.45, hatch: 0 });
  }
}

/** The radio dish on its mast: a white bowl, lit inside, with a feed horn. */
export function dish(d: Draw, at: Pt, r: number): void {
  const mast = capsule(at, pt(at.x + 2, at.y - r * 1.3), 1.2, 1);
  part(d, mast, WASH.metal, { shadow: 0.4, line: 0.5, hatch: 0 });
  const c = pt(at.x + 2, at.y - r * 1.65);
  const tilt = -0.5;
  const bowl: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.55;
    bowl.push(pt(c.x + x * Math.cos(tilt) - y * Math.sin(tilt), c.y + x * Math.sin(tilt) + y * Math.cos(tilt)));
  }
  part(d, bowl, '#eceae4', { shadow: 0.55, line: 0.7, gloss: true });
  // The dish's open face, a shallow ellipse, shaded inside.
  const rim: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.16;
    rim.push(pt(c.x + x * Math.cos(tilt) - y * Math.sin(tilt), c.y + x * Math.sin(tilt) + y * Math.cos(tilt)));
  }
  paint(d, rim, '#c8cbd3', { alpha: 1, shadow: 0.6, hatch: 0, line: 0.6 });
  const horn = pt(c.x + Math.sin(tilt) * r * 0.9, c.y - Math.cos(tilt) * r * 0.9);
  d.pen.stroke([c, horn], 0.6, d.ink, 0.9, false);
  d.pen.dot(horn.x, horn.y, 0.9, d.ink);
}

/** The dish after the crash: the mast snapped, the bowl hanging off the hull by its cable. */
export function snappedDish(d: Draw, at: Pt, r: number): void {
  const stub = capsule(at, pt(at.x + 1, at.y - r * 0.5), 1.2, 1);
  part(d, stub, WASH.metal, { shadow: 0.4, line: 0.5, hatch: 0 });
  d.pen.stroke([pt(at.x + 0.2, at.y - r * 0.5), pt(at.x + 1.6, at.y - r * 0.62), pt(at.x + 1, at.y - r * 0.45)], 0.6, d.ink, 0.9, false);
  // The bowl hangs upside down against the dome's flank, on its cable.
  const c = pt(at.x - r * 2.2, at.y + r * 2.4);
  const bowl: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + Math.PI * (i / 14);
    bowl.push(pt(c.x + Math.cos(a) * r * 0.55 + Math.sin(a) * r * 0.2, c.y - Math.sin(a) * r * 0.95));
  }
  d.pen.stroke([pt(at.x + 0.6, at.y - r * 0.4), pt(at.x - r * 1.2, at.y + r * 0.2), pt(c.x + r * 0.2, c.y - r * 0.9)], 0.5, d.ink, 0.85, false);
  part(d, bowl, '#eceae4', { shadow: 0.55, line: 0.7 });
  d.pen.hair([pt(c.x - r * 0.1, c.y), pt(c.x + r * 0.3, c.y + r * 0.6)], 0.5, d.ink, 0.8);
}

/** The hull's gash after the crash: a long jagged tear, its edges bent inward and lit, the dark inside showing wires. */
export function gash(d: Draw, c: Pt): void {
  const top = [pt(c.x - 9, c.y + 1.5), pt(c.x - 6, c.y - 0.6), pt(c.x - 4, c.y + 0.4), pt(c.x - 1, c.y - 2.4), pt(c.x + 1.5, c.y - 1), pt(c.x + 4, c.y - 3), pt(c.x + 6.5, c.y - 1.6), pt(c.x + 9, c.y - 2.6)];
  const bottom = [pt(c.x + 9, c.y - 2.6), pt(c.x + 7, c.y + 0.4), pt(c.x + 4.5, c.y - 0.2), pt(c.x + 2, c.y + 2.2), pt(c.x - 1, c.y + 1), pt(c.x - 4, c.y + 3), pt(c.x - 7, c.y + 2.4)];
  const hole = [...top, ...bottom.slice(1)];
  paint(d, hole, '#2a2733', { alpha: 1, shadow: 0, hatch: 0, line: 0.7 });
  d.pen.clipped(hole, () => {
    d.pen.stroke([pt(c.x - 6, c.y + 2), pt(c.x - 1, c.y), pt(c.x + 5, c.y + 0.5)], 0.6, '#b07a3a', 0.85, false);
    d.pen.stroke([pt(c.x - 3, c.y - 1), pt(c.x + 3, c.y + 1.2)], 0.5, '#7d93c4', 0.85, false);
  });
  // The torn lip above is lit where it bends in; the one below sits in shadow.
  d.pen.stroke(top.map((p) => pt(p.x, p.y - 0.7)), 0.8, '#fff6e2', 0.8, false);
  d.pen.stroke(bottom.map((p) => pt(p.x, p.y + 0.8)), 0.8, '#3b3946', 0.5, false);
  // Cracks running off into the plate.
  d.pen.hair([pt(c.x - 9, c.y + 1.5), pt(c.x - 12, c.y + 0.4), pt(c.x - 14, c.y + 1.4)], 0.4, d.ink, 0.8);
  d.pen.hair([pt(c.x + 9, c.y - 2.6), pt(c.x + 11, c.y - 5), pt(c.x + 13.5, c.y - 5.4)], 0.4, d.ink, 0.8);
}

/** The welded plate over where the gash was: newer metal, a bead of weld along its edges, heat-tint round it. */
export function weldPlate(d: Draw, c: Pt): void {
  dab(d, oval(c.x, c.y, 12, 7.5, 18), '#8a6a8a', 0.22, 1.4);
  const plate = roundRect(c.x - 8.5, c.y - 5, c.x + 8.5, c.y + 5, 1.2);
  part(d, plate, '#c9ccd2', { shadow: 0.45, line: 0.7, gloss: true });
  rivets(d, [pt(c.x - 6.5, c.y - 3.4), pt(c.x + 6.5, c.y - 3.4), pt(c.x - 6.5, c.y + 3.2), pt(c.x + 6.5, c.y + 3.2)], 0.45);
  for (let x = c.x - 8; x < c.x + 8.5; x += 1.6) d.pen.dot(x, c.y - 5.2, 0.5, '#5f5866', 0.8);
}

/** The ore hopper: a funnel on a bracket where the bag is tipped in, with the last load on its lip. */
export function hopper(d: Draw, x: number, top: number, wash: string): void {
  const bracket = [pt(x - 3, top + 8), pt(x + 4, top + 8), pt(x + 4, top + 10), pt(x - 3, top + 10)];
  part(d, bracket, WASH.darkMetal, { shadow: 0.3, line: 0.5, hatch: 0 });
  const funnel = [pt(x, top), pt(x + 17, top), pt(x + 11, top + 12), pt(x + 6, top + 12)];
  hullPlate(d, funnel, wash, x, x + 17, top, top + 12, 0.25);
  edge(d, funnel, 0.9);
  seam(d, [pt(x + 1.4, top + 2.6), pt(x + 15.6, top + 2.6)], 0.4);
  const chute = [pt(x + 6, top + 12), pt(x + 11, top + 12), pt(x + 4.5, top + 20), pt(x, top + 19)];
  part(d, chute, WASH.darkMetal, { shadow: 0.4, line: 0.55, gloss: true });
  // A few ore lumps on the lip, in highlighter: the last load.
  for (const [lx, c] of [[x + 4, '#ffa94d'], [x + 9, '#f3e04a'], [x + 12.8, '#74c7f2']] as const) {
    const lump = oval(lx, top - 1.2, 2, 1.5, 10);
    paint(d, lump, c, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
  }
}

/** One landing leg: a foil-wrapped upper strut, a shock strut into a dish-shaped pad, a thin brace. `far` legs sit back in shadow. */
export function leg(d: Draw, hip: Pt, knee: Pt, foot: Pt, braceFrom: Pt, far = false): void {
  const tone = far ? 0.35 : 0;
  d.pen.stroke([braceFrom, knee], far ? 0.7 : 0.9, d.ink, 0.85, false);
  const upper = capsule(hip, knee, 4, 3.4);
  paint(d, upper, mix(FOIL, SHADOW, tone), { alpha: 1, shadow: 0.55, hatch: 0, line: 0.7 });
  d.pen.clipped(upper, () => {
    for (let k = 0; k < 6; k++) {
      const t = (k + 0.5) / 6;
      const p = pt(hip.x + (knee.x - hip.x) * t, hip.y + (knee.y - hip.y) * t);
      d.pen.hair([pt(p.x - 1.6, p.y - 1), pt(p.x + 1.6, p.y + 1)], 0.35, '#5e3f12', 0.5);
    }
  });
  const lower = capsule(knee, foot, 2.4, 2.2);
  part(d, lower, mix(WASH.metal, SHADOW, tone), { shadow: 0.45, line: 0.6, gloss: true, hatch: 0 });
  part(d, oval(knee.x, knee.y, 2.4, 2.4, 14), mix(WASH.darkMetal, SHADOW, tone), { shadow: 0.4, line: 0.55, gloss: true, hatch: 0 });
  const pad = [pt(foot.x - 7, foot.y + 0.8), pt(foot.x - 5, foot.y - 1.6), pt(foot.x + 5, foot.y - 1.6), pt(foot.x + 7, foot.y + 0.8)];
  part(d, pad, mix(WASH.metal, SHADOW, tone), { shadow: 0.5, line: 0.7, gloss: true, hatch: 0 });
}

/** The spare fuel tank strapped to a leg. */
export function spareTank(d: Draw, x: number, y0: number, y1: number): void {
  const tank = capsule(pt(x, y0), pt(x, y1), 5, 5);
  part(d, tank, WASH.can, { shadow: 0.6, line: 0.7, gloss: true });
  for (const y of [y0 + 3.5, y1 - 3.5]) {
    const strap = roundRect(x - 2.8, y - 0.7, x + 2.8, y + 0.7, 0.3);
    part(d, strap, WASH.leather, { shadow: 0.2, line: 0.4, hatch: 0 });
  }
}

/** The pennant on the antenna: a small flag in the guild's cobalt, rippled. */
export function pennant(d: Draw, base: Pt, top: Pt): void {
  d.pen.stroke([base, top], 0.8, d.ink, 1, false);
  const flag = [top, pt(top.x + 6, top.y + 1.4), pt(top.x + 11, top.y + 2.2), pt(top.x + 5.5, top.y + 4.2), pt(top.x, top.y + 5.6)];
  part(d, flag, WASH.fabric, { shadow: 0.4, line: 0.55, hatch: 0 });
  d.pen.dot(top.x, top.y - 0.6, 0.8, d.ink);
}

/** The guild's mark stencilled on the hull: a pick crossed over a star. */
export function guildMark(d: Draw, c: Pt, s: number): void {
  const ink = '#3d4f86';
  d.pen.stroke([pt(c.x - s, c.y + s), pt(c.x + s, c.y - s)], s * 0.32, ink, 0.85, false);
  d.pen.stroke([pt(c.x + s * 0.3, c.y - s * 1.1), pt(c.x + s * 1.1, c.y - s * 0.3)], s * 0.3, ink, 0.85, false);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
    d.pen.hair([pt(c.x - s * 0.2, c.y + s * 0.1), pt(c.x - s * 0.2 + Math.cos(a) * s * 0.9, c.y + s * 0.1 + Math.sin(a) * s * 0.9)], s * 0.22, ink, 0.85);
  }
}

/** A floodlight's lens (its glow is painted round the craft, landerArt.ts). */
export function lamp(d: Draw, at: Pt, r: number): void {
  paint(d, oval(at.x, at.y, r * 0.6, r, 12), '#fff3c8', { alpha: 1, shadow: 0.1, hatch: 0, line: 0.5, gloss: true });
}
