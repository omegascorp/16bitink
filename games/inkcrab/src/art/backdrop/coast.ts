import { bezier, closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { GRANITE, rock } from './granite';

/**
 * Props for a cold granite coast: wind-torn cumulus and gulls, a far
 * headland with its lighthouse, and a small fishing harbour with whitewashed
 * cottages, a stone quay, a slipway, a crabber and stacks of pots.
 */
const CLOUD_SHADE = '#8b9db2';
const GULL_GREY = '#aeb7c3';
const SLATE = '#76808f';
const DISTANCE = '#8d9ca3';
const FIELD = '#9fb086';
const WALL_WHITE = '#f1ece0';
const HULL = '#3f6f9c';
const FLOAT = '#e8823a';

/**
 * A fair-weather cumulus scudding before the wind: heaped on the upwind
 * (left) side, torn into rags downwind, with a flat grey base.
 */
export function scud(t: Draw, x: number, base: number, w: number, h: number): void {
  const { pen } = t;
  const { ctx } = pen;
  // A row of overlapping puffs, heaped on the upwind side, and a few on top of the middle.
  const n = Math.max(3, Math.ceil(w / (h * 0.8)));
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const env = Math.sin(Math.PI * (0.08 + u * 0.84)) ** 0.6;
    const r = h * (0.32 + 0.42 * env) * (0.85 + pen.rng() * 0.3);
    puffs.push({ x: x - w / 2 + h * 0.35 + (w - h * 0.7) * u, y: base - r * 0.5, r });
  }
  for (let i = 0, m = Math.max(1, Math.round(n / 2.5)); i < m; i++) {
    const u = 0.2 + (0.4 * (i + 0.5)) / m;
    const r = h * (0.42 + pen.rng() * 0.16);
    puffs.push({ x: x - w / 2 + w * u, y: base - h * 0.55 - r * 0.3, r });
  }
  const inside = (p: Pt, skip: number): boolean => puffs.some((q, k) => k !== skip && Math.hypot(p.x - q.x, p.y - q.y) < q.r - 0.4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w, base - h * 3, w * 2, h * 3);
  ctx.clip();
  ctx.beginPath();
  for (const p of puffs) {
    ctx.moveTo(p.x + p.r, p.y);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x - w, base - h * 3, w * 2, h * 3);
  const under = ctx.createLinearGradient(0, base - h * 0.7, 0, base);
  under.addColorStop(0, 'rgba(139,157,178,0)');
  under.addColorStop(1, 'rgba(139,157,178,0.5)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = under;
  ctx.fillRect(x - w, base - h, w * 2, h);
  ctx.restore();
  const box = [pt(x - w, base - h * 0.35), pt(x + w, base - h * 0.35), pt(x + w, base), pt(x - w, base)];
  pen.clipped(box, () => {
    for (const p of puffs) pen.clipped(oval(p.x, p.y, p.r, p.r, 20), () => pen.hatch(box, 2.2, 0.15, 0.38, { color: t.ink, alpha: FAR * 0.28 }));
  });
  // Ink only the heap's outside, and only above its base.
  puffs.forEach((p, i) => {
    const arc = oval(p.x, p.y, p.r, p.r, 28);
    let run: Pt[] = [];
    for (const q of [...arc, arc[0]!]) {
      if (!inside(q, i) && q.y < base - 1) run.push(q);
      else {
        if (run.length > 2) pen.hair(run, 0.6, t.ink, FAR * 0.6);
        run = [];
      }
    }
    if (run.length > 2) pen.hair(run, 0.6, t.ink, FAR * 0.6);
  });
  pen.hair(bezier(pt(x - w * 0.45, base), pt(x, base + 0.6), pt(x + w * 0.35, base - 0.4), 10), 0.45, CLOUD_SHADE, 0.7);
  // Rags torn off downwind, and streaks of the wind.
  for (let k = 0; k < (h < 14 ? 1 : 3); k++) {
    const rx = x + w * (0.5 + k * 0.14) + h * 0.4 + pen.jitter(3);
    const ry = base - h * (0.35 + pen.rng() * 0.3);
    const rr = h * (0.22 - k * 0.05);
    const spine = bezier(pt(rx - rr * 2.6, ry + rr * 0.3), pt(rx, ry - rr * 0.5), pt(rx + rr * 3.4, ry + rr * 0.1), 12);
    const rag = ribbon(spine, (u) => rr * 1.3 * Math.sin(Math.PI * u) ** 0.7 * (1 - 0.4 * u));
    pen.fill(rag.shape, PAPER_FILL, 0.85);
    pen.fill(rag.bot.map((p, i) => pt(p.x, p.y - (rag.bot[i]!.y - spine[i]!.y) * 0.4)).concat([...rag.bot].reverse()), CLOUD_SHADE, 0.3);
    pen.hair(rag.top.slice(1, 8), 0.45, t.ink, FAR * 0.45);
  }
  for (let k = 0; k < 2; k++) {
    const sy = base - h * (0.2 + 0.4 * k);
    pen.hair([pt(x + w * 0.55, sy), pt(x + w * (0.95 + 0.2 * k), sy - 1)], 0.4, t.ink, FAR * 0.25);
  }
}

/** A herring gull riding the wind: grey wings with black tips, a white body. `flap` lifts the wings. */
export function gull(t: Draw, x: number, y: number, s: number, flap = 0, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, y + dy * s);
  for (const side of [-1, 1] as const) {
    const tipY = -2 - flap * 4 + (side > 0 ? 1 : 0);
    const lead = cub(P(side * 1, -0.5), P(side * 4, -4 - flap * 2), P(side * 8, -4 - flap * 3), P(side * 12, tipY), 10);
    const trail = cub(P(side * 12, tipY), P(side * 8, -1.5 - flap * 2), P(side * 4, -0.5), P(side * 1, 1), 10);
    const wing = [...lead, ...trail.slice(1)];
    pen.fill(wing, PAPER_FILL, 1);
    pen.fill(wing, GULL_GREY, 0.7);
    pen.fill([...lead.slice(7), ...trail.slice(0, 4)], t.ink, FAR * 0.9);
    pen.hair(lead, 0.6, t.ink, FAR * 1.1);
    pen.hair(trail, 0.35, t.ink, FAR * 0.6);
  }
  const body = oval(x + 0.5 * s * dir, y + 0.3 * s, 3.4 * s, 1.1 * s, 12);
  pen.fill(body, PAPER_FILL, 1);
  pen.hair(body.slice(2, 10), 0.4, t.ink, FAR * 0.8);
  pen.dot(x + 3.9 * s * dir, y + 0.1 * s, 0.5 * s, '#e3b23c', 0.9);
}

/**
 * A headland far across the water: a long hazy blue-grey mass with a
 * patchwork of fields along its top and a cliff falling to the sea at its
 * seaward (`dir`) end. Returns its skyline.
 */
export function headland(t: Draw, x0: number, x1: number, horizon: number, h: number, dir: 1 | -1): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  const cliffAt = dir > 0 ? x1 : x0;
  for (let x = x0; x <= x1; x += 4) {
    const fromCliff = Math.abs(x - cliffAt);
    const fromTail = Math.abs(x - (dir > 0 ? x0 : x1));
    const rise = Math.min(1, fromTail / ((x1 - x0) * 0.55)) ** 0.7;
    const drop = Math.min(1, fromCliff / 10);
    top.push(pt(x, horizon - h * rise * drop - 1.2 * Math.sin(x * 0.07)));
  }
  const shape = [...top, pt(x1, horizon + 0.5), pt(x0, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.9);
  pen.fill(shape, DISTANCE, 0.42);
  pen.clipped(shape, () => {
    // Fields: a cap of soft green, divided by faint hedges.
    pen.fill([...top, ...[...top].reverse().map((p) => pt(p.x, p.y + 3 + h * 0.15))], FIELD, 0.4);
    for (let x = x0 + 14; x < x1 - 14; x += 12 + pen.rng() * 16) pen.hair([pt(x, horizon - h - 2), pt(x + pen.jitter(3), horizon - h * 0.2)], 0.35, t.ink, FAR * 0.25);
    // The cliff face, hatched.
    const face = [pt(cliffAt - dir * 14, horizon - h), pt(cliffAt + dir * 2, horizon - h), pt(cliffAt + dir * 2, horizon + 1), pt(cliffAt - dir * 18, horizon + 1)];
    pen.hatch(face, 1.4, 1.35, 0.35, { color: t.ink, alpha: FAR * 0.4 });
  });
  pen.hair(top, 0.6, t.ink, FAR * 0.8);
  return top;
}

/** A white lighthouse on a far headland with its keepers' cottages, its lantern catching the light. */
export function lighthouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  for (const [dx, w] of [[-12, 8], [-5, 6]] as const) {
    const wall = [P(dx, 0), P(dx + w, 0), P(dx + w, -3.2), P(dx, -3.2)];
    pen.fill(wall, PAPER_FILL, 1);
    pen.fill([P(dx - 0.5, -3.2), P(dx + w + 0.5, -3.2), P(dx + w - 1, -5), P(dx + 1, -5)], SLATE, 0.6);
    pen.hair(edges(wall), 0.4, t.ink, FAR * 0.8);
  }
  const tower = [P(-2.4, 0), P(2.4, 0), P(1.6, -20), P(-1.6, -20)];
  pen.fill(tower, PAPER_FILL, 1);
  pen.clipped(tower, () => pen.fill([P(0.6, 0), P(3, 0), P(3, -21), P(0.5, -21)], CLOUD_SHADE, 0.35));
  pen.stroke(edges(tower), 0.55, t.ink, FAR * 1.1, false);
  pen.hair([P(-2.6, -20.2), P(2.6, -20.2)], 0.6, t.ink, FAR);
  const lamp = [P(-1.2, -20.2), P(1.2, -20.2), P(1.2, -22.6), P(-1.2, -22.6)];
  pen.fill(lamp, '#f3dc8a', 0.9);
  pen.hair(edges(lamp), 0.4, t.ink, FAR);
  pen.fill([P(-1.5, -22.6), P(1.5, -22.6), P(0, -24.4)], t.ink, FAR * 0.9);
  pen.dot(x, ground - 21.4 * s, 3.2 * s, '#fff3c4', 0.35);
}

/** A whitewashed cottage with a slate roof and chimneys at the gables. `wash` tints the walls. */
export function cottage(t: Draw, x: number, ground: number, s: number, wash: string, wide = 1): void {
  const { pen } = t;
  const w = 20 * s * wide;
  const P = (dx: number, dy: number): Pt => pt(x + dx, ground + dy * s);
  const wall = [P(-w / 2, 0), P(w / 2, 0), P(w / 2, -10), P(-w / 2, -10)];
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, wash, 0.55);
  pen.clipped(wall, () => pen.fill([P(w / 2 - 3 * s, 0), P(w / 2 + 1, 0), P(w / 2 + 1, -11), P(w / 2 - 3 * s, -11)], CLOUD_SHADE, 0.3));
  const roof = [P(-w / 2 - 1, -10), P(w / 2 + 1, -10), P(w / 2 - 2 * s, -16.5), P(-w / 2 + 2 * s, -16.5)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, SLATE, 0.62);
  pen.clipped(roof, () => {
    for (let k = 1; k < 4; k++) pen.hair([P(-w / 2, -10 - k * 1.7), P(w / 2, -10 - k * 1.7)], 0.35, t.ink, FAR * 0.45);
  });
  pen.stroke(edges(roof), 0.55, t.ink, FAR, false);
  for (const cx of [-w / 2 + 2.5 * s, w / 2 - 2.5 * s]) {
    const stack = [P(cx - 1.4 * s, -15), P(cx + 1.4 * s, -15), P(cx + 1.4 * s, -19.5), P(cx - 1.4 * s, -19.5)];
    pen.fill(stack, GRANITE, 0.8);
    pen.hair(edges(stack), 0.4, t.ink, FAR);
  }
  const n = Math.max(2, Math.round(w / (6 * s)));
  for (let k = 0; k < n; k++) {
    const wx = x - w / 2 + ((k + 0.5) * w) / n;
    const isDoor = k === Math.floor(n / 2) && n > 2;
    const win = isDoor ? [P(-1.3 * s + wx - x, 0), P(1.3 * s + wx - x, 0), P(1.3 * s + wx - x, -5.5), P(-1.3 * s + wx - x, -5.5)] : [P(-1.5 * s + wx - x, -4), P(1.5 * s + wx - x, -4), P(1.5 * s + wx - x, -7), P(-1.5 * s + wx - x, -7)];
    pen.fill(win, isDoor ? '#4f7f8a' : t.ink, isDoor ? 0.6 : FAR * 0.8);
    if (!isDoor) pen.hair([P(wx - x, -4), P(wx - x, -7)], 0.35, PAPER_FILL, 0.9);
  }
  pen.stroke(edges(wall), 0.55, t.ink, FAR, false);
}

/**
 * The harbour wall: a long quay of dressed granite courses, its foot dark
 * with weed below the tide line, an iron ladder, bollards, and a rounded
 * pierhead at its seaward (left) end with a small light.
 */
export function quay(t: Draw, x0: number, x1: number, water: number, h: number): void {
  const { pen } = t;
  const top = water - h;
  const face = [pt(x0 + 6, top), pt(x1, top), pt(x1, water + 2), pt(x0, water + 2), pt(x0 + 1, top + 4)];
  rock(t, face, { fade: 0.85, lichen: 3, hatch: false });
  pen.clipped(face, () => {
    for (let y = top + 3.2, row = 0; y < water; y += 3.2, row++) {
      pen.hair([pt(x0, y), pt(x1, y)], 0.35, t.ink, FAR * 0.45);
      for (let x = x0 + (row % 2) * 4 + pen.rng() * 3; x < x1; x += 7 + pen.rng() * 4) pen.hair([pt(x, y - 3.2), pt(x, y)], 0.35, t.ink, FAR * 0.4);
    }
    // Below the tide line: wet, dark and weedy.
    const tide = water - h * 0.32;
    pen.fill([pt(x0, tide), pt(x1, tide + 0.5), pt(x1, water + 2), pt(x0, water + 2)], '#56552f', 0.45);
    for (let x = x0 + 2; x < x1; x += 2 + pen.rng() * 3) pen.hair([pt(x, tide - 0.5), pt(x + pen.jitter(0.6), tide + 1.5 + pen.rng() * 3)], 0.5, '#4b4a26', 0.55);
  });
  // The pierhead's rounded end and its light.
  pen.hair([pt(x0 + 6, top), pt(x1, top)], 0.9, PAPER_FILL, 0.8);
  pen.fill([pt(x0 + 7, top), pt(x0 + 10, top), pt(x0 + 9.6, top - 8), pt(x0 + 7.4, top - 8)], PAPER_FILL, 1);
  pen.fill([pt(x0 + 7.2, top - 8), pt(x0 + 9.8, top - 8), pt(x0 + 8.5, top - 10)], '#4f8a63', 0.7);
  pen.hair(edges([pt(x0 + 7, top), pt(x0 + 10, top), pt(x0 + 9.6, top - 8), pt(x0 + 7.4, top - 8)]), 0.4, t.ink, FAR);
  for (const bx of [x0 + 40, x0 + 95, x1 - 30]) pen.fill(oval(bx, top - 1, 1.3, 1.3, 8), t.ink, FAR * 0.8);
  const lx = x0 + 70;
  for (const dx of [0, 3]) pen.hair([pt(lx + dx, top - 2), pt(lx + dx, water)], 0.4, t.ink, FAR * 0.7);
  for (let y = top; y < water; y += 2) pen.hair([pt(lx, y), pt(lx + 3, y)], 0.35, t.ink, FAR * 0.6);
}

/** A stone slipway running down into the harbour from the left, wet and weedy at its foot. */
export function slipway(t: Draw, x0: number, ground: number, x1: number, water: number): void {
  const { pen } = t;
  const ramp = [pt(x0, ground), pt(x1, water), pt(x1, water + 2), pt(x0 - 4, water + 2), pt(x0 - 4, ground)];
  pen.fill(ramp, PAPER_FILL, 1);
  pen.fill(ramp, GRANITE, 0.45);
  pen.clipped(ramp, () => {
    for (let k = 1; k < 8; k++) {
      const u = k / 8;
      const a = pt(x0 + (x1 - x0) * u, ground + (water - ground) * u);
      pen.hair([a, pt(a.x - 1, water + 2)], 0.35, t.ink, FAR * 0.35);
    }
    pen.fill([pt(x0 + (x1 - x0) * 0.65, ground + (water - ground) * 0.65), pt(x1, water), pt(x1, water + 2), pt(x0, water + 2)], '#56552f', 0.35);
  });
  pen.stroke([pt(x0 - 4, ground), pt(x0, ground), pt(x1, water)], 0.7, t.ink, FAR, false);
}

/** A small crabber at her mooring: a blue clinker hull, a wheelhouse, a mizzen and a pot hauler. */
export function crabber(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  const hull = [...bezier(P(-15, -6), P(0, -4.2), P(16, -8.5), 10), ...bezier(P(15, -1), P(2, 2.2), P(-14, 0.5), 10)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL, 0.6);
  pen.clipped(hull, () => {
    pen.hair(bezier(P(-15, -4.6), P(0, -2.8), P(16, -7), 10), 0.9, PAPER_FILL, 0.85);
    for (const k of [-1.5, 0.2]) pen.hair(bezier(P(-15, k), P(0, k + 1.4), P(15, k - 3.5), 10), 0.35, t.ink, FAR * 0.5);
  });
  pen.stroke(closed(hull), 0.6, t.ink, FAR, false);
  const house = [P(-9, -5.2), P(-2, -4.6), P(-2.3, -11.5), P(-8.6, -11.8)];
  pen.fill(house, PAPER_FILL, 1);
  pen.fill(house, WALL_WHITE, 0.6);
  pen.fill([P(-7.8, -10.6), P(-3, -10.4), P(-3.1, -8.6), P(-7.8, -8.8)], t.ink, FAR * 0.75);
  pen.hair(edges(house), 0.45, t.ink, FAR);
  // A steadying sail aft, the mast forward, and the hauler's davit.
  pen.stroke([P(-12.5, -6), P(-12.5, -19)], 0.5, t.ink, FAR, false);
  const sail = [P(-12.3, -18), P(-12.3, -8), P(-17, -8.5)];
  pen.fill(sail, '#c46a4a', 0.5);
  pen.hair(closed(sail), 0.4, t.ink, FAR * 0.8);
  pen.stroke([P(6, -6.6), P(6, -22)], 0.55, t.ink, FAR, false);
  pen.hair([P(6, -21), P(-2.5, -11.5)], 0.3, t.ink, FAR * 0.5);
  pen.hair([P(6, -21), P(15.5, -8.4)], 0.3, t.ink, FAR * 0.5);
  pen.hair([P(2, -6), P(2.5, -9), P(4.5, -9.5)], 0.5, t.ink, FAR * 0.8);
  for (let k = 0; k < 3; k++) pen.hair(bezier(P(-16 + k * 12, 2.6), P(-10 + k * 12, 1.4), P(-4 + k * 12, 2.8), 4), 0.5, t.ink, FAR * 0.3);
}

/** Pots stacked on the quay: boxy frames under netting, a few colours, three high. */
export function potStack(t: Draw, x: number, ground: number, cols: number, rows: number, s: number): void {
  const { pen } = t;
  const nets = ['#4f7f8a', '#5f8a4f', '#3f5a86', '#b0573e'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - (r === rows - 1 ? 1 : 0); c++) {
      const px = x + c * 6.4 * s + (r % 2) * 3.2 * s;
      const py = ground - r * 4.6 * s;
      const box = [pt(px, py), pt(px + 6 * s, py), pt(px + 6 * s, py - 4.4 * s), pt(px, py - 4.4 * s)];
      pen.fill(box, PAPER_FILL, 0.9);
      pen.fill(box, nets[(r * 3 + c) % nets.length]!, 0.35);
      pen.hatch(box, 1.1 * s, 0.8, 0.25, { color: t.ink, alpha: FAR * 0.45 });
      pen.hatch(box, 1.1 * s, -0.8, 0.25, { color: t.ink, alpha: FAR * 0.35 });
      pen.hair(edges(box), 0.45, t.ink, FAR * 0.9);
    }
  }
}

/** A pot buoy: a round orange float, with a dan flag on a cane if `flag`. */
export function float(t: Draw, x: number, water: number, s: number, flag = false): void {
  const { pen } = t;
  const ball = oval(x, water - 1.6 * s, 2 * s, 1.9 * s, 12);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, FLOAT, 0.7);
  pen.dot(x - 0.6 * s, water - 2.4 * s, 0.4 * s, PAPER_FILL, 0.9);
  pen.hair(closed(ball), 0.45, t.ink, FAR);
  if (flag) {
    pen.hair([pt(x, water - 3 * s), pt(x + 0.6 * s, water - 13 * s)], 0.5, t.ink, FAR);
    pen.fill([pt(x + 0.6 * s, water - 13 * s), pt(x + 4.8 * s, water - 12 * s), pt(x + 0.5 * s, water - 10.4 * s)], t.ink, FAR * 0.85);
  }
  pen.hair([pt(x - 3 * s, water + 0.6), pt(x + 3 * s, water + 0.6)], 0.4, t.ink, FAR * 0.4);
}
