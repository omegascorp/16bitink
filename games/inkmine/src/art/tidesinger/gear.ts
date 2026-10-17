import type { Piece } from '../../logic/gear';
import { capsule, closed, cub, oval, pt, ribbon, tube, type Draw } from '../kit';
import { boxOf, dab, gleam, glow, LIGHT, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * The Tidesingers' own things (spec, "The Tidesingers"), as their broken
 * tools lie in the drowned village on Brine: what the suit studies to
 * learn Mk 3. A sea people who never had fire, so never metal: everything
 * is stone, shell, nacre, glass grown by sponges, woven sea-grass fibre and
 * a waxy sealant at every joint. Where the Aster's things are ribbed and
 * radial round a star, theirs coil: spiral shells, a spiral for their mark,
 * flowing wing-like curves (their language: style.ts). The cell is an
 * electric organ, so its stored charge glows violet. Each fits a frame of 40 units, origin at the centre, as a
 * technology slot's picture does (techArt.ts).
 */
const TIDE = {
  /** Basalt, ground smooth (as style.ts's). */
  stone: '#4d4a57',
  /** A paler worked stone (the spindle, the plates). */
  pale: '#b5ad9c',
  shell: '#efe1c9',
  /** Brown markings on a shell (cowrie spots, nautilus stripes). */
  marking: '#9a5f3c',
  nacre: '#e8e1e6',
  /** Seagrass fibre, twined and dried (as style.ts's). */
  fibre: '#a99a68',
  /** Glass-sponge lattice: white silica. */
  sponge: '#f3f0e4',
  glass: '#cfe5e6',
  /** Their wax: cloudy cream, a little warmer here so a bead of it reads at slot size. */
  wax: '#e6d3a0',
  /** An electric organ's light: violet, unlike their plankton lanterns' blue-white. */
  glow: '#b88dff',
  /** Dark water seen inside a thing. */
  deep: '#2c2343',
} as const;

/** Nacre's play of colour: green, rose, blue and gold, laid over its pearl white in soft bands. */
const IRIS = ['#bfe4d8', '#ecc5dc', '#c4cff2', '#f1e1b8'] as const;

/** Nacre: pearl white, glossy, with soft bands of colour across it and a crisp line. */
export function nacre(d: Draw, shape: readonly Pt[], line = 0.6, shadow = 0.4): void {
  paint(d, shape, TIDE.nacre, { alpha: 1, shadow, hatch: 0, line: 0, gloss: true });
  const b = boxOf(shape);
  const n = 5;
  d.pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = b.x0 + b.w * ((i + 0.5) / n);
      const w = (b.w / n) * 0.55 + 0.4;
      const slant = b.h * 0.45;
      const bandShape = [pt(x - w, b.y0 - 1), pt(x + w, b.y0 - 1), pt(x + w - slant, b.y0 + b.h + 1), pt(x - w - slant, b.y0 + b.h + 1)];
      dab(d, bandShape, IRIS[i % IRIS.length]!, 0.5, Math.max(0.5, w * 0.6));
    }
  });
  if (line > 0) d.pen.stroke(closed(shape), line, d.ink, 0.9, false);
}

/** Worked stone: ground smooth, a little grain in it, matt. */
export function stone(d: Draw, shape: readonly Pt[], color: string = TIDE.stone, line = 0.7): void {
  paint(d, shape, color, { alpha: 1, shadow: 0.55, hatch: 0.2, line });
  const b = boxOf(shape);
  d.pen.stipple(shape, Math.round(b.w * b.h * 0.9), () => 0.5, 0.18, mix(color, SHADOW, 0.5));
  d.pen.stipple(shape, Math.round(b.w * b.h * 0.4), (_, y) => Math.max(0, 1 - (y - b.y0) / b.h), 0.16, mix(color, LIGHT, 0.6));
}

/** Woven sea-grass: the body colour, then a twill of short stitches, every row slanting the other way. */
export function woven(d: Draw, shape: readonly Pt[], color: string = TIDE.fibre, step = 1.5, line = 0.6): void {
  paint(d, shape, color, { alpha: 1, shadow: 0.5, hatch: 0.1, line: 0 });
  const b = boxOf(shape);
  const dark = mix(color, SHADOW, 0.55);
  const lit = mix(color, LIGHT, 0.5);
  d.pen.clipped(shape, () => {
    let row = 0;
    for (let y = b.y0; y < b.y0 + b.h + step; y += step * 0.8, row++) {
      const s = row % 2 ? 1 : -1;
      for (let x = b.x0 - step + (row % 2) * step * 0.5; x < b.x0 + b.w + step; x += step) {
        const a = pt(x - step * 0.32, y + s * step * 0.3);
        const c = pt(x + step * 0.32, y - s * step * 0.3);
        d.pen.hair([pt(a.x + 0.15, a.y + 0.25), pt(c.x + 0.15, c.y + 0.25)], 0.3, dark, 0.7);
        d.pen.hair([a, c], 0.22, lit, 0.6);
      }
    }
  });
  if (line > 0) d.pen.stroke(closed(shape), line, d.ink, 0.9, false);
}

/** A bead of their waxy sealant where two parts meet: glossy gold, a drip running from it. */
export function wax(d: Draw, c: Pt, r: number, drip = 0): void {
  const blob = oval(c.x, c.y, r, r * 0.8, 14);
  const shape = drip > 0 ? [...blob.slice(0, 5), pt(c.x + r * 0.2, c.y + r * 0.6 + drip), pt(c.x - r * 0.25, c.y + r * 0.7 + drip * 0.8), ...blob.slice(8)] : blob;
  paint(d, shape, TIDE.wax, { alpha: 0.95, shadow: 0.35, hatch: 0, line: 0.35, gloss: true });
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.3, Math.max(0.2, r * 0.22), PAPER_FILL, 0.9);
}

/** Fibre cord wound round a part, from `a` across to `b`: a few tight turns, sealed with wax. */
export function binding(d: Draw, a: Pt, b: Pt, turns = 3, sealed = true): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 0.95;
  const ny = (dx / len) * 0.95;
  for (let k = 0; k < turns; k++) {
    const o = (k - (turns - 1) / 2) * 1.3;
    const p0 = pt(a.x + nx * o, a.y + ny * o);
    const p1 = pt(b.x + nx * o + nx * 0.5, b.y + ny * o + ny * 0.5);
    d.pen.stroke([p0, p1], 1, mix(TIDE.fibre, SHADOW, 0.25), 1, false);
    d.pen.hair([pt(p0.x - 0.25, p0.y - 0.25), pt(p1.x - 0.25, p1.y - 0.25)], 0.3, mix(TIDE.fibre, LIGHT, 0.55), 0.85);
  }
  if (sealed) wax(d, pt(b.x + nx * 0.4, b.y + ny * 0.4), 0.9);
}

/** Glass-sponge lattice over `shape`: a square grid of white silica with a diagonal strut in every other cell, as Venus's flower basket grows it. */
export function lattice(d: Draw, shape: readonly Pt[], cell: number, alpha = 0.85): void {
  const b = boxOf(shape);
  d.pen.clipped(shape, () => {
    const strut = (p: Pt, q: Pt, w: number): void => {
      d.pen.hair([pt(p.x + 0.2, p.y + 0.25), pt(q.x + 0.2, q.y + 0.25)], w * 0.7, d.ink, alpha * 0.45);
      d.pen.hair([p, q], w, TIDE.sponge, alpha);
    };
    for (let x = b.x0; x <= b.x0 + b.w + cell; x += cell) strut(pt(x, b.y0 - 1), pt(x, b.y0 + b.h + 1), 0.42);
    for (let y = b.y0; y <= b.y0 + b.h + cell; y += cell) strut(pt(b.x0 - 1, y), pt(b.x0 + b.w + 1, y), 0.42);
    let i = 0;
    for (let x = b.x0; x < b.x0 + b.w; x += cell) {
      let j = 0;
      for (let y = b.y0; y < b.y0 + b.h; y += cell) {
        if ((i + j) % 2 === 0) strut(pt(x, y), pt(x + cell, y + cell), 0.28);
        else strut(pt(x + cell, y), pt(x, y + cell), 0.28);
        j++;
      }
      i++;
    }
  });
}

/** Their mark: a spiral, coiling out like a song from its singer, carved or painted in `color`. */
export function spiralMark(d: Draw, c: Pt, r: number, color: string): void {
  const turns = 2.2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * turns * Math.PI * 2 - Math.PI / 2;
    const q = r * (0.12 + 0.88 * t);
    pts.push(pt(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q));
  }
  d.pen.stroke(pts, Math.max(0.35, r * 0.2), color, 0.95, false);
  d.pen.hair(pts.map((p) => pt(p.x + 0.2, p.y + 0.25)), Math.max(0.15, r * 0.06), d.ink, 0.5);
}

/** A tusk shell: a hollow, gently curved tube, ringed where it grew. Runs from `a` (narrow) to `b` (open, wide). */
function tuskShell(d: Draw, a: Pt, b: Pt, w0: number, w1: number): void {
  const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.8);
  const spine = cub(a, mid, mid, b, 10);
  const body = ribbon(spine, (u) => w0 + (w1 - w0) * u);
  paint(d, body.shape, mix(TIDE.shell, '#f6efe2', 0.4), { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.7, gloss: true });
  for (let i = 2; i < spine.length - 1; i += 2) {
    d.pen.hair([body.top[i]!, pt((body.top[i]!.x + body.bot[i]!.x) / 2 + 0.4, (body.top[i]!.y + body.bot[i]!.y) / 2), body.bot[i]!], 0.25, mix(TIDE.shell, SHADOW, 0.4), 0.6);
  }
  gleam(d, body.top.slice(1, -2).map((p) => pt(p.x + 0.2, p.y + 0.9)), 0.5, 0.75);
}

/**
 * The drill: a bow drill, as they bore stone. A tusk shell for a hollow
 * crown, fed wet sand from a woven pouch, on a spindle of pale stone with
 * a basalt whorl to carry it round; the bow is a curve of shell strung
 * with fibre, wound twice round the spindle.
 */
function drill(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(-0.6, 0.6);
  ctx.rotate(-0.5);
  ctx.scale(0.9, 0.9);
  // The bow, behind: a long curve of shell, its string wound round the spindle.
  const bow = cub(pt(-13, -6), pt(-8, -16.5), pt(4, -16.5), pt(9, -6.4), 16);
  paint(d, tube(bow, 2.8, 2), TIDE.shell, { alpha: 1, shadow: 0.25, hatch: 0, line: 0.55, gloss: true });
  for (const end of [bow[0]!, bow[bow.length - 1]!]) wax(d, end, 1.1);
  const string = mix(TIDE.fibre, SHADOW, 0.35);
  d.pen.hair([bow[0]!, pt(-4.6, -1.5)], 0.45, string, 0.95);
  d.pen.hair([bow[bow.length - 1]!, pt(-0.4, -1.5)], 0.45, string, 0.95);
  // The spindle: a rod of pale stone, a fibre grip at its head.
  const rod = capsule(pt(-17, 0), pt(11, 0), 2.8, 2.6);
  stone(d, rod, TIDE.pale, 0.6);
  gleam(d, [pt(-14, -0.8), pt(9, -0.8)], 0.4, 0.6);
  woven(d, capsule(pt(-17.2, 0), pt(-13.4, 0), 3.6, 3.6), TIDE.fibre, 1.1, 0.5);
  // The string's two turns round it.
  for (const x of [-4.4, -2.6, -0.8]) d.pen.stroke([pt(x - 0.6, -1.5), pt(x + 0.6, 1.5)], 0.6, string, 1, false);
  // The whorl: a disc of basalt, seen nearly edge on, the mark carved in its face.
  const whorl = oval(-10, 0, 2.8, 7.6, 22);
  stone(d, whorl);
  d.pen.hair(oval(-9.6, 0, 1.6, 5.6, 18), 0.3, mix(TIDE.stone, LIGHT, 0.5), 0.6);
  spiralMark(d, pt(-9.8, -3.2), 1.2, mix(TIDE.stone, LIGHT, 0.55));
  // The crown: a tusk shell, its wide end open, sealed onto the spindle.
  tuskShell(d, pt(10, 0), pt(19.4, 0.4), 4, 5.6);
  const mouth = oval(19.4, 0.4, 1.2, 2.8, 16);
  paint(d, mouth, TIDE.deep, { alpha: 1, shadow: 0, hatch: 0, line: 0.5 });
  d.pen.hair(oval(19.3, 0.4, 1.4, 3, 16), 0.35, '#f6efe2', 0.8);
  binding(d, pt(10.4, -2), pt(10.4, 2), 2);
  // The sand pouch, hung under the spindle, a few wet grains trickling from it.
  d.pen.hair([pt(3, 1.2), pt(3.6, 4)], 0.45, string, 0.95);
  const pouch = [pt(1.6, 3.6), ...cub(pt(1.6, 3.6), pt(-1.4, 7), pt(0.4, 12.4), pt(4, 12.6), 8), ...cub(pt(4, 12.6), pt(7.6, 12.4), pt(8.4, 7), pt(5.6, 3.6), 8)];
  woven(d, pouch, mix(TIDE.fibre, '#a08a5a', 0.4), 1.3, 0.65);
  d.pen.stroke([pt(1.8, 5), pt(5.6, 5)], 0.7, string, 1, false);
  d.pen.stipple(oval(19.4, 0.6, 1, 2.4, 12), 30, () => 0.8, 0.2, '#d8c9a2');
  ctx.restore();
}

/**
 * The cell: an electric organ, grown and kept in a cowrie case. Through a
 * window latticed with sponge glass you see its stack of translucent
 * discs, like an electric ray's electrocytes, faintly glowing violet. A
 * basalt stopper sealed with wax at each end, a fibre lead out of each.
 */
function cell(d: Draw): void {
  const { ctx } = d.pen;
  glow(ctx, pt(0, 0.5), 15, TIDE.glow, 0.28);
  // The leads, behind.
  d.pen.stroke([pt(0.6, -15), pt(3, -17.6), pt(6.4, -17.2), pt(8, -18.8)], 0.9, mix(TIDE.fibre, SHADOW, 0.3), 1, false);
  d.pen.stroke([pt(0, 15), pt(3.6, 17.4), pt(8.6, 16.6)], 0.9, mix(TIDE.fibre, SHADOW, 0.3), 1, false);
  // The case: a glossy cowrie, spotted brown.
  const caseShape = [...cub(pt(0, -15), pt(7.4, -15), pt(10.6, -6), pt(10.2, 2), 10), ...cub(pt(10.2, 2), pt(9.8, 10), pt(6, 15), pt(0, 15), 10).slice(1), ...cub(pt(0, 15), pt(-6, 15), pt(-9.8, 10), pt(-10.2, 2), 10).slice(1), ...cub(pt(-10.2, 2), pt(-10.6, -6), pt(-7.4, -15), pt(0, -15), 10).slice(1, -1)];
  paint(d, caseShape, TIDE.shell, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.8, gloss: true });
  d.pen.stipple(caseShape, 240, (x) => Math.min(1, Math.abs(x) / 7), 0.42, TIDE.marking);
  // The window into the organ.
  const win = oval(0, 0.5, 5.8, 11.2, 30);
  d.pen.fill(win, TIDE.deep, 1);
  d.pen.clipped(win, () => {
    glow(ctx, pt(0, 0.5), 10, TIDE.glow, 0.55 + d.f * 0.05);
    for (let k = 0; k < 9; k++) {
      const y = -9 + k * 2.4;
      const rx = 5.4 * Math.sqrt(Math.max(0.15, 1 - (y / 11.4) ** 2));
      const disc = oval(0, y, rx, 1.05, 18);
      d.pen.fill(disc, mix(TIDE.glow, '#f4ecff', 0.45), 0.45 + (1 - Math.abs(y) / 11) * 0.3);
      d.pen.hair(disc.slice(10, 18), 0.25, '#fbf6ff', 0.8);
      d.pen.hair(disc.slice(1, 9), 0.2, d.ink, 0.4);
    }
    lattice(d, win, 2.8, 0.75);
    dab(d, oval(-2.6, -5, 1.2, 3.6, 12), PAPER_FILL, 0.35, 0.5);
  });
  // A lip of nacre round the window.
  d.pen.stroke(closed(win), 1.4, mix(TIDE.nacre, IRIS[1], 0.5), 1, false);
  d.pen.hair(closed(win), 0.35, d.ink, 0.85);
  d.pen.hair(closed(oval(0, 0.5, 6.6, 12, 30)), 0.25, mix(TIDE.shell, SHADOW, 0.45), 0.6);
  // The stoppers, sealed.
  stone(d, oval(0, -15, 3.6, 2, 16));
  stone(d, oval(0, 15, 3.2, 1.8, 16));
  wax(d, pt(-2.8, -13.6), 0.9, 1.4);
  wax(d, pt(2.4, 13.6), 0.8);
  spiralMark(d, pt(-7, -6.4), 1.5, TIDE.marking);
}

/** One knot's worth of a net: where row `i`, knot `j` sits on a bag that bulges as `hw` says. */
function netPoint(u: number, v: number, hw: (v: number) => number, y0: number, y1: number): Pt {
  const y = y0 + (y1 - y0) * v;
  return pt(u * hw(v), y + (1 - u * u) * 1.4 * Math.sin(v * Math.PI));
}

/**
 * The pack: a net bag knotted from fibre, bulging with what was in it
 * (stones, a spiral shell), gathered at its mouth by a plaited rim and
 * a drawstring with shell toggles; a plaited strap to carry it by.
 */
function pack(d: Draw): void {
  const string = mix(TIDE.fibre, SHADOW, 0.3);
  // The strap, behind: a plaited loop.
  const strap = cub(pt(-7, -9), pt(-8, -18), pt(8, -18), pt(7, -9), 16);
  d.pen.stroke(strap, 1.8, TIDE.fibre, 1, false);
  for (let i = 1; i < strap.length - 1; i++) {
    const p = strap[i]!;
    d.pen.hair([pt(p.x - 0.6, p.y - 0.5), pt(p.x + 0.6, p.y + 0.5)], 0.3, string, 0.85);
  }
  d.pen.hair(strap.map((p) => pt(p.x - 0.5, p.y - 0.5)), 0.3, d.ink, 0.6);
  // The bag's outline: a rounded sack, narrow at the mouth.
  const [y0, y1] = [-8.4, 13.4];
  const hw = (v: number): number => 7.6 + 6.4 * Math.sin(Math.min(1, v * 1.25) * Math.PI * 0.62) - (v > 0.75 ? (v - 0.75) * 30 : 0);
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const v = i / 16;
    const y = y0 + (y1 - y0) * v;
    left.push(pt(-Math.max(0.5, hw(v)), y));
    right.push(pt(Math.max(0.5, hw(v)), y));
  }
  const bag = [...right, ...left.reverse()];
  // What's inside, seen through the mesh: dark fibre shadow, stones and a spiral shell.
  paint(d, bag, mix(TIDE.fibre, SHADOW, 0.45), { alpha: 0.55, shadow: 0.6, hatch: 0, line: 0 });
  d.pen.clipped(bag, () => {
    stone(d, oval(-5, 7, 5.6, 4.4, 18), TIDE.stone, 0.5);
    stone(d, oval(5.4, 8.6, 4.4, 3.6, 18), mix(TIDE.stone, TIDE.pale, 0.35), 0.5);
    // A spiral shell, lying on its side: whorls stepping down to a point.
    const conch = [pt(-2, -4.6), ...cub(pt(-2, -4.6), pt(4, -6.4), pt(9, -3.4), pt(10.6, 0.6), 8), ...cub(pt(10.6, 0.6), pt(7, 2.6), pt(1, 3.4), pt(-2.4, 2), 8)];
    paint(d, conch, TIDE.shell, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.5, gloss: true });
    for (const x of [1.6, 4.6, 7.2, 9.2]) d.pen.hair([pt(x - 0.4, -4.8 + (x - 1.6) * 0.5), pt(x + 0.6, 2.4 - (x - 1.6) * 0.3)], 0.35, TIDE.marking, 0.75);
    paint(d, oval(-2.2, -1.2, 1.6, 3.2, 14), mix(TIDE.nacre, IRIS[1], 0.5), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.45, gloss: true });
    nacre(d, oval(-6.4, -1.6, 2.4, 1.9, 14), 0.4);
    dab(d, oval(0, 12, 14, 4, 16), SHADOW, 0.35, 1.5);
  });
  // The net: knots in offset rows, each strand running down to the two knots below it.
  const rows = 7;
  const cols = 6;
  const knot = (i: number, j: number): Pt => netPoint((j + (i % 2) * 0.5) / cols * 2 - 1, i / rows, hw, y0, y1);
  d.pen.clipped(bag.map((p) => pt(p.x * 1.04, p.y)), () => {
    for (let i = 0; i < rows; i++) {
      for (let j = -1; j <= cols; j++) {
        const a = knot(i, j);
        const off = i % 2;
        for (const b of [knot(i + 1, j + off - 1), knot(i + 1, j + off)]) {
          d.pen.hair([pt(a.x + 0.25, a.y + 0.3), pt(b.x + 0.25, b.y + 0.3)], 0.45, SHADOW, 0.45);
          d.pen.stroke([a, b], 0.55, mix(TIDE.fibre, LIGHT, 0.25), 1, false);
        }
        d.pen.dot(a.x, a.y, 0.5, string, 1);
      }
    }
  });
  d.pen.stroke(closed(bag), 0.8, d.ink, 0.9, false);
  // The plaited rim at the mouth, and the drawstring with its toggles.
  const rim = capsule(pt(-8.6, -8.6), pt(8.6, -8.6), 3, 3);
  woven(d, rim, TIDE.fibre, 1.1, 0.6);
  d.pen.stroke([pt(6, -8), pt(7.6, -5.6), pt(8.8, -4.4)], 0.55, string, 1, false);
  d.pen.stroke([pt(7, -8), pt(9.8, -6.6), pt(11.6, -6.4)], 0.55, string, 1, false);
  for (const [c, a] of [[pt(9.4, -3.6), 0.9], [pt(12.4, -6), 0.2]] as const) {
    const toggle = capsule(pt(c.x - Math.cos(a + 1.5) * 1.6, c.y - Math.sin(a + 1.5) * 1.6), pt(c.x + Math.cos(a + 1.5) * 1.6, c.y + Math.sin(a + 1.5) * 1.6), 1.7, 1.5);
    nacre(d, toggle, 0.45);
    d.pen.hair([pt(c.x - 0.2, c.y - 1), pt(c.x + 0.2, c.y + 1)], 0.25, d.ink, 0.7);
  }
  // A nacre tag tied to the rim, the mark cut in it.
  const tag = oval(-10.4, -4.4, 2.4, 2.6, 16);
  d.pen.hair([pt(-8.8, -7.6), pt(-10, -6.6)], 0.45, string, 0.95);
  nacre(d, tag, 0.5);
  spiralMark(d, pt(-10.4, -4.4), 1.6, mix(TIDE.marking, SHADOW, 0.2));
}

/**
 * The helmet: a broad, low dome for a ray's broad head. Panes of clear
 * glass in a frame grown by a glass sponge, set in a rim of nacre plates
 * over a woven gasket, a lens bulging at each end where a Tidesinger's eyes
 * sit, on its wings' leading edge, and a turban shell for a crest.
 */
function helmet(d: Draw): void {
  // The gasket under the rim: woven.
  const gasket = [pt(-15, 6.4), ...cub(pt(-15, 6.4), pt(-8, 9.4), pt(8, 9.4), pt(15, 6.4), 10), pt(14, 9.4), ...cub(pt(14, 9.4), pt(8, 12), pt(-8, 12), pt(-14, 9.4), 10)];
  woven(d, gasket, TIDE.fibre, 1.2, 0.6);
  // The dome: glass, the rim's far side faintly seen through it.
  const dome = oval(0, 4.6, 14.2, 13.6, 36).filter((p) => p.y <= 4.7);
  paint(d, dome, TIDE.glass, { alpha: 0.6, shadow: 0.35, hatch: 0, line: 0, gloss: true });
  d.pen.clipped(dome, () => {
    d.pen.hair(cub(pt(-13.6, 4.4), pt(-7, 1.6), pt(7, 1.6), pt(13.6, 4.4), 12), 0.4, mix(TIDE.nacre, SHADOW, 0.35), 0.5);
    // The sponge-glass frame: a lattice curving over the dome.
    // Seen from the front and a little above: meridians from the rim to the crown, parallels sagging towards you.
    const at = (phi: number, theta: number): Pt => pt(-14.2 * Math.cos(phi) * Math.cos(theta), 4.6 - 13.6 * Math.sin(theta) + 1.6 * Math.sin(phi) * Math.cos(theta));
    for (let k = 1; k < 8; k++) {
      const meridian = Array.from({ length: 13 }, (_, i) => at((k / 8) * Math.PI, (i / 12) * (Math.PI / 2)));
      d.pen.hair(meridian.map((p) => pt(p.x + 0.25, p.y + 0.3)), 0.35, d.ink, 0.35);
      d.pen.hair(meridian, 0.5, TIDE.sponge, 0.9);
    }
    for (const theta of [0.38, 0.72, 1.08]) {
      const ring = Array.from({ length: 19 }, (_, i) => at((i / 18) * Math.PI, theta));
      d.pen.hair(ring.map((p) => pt(p.x + 0.25, p.y + 0.3)), 0.35, d.ink, 0.35);
      d.pen.hair(ring, 0.5, TIDE.sponge, 0.9);
    }
    dab(d, oval(-6, -4, 3.2, 4.8, 14), PAPER_FILL, 0.5, 0.8);
    gleam(d, cub(pt(-11, 0), pt(-11, -5), pt(-7, -8.6), pt(-3, -9.6), 8), 0.6, 0.8);
  });
  d.pen.stroke(closed(dome), 0.75, d.ink, 0.9, false);
  // The crest: a turban shell, sealed on at the crown.
  const crest = [pt(-3.4, -8), ...cub(pt(-3.4, -8), pt(-4.6, -12.6), pt(-1, -15.6), pt(0.4, -16.4), 6), ...cub(pt(0.4, -16.4), pt(2.4, -14.4), pt(4.4, -11.6), pt(3.4, -8), 6)];
  paint(d, crest, TIDE.shell, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.6, gloss: true });
  for (const y of [-14, -11.8, -9.8]) d.pen.hair([pt(-3.6 + (y + 16) * 0.1, y + 0.8), pt(3.6 - (y + 16) * 0.1, y - 0.8)], 0.3, TIDE.marking, 0.75);
  wax(d, pt(0, -8.2), 1.4);
  // The rim: a band of nacre plates.
  const rim = [pt(-15.6, 3.6), ...cub(pt(-15.6, 3.6), pt(-8, 6.6), pt(8, 6.6), pt(15.6, 3.6), 12), pt(15.4, 6.8), ...cub(pt(15.4, 6.8), pt(8, 9.8), pt(-8, 9.8), pt(-15.4, 6.8), 12)];
  nacre(d, rim, 0.7);
  for (let k = -5; k <= 5; k++) {
    const x = k * 2.8;
    const yTop = 3.6 + 3 * (1 - (x / 15.6) ** 2) * 0.75;
    d.pen.hair([pt(x, yTop + 0.2), pt(x + 0.3, yTop + 3)], 0.3, mix(TIDE.nacre, SHADOW, 0.5), 0.7);
  }
  // The lenses at either end, where its eyes sit.
  for (const s of [-1, 1]) {
    const c = pt(s * 15.4, 4.6);
    const bezel = oval(c.x, c.y, 2.6, 3.4, 16);
    nacre(d, bezel, 0.6);
    const lens = oval(c.x + s * 0.5, c.y, 1.8, 2.5, 16);
    paint(d, lens, TIDE.glass, { alpha: 0.9, shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
    d.pen.dot(c.x + s * 0.5 - 0.6, c.y - 0.9, 0.45, PAPER_FILL, 0.95);
    wax(d, pt(c.x - s * 1.8, c.y + 2.6), 0.7, 1);
  }
  spiralMark(d, pt(-6.6, 7.2), 1.3, mix(TIDE.marking, SHADOW, 0.2));
}

/**
 * The jetpack: a siphon pump, as a squid swims. A tiger-striped nautilus
 * shell is the chamber; pleated woven bellows on its back draw water in
 * past a limpet-shell valve and squeeze it out through a nacre funnel.
 */
function jetpack(d: Draw): void {
  const c = pt(-3, 2.6);
  // Straps, behind.
  for (const y of [-4, 6]) d.pen.stroke([pt(-11, y - 2), pt(-16, y), pt(-12.4, y + 3.4)], 1.4, TIDE.fibre, 1, false);
  // The bellows on top: woven pleats between two basalt plates.
  const pleats: Pt[] = [];
  const pleatsBack: Pt[] = [];
  for (let k = 0; k <= 6; k++) {
    const y = -8.6 - k * 1.2;
    const w = k % 2 ? 6.4 : 5.2;
    pleats.push(pt(-4 + w, y));
    pleatsBack.push(pt(-4 - w, y));
  }
  const bellows = [...pleats, ...pleatsBack.reverse()];
  woven(d, bellows, mix(TIDE.fibre, '#a08a5a', 0.3), 1.1, 0.6);
  for (let k = 1; k < 6; k++) {
    const y = -8.6 - k * 1.2;
    const w = k % 2 ? 6.4 : 5.2;
    d.pen.hair([pt(-4 - w, y), pt(-4 + w, y)], 0.3, k % 2 ? mix(TIDE.fibre, LIGHT, 0.5) : mix(TIDE.fibre, SHADOW, 0.6), 0.8);
  }
  stone(d, oval(-4, -16.2, 6.6, 1.6, 20));
  d.pen.stroke([pt(-7, -17), pt(-6, -19.2), pt(-2, -19.2), pt(-1, -17)], 0.9, mix(TIDE.fibre, SHADOW, 0.3), 1, false);
  spiralMark(d, pt(-1.2, -16.3), 0.9, mix(TIDE.stone, LIGHT, 0.55));
  // The chamber: a nautilus shell, coiled, striped from its centre out.
  const body = oval(c.x, c.y, 11.2, 10.6, 36);
  paint(d, body, TIDE.shell, { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.85, gloss: true });
  d.pen.clipped(body, () => {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * 0.55 + k * 0.42;
      const stripe = Array.from({ length: 8 }, (_, i) => {
        const r = 2.6 + i * 1.25;
        const aa = a + i * 0.1 + Math.sin(i * 1.3 + k) * 0.06;
        return pt(c.x + Math.cos(aa) * r, c.y + Math.sin(aa) * r);
      });
      d.pen.stroke(stripe, 0.9 + (k % 3) * 0.3, mix(TIDE.marking, TIDE.shell, 0.15), 0.75, false);
    }
    // The coil: the inner whorl's edge spiralling into the umbilicus.
    const coil = Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      const a = Math.PI * 0.2 + t * Math.PI * 1.9;
      const r = 7.4 * (1 - t * 0.78);
      return pt(c.x - 0.6 + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
    d.pen.hair(coil, 0.5, d.ink, 0.8);
    d.pen.hair(coil.map((p) => pt(p.x - 0.4, p.y - 0.3)), 0.35, PAPER_FILL, 0.6);
    dab(d, oval(c.x - 0.8, c.y, 1.4, 1.4, 10), SHADOW, 0.4, 0.4);
  });
  // The aperture, nacre-lined, and the funnel out of it.
  const aperture = oval(6.2, 4.6, 3.2, 7.2, 22);
  nacre(d, aperture, 0.6);
  paint(d, oval(6.8, 4.8, 1.6, 5, 18), TIDE.deep, { alpha: 0.9, shadow: 0, hatch: 0, line: 0.4 });
  const funnelSpine = cub(pt(6.6, 8.6), pt(10, 10.4), pt(12.6, 12), pt(16.4, 14.2), 10);
  const funnel = ribbon(funnelSpine, (u) => 4.4 - u * 2.2 + (u > 0.85 ? (u - 0.85) * 10 : 0));
  nacre(d, funnel.shape, 0.7);
  d.pen.fill(oval(16.4, 14.2, 0.8, 1.4, 10), TIDE.deep, 0.95);
  binding(d, pt(8.6, 7.6), pt(7.2, 11.4), 2);
  // The intake: a limpet shell over a hole, waxed round its rim.
  const limpet = [pt(-15.2, 5.4), ...cub(pt(-15.2, 5.4), pt(-15, 1), pt(-12.4, -0.2), pt(-11.2, 0.4), 6), ...cub(pt(-11.2, 0.4), pt(-10.6, 2), pt(-11.2, 4.6), pt(-12, 6.4), 6)];
  paint(d, limpet, mix(TIDE.shell, TIDE.pale, 0.5), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
  for (const t of [0.3, 0.6]) d.pen.hair([pt(-11.6, 1), pt(-15.2 + t * 2, 5.4 - t)], 0.25, mix(TIDE.pale, SHADOW, 0.5), 0.7);
  wax(d, pt(-12.2, 6.2), 0.8, 1.2);
  // The seal where the bellows meet the shell.
  for (const x of [-8.6, -4, 0.8]) wax(d, pt(x, -8.4), 0.9, x === -4 ? 1.6 : 0);
}

/**
 * The suit: shaped for a ray, laid out flat: a broad mantle with pointed
 * wings, woven fibre covered in rows of overlapping nacre scales, the
 * front scales over the ones behind as a fish's lie, a woven border and
 * fringe, two rolled lobes at the front for the hands, a plaited tail cord.
 */
function suit(d: Draw): void {
  const half = (s: 1 | -1): Pt[] => [
    ...cub(pt(0, -6.4), pt(s * 6, -10.6), pt(s * 13, -7.4), pt(s * 17.4, 1.2), 12),
    ...cub(pt(s * 17.4, 1.2), pt(s * 12, 4), pt(s * 6, 9.4), pt(0, 10.4), 12).slice(1),
  ];
  const right = half(1);
  const left = half(-1);
  const mantle = [...right, ...left.reverse().slice(1, -1)];
  // The tail cord, behind, and the front lobes.
  const tail = cub(pt(0, 9), pt(1, 13), pt(4, 15), pt(8, 16.4), 12);
  d.pen.stroke(tail, 1.4, TIDE.fibre, 1, false);
  for (let i = 1; i < tail.length - 1; i += 1) d.pen.hair([pt(tail[i]!.x - 0.4, tail[i]!.y - 0.5), pt(tail[i]!.x + 0.4, tail[i]!.y + 0.5)], 0.25, mix(TIDE.fibre, SHADOW, 0.5), 0.8);
  nacre(d, oval(8.8, 16.6, 1.6, 1.2, 12), 0.45);
  for (const s of [-1, 1] as const) {
    const spine = cub(pt(s * 4, -6.8), pt(s * 4.2, -9.4), pt(s * 4.8, -11.4), pt(s * 5.6, -12.8), 10);
    const lobe = ribbon(spine, (u) => 2.8 - u * 0.9).shape;
    woven(d, lobe, mix(TIDE.fibre, SHADOW, 0.12), 1, 0.6);
    // Rolled up at the tip, outwards, as a manta's lobes are.
    const roll = oval(s * 6, -13.2, 1.4, 1.2, 12);
    paint(d, roll, mix(TIDE.fibre, SHADOW, 0.2), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
    spiralMark(d, pt(s * 6, -13.2), 0.85, mix(TIDE.fibre, LIGHT, 0.5));
    wax(d, pt(s * 4.4, -8), 0.7);
  }
  // The mantle: woven fibre, then its scales.
  woven(d, mantle, TIDE.fibre, 1.4, 0);
  const inner = mantle.map((p) => pt(p.x * 0.88, p.y * 0.86 + 0.2));
  d.pen.clipped(inner, () => {
    const w = 3.2;
    for (let row = 8; row >= 0; row--) {
      const y = -9 + row * 2.3;
      const off = row % 2 ? w / 2 : 0;
      for (let x = -18 + off; x < 18; x += w) {
        const tone = IRIS[Math.floor(d.pen.rng() * IRIS.length)]!;
        const scale = [pt(x - w * 0.55, y - 1.6), pt(x + w * 0.55, y - 1.6), ...cub(pt(x + w * 0.55, y - 1.6), pt(x + w * 0.6, y + 1.6), pt(x - w * 0.6, y + 1.6), pt(x - w * 0.55, y - 1.6), 8).slice(1, -1)];
        d.pen.fill(scale, mix(TIDE.nacre, tone, 0.45 + d.pen.rng() * 0.3), 1);
        const lip = cub(pt(x + w * 0.55, y - 0.6), pt(x + w * 0.6, y + 1.6), pt(x - w * 0.6, y + 1.6), pt(x - w * 0.55, y - 0.6), 8);
        d.pen.hair(lip.map((p) => pt(p.x + 0.15, p.y + 0.3)), 0.35, SHADOW, 0.45);
        d.pen.hair(lip, 0.3, d.ink, 0.75);
        d.pen.dot(x - w * 0.15, y - 0.1, 0.35, PAPER_FILL, 0.7);
      }
    }
  });
  // Form: the mantle's light and shade over the scales, a gleam along the near wing.
  d.pen.crescent(mantle, pt(-2.2, -3.4), () => d.pen.fill(mantle, SHADOW, 0.22));
  dab(d, oval(-7, -4, 5, 2.4, 14), LIGHT, 0.25, 1);
  d.pen.hair(closed(inner), 0.3, mix(TIDE.fibre, SHADOW, 0.5), 0.8);
  // The fringe along its trailing edge.
  for (let i = 2; i < right.length - 1; i += 2) {
    for (const side of [right, left]) {
      const p = side[i]!;
      if (p.y < 2) continue;
      d.pen.hair([p, pt(p.x * 1.02, p.y + 1.4)], 0.3, mix(TIDE.fibre, SHADOW, 0.3), 0.85);
    }
  }
  d.pen.stroke(closed(mantle), 0.85, d.ink, 0.9, false);
  // A disc of nacre at its centre, the mark cut in it, sealed down.
  nacre(d, oval(0, -1, 2.8, 2.6, 16), 0.55);
  spiralMark(d, pt(0, -1), 1.9, mix(TIDE.marking, SHADOW, 0.2));
  wax(d, pt(2.4, 1.4), 0.7);
}

const DRAW: Readonly<Record<Piece, (d: Draw) => void>> = { drill, cell, pack, helmet, jetpack, suit };

/** One of the Tidesingers' own tools, as it was before it broke. */
export function drawTidesingerGear(d: Draw, piece: Piece): void {
  DRAW[piece](d);
}
