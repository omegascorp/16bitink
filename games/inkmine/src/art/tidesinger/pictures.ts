import { hash } from '../../logic/noise';
import { cub, oval, pt, ribbon, TAU, type Draw } from '../kit';
import { dab, mix, paint, SHADOW, soft } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ASTER } from '../aster/style';
import { spiral, TIDE } from './style';

/**
 * Story card pictures on Brine, as the Aster's wall pictures on Mycel are
 * (aster/camp.ts), but each in its maker's own medium. The Aster scratch in
 * their plum ink on the inside of their craft's glazed shell, in their
 * pictographs (bells on legs, the star). The Tidesingers draw with a lobe's
 * tip in wet sand: soft grooves with a ridge of sand thrown up beside
 * each, lines that flow and end in spirals, rows of pressed dots like the
 * spots on their wings.
 */

/** A story card's picture. Origin at the centre. */
export const TIDE_PICTURE = { w: 140, h: 100, ox: 70, oy: 50 } as const;

// ---------------------------------------------------------------- the surfaces

/** A slab with rounded corners and a slightly rough edge, inset from the frame. */
function slab(seed: number, inset = 4): Pt[] {
  const W = TIDE_PICTURE;
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const k = 1 + (hash(i, seed, 1800) - 0.5) * 0.05;
    const x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.4) * (W.w / 2 - inset) * k;
    const y = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.4) * (W.h / 2 - inset) * k;
    return pt(x, y);
  });
}

/** The inside of the craft's shell: glazed ceramic, bone-white with the lilac glaze pooled low, ribbed, a seam laced with cord, a tide line where the water stood. */
function shellWall(d: Draw): void {
  const s = slab(5);
  paint(d, s, ASTER.shell, { alpha: 1, shadow: 0.3, hatch: 0.08, line: 0.9, gloss: true });
  d.pen.clipped(s, () => {
    dab(d, oval(0, 52, 90, 26, 24), ASTER.glaze, 0.55, 6);
    // The ribs, curving as the hull does.
    for (let k = -4; k <= 4; k++) {
      const x = k * 16;
      const line = cub(pt(x * 1.1, -52), pt(x * 0.92, -18), pt(x * 0.92, 18), pt(x * 1.1, 52), 12);
      d.pen.hair(line, 0.8, mix(ASTER.glaze, SHADOW, 0.35), 0.45);
      d.pen.hair(line.map((p) => pt(p.x - 1, p.y)), 0.5, PAPER_FILL, 0.5);
    }
    // A seam laced with cord down the left edge.
    for (let y = -44; y <= 44; y += 6) d.pen.stroke([pt(-60, y), pt(-56, y + 1)], 1, ASTER.cord, 0.9, false);
    // A purple tide line and stain from the water that filled it.
    dab(d, [pt(-80, -38), pt(80, -42), pt(80, -36), pt(-80, -33)], '#8a7aa8', 0.22, 2);
    for (let k = 0; k < 18; k++) dab(d, oval((hash(k, 1, 1801) - 0.5) * 130, (hash(k, 2, 1801) - 0.5) * 90, 3 + hash(k, 3, 1801) * 6, 2 + hash(k, 4, 1801) * 3, 10), '#a99bc0', 0.12, 2);
  });
}

/** Wet sand, smoothed for drawing: ripple marks at the edges, darker where it's wettest, grains, a fleck of shell. */
function wetSand(d: Draw, seed: number): Pt[] {
  const s = slab(seed, 3);
  paint(d, s, TIDE.sand, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.7 });
  d.pen.clipped(s, () => {
    for (let k = 0; k < 12; k++) dab(d, oval((hash(k, seed, 1810) - 0.5) * 130, (hash(k, seed, 1811) - 0.5) * 90, 10 + hash(k, seed, 1812) * 18, 6 + hash(k, seed, 1813) * 10, 14), mix(TIDE.sand, '#7d6e66', 0.5), 0.18, 6);
    // Ripple marks the current left, smoothed away in the middle where it was drawn on.
    for (let row = 0; row < 9; row++) {
      const y = -46 + row * 11.5;
      const ripple = Array.from({ length: 30 }, (_, i) => pt(-70 + i * 5, y + Math.sin(i * 0.9 + row) * 1.2));
      const fade = Math.min(1, Math.abs(y) / 30);
      d.pen.hair(ripple, 0.6, mix(TIDE.sand, SHADOW, 0.3), 0.08 + fade * 0.22);
      d.pen.hair(ripple.map((p) => pt(p.x, p.y - 0.8)), 0.4, PAPER_FILL, 0.06 + fade * 0.18);
    }
    dab(d, oval(0, 0, 54, 36, 24), TIDE.sand, 0.55, 8);
    d.pen.stipple(s, 500, () => 0.5, 0.25, mix(TIDE.sand, SHADOW, 0.35));
    d.pen.stipple(s, 160, () => 0.5, 0.25, PAPER_FILL);
    for (let k = 0; k < 3; k++) {
      const c = pt(-58 + hash(k, seed, 1814) * 116, -40 + hash(k, seed, 1815) * 80);
      paint(d, oval(c.x, c.y, 2, 1.3, 10), TIDE.nacre, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.35 });
    }
  });
  return s;
}

// ---------------------------------------------------------------- marks

/** A scratch in the shell, inked plum: the groove, with its far wall catching the light. */
function scratch(d: Draw, pts: readonly Pt[], w = 1.2): void {
  d.pen.stroke(pts, w, ASTER.ink, 0.9, false);
  d.pen.hair(pts.map((p) => pt(p.x + w * 0.45, p.y + w * 0.45)), w * 0.35, PAPER_FILL, 0.5);
}

/** A groove drawn in wet sand: a shadowed furrow, the light on its far wall, a ridge of sand pushed up beside it. */
function groove(d: Draw, pts: readonly Pt[], w = 1.5): void {
  const dark = mix(TIDE.sand, '#2a1e30', 0.72);
  // The ridge of sand pushed up on the lit side, then the furrow's soft shadow, its dark floor, and light on its far wall.
  d.pen.stroke(pts.map((p) => pt(p.x - w * 0.55, p.y - w * 0.65)), w * 1.1, mix(TIDE.sand, PAPER_FILL, 0.6), 0.6, false);
  soft(d.pen.ctx, w * 0.5, () => d.pen.stroke(pts.map((p) => pt(p.x + w * 0.3, p.y + w * 0.3)), w * 1.8, SHADOW, 0.22, false));
  d.pen.stroke(pts, w, dark, 0.9, false);
  d.pen.hair(pts.map((p) => pt(p.x + w * 0.3, p.y + w * 0.35)), w * 0.32, mix(TIDE.sand, PAPER_FILL, 0.35), 0.75);
}

/** A lobe drawn in the sand: its tapering outline along `spine`, three digits fanned at its tip. */
function lobeGroove(d: Draw, spine: readonly Pt[], w0: number, w1: number, digits = true): void {
  const { top, bot } = ribbon(spine, (u) => w0 + (w1 - w0) * u);
  groove(d, top, 1.4);
  groove(d, bot, 1.4);
  if (!digits) return;
  const tip = spine[spine.length - 1]!;
  const prev = spine[spine.length - 3]!;
  const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  for (const k of [-1, 0, 1]) groove(d, [tip, pt(tip.x + Math.cos(a + k * 0.55) * 4.4, tip.y + Math.sin(a + k * 0.55) * 4.4)], 1);
}

/** A dot pressed into the sand with a digit's tip. */
function pressed(d: Draw, c: Pt, r = 1): void {
  d.pen.dot(c.x + r * 0.35, c.y + r * 0.4, r * 1.1, PAPER_FILL, 0.4);
  d.pen.dot(c.x, c.y, r, mix(TIDE.sand, '#3d3040', 0.55), 0.8);
}

/** One of the Aster, as they draw themselves: a bell, three legs a side splayed out (swimming, if `swim`), a dot of light on the crown. */
function asterGlyph(d: Draw, c: Pt, s: number, swim: boolean): void {
  const bell = [pt(c.x - 4 * s, c.y), ...cub(pt(c.x - 4 * s, c.y), pt(c.x - 4.6 * s, c.y - 5 * s), pt(c.x - 2 * s, c.y - 7.4 * s), pt(c.x, c.y - 7.4 * s), 6), ...cub(pt(c.x, c.y - 7.4 * s), pt(c.x + 2 * s, c.y - 7.4 * s), pt(c.x + 4.6 * s, c.y - 5 * s), pt(c.x + 4 * s, c.y), 6), pt(c.x - 4 * s, c.y)];
  d.pen.fill(bell, ASTER.ink, 0.2);
  scratch(d, bell, 1);
  for (const side of [-1, 1]) {
    for (const k of [0, 1, 2]) {
      const reach = swim ? pt(side * (4.4 + k * 1.6), -1.4 + k * 2.6) : pt(side * (3.6 + k * 1.8), 3.4);
      scratch(d, [pt(c.x + side * (1.6 + k * 0.9) * s, c.y), pt(c.x + reach.x * s, c.y + reach.y * s)], 0.7);
    }
  }
  d.pen.dot(c.x, c.y - 9.2 * s, 1, ASTER.ink, 0.9);
}

/** A Tidesinger as the Aster drew one, seen from above: a kite of swept wings, two lobes at its nose, a long tail. Heading along `tilt`. */
function rayGlyph(d: Draw, c: Pt, s: number, tilt: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  // Nose to the right (+x), wings out to ±y, swept back.
  const lead = (g: number): Pt[] => cub(pt(6, g * 2.4), pt(6, g * 9), pt(1, g * 14), pt(-8, g * 16.5), 8);
  const trail = (g: number): Pt[] => cub(pt(-8, g * 16.5), pt(-3.4, g * 11), pt(-5, g * 5), pt(-9, g * 1.8), 8);
  const body = [...[...trail(-1)].reverse(), ...[...lead(-1)].reverse(), ...lead(1).slice(1), ...trail(1).slice(1)];
  d.pen.fill(body, ASTER.ink, 0.16);
  scratch(d, [...body, body[0]!], 1.1 / s);
  scratch(d, [pt(7, -2), pt(10, -3.4)], 0.8 / s);
  scratch(d, [pt(7, 2), pt(10, 3.4)], 0.8 / s);
  const back = oval(-1, 0, 6, 3.2, 14);
  scratch(d, [...back, back[0]!], 0.7 / s);
  scratch(d, [pt(-9, 0), pt(-16, 1), pt(-24, -0.8)], 0.8 / s);
  ctx.restore();
}

/** Their craft as they draw it: the cup of petals with its two sides rising, a hexagon at its heart. */
function craftGlyph(d: Draw, c: Pt, s: number, tilt: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  for (const side of [-1, 1]) {
    const leaf = [pt(side * 10, 1), pt(side * 13, -5), pt(side * 17, -12), pt(side * 15.4, -12.4), pt(side * 16.2, -14), pt(side * 12, -9), pt(side * 8.6, -3)];
    d.pen.fill(leaf, ASTER.ink, 0.12);
    scratch(d, [...leaf, leaf[0]!], 1 / s);
  }
  const dome = Array.from({ length: 11 }, (_, i) => pt(-9 + (i / 10) * 18, -Math.sin((i / 10) * Math.PI) * 7));
  scratch(d, dome, 0.9 / s);
  const cup = [pt(-13, 0), ...cub(pt(-13, 0), pt(-12, 9.6), pt(12, 9.6), pt(13, 0), 12), pt(-13, 0)];
  d.pen.fill(cup, PAPER_FILL, 0.6);
  d.pen.fill(cup, ASTER.ink, 0.12);
  scratch(d, cup, 1.3 / s);
  const hex = Array.from({ length: 7 }, (_, i) => pt(Math.cos((i / 6) * TAU) * 2.4, 4.4 + Math.sin((i / 6) * TAU) * 2.4));
  scratch(d, hex, 0.8 / s);
  ctx.restore();
}

/** A dashed path: short scratches with gaps. */
function dashes(d: Draw, path: readonly Pt[], every: number, mark: (pts: Pt[]) => void): void {
  for (let i = 0; i + 1 < path.length; i += every) mark(path.slice(i, Math.min(path.length, i + Math.ceil(every / 2) + 1)));
}

/** An arrowhead at the end of a path. */
function arrowHead(path: readonly Pt[], size: number): [Pt[], Pt[]] {
  const b = path[path.length - 1]!;
  const a = path[path.length - 3] ?? path[0]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const side = (k: number): Pt[] => [pt(b.x + Math.cos(ang + Math.PI - k * 0.5) * size, b.y + Math.sin(ang + Math.PI - k * 0.5) * size), b];
  return [side(1), side(-1)];
}

// ---------------------------------------------------------------- the pictures

/**
 * Scratched in plum on the inside of the craft's shell (spec, "Brine",
 * step 5), as the Aster draw: the sea's surface, their craft going down
 * tilted under it with bubbles rising, the three of them swimming out of
 * it, and wide ray shapes rising under them, carrying them down and away.
 */
export function drawCraftSinkingPicture(d: Draw): void {
  shellWall(d);
  // The surface: a long wave line across the top.
  const surface = Array.from({ length: 36 }, (_, i) => pt(-62 + i * 3.6, -34 + Math.sin(i * 0.8) * 1.6));
  scratch(d, surface, 1.3);
  // Bubbles rising from the craft to the surface.
  for (const [x, y, r] of [[-36, -26, 1.6], [-32, -30, 1.1], [-40, -21, 1.2], [-28, -24, 0.9]] as const) scratch(d, [...oval(x, y, r, r, 10), pt(x + r, y)], 0.8);
  craftGlyph(d, pt(-40, -4), 1.3, 0.55);
  // Its path down, dashed.
  dashes(d, cub(pt(-46, 8), pt(-50, 22), pt(-46, 32), pt(-38, 40), 16), 3, (p) => scratch(d, p, 1));
  // The three, each on the back of a ray carrying it down and away to the right, the path behind dashed.
  for (const [i, [x, y]] of ([[-8, 2], [16, 14], [38, 0]] as const).entries()) {
    rayGlyph(d, pt(x, y + 6), 1.15, 0.45 + i * 0.05);
    asterGlyph(d, pt(x - 1.5, y + 5), 0.62, true);
    dashes(d, cub(pt(x - 10, y - 6), pt(x - 8, y - 3), pt(x - 6, y - 1), pt(x - 5, y), 6), 2, (p) => scratch(d, p, 0.8));
  }
  // Where they're going: down, an arrow to the reef.
  const path = cub(pt(30, 26), pt(38, 34), pt(48, 38), pt(58, 38), 12);
  scratch(d, path, 1.2);
  for (const h of arrowHead(path, 3.6)) scratch(d, h, 1.2);
}

/**
 * Drawn by a Tidesinger with a lobe's tip in wet sand (spec, "Brine", step
 * 7): what they want. A lump of branching native copper; an arrow from it
 * into a block of hard rock, where it lies; and a lobe, three digits at its
 * tip, pressed against the rock and bent back from it, unable to break it.
 */
export function drawCopperSandPicture(d: Draw): void {
  d.pen.clipped(wetSand(d, 7), () => copperMarks(d));
}

function copperMarks(d: Draw): void {
  // The copper: a lump with branches growing off it, as native copper grows, a spiral where they love it.
  const trunk = cub(pt(-50, 22), pt(-50, 6), pt(-46, -8), pt(-38, -22), 10);
  groove(d, trunk, 2.4);
  for (const [t, a, l] of [[3, -2.5, 12], [5, -0.5, 13], [7, -2.7, 11], [9, -0.3, 9], [10, -1.9, 7]] as const) {
    const p = trunk[t]!;
    const tip = pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
    groove(d, cub(p, pt((p.x + tip.x) / 2, (p.y + tip.y) / 2 - 1.2), tip, tip, 6), 1.6);
    groove(d, [tip, pt(tip.x + Math.cos(a - 0.6) * l * 0.4, tip.y + Math.sin(a - 0.6) * l * 0.4)], 0.9);
  }
  const lump = oval(-48, 24, 9, 5.4, 18);
  groove(d, [...lump, lump[0]!], 1.6);
  for (let k = 0; k < 5; k++) pressed(d, pt(-53 + k * 2.6, 24 + (k % 2) * 1.2), 0.7);
  // The arrow, from the copper into the rock.
  const arrow = cub(pt(-30, -6), pt(-18, -16), pt(-4, -14), pt(8, -2), 14);
  groove(d, arrow, 1.6);
  for (const h of arrowHead(arrow, 5)) groove(d, h, 1.6);
  // The rock: a block, hatched hard, the copper lying in it as a small branching mark.
  const block = [pt(6, -18), pt(36, -21), pt(38, 26), pt(4, 30), pt(6, -18)];
  groove(d, block, 2);
  for (let k = 0; k < 5; k++) groove(d, [pt(10 + k * 5.4, 24 - k * 0.6), pt(16 + k * 5.4, 12 - k * 0.6)], 0.8);
  groove(d, cub(pt(20, 2), pt(22, -2), pt(24, -4), pt(26, -8), 6), 1.1);
  groove(d, [pt(23, -2.6), pt(28, -1)], 0.9);
  groove(d, [pt(24.6, -5.6), pt(21, -9)], 0.9);
  // The lobe: reaching in from the right, pressed to the rock and buckling against it, the strain marks where it pushes.
  lobeGroove(d, cub(pt(64, -34), pt(54, -30), pt(50, -18), pt(41, -10), 14), 9, 4);
  for (const [a, b] of [[pt(42, -2), pt(46, 0)], [pt(40, 4), pt(44, 7)], [pt(36, -16), pt(34, -20)]] as const) groove(d, [a, b], 1);
  // And a spiral turned back on itself: in their drawing, "it won't".
  groove(d, spiral(pt(56, 18), 6, 1.6, Math.PI), 1);
  for (let k = 0; k < 4; k++) pressed(d, pt(48 + k * 4, 30), 0.8);
}

/**
 * Drawn in wet sand by a Tidesinger (spec, "Brine", step 8): how they bore
 * stone. A tube spun on wet sand, as the Egyptians drilled granite: the
 * tube standing in a ring cut into a block of stone, sand poured round its
 * foot, a lobe twisting it at the top, curling arrows for the turning, and
 * beside it the core it cut, lifted out.
 */
export function drawTubeDrillPicture(d: Draw): void {
  d.pen.clipped(wetSand(d, 9), () => drillMarks(d));
}

function drillMarks(d: Draw): void {
  // The block of stone, hatched hard.
  const block = [pt(-50, 2), pt(30, -2), pt(34, 38), pt(-52, 40), pt(-50, 2)];
  groove(d, block, 2);
  for (let k = 0; k < 9; k++) groove(d, [pt(-46 + k * 8.4, 36 - k * 0.2), pt(-41 + k * 8.4, 28 - k * 0.2)], 0.8);
  // The tube, going down into it: two walls and an ellipse at its mouth, and the ring it cut, in section.
  const cx = -12;
  const top = -26;
  const bottom = 22;
  groove(d, [pt(cx - 10, top), pt(cx - 10, bottom)], 1.8);
  groove(d, [pt(cx + 10, top), pt(cx + 10, bottom)], 1.8);
  const mouth = oval(cx, top, 10, 3.2, 20);
  groove(d, [...mouth, mouth[0]!], 1.4);
  // The core standing inside the cut, dashed where it's hidden.
  dashes(d, [pt(cx - 6, 0), pt(cx - 6, 4), pt(cx - 6, 8), pt(cx - 6, 12), pt(cx - 6, 16), pt(cx - 6, 20)], 2, (p) => groove(d, p, 0.8));
  dashes(d, [pt(cx + 6, 0), pt(cx + 6, 4), pt(cx + 6, 8), pt(cx + 6, 12), pt(cx + 6, 16), pt(cx + 6, 20)], 2, (p) => groove(d, p, 0.8));
  // Sand poured in round its foot, pressed dots running down the walls and heaped at the bottom.
  for (let k = 0; k < 6; k++) {
    pressed(d, pt(cx - 13 - (k % 2) * 1.6, -2 + k * 4), 0.75);
    pressed(d, pt(cx + 13 + (k % 2) * 1.6, -2 + k * 4), 0.75);
  }
  for (let k = 0; k < 7; k++) pressed(d, pt(cx - 9 + k * 3, bottom + 2 + (k % 2) * 1.4), 0.8);
  // The turning: curling arrows round the tube's top, one each way.
  for (const side of [-1, 1]) {
    const arc = Array.from({ length: 12 }, (_, i) => {
      const a = side > 0 ? -0.2 + (i / 11) * 2.2 : Math.PI + 0.2 - (i / 11) * 2.2;
      return pt(cx + Math.cos(a) * 17, top + 10 + Math.sin(a) * 5);
    });
    groove(d, arc, 1.3);
    for (const h of arrowHead(arc, 3.6)) groove(d, h, 1.3);
  }
  // The lobe twisting it, from above, its three digits round the mouth.
  lobeGroove(d, cub(pt(42, -40), pt(26, -42), pt(10, -36), pt(cx + 7, -29), 14), 8, 3.4, true);
  // Beside it, the core it cut, lifted out, and a spiral of pressed dots: "done".
  const core = [pt(44, 6), pt(44, 30), ...oval(50, 30, 6, 2, 10).filter((p) => p.y >= 30).reverse(), pt(56, 30), pt(56, 6)];
  groove(d, core, 1.4);
  const coreTop = oval(50, 6, 6, 2, 16);
  groove(d, [...coreTop, coreTop[0]!], 1.2);
  spiral(pt(54, -18), 8, 1.6, 0, 18).forEach((p, i) => i % 2 === 0 && pressed(d, p, 0.8));
}
