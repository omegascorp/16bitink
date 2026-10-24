import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { backArc, beam, CROWN_BLUE, CROWN_GOLD, DEPTH, frontArc, P, roundWash, STONE, TIMBER, TIMBER_DARK } from '../sites/build';
import { blob, castShadow, crisp, dab, flat, gleam, groundShadow, LIGHT, mix, paint, SHADOW, soft } from '../sites/paintKit';
import { lump, ROCK } from '../sites/parts';
import { cone, finial } from '../sites/spire';
import { banner, OAK_DARK, STRAW, tufts } from './dwellingKit';

/**
 * The griffin tower: the griffins' eyrie, a tall slender stone tower on a
 * crag, a timber gallery near its top heaped with great twig nests (a
 * griffin looking out of one), a nest on a bracket below with its eggs, a
 * blue spire, the griffin-head banner and moulted feathers.
 */
const TOWER_STONE = mix(STONE, '#d8cdb4', 0.3);
const TAWNY = '#b8843e';
const PLUMAGE = '#efe6cf';
const BEAK = '#d9a43a';
const TWIGS = ['#5a3d26', '#7a5534', '#8f6a3c', '#a5823a', '#c9a55c'] as const;

/** The tower's axis on the plan. */
const TX = 0;
const TZ = 12;

/** A round shaft tapering from r0 at h0 to r1 at h1: washed round, coursed stone following its curve. */
function shaft(d: Draw, rng: Rng, r0: number, r1: number, h0: number, h1: number, color: string, course = 7): Pt[] {
  const { pen } = d;
  const base = P(TX, TZ, h0);
  const top = P(TX, TZ, h1);
  const body = [...frontArc(base.x, base.y, r0, 20), ...backArc(top.x, top.y, r1, 20)];
  roundWash(d, body, base.x - r0, base.x + r0, color, 0.26);
  pen.clipped(body, () => {
    for (let v = course, k = 0; v < h1 - h0; v += course * (0.8 + rng() * 0.4), k++) {
      const r = r0 + ((r1 - r0) * v) / (h1 - h0);
      const y = base.y - v;
      pen.hair(frontArc(base.x, y, r, 20), 0.45, d.ink, 0.42);
      const n = Math.max(5, Math.round(r / 3.6));
      for (let i = 0; i < n; i++) {
        const t = ((i + (k % 2) * 0.5 + rng() * 0.2) / n) * Math.PI;
        const px = base.x - r * Math.cos(t);
        const py = y + r * DEPTH * Math.sin(t);
        pen.hair([pt(px, py), pt(px, py + course - 0.4)], 0.42, d.ink, 0.4);
        if (rng() < 0.35) {
          const w = 5 * Math.sin(t) + 0.6;
          pen.fill([pt(px, py + 0.3), pt(px + w, py + 0.3), pt(px + w, py + course - 0.3), pt(px, py + course - 0.3)], rng() < 0.5 ? mix(color, LIGHT, 0.5) : mix(color, '#7d6e58', 0.5), 0.2);
        }
      }
      // A lit arris under each course on the lit flank.
      pen.hair(frontArc(base.x, y - 0.5, r, 20).slice(2, 9), 0.5, PAPER_FILL, 0.35);
    }
    for (let i = 0; i < 5; i++) {
      const c = pt(base.x + (rng() - 0.5) * r0 * 1.6, base.y - rng() * (h1 - h0));
      dab(d, blob(c, 5 + rng() * 6, 8 + rng() * 10, rng, 0.3, 14), mix(color, rng() < 0.5 ? '#9c7f58' : '#7d86a0', 0.6), 0.16, 3);
    }
    soft(pen.ctx, 2.5, () => pen.fill([...frontArc(base.x, base.y - 8, r0 + 2, 16), pt(base.x + r0 + 2, base.y + 10), pt(base.x - r0 - 2, base.y + 10)], mix(color, '#5a4a3a', 0.5), 0.25));
  });
  pen.stroke(closed(body), 0.75, d.ink, 0.9);
  return body;
}

/** A moulded ring round the shaft at height h: a lit lip, a shadow under it. */
function band(d: Draw, h: number, r: number): void {
  const c = P(TX, TZ, h);
  const lower = frontArc(c.x, c.y, r + 1.4, 20);
  const upper = frontArc(c.x, c.y - 2.6, r + 1.4, 20);
  d.pen.clipped([...frontArc(c.x, c.y + 6, r, 20), ...frontArc(c.x, c.y, r, 20).reverse()], () => soft(d.pen.ctx, 1.2, () => d.pen.fill([...frontArc(c.x, c.y + 4, r, 20), ...frontArc(c.x, c.y, r, 20).reverse()], SHADOW, 0.32)));
  const ring = [...upper, ...lower.reverse()];
  roundWash(d, ring, c.x - r - 1.4, c.x + r + 1.4, mix(TOWER_STONE, LIGHT, 0.15), 0);
  d.pen.stroke(closed(ring), 0.6, d.ink, 0.9);
}

/** A point on the shaft's face: `s` from -1 (left limb) to 1 (right limb), at height h, radius r. */
const onShaft = (s: number, h: number, r: number): Pt => {
  const c = P(TX, TZ, h);
  return pt(c.x + s * r, c.y + Math.sqrt(Math.max(0, 1 - s * s)) * r * DEPTH);
};

/** A narrow arched window set in the curve of the shaft. */
function shaftWindow(d: Draw, s: number, h: number, r: number, w: number, tall: number): void {
  const c = onShaft(s, h, r);
  const squeeze = Math.sqrt(Math.max(0.2, 1 - s * s));
  const ww = w * squeeze;
  const head = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 8) * Math.PI;
    return pt(c.x + Math.cos(a) * (ww / 2), c.y - tall + ww / 2 - Math.sin(a) * (w / 2));
  });
  const sur = [pt(c.x - ww / 2 - 1.6, c.y + 1.6), pt(c.x + ww / 2 + 1.6, c.y + 1.6), ...head.map((p) => pt(c.x + (p.x - c.x) * ((ww + 3.2) / ww), p.y - 1.6))];
  flat(d, sur, mix(TOWER_STONE, LIGHT, 0.2), { tone: s > 0.3 ? 0.3 : 0, line: 0.5 });
  const hole = [pt(c.x - ww / 2, c.y), pt(c.x + ww / 2, c.y), ...head];
  d.pen.fill(hole, '#2b2738', 0.95);
  d.pen.crescent(hole, pt(-1, -1.2), () => d.pen.fill(hole, mix(TOWER_STONE, SHADOW, 0.2), 0.5));
  d.pen.stroke(closed(hole), 0.6, d.ink, 0.9);
}

// ---- Nests, griffins and feathers ----

/** A great nest of twigs and straw, `c` at the middle of its rim, `rx` across: a rough woven heap, sticks bristling, its cup. */
function nest(d: Draw, rng: Rng, c: Pt, rx: number, cup?: () => void): void {
  const { pen } = d;
  const ry = rx * 0.34;
  const depth = rx * 0.66;
  // The heap's outline: rough all round, sagging lower in the middle.
  const n = 30;
  const heap = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const below = Math.sin(a) > 0;
    const k = 1 + (rng() - 0.5) * 0.16;
    return pt(c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * (below ? depth : ry * 1.15) * k);
  });
  paint(d, heap, '#6e4c30', { shadow: 0.65, hatch: 0.22, line: 0.75 });
  // Twigs woven round the heap, lit towards the upper left, crossing every way.
  pen.clipped(heap, () => {
    for (let i = 0; i < rx * 12; i++) {
      const x = c.x + (rng() * 2 - 1) * rx;
      const y = c.y - ry + rng() * (depth + ry);
      const a = (rng() - 0.5) * 1.3;
      const l = 3 + rng() * 7;
      const lit = (c.x - x) / rx * 0.6 + (c.y - y) / depth > 0.1;
      const col = TWIGS[Math.min(4, Math.floor(rng() * 2.6 + (lit ? 2 : 0)))]!;
      pen.hair([pt(x - Math.cos(a) * l, y - Math.sin(a) * l), pt(x + Math.cos(a) * l, y + Math.sin(a) * l)], 0.6, col, 0.85);
    }
    pen.crescent(heap, pt(-rx * 0.25, -depth * 0.3), () => soft(pen.ctx, 2, () => pen.fill(heap, SHADOW, 0.3)));
  });
  // Sticks bristling out of the weave all round.
  for (let i = 0; i < Math.round(rx * 0.6); i++) {
    const a = (rng() * 0.9 + 0.05) * Math.PI * (rng() < 0.8 ? 1 : -1);
    const base = pt(c.x + Math.cos(a) * rx * 0.75, c.y + Math.sin(a) * (Math.sin(a) > 0 ? depth : ry) * 0.75);
    const l = 6 + rng() * 8;
    const t = a + (rng() - 0.5) * 0.9;
    const tip = pt(base.x + Math.cos(t) * l, base.y + Math.sin(t) * l * 0.7);
    pen.stroke([base, pt((base.x + tip.x) / 2, (base.y + tip.y) / 2 + 0.6), tip], 1.4, TWIGS[Math.floor(rng() * 4)]!, 1, false);
  }
  // The cup: deep in shade at its back, lined with straw and down.
  const rim = blob(pt(c.x + rx * 0.05, c.y - ry * 0.1), rx * 0.74, ry * 0.72, rng, 0.12, 22);
  flat(d, rim, '#4e3424', { tone: 0.25, line: 0.6 });
  pen.clipped(rim, () => {
    pen.fill(oval(c.x + rx * 0.05, c.y + ry * 0.35, rx * 0.66, ry * 0.5, 20), mix(STRAW, '#4e3424', 0.35), 0.75);
    for (let i = 0; i < rx * 2; i++) {
      const p = pt(c.x + (rng() - 0.5) * rx * 1.4, c.y + (rng() - 0.2) * ry);
      const a = (rng() - 0.5) * 0.8;
      pen.hair([p, pt(p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 2)], 0.45, rng() < 0.5 ? STRAW : '#f0dc9c', 0.85);
    }
  });
  cup?.();
  // The rim's front lip: twigs laid over the cup's edge.
  for (let i = 0; i < Math.round(rx * 0.9); i++) {
    const t = (i + rng() * 0.6) / Math.round(rx * 0.9);
    const a = Math.PI * (0.05 + t * 0.9);
    const p = pt(c.x - Math.cos(a) * rx * 0.8, c.y + Math.sin(a) * ry * 0.75);
    const tilt = (rng() - 0.5) * 1.2;
    pen.stroke([pt(p.x - 3.5, p.y - tilt), pt(p.x + 3.5, p.y + tilt)], 0.9, TWIGS[2 + Math.floor(rng() * 3)]!, 0.95, false);
  }
}

/** Two great speckled eggs in a nest's cup. */
function eggs(d: Draw, rng: Rng, c: Pt, s: number): void {
  for (const [dx, dy, k] of [[-0.35, 0.1, 1], [0.4, 0.15, 0.9]] as const) {
    const e = oval(c.x + dx * s * 2, c.y + dy * s - s * 0.55 * k, s * 0.5 * k, s * 0.68 * k, 18);
    paint(d, e, '#e9dcb4', { shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
    for (let i = 0; i < 6; i++) d.pen.dot(c.x + dx * s * 2 + (rng() - 0.5) * s * 0.6, c.y + dy * s - s * 0.55 * k + (rng() - 0.5) * s * 0.8, 0.45, '#9a7634', 0.8);
  }
}

/**
 * A griffin's head and shoulders, an eagle's head on a lion's body, facing
 * left, `c` at the base of its neck, `s` its scale (head about 2s long).
 * `herald` paints it flat in gold for a banner.
 */
export function griffinHead(d: Draw, c: Pt, s: number, herald = false, folded = !herald): void {
  const { pen } = d;
  const p = (x: number, y: number): Pt => pt(c.x + x * s, c.y + y * s);
  const plumage = herald ? CROWN_GOLD : PLUMAGE;
  const line = herald ? 0.45 : 0.65;
  if (folded) {
    // The folded wing behind, its rows of feathers.
    const wing = [p(0.2, 0.4), p(0.6, -1.1), p(1.6, -1.5), p(2.6, -1.2), p(3, -0.2), p(2.6, 0.6)];
    paint(d, wing, TAWNY, { shadow: 0.5, hatch: 0.2, line: 0.65 });
    pen.clipped(wing, () => {
      for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) pen.hair(bezier(p(0.8 + i * 0.45, -1.1 + r * 0.5), p(1 + i * 0.45, -0.8 + r * 0.5), p(1.2 + i * 0.45, -1 + r * 0.5), 4), 0.45, mix(TAWNY, SHADOW, 0.6), 0.8);
    });
  }
  // The neck ruff and head.
  const head = [p(0.9, 0.5), p(0.7, -0.8), p(0.6, -1.6), p(0.2, -2.2), p(-0.6, -2.5), p(-1.4, -2.3), p(-1.8, -1.8), p(-1.6, -1.2), p(-1.1, -0.9), p(-0.8, -0.2), p(-0.9, 0.5)];
  paint(d, head, plumage, { shadow: 0.45, hatch: herald ? 0 : 0.15, line });
  if (!herald) {
    pen.clipped(head, () => {
      for (let i = 0; i < 8; i++) pen.hair(bezier(p(-0.7 + i * 0.2, -0.2 + (i % 2) * 0.15), p(-0.6 + i * 0.2, 0.1), p(-0.7 + i * 0.2, 0.5), 4), 0.4, mix(TAWNY, SHADOW, 0.2), 0.7);
      pen.fill([p(-0.9, 0.0), p(0.9, -0.2), p(1, 0.6), p(-1, 0.6)], TAWNY, 0.4);
    });
  }
  // Feathered ear tufts swept back.
  for (const [x0, y0, x1, y1] of [[-0.2, -2.25, 0.7, -3.1], [0.15, -2.05, 1.05, -2.6]] as const) {
    const tuft = [p(x0 - 0.3, y0 + 0.1), p(x1, y1), p(x0 + 0.35, y0 + 0.25)];
    paint(d, tuft, herald ? CROWN_GOLD : mix(PLUMAGE, TAWNY, 0.3), { shadow: 0.4, hatch: 0, line: line * 0.8 });
  }
  // The hooked beak.
  const beak = [p(-1.35, -2.25), p(-2.2, -2.1), p(-2.75, -1.6), p(-2.8, -1.05), p(-2.5, -1.25), p(-2.3, -1.45), p(-1.6, -1.25)];
  paint(d, beak, herald ? mix(CROWN_GOLD, LIGHT, 0.2) : BEAK, { shadow: 0.4, hatch: 0, line, gloss: true });
  pen.hair([p(-1.55, -1.55), p(-2.4, -1.5)], 0.45, d.ink, 0.8);
  if (!herald) gleam(d, [p(-1.6, -2.05), p(-2.2, -1.95), p(-2.55, -1.6)], 0.7, 0.7);
  // A fierce eye under a heavy brow.
  const e = p(-1.05, -1.85);
  pen.dot(e.x, e.y, s * 0.2, herald ? '#232a4f' : '#d9a43a', 1);
  pen.dot(e.x, e.y, s * 0.11, '#1b1a1f', 1);
  if (!herald) pen.dot(e.x - s * 0.05, e.y - s * 0.07, s * 0.05, PAPER_FILL, 0.95);
  pen.stroke([p(-1.5, -2.15), p(-1.1, -2.1), p(-0.6, -2.25)], 0.8, d.ink, 0.9, false);
}

/** A long flight feather, from its quill at `base` along `ang`, gently curved: a barred vane, its tip dark. */
export function feather(d: Draw, base: Pt, ang: number, len: number, color = TAWNY): void {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-dir.y, dir.x);
  const at = (s: number, t: number): Pt => pt(base.x + dir.x * s * len + n.x * (t + s * s * 0.08) * len, base.y + dir.y * s * len + n.y * (t + s * s * 0.08) * len);
  const width = (s: number): number => Math.sin(Math.PI * Math.min(1, (s - 0.14) / 0.9)) ** 0.55;
  const outer = Array.from({ length: 11 }, (_, i) => {
    const s = 0.14 + (i / 10) * 0.86;
    return at(s, 0.1 * width(s) + 0.008);
  });
  const inner = Array.from({ length: 11 }, (_, i) => {
    const s = 1 - (i / 10) * 0.86;
    return at(s, -0.065 * width(s) - 0.008);
  });
  const vane = [...outer, ...inner];
  paint(d, vane, color, { shadow: 0.35, hatch: 0, line: 0.5 });
  d.pen.clipped(vane, () => {
    for (let s = 0.3; s < 0.9; s += 0.12) d.pen.stroke([at(s, -0.09), at(s + 0.07, 0.12)], len * 0.03, mix(color, SHADOW, 0.45), 0.5, false);
    d.pen.fill([at(0.84, -0.2), at(1.1, -0.2), at(1.1, 0.25), at(0.84, 0.25)], mix(color, SHADOW, 0.6), 0.7);
    d.pen.hair([at(0.55, 0.11), at(0.6, 0.02)], 0.5, PAPER_FILL, 0.7);
  });
  d.pen.stroke([at(0, 0), at(0.4, 0), at(0.98, 0)], 0.7, mix(PLUMAGE, LIGHT, 0.4), 1, false);
}

/** One spread wing from the shoulder, raised: a covert mass and long primaries fanned to `tip`. */
function wing(d: Draw, shoulder: Pt, tip: Pt, back: Pt, color: string): void {
  const { pen } = d;
  const fingers = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    return pt(tip.x + (back.x - tip.x) * t * 0.55 + (i % 2) * 1.2, tip.y + (back.y - tip.y) * t * 0.55);
  });
  const lead = bezier(shoulder, pt(shoulder.x - 2, (shoulder.y + tip.y) / 2 - 3), tip, 8);
  const shape = [...lead, ...fingers.slice(1).flatMap((f, i) => [pt((f.x + fingers[i]!.x) / 2 - 1.6, (f.y + fingers[i]!.y) / 2 + 2.4), f]), back];
  paint(d, shape, color, { shadow: 0.45, hatch: 0.15, line: 0.6 });
  pen.clipped(shape, () => {
    fingers.forEach((f) => pen.hair([pt(shoulder.x + (f.x - shoulder.x) * 0.45, shoulder.y + (f.y - shoulder.y) * 0.45), f], 0.45, mix(color, SHADOW, 0.55), 0.8));
    pen.fill([shoulder, ...lead.slice(0, 5), pt(lead[4]!.x + 5, lead[4]!.y + 4), pt(shoulder.x + 6, shoulder.y + 1)], mix(color, TAWNY, 0.5), 0.5);
  });
}

/** A griffin on the wing, flying left, `c` at the middle of its back, `k` its scale (its body some 20k long). */
function flyingGriffin(d: Draw, rng: Rng, c: Pt, k: number): void {
  const p = (x: number, y: number): Pt => pt(c.x + x * k, c.y + y * k);
  wing(d, p(1, -1), p(10, -21), p(9, -1), mix(PLUMAGE, TAWNY, 0.55));
  // The lion's body and hind legs trailing, the tail with its tuft.
  d.pen.stroke(bezier(p(8, 0.5), p(14, 2), p(18, -3), 8), 1.4 * k, d.ink, 1, false);
  d.pen.stroke(bezier(p(8, 0.5), p(14, 2), p(18, -3), 8), 0.8 * k, TAWNY, 1, false);
  paint(d, blob(p(18.6, -3.6), 1.6 * k, 1.1 * k, rng, 0.2, 10, -0.6), '#5a3d26', { shadow: 0.3, hatch: 0, line: 0.5 });
  for (const [x0, x1] of [[6, 11], [4.5, 9]] as const) paint(d, [p(x0, 1), p(x0 + 2, 2), p(x1, 4.6), p(x1 - 1.6, 5.2), p(x0 - 1, 2.6)], mix(TAWNY, SHADOW, 0.15), { shadow: 0.4, hatch: 0, line: 0.5 });
  const body = blob(p(1, 0.6), 8 * k, 3.4 * k, rng, 0.08, 18, -0.06);
  paint(d, body, TAWNY, { shadow: 0.5, hatch: 0.18, line: 0.65 });
  // Eagle's talons tucked under the breast.
  d.pen.stroke([p(-4, 3), p(-3, 5.4), p(-4.6, 6.2)], 0.9 * k, BEAK, 1, false);
  griffinHead(d, p(-6, 0.6), 2.3 * k, false, false);
  wing(d, p(-1.5, -1.4), p(4, -24), p(6.5, -1.2), mix(PLUMAGE, LIGHT, 0.2));
}

// ---- The tower ----

/** The gallery near the top: corbels under a timber platform on joists, its front edge and rail. */
function gallery(d: Draw, h: number, r: number, R: number): void {
  const { pen } = d;
  const c = P(TX, TZ, h);
  // Joists run out from the tower under the planking; their ends show along the front.
  for (let i = 0; i < 9; i++) {
    const t = ((i + 0.5) / 9) * Math.PI;
    const inner = pt(c.x - r * Math.cos(t), c.y + r * DEPTH * Math.sin(t) + 6);
    const outer = pt(c.x - (R + 2) * Math.cos(t), c.y + (R + 2) * DEPTH * Math.sin(t) + 2);
    beam(d, inner, outer, 3, i > 5 ? mix(TIMBER, SHADOW, 0.3) : TIMBER, 0.5);
    // A brace from the wall up under each joist's end.
    beam(d, pt(inner.x + (outer.x - inner.x) * 0.1, inner.y + 12), pt(inner.x + (outer.x - inner.x) * 0.75, outer.y + 2), 1.8, TIMBER_DARK, 0.45);
  }
  const deck = [...frontArc(c.x, c.y, R, 24), ...backArc(c.x, c.y, R, 24).slice(1, -1)];
  flat(d, deck, mix(TIMBER, LIGHT, 0.25), { tone: -0.1, line: 0.6 });
  pen.clipped(deck, () => {
    for (let x = -R; x < R; x += 4.4) pen.hair([pt(c.x + x, c.y - R), pt(c.x + x + 1, c.y + R)], 0.4, TIMBER_DARK, 0.55);
  });
  const edge = [...frontArc(c.x, c.y, R, 24), ...frontArc(c.x, c.y + 4, R, 24).reverse()];
  roundWash(d, edge, c.x - R, c.x + R, TIMBER, 0.2);
  pen.stroke(closed(edge), 0.6, d.ink, 0.9);
}

/** The low rail round the front of the gallery, posts and a top rail. */
function rail(d: Draw, h: number, R: number): void {
  const c = P(TX, TZ, h);
  const arc = frontArc(c.x, c.y, R - 1, 16);
  const posts = arc.filter((_, i) => i % 2 === 0);
  for (const p of posts) beam(d, pt(p.x, p.y + 1), pt(p.x, p.y - 9), 1.8, TIMBER_DARK, 0.45);
  d.pen.stroke(arc.map((p) => pt(p.x, p.y - 8.6)), 2.2, d.ink, 0.95, false);
  d.pen.stroke(arc.map((p) => pt(p.x, p.y - 8.6)), 1.3, mix(TIMBER, LIGHT, 0.2), 1, false);
}

/** A bracketed perch out from the shaft's right side at height h, a nest with eggs on it. */
function perch(d: Draw, rng: Rng, h: number, r: number): void {
  const wall = onShaft(0.82, h, r);
  const end = pt(wall.x + 30, wall.y + 1);
  beam(d, pt(wall.x - 2, wall.y + 18), pt(end.x - 4, end.y + 1), 2.4, TIMBER_DARK);
  beam(d, pt(wall.x - 2, wall.y + 1), pt(end.x, end.y), 3.2, TIMBER);
  const plank = [pt(wall.x - 2, wall.y - 1.6), pt(end.x + 2, end.y - 2.6), pt(end.x + 2, end.y + 0.6), pt(wall.x - 2, wall.y + 1.6)];
  flat(d, plank, mix(TIMBER, LIGHT, 0.2), { tone: 0, line: 0.55 });
  nest(d, rng, pt(wall.x + 17, wall.y - 7), 16, () => eggs(d, rng, pt(wall.x + 17, wall.y - 6), 6));
}

/** One loose boulder: a faceted lump, cracked and speckled. */
function boulder(d: Draw, rng: Rng, c: Pt, rx: number, ry: number): void {
  const shape = lump(d, rng, c, rx, ry, mix(ROCK, rng() < 0.5 ? '#9a917f' : '#b3a991', 0.4), 0.65);
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, Math.round(rx * ry * 0.5), (_, y) => 0.25 + ((y - c.y + ry) / (2 * ry)) * 0.6, 0.45, mix(ROCK, SHADOW, 0.55));
    d.pen.hair([pt(c.x - rx * 0.1, c.y - ry * 0.5), pt(c.x + rx * 0.05, c.y), pt(c.x - rx * 0.05, c.y + ry * 0.6)], 0.5, d.ink, 0.55);
  });
}

const CRAG = mix(ROCK, '#a59a86', 0.4);

/**
 * One block of the crag: an irregular prism of rock from the ground up to
 * about h, its top lit, its front in half-light split by cracks and
 * bedding planes, its right side in hatched shade.
 */
function rockBlock(d: Draw, rng: Rng, x0: number, x1: number, z0: number, z1: number, h: number): void {
  const { pen } = d;
  const j = (k = 3): number => (rng() - 0.5) * k;
  const hs = [h + j(6), h + j(6), h + j(6), h + j(6)];
  const xm = (x0 + x1) / 2 + j(6);
  const hm = (hs[0]! + hs[1]!) / 2 + j(8);
  const t0 = P(x0 + j(), z0, hs[0]!);
  const tm = P(xm, z0, hm);
  const t1 = P(x1 + j(), z0, hs[1]!);
  const t2 = P(x1 + j(), z1, hs[2]!);
  const t3 = P(x0 + j(), z1, hs[3]!);
  const tb = P(xm + 3, z1, (hs[2]! + hs[3]!) / 2 + j(6));
  const side = crisp([P(x1, z0, 0), P(x1, z1, 0), t2, t1], 3);
  const front = crisp([P(x0, z0, 0), P(x1, z0, 0), t1, tm, t0], 3);
  const top = crisp([t0, tm, t1, t2, tb, t3], 3);
  flat(d, side, CRAG, { tone: 0.62, hatch: 0.34, line: 0.6 });
  flat(d, top, CRAG, { tone: -0.38, line: 0.6 });
  flat(d, front, CRAG, { tone: 0.18, line: 0.65 });
  pen.clipped(front, () => {
    // Cracks down the face and ledges across it, each with a lit lip.
    for (let i = 0; i < Math.round((x1 - x0) / 9); i++) {
      const x = x0 + (x1 - x0) * ((i + 0.3 + rng() * 0.4) / Math.round((x1 - x0) / 9));
      const a = P(x, z0, h + 4);
      pen.hair([a, pt(a.x + j(4), a.y + h * 0.45), pt(a.x + j(5), a.y + h + 6)], 0.5, d.ink, 0.6);
      pen.hair([pt(a.x + 0.9, a.y), pt(a.x + 0.9 + j(3), a.y + h * 0.4)], 0.5, PAPER_FILL, 0.35);
    }
    for (let v = 6 + rng() * 6; v < h - 4; v += 7 + rng() * 6) {
      const ua = x0 + rng() * (x1 - x0) * 0.4;
      const ub = ua + (x1 - x0) * (0.3 + rng() * 0.4);
      pen.fill([P(ua, z0, v), P(ub, z0, v + j(2)), P(ub, z0, v - 3), P(ua, z0, v - 2.4)], mix(CRAG, SHADOW, 0.6), 0.4);
      pen.hair([P(ua, z0, v), P(ub, z0, v)], 0.5, d.ink, 0.55);
      pen.hair([P(ua + 1, z0, v + 0.8), P(ub - 1, z0, v + 0.8)], 0.55, PAPER_FILL, 0.4);
    }
    pen.stipple(front, Math.round((x1 - x0) * h * 0.25), () => 0.5, 0.45, mix(CRAG, SHADOW, 0.5));
    dab(d, blob(P((x0 + x1) / 2, z0, h * 0.7), (x1 - x0) * 0.4, h * 0.25, rng, 0.3, 12), rng() < 0.5 ? '#7f9a5a' : '#9c7f58', 0.16, 3);
    soft(pen.ctx, 2.4, () => pen.fill([P(x0 - 2, z0, -2), P(x1 + 2, z0, -2), P(x1 + 2, z0, 8), P(x0 - 2, z0, 8)], mix(CRAG, '#4e4232', 0.5), 0.3));
  });
  pen.clipped(top, () => pen.stipple(top, Math.round((x1 - x0) * (z1 - z0) * 0.12), () => 0.5, 0.4, mix(CRAG, SHADOW, 0.35)));
  if (rng() < 0.7) tufts(d, rng, t0.x + 2, tm.x, (t0.y + tm.y) / 2 + 1.5, 2, 0.8);
}

/** The crag's blocks, back to front, as (x0, x1, z0, z1, h). */
const CRAG_BACK = [[-58, -32, 22, 40, 34], [-36, -10, 26, 44, 50], [8, 32, 26, 44, 46], [30, 56, 22, 40, 30], [-66, -42, 6, 24, 20], [42, 66, 6, 24, 17], [-46, -20, 2, 22, 34], [20, 46, 4, 22, 30], [-22, 24, -2, 24, 26]] as const;
const CRAG_FRONT = [[-62, -40, -8, 4, 9], [-34, -14, -10, 2, 14], [14, 32, -8, 4, 11], [36, 60, -10, 2, 7]] as const;

/** Ivy climbing from the rocks up the shaft's lit flank. */
function ivy(d: Draw, rng: Rng, h0: number, h1: number, r: number): void {
  const stem: Pt[] = [];
  for (let h = h0, i = 0; h < h1; h += 5, i++) stem.push(onShaft(-0.88 + Math.sin(i * 0.9) * 0.08, h, r));
  d.pen.stroke(stem, 0.7, '#3f5f34', 0.95, false);
  stem.forEach((p, i) => {
    const n = i < stem.length * 0.6 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      if (rng() < 0.2) continue;
      const leaf = blob(pt(p.x + (rng() - 0.35) * 7, p.y + (rng() - 0.5) * 4), 2.2, 1.6, rng, 0.25, 8, rng() * 3);
      paint(d, leaf, rng() < 0.5 ? '#5f8f4e' : '#4d7a45', { shadow: 0.4, hatch: 0, line: 0.4 });
    }
  });
}

function griffinTower(d: Draw, rng: Rng): void {
  // The crag it stands on.
  for (const [x0, x1, z0, z1, h] of CRAG_BACK) rockBlock(d, rng, x0, x1, z0, z1, h);
  const H0 = 30;
  const H1 = 196;
  // A battered plinth, then the shaft, ivy up its lit side.
  shaft(d, rng, 24, 19, H0 - 4, H0 + 16, mix(TOWER_STONE, SHADOW, 0.08), 6);
  shaft(d, rng, 18, 15, H0 + 16, H1, TOWER_STONE);
  for (const [sx, h] of [[-0.25, 70], [0.15, 112], [-0.35, 150]] as const) shaftWindow(d, sx, h, 18 - (3 * (h - 50)) / 146, 5, 13);
  for (const h of [96, 150]) band(d, h, 18 - (3 * (h - 46)) / 150);
  ivy(d, rng, H0 + 10, 104, 17.5);
  // The perch partway up, then the banner on its staff out to the left.
  perch(d, rng, 128, 16.5);
  const staffAt = onShaft(-0.85, 176, 15.4);
  beam(d, staffAt, pt(staffAt.x - 30, staffAt.y - 1), 2, OAK_DARK);
  beam(d, pt(staffAt.x + 1, staffAt.y + 16), pt(staffAt.x - 14, staffAt.y + 0.5), 1.6, OAK_DARK);
  banner(d, pt(staffAt.x - 24, staffAt.y + 1.6), 17, 42, CROWN_BLUE, (c) => griffinHead(d, pt(c.x + 3, c.y + 7), 3.6, true), -1.2);
  // The eyrie: corbels, the gallery, the roost stage with its openings, the great nests, the spire.
  shaft(d, rng, 15, 20, H1 - 8, H1, TOWER_STONE, 4);
  gallery(d, H1, 15, 30);
  shaft(d, rng, 13, 13, H1, H1 + 40, mix(TOWER_STONE, LIGHT, 0.05), 6.5);
  shaftWindow(d, -0.1, H1 + 8, 13, 8, 24);
  shaftWindow(d, 0.62, H1 + 10, 13, 6, 20);
  rail(d, H1, 30);
  nest(d, rng, onShaft(0.58, H1 + 3, 30), 19, () => eggs(d, rng, onShaft(0.6, H1 + 3, 30), 6.4));
  nest(d, rng, onShaft(-0.5, H1 + 2, 31), 24, () => griffinHead(d, onShaft(-0.42, H1 + 6, 30), 7.4));
  flyingGriffin(d, rng, pt(-46, -248), 1.1);
  const top = P(TX, TZ, H1 + 40);
  const apex = cone(d, rng, top, 17, 36, CROWN_BLUE);
  finial(d, apex, 7);
  // The front of the crag, bedding the tower's foot; moulted feathers on the rock.
  for (const [x0, x1, z0, z1, h] of CRAG_FRONT) rockBlock(d, rng, x0, x1, z0, z1, h);
  for (const [x, y, rx, ry] of [[-6, 5, 6, 4], [62, 7, 5, 3.5]] as const) boulder(d, rng, pt(x, y), rx, ry);
  feather(d, pt(-30, -16), -0.25, 16, TAWNY);
  feather(d, pt(44, -10), 3.5, 13, mix(PLUMAGE, TAWNY, 0.4));
}

function towerGround(d: Draw, rng: Rng): void {
  groundShadow(d, 4, 2, 72, 9, 0.26);
  castShadow(d, [pt(20, 4), pt(66, 4), pt(74, -6), pt(30, -8)], 0, 0, 0.16, 4);
  tufts(d, rng, -66, -40, 5, 4);
  tufts(d, rng, 30, 66, 6, 4);
}

function towerAir(d: Draw): void {
  feather(d, pt(-62, -236), 0.5, 15, mix(PLUMAGE, TAWNY, 0.5));
  feather(d, pt(56, -176), 2.3, 13, TAWNY);
}

export const EYRIE = { draw: griffinTower, ground: towerGround, air: towerAir } as const;
