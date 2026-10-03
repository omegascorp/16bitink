import type { ItemId } from '../levels/items';
import { createRng, type Rng } from '../logic/rng';
import { INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/** In-game size of a sinking item; the texture is ITEM_SIZE * ART_RES square. */
export const ITEM_SIZE = 64;

const S = ART_RES;
const HALF = ITEM_SIZE / 2;
const PAPER_FILL = '#fffaf0';
const TAU = Math.PI * 2;

/** Drawing context for one item: a pen plus a local frame (units are in-game px, origin at the centre). */
interface Draw {
  readonly pen: Pen;
  readonly rng: Rng;
  /** Maps a local point to canvas pixels. */
  readonly P: (x: number, y: number) => Pt;
  /** Maps a local polyline to canvas pixels. */
  readonly L: (pts: readonly Pt[]) => Pt[];
}

function frame(pen: Pen, seed: number, rot = 0, scale = 1, dx = 0, dy = 0): Draw {
  const c = Math.cos(rot) * scale;
  const s = Math.sin(rot) * scale;
  const P = (x: number, y: number): Pt => ({ x: (HALF + dx + x * c - y * s) * S, y: (HALF + dy + x * s + y * c) * S });
  return { pen, rng: createRng(seed * 7 + 3), P, L: (pts) => pts.map((p) => P(p.x, p.y)) };
}

// ---------------------------------------------------------------- local-space shape helpers

/** Points on an elliptical arc (local units); a full turn repeats the first point so it closes. */
function oval(cx: number, cy: number, rx: number, ry: number, n = 20, a0 = 0, a1 = TAU): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

function qb(p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

const pt = (x: number, y: number): Pt => ({ x, y });

/**
 * A cylinder lying along the x axis, seen a little from its x1 end: the x1
 * cap is a full ellipse (drawn separately), the x0 end shows its back half.
 * `dent(x)` pushes the top edge inwards.
 */
function cylinder(x0: number, x1: number, r: number, e: number, dent: (x: number) => number = () => 0): Pt[] {
  const top = Array.from({ length: 13 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / 12;
    return pt(x, -r + dent(x));
  });
  const front = oval(x1, 0, e, r, 12, -Math.PI / 2, Math.PI / 2);
  const back = oval(x0, 0, e, r, 12, Math.PI / 2, (Math.PI * 3) / 2);
  return [...top, ...front, pt(x0, r), ...back];
}

/** Lines along a lying cylinder's underside: the shadow side. */
function cylinderShade(d: Draw, x0: number, x1: number, r: number, from: number, step: number, color = INK, alpha = 0.55): void {
  for (let y = from; y < r; y += step) d.pen.hair(d.L([pt(x0 - 2, y), pt(x1 + 2, y)]), 0.45 * S, color, alpha);
}

function zigzag(d: Draw, x: number, y: number, len: number, angle: number): void {
  const dir = pt(Math.cos(angle), Math.sin(angle));
  const nrm = pt(-dir.y, dir.x);
  const pts = [0, 1, 2, 3].map((i) => {
    const t = (i / 3) * len;
    const side = i === 0 || i === 3 ? 0 : i === 1 ? 2 : -2;
    return pt(x + dir.x * t + nrm.x * side, y + dir.y * t + nrm.y * side);
  });
  d.pen.stroke(d.L(pts), 1.9 * S, INK, 0.9, false);
  d.pen.stroke(d.L(pts), 1 * S, '#ffe14d', 1, false);
}

/** Erases a closed shape (a real hole in the texture, e.g. a bag handle). */
function cut(d: Draw, pts: readonly Pt[]): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  d.pen.fill(d.L(pts), '#000', 1);
  ctx.restore();
}

// ---------------------------------------------------------------- items

function drawCan(d: Draw): void {
  const { pen, L, P } = d;
  const [x0, x1, r, e] = [-21, 18, 11, 4.5];
  const dent = (x: number): number => 3.2 * Math.exp(-(((x + 4) / 5) ** 2));
  const body = cylinder(x0, x1, r, e, dent);
  pen.fill(L(body), PAPER_FILL, 1);
  pen.fill(L(body), '#23857f', 0.85);
  pen.clipped(L(body), () => {
    // Silver neck and base where the paint stops.
    pen.fill(L([pt(x1 - 4, -r - 2), pt(x1 + 6, -r - 2), pt(x1 + 6, r + 2), pt(x1 - 4, r + 2)]), '#c3c8cd', 1);
    pen.fill(L([pt(x0 - 6, -r - 2), pt(x0 + 2, -r - 2), pt(x0 + 2, r + 2), pt(x0 - 6, r + 2)]), '#c3c8cd', 1);
    pen.hair(L([pt(x1 - 4, -r), pt(x1 - 4, r)]), 0.5 * S, INK, 0.7);
    pen.hair(L([pt(x0 + 2, -r), pt(x0 + 2, r)]), 0.5 * S, INK, 0.7);
    // A lightning bolt label.
    const bolt = [pt(1, -10), pt(-6, 1), pt(-1, 1), pt(-4, 10), pt(7, -3), pt(2, -3), pt(7, -10)].map((p) => pt(p.x - 3, p.y));
    pen.fill(L(bolt), '#f6d23c', 1);
    pen.stroke(L([...bolt, bolt[0]!]), 0.7 * S, INK, 1, false);
    cylinderShade(d, x0, x1, r, 4.5, 1.5, INK, 0.5);
    // Highlight streak along the top.
    pen.fill(L([pt(x0 + 3, -7.4), pt(x1 - 5, -7.4), pt(x1 - 5, -5.6), pt(x0 + 3, -5.6)]), PAPER_FILL, 0.55);
    // Crumpled crease lines around the dent.
    for (const k of [-2, 0, 2]) pen.hair(L(qb(pt(-4 + k * 2, -r + 2.6), pt(-4 + k * 3, -5), pt(-4 + k * 1.2, -2))), 0.45 * S, INK, 0.75);
  });
  pen.stroke(L([...body, body[0]!]), 1.2 * S);
  // The lid with its rim, ring pull and drinking hole.
  const lid = oval(x1, 0, e, r, 20);
  pen.fill(L(lid), '#d9dde1', 1);
  pen.hair(L(oval(x1 + 0.3, 0, e * 0.7, r * 0.8, 18)), 0.5 * S, INK, 0.8);
  pen.fill(L(oval(x1 + 0.6, 4, 1.3, 2.6, 10)), INK, 0.8);
  pen.hair(L(oval(x1 + 0.6, -3.5, 1.5, 3.4, 12)), 0.55 * S, INK, 0.9);
  pen.dot(P(x1 + 0.6, -1).x, P(x1 + 0.6, -1).y, 0.6 * S);
  pen.stroke(L(lid), 1 * S);
}

function drawChum(d: Draw): void {
  const { pen, L, rng } = d;
  const sack = [...oval(0, 7, 19, 17, 26, -Math.PI / 2 + 0.38, (Math.PI * 3) / 2 - 0.38), pt(-3, -11), pt(-2.4, -15), pt(2.4, -15), pt(3, -11)];
  // A fish tail poking out of the mesh.
  const tail = [pt(14, -2), pt(25, -10), pt(23, -2), pt(27, 4), pt(15, 4)];
  pen.fill(L(tail), PAPER_FILL, 1);
  pen.fill(L(tail), '#a3a8a0', 0.7);
  for (let i = 0; i < 4; i++) pen.hair(L([pt(16, 0), pt(24, -7 + i * 3.5)]), 0.4 * S, INK, 0.7);
  pen.stroke(L([...tail, tail[0]!]), 0.9 * S);
  pen.fill(L(sack), PAPER_FILL, 1);
  pen.fill(L(sack), '#8a4f33', 0.55);
  pen.clipped(L(sack), () => {
    // Chunks of fish and pellets packed inside.
    for (let i = 0; i < 9; i++) {
      const c = pt(-14 + rng() * 28, -2 + rng() * 22);
      const chunk = oval(c.x, c.y, 3.5 + rng() * 2.5, 2.5 + rng() * 1.5, 8).map((p) => pt(p.x + (rng() - 0.5) * 1.6, p.y + (rng() - 0.5) * 1.6));
      pen.fill(L(chunk), rng() < 0.6 ? '#c0473b' : '#e2a08a', 0.9);
      pen.hair(L(chunk), 0.4 * S, INK, 0.6);
    }
    for (let i = 0; i < 30; i++) {
      const c = pt(-16 + rng() * 32, -6 + rng() * 30);
      pen.fill(L(oval(c.x, c.y, 1.4, 1.4, 8)), '#5a3a22', 0.95);
    }
    // The knotted mesh: a diagonal net over everything.
    for (let k = -40; k < 40; k += 4.2) {
      pen.hair(L([pt(k - 20, -20), pt(k + 30, 30)]), 0.5 * S, INK, 0.85);
      pen.hair(L([pt(k + 20, -20), pt(k - 30, 30)]), 0.5 * S, INK, 0.85);
    }
  });
  pen.stroke(L([...sack, sack[0]!]), 1.1 * S);
  // Cinched neck, knot and string ends.
  for (let i = 0; i < 3; i++) pen.hair(L([pt(-3.4, -14 + i * 1.3), pt(3.4, -13.4 + i * 1.3)]), 0.6 * S, INK, 0.9);
  pen.fill(L(oval(0, -17, 2.6, 2.2, 10)), '#c9b38a', 1);
  pen.stroke(L(oval(0, -17, 2.6, 2.2, 10)), 0.8 * S, INK, 1, false);
  pen.stroke(L([...qb(pt(1.5, -18.5), pt(6, -28), pt(12, -25), 8), pt(14, -21)]), 0.8 * S, INK, 1, false);
  pen.stroke(L(qb(pt(-1.5, -18.5), pt(-5, -22), pt(-10, -23), 6)), 0.8 * S, INK, 1, false);
}

function drawBag(d: Draw): void {
  const { pen, L, rng } = d;
  // Drifting upside down: the sealed bottom billows up like a jelly bell, handles trail below.
  const left = qb(pt(-12, 8), pt(-27, -6), pt(-14, -23), 12);
  const seam = qb(pt(-14, -23), pt(1, -29), pt(15, -22), 12);
  const right = qb(pt(15, -22), pt(26, -5), pt(13, 8), 12);
  const handleR = [...qb(pt(13, 8), pt(17, 27), pt(7, 27), 8), ...qb(pt(7, 27), pt(3, 19), pt(4, 9), 6)];
  const mouth = qb(pt(4, 9), pt(0, 13), pt(-4, 9), 6);
  const handleL = [...qb(pt(-4, 9), pt(-2, 19), pt(-6, 26), 6), ...qb(pt(-6, 26), pt(-16, 27), pt(-12, 8), 8)];
  const bag = [...left, ...seam, ...right, ...handleR, ...mouth, ...handleL];
  pen.fill(L(bag), PAPER_FILL, 0.75);
  pen.fill(L(bag), '#d6e3ea', 0.45);
  const holes = [oval(-8.5, 18, 2.2, 5, 12), oval(9.5, 18, 2.2, 5, 12)];
  holes.forEach((h) => cut(d, h));
  pen.clipped(L(bag), () => {
    // Faded red print, upside down like the bag.
    const { ctx } = pen;
    const c = d.P(-1, -7);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI + Math.atan2(d.P(1, 0).y - d.P(0, 0).y, d.P(1, 0).x - d.P(0, 0).x));
    ctx.fillStyle = '#c4433a';
    ctx.globalAlpha = 0.55;
    ctx.font = `bold ${3.6 * S}px Georgia, serif`;
    ctx.textAlign = 'center';
    ['THANK YOU', 'THANK YOU'].forEach((t, i) => ctx.fillText(t, 0, (i * 5.4 - 1) * S));
    ctx.restore();
    // Soft crumple folds running the length of the bag.
    for (let i = -3; i <= 3; i++) {
      const x = i * 4.6 + (rng() - 0.5) * 2;
      pen.hair(L(qb(pt(x, -22), pt(x + (rng() - 0.5) * 9, -8), pt(x * 0.7 + (rng() - 0.5) * 3, 7), 10)), 0.45 * S, INK, 0.4 + rng() * 0.25);
    }
    for (let i = 0; i < 6; i++) {
      const c2 = pt(-12 + rng() * 24, -18 + rng() * 22);
      pen.hair(L([c2, pt(c2.x + 2, c2.y + 1.5), pt(c2.x + 1, c2.y + 3.5), pt(c2.x + 3, c2.y + 5)]), 0.4 * S, INK, 0.55);
    }
    // Faint shade on one flank.
    for (let y = -18; y < 8; y += 2) pen.hair(L([pt(11, y), pt(22, y - 3)]), 0.4 * S, '#5a6a78', 0.35);
  });
  // The heat-sealed edge at the (top) bottom.
  pen.hair(L(seam.map((p) => pt(p.x * 0.97, p.y + 2.4))), 0.5 * S, INK, 0.6);
  pen.stroke(L([...bag, bag[0]!]), 0.9 * S, INK, 0.9);
  holes.forEach((h) => pen.hair(L(h), 0.6 * S, INK, 0.85));
}

function drawBattery(d: Draw): void {
  const { pen, L, P, rng } = d;
  const [x0, x1, r, e] = [-20, 16, 8, 3];
  const body = cylinder(x0, x1, r, e);
  pen.fill(L(body), '#26252b', 1);
  pen.clipped(L(body), () => {
    pen.fill(L([pt(4, -r - 2), pt(x1 + 5, -r - 2), pt(x1 + 5, r + 2), pt(4, r + 2)]), '#c8782d', 1);
    pen.hair(L([pt(4, -r), pt(4, r)]), 0.6 * S, INK, 0.9);
    cylinderShade(d, 4, x1, r, 3, 1.4, '#5a2f10', 0.7);
    // Highlights: matte black body, shiny copper cap.
    pen.fill(L([pt(x0 + 1, -5.6), pt(4, -5.6), pt(4, -4), pt(x0 + 1, -4)]), PAPER_FILL, 0.4);
    pen.fill(L([pt(4.5, -5.6), pt(x1 - 1, -5.6), pt(x1 - 1, -4), pt(4.5, -4)]), '#ffd9a6', 0.85);
    // A white plus sign on the copper.
    pen.stroke(L([pt(7.5, 1), pt(12.5, 1)]), 0.9 * S, PAPER_FILL, 1, false);
    pen.stroke(L([pt(10, -1.5), pt(10, 3.5)]), 0.9 * S, PAPER_FILL, 1, false);
    // Rust and leak crust around the negative end.
    const leak = oval(-16, 4, 5, 3.6, 12).map((p) => pt(p.x + (rng() - 0.5) * 2, p.y + (rng() - 0.5) * 2));
    pen.fill(L(leak), '#a65a2a', 0.85);
    pen.stipple(L(leak), 160, () => 0.7, 0.35 * S, '#5e2a0e');
    pen.hair(L([pt(-12, -1), pt(-8, 0.5), pt(-6, -1)]), 0.4 * S, PAPER_FILL, 0.5);
  });
  pen.stroke(L([...body, body[0]!]), 1.1 * S);
  // Silver end cap and the + terminal nub.
  pen.fill(L(oval(x1, 0, e, r, 18)), '#c9cdd2', 1);
  pen.stroke(L(oval(x1, 0, e, r, 18)), 0.9 * S);
  const nub = cylinder(x1 + 0.6, x1 + 3.6, 3, 1.1);
  pen.fill(L(nub), '#d9dde1', 1);
  pen.stroke(L([...nub, nub[0]!]), 0.8 * S, INK, 1);
  // A rusty drip trailing from the leak.
  pen.stroke(L([pt(-17, 7.5), pt(-18, 10.5), pt(-17.6, 12.5)]), 1.1 * S, '#8a4520', 0.85, false);
  pen.dot(P(-17.6, 13.4).x, P(-17.6, 13.4).y, 0.9 * S, '#8a4520', 0.85);
  // Little electric sparks.
  zigzag(d, -10, -14, 8, -1.9);
  zigzag(d, 12, -12, 8, -1.2);
  zigzag(d, 23, 4, 7, 0.3);
  zigzag(d, -2, 13, 7, 1.7);
}

function drawTin(d: Draw): void {
  const { pen, L, P } = d;
  const [rx, ry, yt, yb] = [16, 5.5, -4, 22];
  // The lid, prised up and bent back behind the opening, with a jagged edge.
  const lid = oval(0, 0, 15, 8.5, 32).map((p, i) => {
    const k = i % 2 ? 0.94 : 1;
    const q = pt(p.x * k, p.y * k);
    const a = -0.22;
    return pt(2 + q.x * Math.cos(a) - q.y * Math.sin(a), yt - 15 + q.x * Math.sin(a) + q.y * Math.cos(a));
  });
  pen.fill(L(lid), '#cfd3d8', 1);
  pen.clipped(L(lid), () => {
    for (const k of [0.75, 0.55]) pen.hair(L(lid.map((p) => pt(2 + (p.x - 2) * k, yt - 15 + (p.y - yt + 15) * k))), 0.5 * S, INK, 0.6);
    for (let x = -14; x < 18; x += 2) pen.hair(L([pt(x, yt - 30), pt(x + 6, yt - 2)]), 0.4 * S, INK, 0.35);
  });
  pen.stroke(L(lid), 0.9 * S);
  const body = [pt(-rx, yt), pt(-rx, yb), ...oval(0, yb, rx, ry, 16, Math.PI, 0), pt(rx, yt), ...oval(0, yt, rx, ry, 16, 0, -Math.PI)];
  pen.fill(L(body), PAPER_FILL, 1);
  pen.fill(L(body), '#aeb3ba', 0.85);
  const front = (y: number): Pt[] => oval(0, y, rx, ry, 16, Math.PI, 0);
  pen.clipped(L(body), () => {
    // Paper label with a little fish drawn on it.
    const label = [...front(3), ...front(16).reverse()];
    pen.fill(L(label), '#f3e9cc', 1);
    pen.fill(L(label), '#d24a3a', 0.25);
    const fish = [...oval(0, 10.5, 6.5, 3.3, 14, Math.PI * 0.15, Math.PI * 1.85), pt(9.5, 7.5), pt(9.5, 13.5)];
    pen.fill(L(fish), '#3f74a8', 0.8);
    pen.hair(L([...fish, fish[0]!]), 0.5 * S, INK, 0.9);
    pen.dot(P(-3.5, 9.8).x, P(-3.5, 9.8).y, 0.55 * S);
    pen.hair(L(front(3)), 0.55 * S, INK, 0.85);
    pen.hair(L(front(16)), 0.55 * S, INK, 0.85);
    // Pressed ribs above and below the label.
    for (const y of [-0.5, 1.5, 18, 20]) pen.hair(L(front(y)), 0.5 * S, INK, 0.6);
    // Metal shading on the right and a bright stripe on the left.
    for (let x = 9; x < rx + 1; x += 1.3) pen.hair(L([pt(x, yt), pt(x, yb + ry)]), 0.4 * S, INK, 0.45);
    pen.fill(L([pt(-12, yt), pt(-9.5, yt), pt(-9.5, yb + 6), pt(-12, yb + 6)]), PAPER_FILL, 0.5);
  });
  pen.stroke(L([...body, body[0]!]), 1.1 * S);
  // The dark inside of the tin and its jagged cut rim.
  const rim = oval(0, yt, rx - 0.6, ry - 0.4, 32).map((p, i) => (i % 2 ? pt(p.x * 0.95, yt + (p.y - yt) * 0.9) : p));
  pen.fill(L(rim), '#3a3940', 0.9);
  pen.hair(L(oval(-2, yt + 1, 9, 2.4, 14, Math.PI * 1.1, Math.PI * 1.9)), 0.5 * S, PAPER_FILL, 0.5);
  pen.stroke(L(rim), 0.7 * S, INK, 1, false);
  pen.stroke(L(oval(0, yt, rx, ry, 24)), 0.9 * S);
}

function drawRings(d: Draw): void {
  const { pen, L } = d;
  // Warp the flat 2x3 grid so the strip sags and twists a little.
  const warp = (p: Pt): Pt => pt(p.x * (1 - 0.04 * (p.y / 7)), p.y + 0.008 * p.x * p.x - 0.05 * p.x * (p.y / 7));
  const W = (pts: readonly Pt[]): Pt[] => L(pts.map(warp));
  const rings: { outer: Pt[]; inner: Pt[] }[] = [];
  for (const cy of [-7, 7]) {
    for (const cx of [-15, 0, 15]) {
      rings.push({ outer: oval(cx, cy, 8.6, 7.8, 28), inner: oval(cx, cy + 0.3, 6.1, 5.3, 28) });
    }
  }
  // One translucent sheet of plastic (union of the outer ovals), then punch the holes.
  const { ctx } = pen;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#e9f1f3';
  ctx.beginPath();
  rings.forEach(({ outer }) => W(outer).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))));
  ctx.fill();
  ctx.restore();
  rings.forEach(({ inner }) => cut(d, inner));
  rings.forEach(({ outer, inner }) => {
    const mid = outer.map((p, i) => pt((p.x + inner[i]!.x) / 2, (p.y + inner[i]!.y) / 2));
    pen.hair(W(mid.slice(3, 11)), 0.4 * S, '#6a8790', 0.55);
    pen.hair(W(inner.slice(17, 24)), 0.9 * S, PAPER_FILL, 0.95);
  });
  rings.forEach(({ outer, inner }) => {
    pen.stroke(W(outer), 0.85 * S);
    pen.hair(W(inner), 0.65 * S, INK, 0.9);
  });
}

function drawDuck(d: Draw): void {
  const { pen, L, P } = d;
  const YELLOW = '#f6cd2f';
  const back = [...qb(pt(-26, -7), pt(-22, 1), pt(-13, 0), 8), ...qb(pt(-13, 0), pt(-7, -1), pt(-3, -2), 4)];
  const front = [...qb(pt(13, -3), pt(26, 5), pt(15, 18), 10), ...qb(pt(15, 18), pt(0, 26), pt(-16, 19), 10), ...qb(pt(-16, 19), pt(-29, 10), pt(-26, -7), 10)];
  const body = [...front, ...back];
  pen.fill(L(body), PAPER_FILL, 1);
  pen.fill(L(body), YELLOW, 0.95);
  pen.clipped(L(body), () => {
    for (let x = -30; x < 30; x += 1.6) pen.hair(L([pt(x, 26), pt(x + 8, 10)]), 0.45 * S, '#9a6a12', 0.55);
    pen.fill(L(oval(-12, 4, 8, 2.2, 12)), PAPER_FILL, 0.5);
  });
  pen.stroke(L(front), 1.2 * S);
  pen.stroke(L(back), 1.2 * S);
  // Moulded wing.
  pen.stroke(L([...qb(pt(-14, 5), pt(-4, 3), pt(3, 9), 8), ...qb(pt(3, 9), pt(-4, 17), pt(-15, 12), 8)]), 0.8 * S, INK, 0.9, false);
  for (const k of [0, 1, 2]) pen.hair(L(qb(pt(-12 + k * 4, 7), pt(-9 + k * 4, 10), pt(-12 + k * 4, 13), 5)), 0.45 * S, INK, 0.6);
  // Head.
  const head = oval(6, -11, 11, 10.5, 28);
  pen.fill(L(head), PAPER_FILL, 1);
  pen.fill(L(head), YELLOW, 0.95);
  pen.clipped(L(head), () => {
    for (let x = 4; x < 20; x += 1.5) pen.hair(L([pt(x, 0), pt(x + 6, -12)]), 0.45 * S, '#9a6a12', 0.5);
    pen.fill(L(oval(2, -16, 4.5, 2.6, 12)), PAPER_FILL, 0.65);
  });
  pen.stroke(L(oval(6, -11, 11, 10.5, 24, Math.PI * 0.62, Math.PI * 2.08)), 1.2 * S);
  // Beak with a mouth line.
  const beak = [pt(15.5, -13.5), ...qb(pt(19, -14.5), pt(27, -13), pt(27, -9.5), 6), ...qb(pt(27, -9.5), pt(25, -5), pt(16, -5.5), 6)];
  pen.fill(L(beak), '#ec7a2a', 1);
  pen.hair(L(qb(pt(17, -9.5), pt(22, -8.5), pt(26.5, -9.6), 6)), 0.55 * S, INK, 0.9);
  pen.stroke(L([...beak, beak[0]!]), 1 * S);
  // Eye with a glint.
  const eye = P(9, -14);
  pen.dot(eye.x, eye.y, 2.1 * S);
  pen.dot(eye.x - 0.6 * S, eye.y - 0.7 * S, 0.6 * S, PAPER_FILL);
}

function drawFirecracker(d: Draw): void {
  const { pen, L, P, rng } = d;
  const [x0, x1, r, e] = [-19, 13, 7, 2.6];
  const body = cylinder(x0, x1, r, e);
  pen.fill(L(body), '#c8322b', 1);
  pen.clipped(L(body), () => {
    for (const [a, b] of [[x0 - 4, x0 + 3], [-4, -2], [x1 - 4, x1 - 1.5]] as const) {
      pen.fill(L([pt(a, -r - 1), pt(b, -r - 1), pt(b, r + 1), pt(a, r + 1)]), '#e0b04a', 1);
      pen.hair(L([pt(a, -r), pt(a, r)]), 0.4 * S, INK, 0.7);
      pen.hair(L([pt(b, -r), pt(b, r)]), 0.4 * S, INK, 0.7);
    }
    // Paper wrap seams spiralling round the tube.
    for (let x = x0 + 5; x < x1 - 4; x += 4) pen.hair(L([pt(x, -r), pt(x + 3, r)]), 0.4 * S, '#6e1410', 0.5);
    cylinderShade(d, x0, x1, r, 2.5, 1.3, '#3a0a08', 0.6);
    pen.fill(L([pt(x0 + 1, -5), pt(x1 - 1, -5), pt(x1 - 1, -3.6), pt(x0 + 1, -3.6)]), '#ffd6c8', 0.6);
  });
  pen.stroke(L([...body, body[0]!]), 1.1 * S);
  pen.fill(L(oval(x1, 0, e, r, 16)), '#efe2c4', 1);
  pen.stroke(L(oval(x1, 0, e, r, 16)), 0.9 * S);
  pen.dot(P(x1 + 0.4, 0).x, P(x1 + 0.4, 0).y, 0.9 * S);
  // Twisted fuse, blackened near the flame.
  const fuse = qb(pt(x1 + 0.5, 0), pt(20, 1), pt(22, -8), 10);
  pen.stroke(L(fuse), 1.1 * S, '#6b5a3a', 1, false);
  fuse.forEach((p, i) => i % 2 || pen.hair(L([pt(p.x - 0.8, p.y - 0.6), pt(p.x + 0.8, p.y + 0.6)]), 0.35 * S, INK, 0.8));
  pen.stroke(L(fuse.slice(7)), 1.1 * S, INK, 1, false);
  // Spark star at the tip.
  const c = pt(22.5, -10);
  const star = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * TAU + 0.2;
    const rr = i % 2 ? 2.2 : 6 + rng() * 1.5;
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
  pen.fill(L(star), '#ffcf33', 1);
  pen.fill(L(oval(c.x, c.y, 2.2, 2.2, 10)), '#fff7c2', 1);
  pen.hair(L([...star, star[0]!]), 0.5 * S, '#b2420e', 0.95);
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU;
    const q = P(c.x + Math.cos(a) * (8 + rng() * 2), c.y + Math.sin(a) * (8 + rng() * 2));
    pen.dot(q.x, q.y, 0.6 * S, '#e8731c');
  }
}

function drawLure(d: Draw): void {
  const { pen, L, P } = d;
  // Wire shaft with an eye at the top.
  pen.stroke(L(oval(0, -27, 2.4, 2.4, 12)), 0.8 * S, INK, 1, false);
  pen.stroke(L([pt(0, -24.6), pt(0, 15)]), 0.8 * S, INK, 1, false);
  // Teardrop blade hanging off a clevis, swung to one side.
  const a = 0.5;
  const tear = [pt(0, 0), ...oval(0, 15, 8.5, 9, 22, -0.15 * Math.PI, 1.15 * Math.PI)];
  const blade = tear.map((p) => pt(1 + p.x * Math.cos(a) - p.y * Math.sin(a), -21 + p.x * Math.sin(a) + p.y * Math.cos(a)));
  pen.fill(L(blade), PAPER_FILL, 1);
  pen.fill(L(blade), '#b9c3cc', 0.9);
  pen.clipped(L(blade), () => {
    for (let k = -30; k < 10; k += 1.4) pen.hair(L([pt(k, -10), pt(k + 10, 10)]), 0.4 * S, INK, 0.5);
    pen.fill(L(oval(-6, -9, 2, 5.5, 12).map((p) => pt(p.x + (p.y + 9) * 0.5, p.y))), PAPER_FILL, 0.95);
  });
  pen.hair(L([pt(0.5, -19), pt(-7.5, -3)]), 0.45 * S, INK, 0.7);
  pen.stroke(L([...blade, blade[0]!]), 1 * S);
  pen.stroke(L(qb(pt(-1.5, -20), pt(0, -23.5), pt(1.5, -20), 4)), 0.7 * S, INK, 1, false);
  // Bead body: red, yellow, red, then a brass weight.
  for (const [y, rr, col] of [[-12, 2.6, '#d0342c'], [-7, 2.5, '#f2c53a'], [-2.2, 2.4, '#d0342c']] as const) {
    pen.fill(L(oval(0, y, rr, rr, 12)), col, 1);
    pen.stroke(L(oval(0, y, rr, rr, 12)), 0.7 * S, INK, 1, false);
    pen.dot(P(-0.9, y - 0.9).x, P(-0.9, y - 0.9).y, 0.6 * S, PAPER_FILL, 0.9);
  }
  const brass = [pt(-2.4, 0.6), pt(2.4, 0.6), pt(3, 9), pt(1.5, 12), pt(-1.5, 12), pt(-3, 9)];
  pen.fill(L(brass), '#c99a3e', 1);
  pen.hair(L([pt(-1.2, 1.5), pt(-1.4, 10.5)]), 0.6 * S, '#fff1c2', 0.9);
  pen.stroke(L([...brass, brass[0]!]), 0.8 * S, INK, 1, false);
  // Split ring and the treble hook.
  pen.stroke(L(oval(0, 15, 1.7, 2.3, 10)), 0.6 * S, INK, 1, false);
  pen.stroke(L([pt(0, 17.3), pt(0, 24)]), 0.9 * S, INK, 1, false);
  for (const side of [-1, 1]) {
    const hook = [...qb(pt(0, 24), pt(side * 0.5, 29.5), pt(side * 5, 28.5), 6), ...qb(pt(side * 5, 28.5), pt(side * 7.5, 27), pt(side * 7, 21.5), 5)];
    pen.stroke(L(hook), 0.9 * S, INK, 1, false);
    pen.stroke(L([pt(side * 7, 21.5), pt(side * 5.6, 23.8)]), 0.7 * S, INK, 1, false);
  }
  pen.stroke(L([...qb(pt(0, 24), pt(0.5, 30), pt(2.6, 29.5), 5), pt(3.4, 26.5)]), 0.9 * S, INK, 1, false);
  pen.hair(L([pt(3.4, 26.5), pt(2.2, 27.6)]), 0.6 * S, INK, 1);
}

function drawBottle(d: Draw): void {
  const { pen, L, P } = d;
  const GREEN = '#2f8a52';
  const top = [pt(-24, -10), pt(5, -10), ...qb(pt(5, -10), pt(12, -10), pt(13, -4.2), 6), pt(21, -4.2)];
  const glass = [...top, ...oval(21, 0, 1.4, 4.2, 8, -Math.PI / 2, Math.PI / 2), ...top.map((p) => pt(p.x, -p.y)).reverse(), ...oval(-24, 0, 3.5, 10, 12, Math.PI / 2, Math.PI * 1.5)];
  // Cork sticking out of the neck.
  const cork = cylinder(20.5, 26.5, 3.5, 1.3);
  pen.fill(L(cork), '#c39257', 1);
  pen.stipple(L(cork), 70, () => 0.8, 0.35 * S, '#5a3a1a');
  pen.stroke(L([...cork, cork[0]!]), 0.8 * S);
  pen.fill(L(glass), PAPER_FILL, 0.55);
  pen.fill(L(glass), GREEN, 0.5);
  // The rolled note inside, tied with a red thread.
  const note = cylinder(-17, 3, 4.6, 1.8).map((p) => pt(p.x, p.y + 2.5));
  pen.fill(L(note), '#f5e9c8', 1);
  pen.fill(L(note), GREEN, 0.18);
  pen.hair(L(oval(3, 2.5, 1.8, 4.6, 14)), 0.5 * S, INK, 0.8);
  pen.hair(L(oval(3.3, 2.5, 0.9, 2.2, 10)), 0.45 * S, INK, 0.7);
  for (const y of [0, 3, 5]) pen.hair(L([pt(-14, y), pt(0, y)]), 0.35 * S, INK, 0.45);
  pen.stroke(L([pt(-7, -2), pt(-6.4, 7)]), 1 * S, '#b23a2e', 1, false);
  pen.hair(L([...note, note[0]!]), 0.55 * S, INK, 0.85);
  pen.clipped(L(glass), () => {
    cylinderShade(d, -26, 22, 10, 6, 1.3, '#123d23', 0.6);
    pen.fill(L(oval(-24, 0, 3.5, 10, 16)), '#1d5a35', 0.35);
  });
  // Glass highlights.
  pen.fill(L([pt(-21, -7.6), pt(4, -7.6), pt(4, -6), pt(-21, -6)]), PAPER_FILL, 0.85);
  pen.fill(L([pt(13, -2.8), pt(19, -2.8), pt(19, -1.9), pt(13, -1.9)]), PAPER_FILL, 0.8);
  pen.dot(P(-23, 6).x, P(-23, 6).y, 0.8 * S, PAPER_FILL, 0.8);
  pen.stroke(L([...glass, glass[0]!]), 1.1 * S, '#14301e');
  // Lip ring at the mouth.
  const lip = cylinder(18.5, 21, 5, 1.6);
  pen.fill(L(lip), GREEN, 0.75);
  pen.stroke(L([...lip, lip[0]!]), 0.8 * S, '#14301e');
}

function drawGlowstick(d: Draw): void {
  const { pen, L, rng } = d;
  const [x0, x1, r] = [-21, 22, 4.2];
  const GLOW = '#8dff4f';
  // Soft halo, brightest along the tube.
  pen.fill(L(oval(1, 0, 30, 13, 28)), GLOW, 0.14);
  pen.fill(L(oval(1, 0, 27, 9, 28)), GLOW, 0.2);
  pen.fill(L(oval(1, 0, 25, 6.5, 28)), GLOW, 0.28);
  const tube = [...oval(x1 - r, 0, r, r, 10, -Math.PI / 2, Math.PI / 2), ...oval(x0 + r, 0, r, r, 10, Math.PI / 2, Math.PI * 1.5)];
  pen.fill(L(tube), '#6fe63c', 1);
  pen.clipped(L(tube), () => {
    pen.fill(L([pt(x0, -1.6), pt(x1, -1.6), pt(x1, 0.8), pt(x0, 0.8)]), '#efffd6', 0.9);
    cylinderShade(d, x0, x1, r, 2.4, 1, '#2f7a1c', 0.55);
    // Shards of the snapped inner vial.
    for (let i = 0; i < 7; i++) pen.hair(L([pt(-6 + rng() * 14, -2 + rng() * 4), pt(-5 + rng() * 14, -2 + rng() * 4)]), 0.45 * S, '#ffffff', 0.9);
    // Plastic end cap.
    pen.fill(L([pt(x0 - 1, -r - 1), pt(x0 + 3.5, -r - 1), pt(x0 + 3.5, r + 1), pt(x0 - 1, r + 1)]), '#3b8c27', 1);
    pen.hair(L([pt(x0 + 3.5, -r), pt(x0 + 3.5, r)]), 0.5 * S, INK, 0.8);
  });
  // Bent kink where it was snapped.
  pen.hair(L([pt(1, -r), pt(0, -1.5), pt(1.5, 0.5), pt(0.5, r)]), 0.5 * S, '#235c16', 0.8);
  pen.stroke(L([...tube, tube[0]!]), 0.75 * S, '#1d3d14', 1);
  // Little loop for a lanyard.
  pen.stroke(L(oval(x0 - 3.4, 0, 3, 2.6, 14)), 0.75 * S, '#1d3d14', 1, false);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rng();
    pen.hair(L([pt(1 + Math.cos(a) * 26, Math.sin(a) * 10), pt(1 + Math.cos(a) * 29, Math.sin(a) * 12)]), 0.4 * S, '#4fbf2a', 0.6);
  }
}

// ---------------------------------------------------------------- entry point

type Painter = { draw: (d: Draw) => void; rot?: number; scale?: number; dx?: number; dy?: number };

const PAINTERS: Readonly<Record<ItemId, Painter>> = {
  can: { draw: drawCan, rot: -0.3, dx: -1 },
  chum: { draw: drawChum, dy: 2 },
  bag: { draw: drawBag, rot: 0.12 },
  battery: { draw: drawBattery, rot: -0.4 },
  tin: { draw: drawTin, scale: 0.9, dy: 1.5 },
  rings: { draw: drawRings, rot: -0.15, scale: 1.05 },
  duck: { draw: drawDuck, rot: -0.05, dy: 2 },
  firecracker: { draw: drawFirecracker, rot: -0.5, dx: -3, dy: 4 },
  lure: { draw: drawLure, rot: 0.12, scale: 0.92 },
  bottle: { draw: drawBottle, rot: -0.35, dx: -1 },
  glowstick: { draw: drawGlowstick, rot: -0.75 },
};

/** One item, centred in an ITEM_SIZE * ART_RES square canvas; `seed` varies the pen wobble. */
export function drawItem(ctx: CanvasRenderingContext2D, kind: ItemId, seed: number): void {
  const p = PAINTERS[kind];
  const pen = new Pen(ctx, seed, 0.45);
  p.draw(frame(pen, seed, p.rot ?? 0, p.scale ?? 1, p.dx ?? 0, p.dy ?? 0));
}
