import type { Rng } from '../logic/rng';
import { arc, blob, body, type Edgeness, edgeWash, groundWash, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { LICHEN, LIMESTONE, LIMESTONE_COOL, worn } from './ruinsThings';
import { mix, rgba } from './wash';

/**
 * The ruins' floor: big worn flagstones, cracked and here and there broken
 * or gone to earth towards the edges, moss and grass in the joints; and in
 * the nave the remains of an old mosaic, faded terracotta and ochre
 * tesserae in a sawtooth border round a rosette, lost in patches to the
 * lime bed beneath. Pale and quiet in the middle. Board coordinates.
 */
const JOINT = '#bdb59c';
const FLOOR_DEEP = '#9d937c';
const EARTH = '#8d7356';
const BED = '#e2d8bf';
const TERRACOTTA = '#c47a5a';
const OCHRE = '#d1a65a';
const CREAM = '#efe6cf';
const SLATE = '#8a9696';
const TERRA_DARK = '#a05f48';
/** A tessera's pitch, board units. */
const TESSERA = 5.4;

interface Flag {
  readonly shape: Pt[];
  readonly sides: Pt[][];
  readonly c: Pt;
  readonly w: number;
  readonly h: number;
}

/** Courses of big rectangular flags, each joint a little askew, the courses gently wavering. */
function layFlags(w: number, h: number, rng: Rng): Flag[] {
  const rows: number[] = [-30 - rng() * 40];
  while (rows[rows.length - 1]! < h + 10) rows.push(rows[rows.length - 1]! + 96 + rng() * 48);
  const phase = rows.map(() => rng() * TAU);
  const course = (i: number, x: number): number => rows[i]! + Math.sin(x / 210 + phase[i]!) * 4;
  const g = 2.4;
  const out: Flag[] = [];
  for (let r = 0; r + 1 < rows.length; r++) {
    const joints: { top: number; bot: number }[] = [];
    for (let x = -40 - rng() * 120; x < w + 40; x += 110 + rng() * 120) {
      const lean = (rng() - 0.5) * 12;
      joints.push({ top: x + lean, bot: x - lean });
    }
    joints.push({ top: w + 240, bot: w + 240 });
    for (let j = 0; j + 1 < joints.length; j++) {
      const [a, b] = [joints[j]!, joints[j + 1]!];
      const along = (x0: number, x1: number, row: number, dy: number): Pt[] => {
        const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 18));
        return Array.from({ length: n + 1 }, (_, k) => pt(x0 + ((x1 - x0) * k) / n, course(row, x0 + ((x1 - x0) * k) / n) + dy));
      };
      const top = along(a.top + g, b.top - g, r, g);
      const bot = along(b.bot - g, a.bot + g, r + 1, -g);
      const right = [top[top.length - 1]!, bot[0]!];
      const left = [bot[bot.length - 1]!, top[0]!];
      out.push({ shape: worn([...top, ...bot], 5), sides: [top, right, bot, left], c: pt((a.top + b.bot) / 2, (course(r, a.top) + course(r + 1, b.bot)) / 2), w: b.top - a.top, h: rows[r + 1]! - rows[r]! });
    }
  }
  return out;
}

/** A crack wandering across a flag from one side towards another, with a branch or two. */
function crack(d: Draw, f: Flag, rng: Rng, alpha: number): Pt[] {
  const a0 = rng() * TAU;
  const from = polar(f.c, a0, Math.min(f.w, f.h) * 0.55);
  const to = polar(f.c, a0 + Math.PI + (rng() - 0.5) * 1.2, Math.min(f.w, f.h) * 0.55);
  const line = arc(from, to, (rng() - 0.5) * 20, 9).map((p, i, all) => (i === 0 || i === all.length - 1 ? p : polar(p, rng() * TAU, 2.5)));
  d.pen.clipped(f.shape, () => {
    d.pen.stroke(line, 0.8, d.ink, alpha, false);
    const k = 2 + Math.floor(rng() * 5);
    d.pen.hair([line[k]!, polar(line[k]!, a0 + 1.2 + rng(), 8 + rng() * 14)], 0.5, d.ink, alpha * 0.8);
  });
  return line;
}

/** One flag: pale wash, weathering, a worn shadowed edge, a broken outline, now and then a crack; firmer towards the edges. */
function paintFlag(d: Draw, f: Flag, edge: Edgeness, rng: Rng): void {
  const { pen } = d;
  const e = edge(f.c.x, f.c.y);
  // A few towards the edges have gone altogether: earth and moss where they were.
  if (e > 0.55 && rng() < 0.1) {
    // The flag's own bed, a little inset: the joints' edges crumbled in.
    const hole = f.shape.map((p) => polar(pt(f.c.x + (p.x - f.c.x) * 0.94, f.c.y + (p.y - f.c.y) * 0.92), rng() * TAU, 1.5));
    body(d, hole, mix(EARTH, MOSS, 0.45), 0.4);
    pen.clipped(hole, () => {
      for (let k = 0; k < f.w * 0.9; k++) {
        const p = polar(f.c, rng() * TAU, Math.sqrt(rng()) * f.w * 0.45);
        pen.fill(oval(p.x, p.y, 1.5 + rng() * 2.4, 1.2 + rng() * 1.6, 8), rng() < 0.4 ? LEAF : MOSS, 0.6);
      }
    });
    pen.crescent(hole, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(hole, d.ink, 0.2));
    pen.stroke(closed(hole), 0.7, d.ink, 0.35, false);
    return;
  }
  pen.fill(f.shape, PAPER_FILL, 0.9);
  pen.fill(f.shape, mix(rng() < 0.5 ? LIMESTONE : LIMESTONE_COOL, STONE_DARK, rng() * 0.3), 0.14 + 0.2 * e + rng() * 0.06);
  pen.clipped(f.shape, () => {
    for (let i = 0; i < 3; i++) pen.fill(blob(polar(f.c, rng() * TAU, rng() * f.w * 0.3), 14 + rng() * 26, 9 + rng() * 16, rng, 0.3, 14), STONE_DARK, 0.03 + 0.05 * e);
    if (rng() < 0.2 + 0.5 * e) {
      const p = polar(f.c, rng() * TAU, rng() * f.w * 0.3);
      const lr = 3 + rng() * 6;
      pen.fill(blob(p, lr, lr * 0.85, rng, 0.25, 12), LICHEN, 0.3 + 0.2 * e);
    }
  });
  pen.crescent(f.shape, pt(-3.2, -4.6), () => pen.fill(f.shape, STONE_DARK, 0.12 + 0.1 * e));
  if (e > 0.3) pen.crescent(f.shape, pt(-7, -10), () => pen.hatch(f.shape, 4, 0.9, 0.45, { color: d.ink, alpha: 0.1 + 0.2 * e }));
  const a = 0.16 + 0.45 * e;
  for (const side of f.sides) if (rng() < 0.85) pen.stroke(side, 0.7 + 0.4 * e, d.ink, a, false);
  if (rng() < 0.25 + 0.45 * e) {
    const line = crack(d, f, rng, 0.25 + 0.4 * e);
    // Moss in a crack towards the edges.
    if (e > 0.4) for (const p of line) if (rng() < 0.5) pen.fill(oval(p.x + rng() * 2, p.y + rng() * 2, 1.4 + rng() * 2, 1.2 + rng() * 1.4, 7), MOSS, 0.55);
  }
}

/** Moss and grass in the joints, thicker towards the edges. */
function joints(d: Draw, flags: readonly Flag[], edge: Edgeness, rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  for (const colour of [MOSS, LEAF, '#b9cc78']) {
    ctx.fillStyle = rgba(colour, 0.5);
    ctx.beginPath();
    for (const f of flags) {
      for (const side of [f.sides[0]!, f.sides[1]!]) {
        for (let i = 0; i + 1 < side.length; i++) {
          const [p, q] = [side[i]!, side[i + 1]!];
          const e = edge(p.x, p.y);
          const n = Math.round((Math.hypot(q.x - p.x, q.y - p.y) / 9) * (0.1 + 0.9 * e));
          for (let k = 0; k < n; k++) {
            const t = rng();
            const r = 1 + rng() * 2.2 * (0.4 + e);
            const x = p.x + (q.x - p.x) * t + (rng() - 0.5) * 4;
            const y = p.y + (q.y - p.y) * t + (rng() - 0.5) * 4;
            ctx.moveTo(x + r, y);
            ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU);
          }
        }
      }
    }
    ctx.fill();
  }
  ctx.restore();
}

/** The flagstone floor: see the module comment. */
export function flagFloor(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): void {
  groundWash(d, w, h, JOINT, 0.5);
  edgeWash(d, w, h, FLOOR_DEEP, 0.22, 280);
  const flags = layFlags(w, h, rng);
  for (const f of flags) paintFlag(d, f, edge, rng);
  joints(d, flags, edge, rng);
}

/** A patch of the mosaic lost to the bed: centre and radius, its edge ragged. */
interface Lacuna {
  readonly c: Pt;
  readonly r: number;
  readonly ph: number;
}

const lostIn = (l: Lacuna, x: number, y: number): boolean => {
  const a = Math.atan2(y - l.c.y, x - l.c.x);
  return Math.hypot(x - l.c.x, y - l.c.y) < l.r * (1 + 0.22 * Math.sin(a * 3 + l.ph) + 0.12 * Math.sin(a * 7 + l.ph * 2));
};

/** Tesserae batched by colour: each a little square turned by `turn`, laid into the layer's paths. */
type Lay = (colour: string, x: number, y: number, turn: number) => void;

/**
 * The mosaic panel centred at c, half sizes A × B: a slate fillet, a
 * sawtooth band of terracotta and ochre, a cream field and a rosette
 * medallion laid in rings; lacunae where it's lost.
 */
export function mosaic(d: Draw, c: Pt, A: number, B: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const ragged = (k: number): Pt[] => outline([pt(c.x - A - k, c.y - B - k), pt(c.x + A + k, c.y - B - k), pt(c.x + A + k, c.y + B + k), pt(c.x - A - k, c.y + B + k)], 10).map((p) => polar(p, rng() * TAU, 2.5));
  const bed = ragged(4);
  pen.fill(bed, PAPER_FILL, 0.5);
  pen.fill(bed, BED, 0.55);
  pen.stipple(bed, 900, () => 0.5, 0.5, mix(BED, STONE_DARK, 0.5));
  const lacunae: Lacuna[] = Array.from({ length: 7 }, (_, i) => {
    const onEdge = i < 4;
    const p = onEdge ? pt(c.x + (i % 2 === 0 ? (rng() - 0.5) * 2 * A : (i === 1 ? -A : A)), c.y + (i % 2 === 0 ? (i === 0 ? -B : B) : (rng() - 0.5) * 2 * B)) : pt(c.x + (rng() - 0.5) * 1.6 * A, c.y + (rng() - 0.5) * 1.6 * B);
    return { c: p, r: (onEdge ? 40 : 18) + rng() * (onEdge ? 60 : 34), ph: rng() * TAU };
  });
  const R = Math.min(A, B) * 0.62;
  const paths = new Map<string, Path2D>();
  const lay: Lay = (colour, x, y, turn) => {
    if (lacunae.some((l) => lostIn(l, x, y)) || rng() < 0.035) return;
    const tone = `${colour}${rng() < 0.5 ? 'a' : 'b'}`;
    let p = paths.get(tone);
    if (!p) paths.set(tone, (p = new Path2D()));
    const s = TESSERA * 0.45 * (0.88 + rng() * 0.2);
    const [cs, sn] = [Math.cos(turn) * s, Math.sin(turn) * s];
    const jx = x + (rng() - 0.5) * 0.8;
    const jy = y + (rng() - 0.5) * 0.8;
    p.moveTo(jx - cs + sn, jy - sn - cs);
    p.lineTo(jx + cs + sn, jy + sn - cs);
    p.lineTo(jx + cs - sn, jy + sn + cs);
    p.lineTo(jx - cs - sn, jy - sn + cs);
    p.closePath();
  };
  // The border and the field, on a square grid.
  const band = 26;
  for (let y = c.y - B + TESSERA / 2; y < c.y + B; y += TESSERA) {
    for (let x = c.x - A + TESSERA / 2; x < c.x + A; x += TESSERA) {
      const lx = x - c.x;
      const ly = y - c.y;
      if (Math.hypot(lx, ly) < R + 3) continue;
      const e = Math.min(A - Math.abs(lx), B - Math.abs(ly));
      const s = A - Math.abs(lx) < B - Math.abs(ly) ? ly : lx;
      let colour = CREAM;
      if (e < TESSERA * 1.1) colour = SLATE;
      else if (e < TESSERA * 2.1) colour = CREAM;
      else if (e < TESSERA * 2.1 + band) {
        const f = (s / band) % 1;
        const tri = 1 - Math.abs(2 * (f < 0 ? f + 1 : f) - 1);
        colour = (e - TESSERA * 2.1) / band < tri ? TERRACOTTA : OCHRE;
      } else if (e < TESSERA * 3.2 + band) colour = SLATE;
      lay(colour, x, y, 0);
    }
  }
  // The medallion, laid in rings round its centre, over a soft wash of its rosette.
  const petalR = (a: number): number => R * 0.78 * (0.35 + 0.65 * Math.abs(Math.cos(a * 4)) ** 0.6);
  pen.fill(Array.from({ length: 96 }, (_, i) => polar(c, (i / 96) * TAU, petalR((i / 96) * TAU))), TERRACOTTA, 0.1);
  pen.fill(oval(c.x, c.y, R, R, 48), OCHRE, 0.05);
  for (let rho = TESSERA * 0.6; rho < R + 3; rho += TESSERA) {
    const n = Math.max(6, Math.round((TAU * rho) / TESSERA));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = c.x + Math.cos(a) * rho;
      const y = c.y + Math.sin(a) * rho;
      const edgeR = petalR(a);
      const petal = rho < edgeR;
      const inner = rho < R * 0.78 * (0.2 + 0.4 * Math.abs(Math.cos(a * 4)) ** 0.6);
      let colour = petal ? (inner ? OCHRE : rho > edgeR - TESSERA ? TERRA_DARK : TERRACOTTA) : CREAM;
      if (rho < TESSERA * 1.7) colour = SLATE;
      else if (rho > R - TESSERA * 1.1) colour = SLATE;
      else if (rho > R - TESSERA * 2.2) colour = Math.floor((a / TAU) * 32) % 2 === 0 ? OCHRE : TERRACOTTA;
      lay(colour, x, y, a);
    }
  }
  ctx.save();
  for (const [tone, p] of paths) {
    const base = tone.slice(0, 7);
    ctx.fillStyle = rgba(tone.endsWith('a') ? base : mix(base, STONE_DARK, 0.15), base === CREAM ? 0.5 : 0.36);
    ctx.fill(p);
  }
  ctx.restore();
  // Fade it into the floor, then shade the lost patches: the tesserae stand a little proud of the bed.
  pen.fill(bed, PAPER_FILL, 0.18);
  for (const l of lacunae) {
    const hole = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * TAU;
      return polar(l.c, a, l.r * (1 + 0.22 * Math.sin(a * 3 + l.ph) + 0.12 * Math.sin(a * 7 + l.ph * 2)) - 1.5);
    });
    pen.clipped(bed, () => {
      pen.fill(hole, mix(BED, STONE_DARK, 0.35), 0.18);
      pen.stipple(hole, Math.round(l.r * 3), () => 0.6, 0.5, mix(BED, STONE_DARK, 0.6));
      pen.crescent(hole, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(hole, d.ink, 0.1));
      pen.hair(closed(hole), 0.4, d.ink, 0.18);
    });
  }
  pen.stroke(bed.concat([bed[0]!]), 0.7, d.ink, 0.22, false);
}
