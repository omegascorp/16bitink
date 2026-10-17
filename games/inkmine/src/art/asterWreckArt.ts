import { hash } from '../logic/noise';
import { capsule, cub, edge, oval, pt, type Draw } from './kit';
import { dab, glow, mix, paint, SHADOW } from './paint';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { ASTER, starGlyph } from './aster/style';

/**
 * The Aster lander on Mycel (spec, "Mycel"): another people's lander, nothing like
 * a guild tin can. Their ships are grown more than built: a ribbed ceramic
 * pod like a seed head, glazed bone-white and lilac, joined with cord where
 * ours would be riveted, a band of hexagonal windows round its waist, a
 * fan of petal thrusters under it, three jointed claw legs, and an
 * eight-pointed star on its crown. It came down hard from the west years
 * ago: a furrow ploughed through the peat behind it, torn petals in the
 * furrow, a leg folded under it, the shell split, and fungus has climbed
 * it. Its beacon, a glass bead on the crown, is drawn dark here; the scene
 * lights it at `asterBeacon()`. Origin on the ground under its middle.
 */
export const ASTER_WRECK = { w: 240, h: 176, ox: 124, oy: 160 } as const;

/** How it lies: tipped forward (radians) about its feet, and sunk this far into the peat. */
const TIP = 0.26;
const SINK = pt(2, 8);
/** The beacon bead on its crown, before it's tipped. */
const BEACON = pt(0, -133);
const PEAT = '#8f7a9c';
const THREAD = '#f3ecdc';

/** A point on the pod as it lies: tipped and sunk. */
function laid(p: Pt): Pt {
  const c = Math.cos(TIP);
  const s = Math.sin(TIP);
  return pt(p.x * c - p.y * s + SINK.x, p.x * s + p.y * c + SINK.y);
}

/** Where the scene draws the beacon's light, in drawing units from the origin. */
export function asterBeacon(): Pt {
  return laid(BEACON);
}

/** Cord lashed round a joint: a few tight dark turns, each with a lit ridge. */
function lashing(d: Draw, at: Pt, r: number, angle: number): void {
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  for (let k = -1; k <= 1; k++) {
    const c = pt(at.x + nx * k * r * 0.45, at.y + ny * k * r * 0.45);
    const a = pt(c.x - ny * r, c.y + nx * r);
    const b = pt(c.x + ny * r, c.y - nx * r);
    d.pen.stroke([a, b], r * 0.42, ASTER.cord, 1, false);
    d.pen.hair([pt(a.x - nx * 0.2, a.y - ny * 0.2), pt(b.x - nx * 0.2, b.y - ny * 0.2)], r * 0.12, '#c98b6c', 0.8);
  }
}

/** A claw leg, like a crab's: a thick ribbed thigh from the hip up to a high knee, then a curved, tapering shin down to a pointed foot, lashed at the knee. */
function claw(d: Draw, hip: Pt, knee: Pt, foot: Pt, far: boolean): void {
  const wash = far ? mix(ASTER.shell, SHADOW, 0.3) : ASTER.shell;
  paint(d, capsule(hip, knee, 8, 6.4), wash, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.7, gloss: true });
  const mid = pt((hip.x + knee.x) / 2, (hip.y + knee.y) / 2);
  d.pen.hair([pt(mid.x - 2, mid.y - 2.6), pt(mid.x + 2, mid.y + 2.6)], 0.6, mix(ASTER.glaze, SHADOW, 0.45), 0.8);
  // The shin bows outward as it comes down.
  const out = Math.sign(foot.x - hip.x) || 1;
  const bow = pt((knee.x + foot.x) / 2 + out * 6, (knee.y + foot.y) / 2);
  const shin = [
    ...cub(pt(knee.x - 3, knee.y), pt(bow.x - 3, bow.y - 4), pt(foot.x - 1.6, foot.y - 10), pt(foot.x, foot.y), 8),
    ...cub(pt(foot.x, foot.y), pt(foot.x + 2, foot.y - 10), pt(bow.x + 3, bow.y - 4), pt(knee.x + 3, knee.y), 8),
  ];
  paint(d, shin, wash, { alpha: 1, shadow: 0.55, hatch: 0.12, line: 0.7, gloss: true });
  lashing(d, knee, 4, Math.atan2(foot.y - knee.y, foot.x - knee.x));
}

/** A petal thruster hanging under the hull: a curved ceramic scoop, sooty at its mouth. */
function petal(d: Draw, root: Pt, angle: number, len: number, torn: boolean): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const at = (u: number, v: number): Pt => pt(root.x + c * u - s * v, root.y + s * u + c * v);
  const shape = [at(0, -4), ...cub(at(0, -4), at(len * 0.5, -6), at(len * 0.9, -3), at(torn ? len * 0.6 : len, 0), 6), ...cub(at(torn ? len * 0.6 : len, 0), at(len * 0.9, 3), at(len * 0.5, 6), at(0, 4), 6)];
  paint(d, shape, mix(ASTER.shell, ASTER.glaze, 0.4), { alpha: 1, shadow: 0.5, hatch: 0.15, line: 0.7 });
  dab(d, oval(at(len * 0.75, 0).x, at(len * 0.75, 0).y, 3, 2.2, 10), '#2a2238', 0.5, 0.8);
  if (torn) d.pen.hair([at(len * 0.6, -2.6), at(len * 0.52, -0.4), at(len * 0.62, 1.2), at(len * 0.56, 2.8)], 0.6, d.ink, 0.9);
}

/** The pod's hull outline: an onion of ceramic from its base up to a narrow neck under the crown. */
function hullShape(): Pt[] {
  return [
    ...cub(pt(-30, -40), pt(-44, -52), pt(-42, -84), pt(-8, -114), 12),
    pt(-5, -117), pt(5, -117),
    ...cub(pt(8, -114), pt(42, -84), pt(44, -52), pt(30, -40), 12),
    ...cub(pt(30, -40), pt(14, -35), pt(-14, -35), pt(-30, -40), 8),
  ];
}

/** Ribs from the base sweeping up to the neck, each a lit ridge beside a shadowed groove. */
function ribs(d: Draw, hull: readonly Pt[]): void {
  d.pen.clipped(hull, () => {
    for (let k = -3; k <= 3; k++) {
      const x0 = k * 10;
      const rib = cub(pt(x0, -37), pt(x0 * 1.45, -60), pt(x0 * 1.1, -92), pt(k * 1.3, -116), 12);
      d.pen.hair(rib, 0.9, mix(ASTER.glaze, SHADOW, 0.45), 0.8);
      d.pen.hair(rib.map((p) => pt(p.x - 1.1, p.y)), 0.6, PAPER_FILL, 0.6);
    }
  });
}

/** The band of hexagonal windows round the pod's waist, dark now, one cracked, one with the last of the glow. */
function windows(d: Draw): void {
  for (let k = -2; k <= 2; k++) {
    const c = pt(k * 13, -68 + Math.abs(k) * 1.4);
    const r = 5.2 - Math.abs(k) * 0.6;
    const hex = Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos((i / 6) * Math.PI * 2) * r * (1 - Math.abs(k) * 0.12), c.y + Math.sin((i / 6) * Math.PI * 2) * r));
    paint(d, hex, k === 1 ? ASTER.glass : '#2f3a46', { alpha: 1, shadow: 0.3, hatch: 0, line: 0.7, gloss: true });
    if (k === 1) glow(d.pen.ctx, c, r * 1.6, ASTER.glow, 0.35);
    if (k === -1) d.pen.hair([pt(c.x - r * 0.7, c.y - r * 0.5), pt(c.x - 0.4, c.y + 0.4), pt(c.x + r * 0.6, c.y - r * 0.2), pt(c.x + r * 0.3, c.y + r * 0.8)], 0.5, PAPER_FILL, 0.9);
  }
}

/** The crown: a neck lashed with cord, an eight-pointed star, and the beacon's glass bead on top (dark: the scene lights it). */
function crown(d: Draw): void {
  lashing(d, pt(0, -117), 5.5, -Math.PI / 2);
  starGlyph(d, pt(0, -124), 7.5, ASTER.shell, true);
  paint(d, oval(BEACON.x, BEACON.y, 3.4, 3.4, 14), '#4f7f78', { alpha: 1, shadow: 0.3, hatch: 0, line: 0.6, gloss: true });
}

/** Where the shell split as it came down: a gap into its dark inside, the shell's edge jagged and lit. */
function split(d: Draw): void {
  const gap = [pt(14, -92), pt(19, -82), pt(16, -74), pt(22, -64), pt(18, -52), pt(26, -46), pt(30, -54), pt(25, -64), pt(29, -76), pt(22, -86)];
  paint(d, gap, '#241c30', { alpha: 1, shadow: 0, hatch: 0.4, line: 0.8 });
  d.pen.hair(gap.slice(0, 6).map((p) => pt(p.x - 0.8, p.y)), 0.5, PAPER_FILL, 0.7);
  // A loose end of cord hanging out of it.
  d.pen.stroke([pt(24, -60), pt(29, -52), pt(27, -42), pt(31, -36)], 1.1, ASTER.cord, 1, false);
}

/** Their writing on the hull: a rosette of strokes round a centre, as the Aster write. */
function rosette(d: Draw, c: Pt, r: number): void {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const len = r * (0.55 + hash(k, 1, 970) * 0.45);
    d.pen.hair([pt(c.x + Math.cos(a) * r * 0.25, c.y + Math.sin(a) * r * 0.25), pt(c.x + Math.cos(a) * len, c.y + Math.sin(a) * len)], 0.7, ASTER.ink, 0.85);
    if (hash(k, 2, 970) > 0.5) d.pen.dot(c.x + Math.cos(a) * len, c.y + Math.sin(a) * len, 0.7, ASTER.ink, 0.85);
  }
  d.pen.dot(c.x, c.y, 0.9, ASTER.ink, 0.85);
}

/** The furrow it ploughed: a churned bank of peat along the ground, highest by the wreck, clods turned up along it. */
function furrow(d: Draw): void {
  const bank = [pt(-112, 1), ...cub(pt(-100, 0), pt(-70, -4), pt(-40, -6), pt(-22, -5), 10), pt(-22, 1)];
  paint(d, bank, mix(PEAT, SHADOW, 0.25), { alpha: 0.95, shadow: 0.5, hatch: 0.3, line: 0.5 });
  for (let k = 0; k < 14; k++) {
    const x = -108 + k * 6.4 + hash(k, 1, 900) * 3;
    const r = 1.4 + hash(k, 2, 900) * (1.2 + (x + 112) / 50);
    paint(d, oval(x, -r * 0.55, r, r * 0.7, 9), PEAT, { alpha: 0.95, shadow: 0.55, hatch: 0, line: 0.45 });
  }
}

/** A petal torn off in the crash, lying in the furrow. */
function lostPetal(d: Draw, x: number, tilt: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(x, -1);
  ctx.rotate(tilt);
  petal(d, pt(-6, 0), 0, 13, true);
  ctx.restore();
}

/** A small cap grown on the wreck: a water bladder on root-legs, as Mycel's caps are. */
function cap(d: Draw, at: Pt, r: number, k: number): void {
  const skins = ['#b65a93', '#8f62b8', '#4f9a96', '#d09a4c'] as const;
  for (const s of [-1, 1]) d.pen.stroke([pt(at.x + s * r * 0.2, at.y - r * 0.7), pt(at.x + s * r * 0.75, at.y - r * 0.35), pt(at.x + s * r * 0.9, at.y)], r * 0.18, mix(skins[k % 4]!, '#efe4cf', 0.5), 1, false);
  const sac = oval(at.x, at.y - r * 1.2, r * 0.7, r * 0.75, 14);
  paint(d, sac, skins[k % 4]!, { alpha: 0.85, shadow: 0.45, hatch: 0, line: 0.5, gloss: true });
  d.pen.stroke([pt(at.x, at.y - r * 1.9), pt(at.x, at.y - r * 2.3)], r * 0.16, skins[k % 4]!, 1, false);
  d.pen.dot(at.x, at.y - r * 2.35, r * 0.13, '#8ff0d8', 1);
}

/** Threads of mycelium climbing it: fine white lines wandering up from the ground and over the shell. */
function threads(d: Draw): void {
  for (let k = 0; k < 9; k++) {
    let x = -30 + k * 7.5 + hash(k, 3, 910) * 4;
    let y = -36;
    const pts: Pt[] = [pt(x, y)];
    const steps = 3 + Math.floor(hash(k, 4, 910) * 5);
    for (let i = 0; i < steps; i++) {
      x += (hash(k, i, 920) - 0.5) * 9;
      y -= 5 + hash(k, i, 930) * 7;
      pts.push(pt(x, y));
    }
    d.pen.hair(pts, 0.55, THREAD, 0.75);
    const from = pts[Math.min(2, pts.length - 1)]!;
    d.pen.hair([from, pt(from.x + (hash(k, 5, 910) - 0.5) * 12, from.y - 6)], 0.4, THREAD, 0.6);
  }
}

/** The heap of peat it pushed up as it stopped, over its feet. */
function heap(d: Draw): void {
  const mound = [pt(-36, 2), ...cub(pt(-36, 0), pt(-24, -8), pt(-6, -5), pt(10, -10), 8), ...cub(pt(10, -10), pt(28, -20), pt(50, -17), pt(64, -7), 10), pt(86, 0), pt(86, 3)];
  paint(d, mound, PEAT, { alpha: 1, shadow: 0.55, hatch: 0.22, line: 0.7 });
  d.pen.clipped(mound, () => {
    for (let k = 0; k < 22; k++) dab(d, oval(-30 + hash(k, 6, 940) * 110, -16 + hash(k, 7, 940) * 18, 1.6, 1, 8), mix(PEAT, SHADOW, 0.4), 0.35, 0.4);
  });
  edge(d, mound.slice(1, -2), 0.9, 0.85);
}

/** The Aster lander as it lies in the swamp. */
export function drawAsterWreck(d: Draw): void {
  const { ctx } = d.pen;
  furrow(d);
  lostPetal(d, -88, 0.25);
  lostPetal(d, -54, -0.4);
  ctx.save();
  ctx.translate(SINK.x, SINK.y);
  ctx.rotate(TIP);
  // The far claw first, then the petals under the hull, the hull, and the near claws.
  claw(d, pt(4, -44), pt(18, -66), pt(24, -8), true);
  for (const [i, a] of [2.0, 1.75, 1.4, 1.15].entries()) petal(d, pt(-12 + i * 8, -38), a, 18, i === 2);
  const hull = hullShape();
  paint(d, hull, ASTER.shell, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 1, gloss: true });
  // The lilac glaze pooled low on the shell, as glaze runs in the kiln.
  d.pen.clipped(hull, () => dab(d, oval(0, -42, 46, 22, 20), ASTER.glaze, 0.55, 3));
  ribs(d, hull);
  windows(d);
  rosette(d, pt(-22, -88), 6);
  split(d);
  edge(d, hull, 1.2, 0.95);
  crown(d);
  claw(d, pt(-22, -44), pt(-42, -66), pt(-54, -4), false);
  // The near right claw folded under it in the crash.
  claw(d, pt(22, -42), pt(40, -44), pt(32, -14), false);
  threads(d);
  ctx.restore();
  // Nothing below the ground line: the ground itself is the world's.
  ctx.clearRect(-ASTER_WRECK.ox, 1, ASTER_WRECK.w, ASTER_WRECK.h);
  heap(d);
  for (const [i, at] of [pt(-16, -6), pt(30, -19), pt(40, -19.5), pt(72, -3)].entries()) cap(d, at, 3 + hash(i, 9, 950) * 1.6, i + 1);
}

/** The beacon's light, lit: a teal glow round its bead (drawn on its own canvas for the scene to pulse). */
export function drawAsterBeam(ctx: CanvasRenderingContext2D, r: number): void {
  glow(ctx, pt(0, 0), r, ASTER.glow, 0.9);
  glow(ctx, pt(0, 0), r * 0.35, '#e9fff8', 1);
}
