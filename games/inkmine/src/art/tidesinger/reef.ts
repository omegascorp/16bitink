import { hash } from '../../logic/noise';
import { capsule, cub, edge, makeDraw, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, rgba, SHADOW } from '../paint';
import { BLUE, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { drawAsterPerson, type AsterPose } from '../aster/camp';
import { basalt, fibreCord, glassSponge, liftBag, nacre, spiral, TIDE, twine } from './style';

/**
 * The Tidesingers' home on Brine (spec, "Brine": the Tidesingers' reef, and
 * the air bell where the Aster crew live). Everything here is theirs, so in
 * their language (style.ts): woven seagrass fibre, shell, ground basalt and
 * glass sponge, and no metal anywhere. Brine's rock is basalt that set under
 * the sea, so it lies in pillows, as real pillow lava does. 1 unit = 1 px in
 * the world.
 */

/** The mouth of their home in the cave. Origin at the bottom centre, on the cave floor. */
export const REEF_HOME = { w: 240, h: 156, ox: 120, oy: 152 } as const;
/** The air bell under the reef, with or without the crew in it. Origin at the bottom centre, on the floor. */
export const AIR_BELL = { w: 176, h: 150, ox: 88, oy: 146 } as const;

/** Where the reef home's lanterns glow, from its origin: the scene can pulse light there. */
export const REEF_LANTERNS: readonly Pt[] = [pt(-80, -30), pt(82, -30), pt(0, -92)];
/** Where the air bell's lantern glows inside it, from its origin. */
export const AIR_BELL_LANTERN = pt(0, -94);

const DARK = '#1b1836';
const CREVICE = '#24223a';
const CRUST = '#c98aa0';
const WEED = '#5f7a5a';
const SAND = '#b7a796';

// ---------------------------------------------------------------- shared bits

/** A soft shadow on the floor under something. */
function floorShadow(d: Draw, x: number, rx: number, alpha = 0.18): void {
  dab(d, oval(x, 0.4, rx, 2.4, 20), SHADOW, alpha, 1.4);
}

/** A lumpy oval: a pillow of basalt. */
function lump(c: Pt, rx: number, ry: number, seed: number): Pt[] {
  return oval(c.x, c.y, rx, ry, 18).map((p, i) => {
    const k = 1 + (hash(i, seed, 1500) - 0.5) * 0.14;
    // Pillows sag: flatter below, domed above.
    const sag = p.y > c.y ? 0.82 : 1;
    return pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k * sag);
  });
}

/**
 * A mass of pillow basalt filling `outline`: the dark of the crevices, then
 * rows of rounded pillows from the bottom up, each lit on its crown with
 * a cool shadow under it, a few grown over with pink crust.
 */
function pillows(d: Draw, outline: readonly Pt[], seed: number, size = 10): void {
  paint(d, outline, CREVICE, { alpha: 1, shadow: 0.2, hatch: 0, line: 0 });
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  d.pen.clipped(outline, () => {
    let row = 0;
    for (let y = y1 - size * 0.3; y > y0 - size; y -= size * 0.72, row++) {
      for (let x = x0 - size + (row % 2) * size * 0.6; x < x1 + size; x += size * (1.25 + hash(row, Math.round(x), seed) * 0.4)) {
        const k = Math.round(x * 3 + row * 101);
        const rx = size * (0.62 + hash(k, seed, 1502) * 0.3);
        const ry = size * (0.42 + hash(k, seed, 1503) * 0.16);
        const c = pt(x + (hash(k, seed, 1504) - 0.5) * size * 0.3, y);
        const shape = lump(c, rx, ry, k + seed);
        // Lower down and further back, the rock is darker.
        const t = (y - y0) / Math.max(1, y1 - y0);
        paint(d, shape, mix(TIDE.stone, TIDE.stoneLit, 0.25 - t * 0.2), { alpha: 1, shadow: 0.6, hatch: 0.16, line: 0.5, lineAlpha: 0.7 });
        d.pen.clipped(shape, () => {
          dab(d, oval(c.x - rx * 0.25, c.y - ry * 0.55, rx * 0.6, ry * 0.3, 12), TIDE.stoneLit, 0.4, ry * 0.25);
          // The glassy skin's cracks, radiating as pillows crack when they cool.
          for (let i = 0; i < 3; i++) {
            const a = -Math.PI * (0.2 + hash(k, i, 1505) * 0.6);
            d.pen.hair([pt(c.x + Math.cos(a) * rx * 0.3, c.y + Math.sin(a) * ry * 0.3), pt(c.x + Math.cos(a) * rx * 0.95, c.y + Math.sin(a) * ry * 0.95)], 0.3, mix(TIDE.stone, SHADOW, 0.6), 0.5);
          }
        });
        if (hash(k, seed, 1506) > 0.72) {
          const cr = oval(c.x + rx * 0.1, c.y - ry * 0.6, rx * 0.55, ry * 0.32, 12);
          dab(d, cr, CRUST, 0.6, 0.5);
          d.pen.stipple(cr, 10, () => 0.8, 0.35, mix(CRUST, PAPER_FILL, 0.5));
        }
      }
    }
    // Shade pooled low, where the cave's light doesn't reach.
    dab(d, [pt(x0 - 4, y1 - (y1 - y0) * 0.3), pt(x1 + 4, y1 - (y1 - y0) * 0.3), pt(x1 + 4, y1 + 4), pt(x0 - 4, y1 + 4)], SHADOW, 0.3, 6);
  });
  edge(d, outline, 0.9, 0.9);
}

/** A tuft of seagrass from the floor at `x`, leaning with the current. */
function seagrass(d: Draw, x: number, h: number, seed: number, floor = 0): void {
  for (let k = 0; k < 5; k++) {
    const lean = 2 + hash(k, seed, 1520) * 5;
    const len = h * (0.55 + hash(k, seed, 1521) * 0.5);
    const base = pt(x + (k - 2) * 1.4, floor);
    const blade = cub(base, pt(base.x + lean * 0.2, floor - len * 0.4), pt(base.x + lean, floor - len * 0.75), pt(base.x + lean * 1.4, floor - len), 10);
    d.pen.stroke(blade, 1.1, mix(WEED, k % 2 ? TIDE.fibre : '#7d9a6f', 0.3), 0.95, false);
    d.pen.hair(blade.slice(1).map((p) => pt(p.x - 0.3, p.y)), 0.35, mix(WEED, PAPER_FILL, 0.5), 0.6);
  }
}

/** A round stone on the floor. */
function pebble(d: Draw, x: number, r: number, seed: number): void {
  basalt(d, oval(x, -r * 0.62, r, r * 0.66, 14), seed, 0.55);
}

// ---------------------------------------------------------------- the reef home

/** The arch's opening. */
function holeShape(): Pt[] {
  return [pt(-50, 0), ...cub(pt(-50, 0), pt(-54, -70), pt(-36, -116), pt(0, -116), 14), ...cub(pt(0, -116), pt(36, -116), pt(54, -70), pt(50, 0), 14)];
}

/** The dark of the home inside the mouth: deep water going back, a lantern far in, a second screen beyond. */
function inside(d: Draw): void {
  const hole = holeShape();
  const { ctx } = d.pen;
  paint(d, hole, DARK, { alpha: 1, shadow: 0, hatch: 0, line: 0 });
  d.pen.clipped(hole, () => {
    const g = ctx.createLinearGradient(0, -116, 0, 0);
    g.addColorStop(0, rgba('#0f0d24', 0.9));
    g.addColorStop(1, rgba(mix(TIDE.sea, DARK, 0.55), 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(-56, -118, 112, 120);
    // The passage going back: its walls closing in, a far lantern, a screen beyond.
    dab(d, [pt(-50, 0), pt(-14, -30), pt(-12, -86), pt(-50, -110)], '#0b0a1c', 0.6, 4);
    dab(d, [pt(50, 0), pt(16, -30), pt(14, -86), pt(50, -110)], '#0b0a1c', 0.5, 4);
    glow(ctx, pt(6, -48), 34, TIDE.glow, 0.32);
    glow(ctx, pt(6, -48), 7, TIDE.glowCore, 0.6);
    // A second arch further in, lit from beyond, and a lantern hung in it.
    const far = [pt(-14, -6), ...cub(pt(-14, -6), pt(-15, -52), pt(-8, -66), pt(2, -66), 8), ...cub(pt(2, -66), pt(12, -66), pt(18, -52), pt(17, -6), 8)];
    dab(d, far, mix(TIDE.sea, TIDE.glow, 0.25), 0.35, 2.4);
    d.pen.hair(far, 0.5, mix(TIDE.glow, DARK, 0.4), 0.5);
    glow(ctx, pt(2, -30), 16, TIDE.glow, 0.3);
    dab(d, oval(0, 0, 54, 9, 20), mix(TIDE.sea, DARK, 0.25), 0.6, 3);
  });
}

/** The rock of the cave mouth: pillow basalt round the opening, heaped over it. */
function archRock(d: Draw): void {
  const outer = [
    pt(-118, 0), pt(-119, -60), pt(-112, -96), pt(-96, -122), pt(-70, -140), pt(-36, -150), pt(6, -152), pt(46, -148), pt(80, -134), pt(104, -112), pt(116, -84), pt(119, -40), pt(118, 0),
    pt(58, 0), ...cub(pt(58, 0), pt(62, -76), pt(42, -124), pt(0, -124), 14), ...cub(pt(0, -124), pt(-42, -124), pt(-62, -76), pt(-58, 0), 14),
  ];
  pillows(d, outer, 7, 13);
}

/** The shell mosaic round the mouth: two courses of small nacre tiles set in a band of ground stone, a spiral shell at the crown. */
function mosaic(d: Draw): void {
  const path = (r: number, n: number): Pt[] => [...cub(pt(-50 - r, 0), pt(-54 - r, -70 - r), pt(-36 - r, -116 - r), pt(0, -116 - r), n), ...cub(pt(0, -116 - r), pt(36 + r, -116 - r), pt(54 + r, -70 - r), pt(50 + r, 0), n).slice(1)];
  const inner = path(0, 40);
  const outer = path(9, 40);
  const band = [...inner, ...[...outer].reverse()];
  paint(d, band, mix(TIDE.stone, TIDE.stoneLit, 0.45), { alpha: 1, shadow: 0.4, hatch: 0.1, line: 0.7 });
  for (const [r0, r1, salt] of [[0.8, 4.4, 0], [4.6, 8.2, 1]] as const) {
    const a = path(r0, 80);
    const b = path(r1, 80);
    for (let i = 0; i + 2 < a.length; i += 2) {
      const off = salt;
      const j = Math.min(a.length - 1, i + 2);
      const tile = [a[i]!, a[j]!, b[j]!, b[i]!];
      const c = pt(tile.reduce((s, q) => s + q.x, 0) / 4, tile.reduce((s, q) => s + q.y, 0) / 4);
      const shrink = tile.map((p, k) => pt(c.x + (p.x - c.x) * 0.8 + (hash(i, k + off * 4, 1540) - 0.5) * 0.5, c.y + (p.y - c.y) * 0.8 + (hash(i, k + off * 4, 1541) - 0.5) * 0.5));
      const pick = Math.floor(hash(i, off, 1542) * 5);
      const tone = pick === 0 ? TIDE.nacre : mix(TIDE.nacre, TIDE.iris[pick - 1]!, 0.55);
      paint(d, shrink, tone, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.3, lineAlpha: 0.6, gloss: true });
    }
  }
  // The medallion: a great spiral shell set in the crown of the arch.
  const c = pt(0, -122);
  nacre(d, oval(c.x, c.y, 9, 7.6, 24), pt(c.x - 2, c.y + 1), 8, 3, 0.8);
  d.pen.hair(spiral(pt(c.x - 1, c.y + 0.6), 7, 2.2, 0.4), 0.6, mix(TIDE.nacre, SHADOW, 0.55), 0.85);
  gleam(d, [pt(c.x - 6, c.y - 2), pt(c.x - 2.6, c.y - 5.6)], 0.6, 0.8);
}

/** A woven screen hanging across the mouth from a cord: twined fibre, a fringe weighted with small stones, `gather` 0..1 drawn aside to its outer edge. */
function screen(d: Draw, x0: number, x1: number, top: number, bottom: number, gather: number, seed: number): void {
  const w = x1 - x0;
  const outerLeft = x0 < 0;
  const waist = top + (bottom - top) * 0.62;
  // Gathered, the inner edge is drawn back towards the outer one and tied at the waist.
  const pull = gather * w * 0.55;
  const inX = outerLeft ? x1 : x0;
  const sgn = outerLeft ? -1 : 1;
  const innerEdge = cub(pt(inX, top), pt(inX, top + 20), pt(inX + sgn * pull, waist - 6), pt(inX + sgn * pull, waist), 10);
  const innerLow = cub(pt(inX + sgn * pull, waist), pt(inX + sgn * pull * 0.9, waist + 8), pt(inX + sgn * pull * 0.5, bottom - 4), pt(inX + sgn * pull * 0.6, bottom), 8);
  const outX = outerLeft ? x0 : x1;
  const shape = outerLeft ? [pt(outX, top), ...innerEdge, ...innerLow.slice(1), pt(outX, bottom)] : [...innerEdge, ...innerLow.slice(1), pt(outX, bottom), pt(outX, top)];
  paint(d, shape, TIDE.fibre, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 0.75 });
  const cx = (x0 + x1) / 2;
  twine(d, shape, pt(cx, (top + bottom) / 2), w, (bottom - top) / 2 + 4, 1.9, TIDE.fibre, 0, 0.75);
  d.pen.clipped(shape, () => {
    // Folds where it hangs, gathered tighter where it's drawn aside; light from the lantern within on its inner edge.
    for (let k = 0; k < 6; k++) {
      const x = x0 + w * (0.08 + k * 0.17);
      const xb = x + sgn * pull * (1 - Math.abs(x - outX) / w) * 0.8;
      dab(d, [pt(x - 1.2, top), pt(x + 1.2, top), pt(xb + 1.8, waist), pt(xb + 1.4, bottom), pt(xb - 1.4, bottom), pt(xb - 1.8, waist)], k % 2 ? SHADOW : PAPER_FILL, k % 2 ? 0.22 : 0.14, 1.2);
    }
    dab(d, innerEdge.concat(innerLow).map((p) => pt(p.x - sgn * 2, p.y)), TIDE.glow, 0.18, 3);
    // A dyed band of blue-violet fibre across it, spirals twined in.
    const band = top + (bottom - top) * 0.22;
    dab(d, [pt(x0 - 2, band), pt(x1 + 2, band), pt(x1 + 2, band + 5), pt(x0 - 2, band + 5)], TIDE.skin, 0.5, 0.4);
    for (let x = x0 + 3.5; x < x1; x += 6.5) d.pen.hair(spiral(pt(x, band + 2.5), 1.7, 1.3, seed), 0.4, TIDE.mark, 0.85);
    dab(d, [pt(x0 - 2, top), pt(x1 + 2, top), pt(x1 + 2, top + 10), pt(x0 - 2, top + 10)], SHADOW, 0.25, 3);
  });
  // The fringe and its stone weights.
  const lo = outerLeft ? [pt(outX, bottom), innerLow[innerLow.length - 1]!] : [innerLow[innerLow.length - 1]!, pt(outX, bottom)];
  for (let k = 0; k <= 7; k++) {
    const p = pt(lo[0]!.x + ((lo[1]!.x - lo[0]!.x) * k) / 7, bottom);
    d.pen.hair([p, pt(p.x + 0.5, p.y + 3.6)], 0.45, TIDE.fibreDark, 0.85);
    if (k % 2 === 0) basalt(d, oval(p.x + 0.5, p.y + 4.8, 1.2, 1.4, 10), seed + k, 0.4);
  }
  // The tie gathering it aside.
  if (gather > 0) {
    const t = pt(inX + sgn * pull, waist);
    fibreCord(d, pt(t.x - 2.4, t.y - 1.6), pt(t.x + 2.4, t.y + 1.2), 0.5, 1.2);
    fibreCord(d, pt(t.x + sgn * 1, t.y), pt(t.x + sgn * 2.2, t.y + 7), 0.4, 0.6);
  }
}

/** A stone plinth with a glass-sponge lantern on it. */
function standingLantern(d: Draw, x: number, lit: number): void {
  floorShadow(d, x, 9);
  const plinth = [pt(x - 7, 0), pt(x - 5.6, -14), pt(x + 5.4, -14.6), pt(x + 7, 0)];
  basalt(d, plinth, Math.round(x), 0.7);
  d.pen.hair(spiral(pt(x, -7), 3, 1.6, 0.3), 0.5, mix(TIDE.stoneLit, PAPER_FILL, 0.3), 0.7);
  glassSponge(d, pt(x, -14.4), 10, 24, lit);
}

/** A lantern hung from the arch on a cord. */
function hangingLantern(d: Draw, at: Pt, lit: number): void {
  fibreCord(d, pt(at.x, -117), pt(at.x, at.y - 9), 0, 0.7);
  glassSponge(d, pt(at.x, at.y + 9), 8, 18, lit);
}

/** A hafted tool: a haft of fibre wound tight and waxed, its head of ground stone or shell, lashed. */
function tool(d: Draw, foot: Pt, len: number, lean: number, head: 'adze' | 'maul' | 'scraper' | 'pick', seed: number): void {
  const top = pt(foot.x + Math.sin(lean) * len, foot.y - Math.cos(lean) * len);
  paint(d, capsule(foot, top, 2.2, 1.8), mix(TIDE.fibre, TIDE.wax, 0.4), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.55 });
  for (let k = 1; k < 8; k++) {
    const p = pt(foot.x + (top.x - foot.x) * (k / 8), foot.y + (top.y - foot.y) * (k / 8));
    d.pen.hair([pt(p.x - 1.1, p.y + 0.3), pt(p.x + 1.1, p.y - 0.5)], 0.3, TIDE.fibreDark, 0.6);
  }
  const ca = Math.cos(lean);
  const sa = Math.sin(lean);
  const at = (u: number, v: number): Pt => pt(top.x + u * ca - v * sa, top.y + u * sa + v * ca);
  if (head === 'adze') basalt(d, [at(-1.4, 1.6), at(-1.6, -2), at(7, -3.6), at(9, -1.6), at(8, 0.6)], seed, 0.6);
  else if (head === 'maul') basalt(d, oval(top.x, top.y - 1, 4.2, 3.2, 14), seed, 0.6);
  else if (head === 'pick') basalt(d, [at(-6, 0.4), at(-2, -2.4), at(2, -2.4), at(7, 0.4), at(2, -0.4), at(-2, -0.4)], seed, 0.6);
  else nacre(d, [at(-1.4, 1), ...cub(at(-1.4, -1), at(0, -6), at(6, -6.4), at(7.6, -2.6), 6), at(5, 0.6)], at(-0.4, 0), 6, seed, 0.55);
  for (const k of [-0.6, 0.6]) d.pen.stroke([at(k - 1, 2), at(k + 0.6, -1)], 0.9, TIDE.fibreDark, 1, false);
}

/** The tool rack: a cord strung between two standing stones, hafted tools leaning in its loops. */
function toolRack(d: Draw, x: number): void {
  floorShadow(d, x, 22);
  for (const sx of [-17, 17]) basalt(d, [pt(x + sx - 3.4, 0), pt(x + sx - 2.6, -30), pt(x + sx + 0.4, -32), pt(x + sx + 3.2, -29), pt(x + sx + 3.6, 0)], 1600 + sx, 0.7);
  fibreCord(d, pt(x - 17, -27), pt(x + 17, -27), 2.6, 0.9);
  tool(d, pt(x - 12, -1), 30, -0.12, 'adze', 21);
  tool(d, pt(x - 5, -1), 27, 0.04, 'maul', 22);
  tool(d, pt(x + 3, -1), 32, -0.06, 'pick', 23);
  tool(d, pt(x + 11, -1), 24, 0.14, 'scraper', 24);
  for (const hx of [-14.6, -4.6, 1.2, 13.8]) fibreCord(d, pt(x + hx - 1.6, -25.4), pt(x + hx + 1.8, -25), 1.4, 0.6);
}

/** A conch, polished, its spiral wound to a point. */
function conch(d: Draw, at: Pt, r: number): void {
  const shape = [pt(at.x - r, at.y), ...cub(pt(at.x - r, at.y), pt(at.x - r * 1.1, at.y - r * 1.2), pt(at.x + r * 0.2, at.y - r * 1.5), pt(at.x + r * 1.6, at.y - r * 0.6), 10), pt(at.x + r * 1.3, at.y)];
  nacre(d, shape, pt(at.x - r * 0.3, at.y - r * 0.5), r, Math.round(at.x), 0.6);
  d.pen.hair(spiral(pt(at.x - r * 0.25, at.y - r * 0.6), r * 0.7, 1.6, 1), 0.4, mix(TIDE.nacre, SHADOW, 0.5), 0.8);
}

/**
 * The mouth of the Tidesingers' home in its sea cave (spec, "Brine", step
 * 7): an arch in a heap of pillow basalt, a band of ground stone round it
 * set with shell mosaic and a great spiral shell at its crown, two woven
 * screens hung across it, one drawn aside on the dark of the home within,
 * glass-sponge lanterns glowing either side and from the arch, their stone
 * tools racked by the door, a conch and a shell bowl on a ledge, seagrass
 * along the floor. Its lights are at `REEF_LANTERNS`; their halo is
 * `drawReefHomeAir`.
 */
export function drawReefHome(d: Draw): void {
  inside(d);
  screen(d, -51, -8, -112, -8, 0.8, 31);
  screen(d, 4, 51, -112, -10, 0.2, 32);
  fibreCord(d, pt(-54, -113), pt(54, -113), 2.4, 1.1);
  archRock(d);
  mosaic(d);
  hangingLantern(d, REEF_LANTERNS[2]!, 1);
  // Sand banked against the rock.
  dab(d, [pt(-120, 0), ...cub(pt(-120, 0), pt(-80, -7), pt(80, -7), pt(120, 0), 20), pt(120, 2), pt(-120, 2)], SAND, 0.55, 1.6);
  standingLantern(d, REEF_LANTERNS[0]!.x, 1);
  standingLantern(d, REEF_LANTERNS[1]!.x, 1);
  toolRack(d, 95);
  // The ledge by the left pillar, a shell bowl and a conch on it.
  floorShadow(d, -103, 16);
  basalt(d, [pt(-118, 0), pt(-117, -11), pt(-90, -12), pt(-88, 0)], 41, 0.7);
  nacre(d, [pt(-114, -11), ...cub(pt(-114, -11), pt(-113, -17), pt(-102, -17), pt(-101, -11), 8)], pt(-107.6, -12), 6, 5, 0.55);
  conch(d, pt(-96, -12), 4.4);
  for (const [x, r] of [[-46, 2.4], [-38, 1.6], [60, 2.2], [67, 1.4], [-66, 1.8]] as const) pebble(d, x, r, Math.round(x + 300));
  for (const [x, h] of [[-62, 10], [66, 12], [120, 9]] as const) seagrass(d, x, h, Math.round(x + 500));
}

/** The light round the reef home's lanterns (drawn after its finish). */
export function drawReefHomeAir(d: Draw): void {
  const { ctx } = d.pen;
  for (const c of REEF_LANTERNS) {
    glow(ctx, c, 30, TIDE.glow, 0.24 + d.f * 0.02);
    glow(ctx, c, 8, TIDE.glowCore, 0.3);
  }
}

// ---------------------------------------------------------------- the air bell

/** The bell's dome: woven fibre over ribs, its foot set down on a mound of pillow basalt. */
const BELL_R = 60;
const BELL_TOP = -128;
const BELL_FOOT = -22;
/** Where the trapped air meets the water inside it. */
const WATER_LINE = -38;

function domeShape(): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI * (i / 32);
    const s = Math.sin(a);
    // A bell, not a hemisphere: a little waisted low down, full at the shoulder.
    const r = BELL_R * (0.9 + 0.1 * Math.pow(s, 0.5));
    pts.push(pt(-Math.cos(a) * r, BELL_FOOT - Math.pow(s, 0.85) * (BELL_FOOT - BELL_TOP)));
  }
  return pts;
}

/** Half-width of the dome at height y (an approximation of `domeShape`). */
function domeHalf(y: number): number {
  const t = Math.max(0, Math.min(1, (BELL_FOOT - y) / (BELL_FOOT - BELL_TOP)));
  const s = Math.pow(t, 1 / 0.85);
  return BELL_R * Math.sqrt(Math.max(0, 1 - s * s)) * (0.9 + 0.1 * Math.pow(Math.sqrt(Math.max(0, 1 - s * s)), 0.5));
}

/** The ledge inside the bell the crew live on: the mound's top, just out of the water, a woven mat over it. */
function ledge(d: Draw): void {
  const slab = [pt(-44, BELL_FOOT + 4), pt(-42, WATER_LINE - 3), pt(-20, WATER_LINE - 5), pt(22, WATER_LINE - 5), pt(43, WATER_LINE - 3), pt(45, BELL_FOOT + 4)];
  basalt(d, slab, 61, 0.7);
  const mat = [pt(-38, WATER_LINE - 4.6), pt(38, WATER_LINE - 4.6), pt(40, WATER_LINE - 2.4), pt(-40, WATER_LINE - 2.4)];
  paint(d, mat, TIDE.fibre, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.4 });
  twine(d, mat, pt(0, WATER_LINE - 3.5), 40, 2, 1.4, TIDE.fibre);
}

/** Where each of the crew stands on the ledge, how big, and how it stands: thin and tired, one speaking in light. */
const CREW: readonly { x: number; s: number; pose: AsterPose; flip: boolean }[] = [
  { x: -24, s: 0.9, pose: 'stand', flip: false },
  { x: 2, s: 0.94, pose: 'speak', flip: true },
  { x: 27, s: 0.88, pose: 'stand', flip: true },
];

function crew(d: Draw): void {
  const { ctx } = d.pen;
  CREW.forEach((c, i) => {
    ctx.save();
    ctx.translate(c.x, WATER_LINE - 4.6);
    ctx.scale(c.flip ? -c.s : c.s, c.s);
    drawAsterPerson(makeDraw(ctx, 6300 + i * 7 + d.f, d.f, 0, BLUE), c.pose);
    ctx.restore();
  });
}

/** The mound of pillow basalt the bell sits down over, the dome's foot sunk into it. */
function mound(d: Draw): Pt[] {
  const shape = [pt(-84, 0), ...cub(pt(-84, 0), pt(-80, -16), pt(-66, -26), pt(-50, -27), 8), pt(50, -27), ...cub(pt(50, -27), pt(66, -26), pt(80, -16), pt(84, 0), 8)];
  pillows(d, shape, 17, 9);
  return shape;
}

/**
 * The air bell under the reef (spec, "Brine", step 8): a dome of woven
 * seagrass over ribs, sealed with wax, set down over a mound of pillow
 * basalt and lashed to it; the air trapped in it silvery and bright, the
 * water standing in its foot below a shining line; bladders of air the
 * Tidesingers carry down tethered beside it. Inside, on the mound's top just
 * out of the water, the three Aster crew (`crew` 3) or nobody (0), lit by a
 * glass-sponge lantern hung from the crown. Its halo is `drawAirBellAir`.
 */
export function drawAirBell(d: Draw, crewCount: 0 | 3): void {
  const { ctx } = d.pen;
  const dome = domeShape();
  const shell = dome;
  floorShadow(d, 0, 84, 0.16);
  // The bladders, tethered to stakes in the mound, floating up beside it.
  const knots = [liftBag(d, pt(-62, -116), 6.4), liftBag(d, pt(-48, -134), 5), liftBag(d, pt(66, -104), 6.8)];
  fibreCord(d, knots[0]!, pt(-50, -96), 1, 0.55);
  fibreCord(d, knots[1]!, pt(-40, -112), 0.8, 0.55);
  fibreCord(d, knots[2]!, pt(55, -80), 1.2, 0.55);
  // Inside: the air silvery, shading to blue-grey at the water line.
  paint(d, shell, '#d6dbe8', { alpha: 1, shadow: 0.2, hatch: 0, line: 0 });
  d.pen.clipped(shell, () => {
    const g = ctx.createLinearGradient(0, BELL_TOP, 0, WATER_LINE);
    g.addColorStop(0, rgba('#f6f8fc', 0.95));
    g.addColorStop(0.65, rgba('#cdd3e3', 0.9));
    g.addColorStop(1, rgba('#a9b1cb', 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(-BELL_R - 2, BELL_TOP - 2, BELL_R * 2 + 4, WATER_LINE - BELL_TOP + 2);
    // The far side of the dome, seen through the air: its weave and ribs faint.
    twine(d, shell, pt(0, -80), BELL_R, 56, 4.4, mix('#c9cfe0', TIDE.fibre, 0.5), 0, 0.5);
    glow(ctx, AIR_BELL_LANTERN, 48, TIDE.glow, 0.32);
    glow(ctx, AIR_BELL_LANTERN, 14, TIDE.glowCore, 0.55);
    ledge(d);
  });
  if (crewCount === 3) crew(d);
  // The lantern hung from the crown.
  fibreCord(d, pt(0, BELL_TOP + 2), pt(0, AIR_BELL_LANTERN.y - 9), 0, 0.6);
  glassSponge(d, pt(0, AIR_BELL_LANTERN.y + 9), 8, 18, 1);
  // The water standing in the bell's foot: purple, its surface a silver line seen a little from above.
  const half = domeHalf(WATER_LINE);
  d.pen.clipped(shell, () => {
    ctx.save();
    const g = ctx.createLinearGradient(0, WATER_LINE, 0, BELL_FOOT);
    g.addColorStop(0, rgba(TIDE.sea, 0.6));
    g.addColorStop(1, rgba(mix(TIDE.sea, DARK, 0.45), 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(-BELL_R - 2, WATER_LINE, BELL_R * 2 + 4, BELL_FOOT - WATER_LINE + 8);
    ctx.restore();
    // The surface seen from just above: a thin ellipse of reflected light.
    dab(d, oval(0, WATER_LINE + 1.2, half, 2.4, 30), '#e9ecf8', 0.55, 0.6);
    for (let k = 0; k < 7; k++) d.pen.hair([pt(-48 + k * 15, WATER_LINE + 5 + (k % 2) * 3), pt(-42 + k * 15, WATER_LINE + 5.6 + (k % 2) * 3)], 0.4, TIDE.glowCore, 0.5);
  });
  const surface = Array.from({ length: 17 }, (_, i) => pt(-half + (i / 16) * half * 2, WATER_LINE + Math.sin(i * 1.3 + d.f) * 0.35));
  d.pen.stroke(surface, 1.6, '#f7f9ff', 1, false);
  d.pen.hair(surface.map((p) => pt(p.x, p.y + 1.1)), 0.5, mix(TIDE.sea, SHADOW, 0.4), 0.8);
  // The dome itself, in front: wax over weave, clear where you look straight through it, thicker towards its rim.
  d.pen.clipped(shell, () => {
    ctx.save();
    const rg = ctx.createRadialGradient(-8, -80, 10, 0, -70, BELL_R * 1.15);
    rg.addColorStop(0, rgba(TIDE.wax, 0.04));
    rg.addColorStop(0.6, rgba(TIDE.wax, 0.16));
    rg.addColorStop(1, rgba(mix(TIDE.wax, TIDE.fibre, 0.5), 0.75));
    ctx.fillStyle = rg;
    ctx.fillRect(-BELL_R - 2, BELL_TOP - 2, BELL_R * 2 + 4, BELL_FOOT - BELL_TOP + 8);
    ctx.restore();
    twine(d, shell, pt(0, -74), BELL_R, 58, 3.6, TIDE.fibre, 0, 0.45);
    // The ribs, bowing out with the dome up to the crown.
    for (const k of [-0.82, -0.45, 0, 0.45, 0.82]) {
      const rib = Array.from({ length: 15 }, (_, i) => {
        const y = BELL_FOOT - (i / 14) * (BELL_FOOT - BELL_TOP);
        return pt(k * domeHalf(y), y);
      });
      d.pen.stroke(rib, 1.3, mix(TIDE.fibre, TIDE.fibreDark, 0.45), 0.6, false);
      d.pen.hair(rib.map((p) => pt(p.x - 0.6, p.y)), 0.4, mix(TIDE.fibre, PAPER_FILL, 0.55), 0.6);
    }
    // Two lashed bands round it.
    for (const y of [-58, -96]) {
      const h2 = domeHalf(y);
      const band = Array.from({ length: 17 }, (_, i) => pt(-h2 + (i / 16) * h2 * 2, y + Math.sin((i / 16) * Math.PI) * 4));
      d.pen.stroke(band, 1, TIDE.fibreDark, 0.45, false);
    }
    dab(d, oval(34, -52, 26, 34, 20), SHADOW, 0.2, 9);
  });
  // The wax's sheen on its lit shoulder, as on a wet bubble.
  gleam(d, cub(pt(-50, -50), pt(-52, -84), pt(-38, -112), pt(-14, -122), 12), 1.6, 0.7);
  gleam(d, cub(pt(-42, -60), pt(-44, -80), pt(-36, -96), pt(-26, -104), 8), 0.7, 0.5);
  edge(d, dome, 1.1, 0.95);
  // The mound it's set down over, and the lashings tying its foot to stakes of stone.
  mound(d);
  for (const x of [-56, -20, 20, 56]) {
    basalt(d, [pt(x - 2.6, -20), pt(x - 1.6, -30), pt(x + 1.4, -31), pt(x + 2.8, -20)], 70 + x, 0.6);
    fibreCord(d, pt(x * 0.96, BELL_FOOT - 3), pt(x, -26), 0.6, 1);
  }
  seagrass(d, -78, 10, 91, -6);
  seagrass(d, 80, 12, 92, -5);
}

/** The air bell's lantern glow (drawn after its finish). */
export function drawAirBellAir(d: Draw): void {
  glow(d.pen.ctx, AIR_BELL_LANTERN, 70, TIDE.glow, 0.14 + d.f * 0.02);
}
