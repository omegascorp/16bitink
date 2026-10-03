import { INK, type Pt } from './pen';
import { barnacle, clip, type Draw, drift, frame, hair, ink, iron, lerp, oval, paint, PAPER_FILL, pt, puff, qb, ring, rotOval, S, SHADOW, TAU, WOOD } from './decorKit';

/**
 * The sunken pirate ship: the landmark of every shipwreck level and of its
 * chapter on the map. A galleon settled on the sand, bow raised, half
 * buried: a tall stern castle with gallery windows, gun ports with cannons
 * still run out, a hole stove in its side, snapped masts with a tattered
 * Jolly Roger, and its treasure chest burst open in the sand. Same canvas
 * contract as decorArt.ts.
 */
export const SHIPWRECK_SIZE = { w: 440, h: 260 } as const;

const HULL = '#6f5843';
const DARK_WOOD = '#3a2c22';
const HOLD = '#211a1c';
const GOLD = '#d9b44a';
const WEED = '#5c7a48';
/** Bow-up list of the hull as it settled, radians. */
const LIST = -0.045;

/** Rotates a local point by the ship's list, about its keel. */
const tl = (p: Pt): Pt => pt(p.x * Math.cos(LIST) - (p.y + 10) * Math.sin(LIST), p.x * Math.sin(LIST) + (p.y + 10) * Math.cos(LIST) - 10);
const T = (pts: readonly Pt[]): Pt[] => pts.map(tl);

function hullOutline(): Pt[] {
  return T([
    pt(-182, -30), pt(-196, -100), pt(-210, -174),
    pt(-122, -174), pt(-120, -104),
    ...qb(pt(-118, -104), pt(0, -98), pt(104, -112), 14).slice(1),
    pt(108, -134), pt(166, -138),
    ...qb(pt(166, -138), pt(190, -80), pt(150, -24), 12).slice(1),
    ...qb(pt(150, -24), pt(0, -2), pt(-182, -30), 16).slice(1, -1),
  ]);
}

function shipwreck(d: Draw): void {
  const outline = hullOutline();
  puff(d, 0, -4, 215, 10, SHADOW, 0.5);
  masts(d);
  paint(d, outline, HULL, 0.55);
  clip(d, outline, () => {
    planking(d);
    sternCastle(d);
    gunPorts(d);
    d.pen.hatch(d.L(outline), 2.6 * S, 1.15, 0.45 * S, { alpha: 0.4, onlyBelow: d.P(0, -50).y });
    hole(d);
  });
  ink(d, outline, 2);
  rails(d);
  bow(d);
  crust(d);
  rigging(d);
  drift(d, -218, 200, -1, 30);
  treasure(d, 70, -6);
  drift(d, -110, -10, -1, 14);
}

/** Planks following the sheer, with two heavy wales and staggered butt joints. */
function planking(d: Draw): void {
  const { rng } = d;
  const strake = (y: number): Pt[] => T(qb(pt(-215, y + 4), pt(0, y + 8), pt(200, y - 14), 20));
  for (let y = -16; y > -180; y -= 9) {
    const line = strake(y);
    hair(d, line, 0.55, 0.6);
    for (let i = 1 + Math.floor(rng() * 4); i < line.length - 1; i += 4 + Math.floor(rng() * 3)) {
      hair(d, [line[i]!, tl(pt(line[i]!.x, line[i]!.y - 9))], 0.45, 0.5);
    }
  }
  for (const y of [-58, -92]) {
    d.pen.stroke(d.L(strake(y)), 4.2 * S, DARK_WOOD, 0.85, false);
    hair(d, strake(y - 2.5), 0.5, 0.55, PAPER_FILL);
  }
}

/** The stern castle: a gallery of windows under carved scrollwork. */
function sternCastle(d: Draw): void {
  for (let i = 0; i < 4; i++) {
    const x = -200 + i * 18;
    const win = T([pt(x, -128), pt(x, -146), ...qb(pt(x, -146), pt(x + 6, -156), pt(x + 12, -146), 6).slice(1), pt(x + 12, -128)]);
    d.pen.fill(d.L(win), HOLD, 0.8);
    ink(d, [...win, win[0]!], 0.9);
    hair(d, T([pt(x + 6, -150), pt(x + 6, -128)]), 0.5, 0.7, PAPER_FILL);
  }
  // Scrollwork band above the gallery and a balcony rail below it.
  for (let i = 0; i < 6; i++) {
    const x = -205 + i * 14;
    hair(d, T(oval(x + 7, -162, 6, 3.4, 10, Math.PI, TAU * 0.98)), 0.6, 0.8);
  }
  d.pen.stroke(d.L(T([pt(-212, -124), pt(-124, -124)])), 2.4 * S, DARK_WOOD, 0.9, false);
  for (let x = -208; x < -126; x += 7) hair(d, T([pt(x, -124), pt(x, -116)]), 0.6, 0.8);
}

/** A row of gun ports: some with a cannon still run out, some lids hanging, some dark. */
function gunPorts(d: Draw): void {
  [-96, -58, 26, 64, 100].forEach((x, i) => {
    const port = T([pt(x - 6, -80), pt(x + 6, -80), pt(x + 6, -70), pt(x - 6, -70)]);
    d.pen.fill(d.L(port), HOLD, 0.9);
    ink(d, [...port, port[0]!], 0.9);
    if (i % 2 === 0) {
      // A cannon muzzle poking out.
      iron(d, T(rotOval(x + 2, -75, 5, 3.2, 0, 12)), 0.8);
      d.pen.fill(d.L(T(oval(x + 2, -75, 1.6, 1.6, 8))), INK, 0.9);
    } else {
      // The lid, hanging from one hinge.
      const lid = T([pt(x - 6, -70), pt(x + 6, -70), pt(x + 9, -60), pt(x - 3, -60)]);
      paint(d, lid, WOOD, 0.75);
      ink(d, [...lid, lid[0]!], 0.8);
    }
  });
}

/** The hole stove in the side: dark hold, ribs showing, splintered plank ends. */
function hole(d: Draw): void {
  const { rng } = d;
  const c = pt(-22, -40);
  const rim: Pt[] = [];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * TAU;
    const r = 0.78 + rng() * 0.4 + (k % 3 === 0 ? 0.18 : 0);
    rim.push(tl(pt(c.x + Math.cos(a) * 32 * r, c.y + Math.sin(a) * 17 * r)));
  }
  d.pen.fill(d.L(rim), HOLD, 0.92);
  clip(d, rim, () => {
    for (let x = -54; x <= 12; x += 9) hair(d, T(qb(pt(x, -64), pt(x - 4, -40), pt(x + 2, -18), 8)), 2.2, 0.55, '#8a7766');
    // A barrel rolled against the ribs.
    const barrel = T(oval(-8, -30, 7, 9, 14));
    paint(d, barrel, WOOD, 0.6);
    ring(d, barrel, 0.7);
    hair(d, T([pt(-15, -33), pt(-1, -33)]), 0.6, 0.8);
  });
  ink(d, [...rim, rim[0]!], 1.2);
  for (let k = 0; k < rim.length; k += 3) {
    const p = rim[k]!;
    const inward = pt(tl(c).x - p.x, tl(c).y - p.y);
    const len = 0.12 + rng() * 0.14;
    hair(d, [p, pt(p.x + inward.x * len, p.y + inward.y * len)], 0.9, 0.9);
  }
}

/** Rails along the waist and the forecastle, one section broken away. */
function rails(d: Draw): void {
  const waist = T(qb(pt(-118, -104), pt(0, -98), pt(104, -112), 14));
  waist.forEach((p, i) => i % 2 === 0 && hair(d, [p, pt(p.x, p.y - 10)], 1, 0.9));
  ink(d, waist.slice(0, 7).map((p) => pt(p.x, p.y - 10)), 1);
  ink(d, waist.slice(10).map((p) => pt(p.x, p.y - 10)), 1);
  hair(d, [pt(waist[7]!.x, waist[7]!.y - 10), pt(waist[7]!.x + 9, waist[7]!.y - 2)], 1, 0.9);
  const fore = T([pt(110, -134), pt(166, -138)]);
  for (let k = 0; k <= 4; k++) {
    const p = pt(lerp(fore[0]!.x, fore[1]!.x, k / 4), lerp(fore[0]!.y, fore[1]!.y, k / 4));
    hair(d, [p, pt(p.x, p.y - 9)], 1, 0.9);
  }
  ink(d, fore.map((p) => pt(p.x, p.y - 9)), 1);
  // The stern lantern on its post, leaning.
  const post = tl(pt(-196, -174));
  const top = pt(post.x + 5, post.y - 14);
  hair(d, [post, top], 1.4, 0.9);
  const cage = rotOval(top.x + 1, top.y - 4, 3.6, 5, 0.3, 10);
  paint(d, cage, '#c9a23a', 0.5);
  ring(d, cage, 0.8);
}

/** Bowsprit, a carved figurehead under it, and the anchor chain hanging from the hawse hole. */
function bow(d: Draw): void {
  const root = tl(pt(160, -134));
  const tip = tl(pt(216, -166));
  d.pen.stroke(d.L([root, tip]), 3.6 * S, DARK_WOOD, 1, false);
  hair(d, [pt(root.x, root.y - 1.5), pt(tip.x, tip.y - 1.5)], 0.6, 0.6, PAPER_FILL);
  // Figurehead: a weathered carved maiden leaning out under the bowsprit.
  const head = tl(pt(184, -120));
  const body = [tl(pt(170, -112)), ...qb(tl(pt(174, -118)), tl(pt(180, -132)), head, 6), tl(pt(186, -112)), tl(pt(176, -100))];
  paint(d, body, '#c9b48a', 0.75);
  ink(d, [...body, body[0]!], 0.9);
  const face = oval(head.x + 1, head.y - 3, 3.4, 3.8, 10);
  paint(d, face, '#c9b48a', 0.75);
  ring(d, face, 0.8);
  hair(d, qb(pt(head.x - 2, head.y - 6), pt(head.x - 10, head.y), pt(head.x - 8, head.y + 10), 6), 0.6, 0.8);
  // Hawse hole and the anchor chain sagging into the sand.
  const hawse = tl(pt(138, -98));
  ring(d, oval(hawse.x, hawse.y, 3, 3, 10), 1);
  const chain = qb(hawse, pt(hawse.x + 30, hawse.y + 50), pt(hawse.x + 46, -4), 18);
  chain.forEach((p, i) => ring(d, rotOval(p.x, p.y, i % 2 ? 2.6 : 1.6, i % 2 ? 1.6 : 2.6, 0.8, 10), 0.7));
}

/** The masts, snapped; the main still flies a tattered Jolly Roger. */
function masts(d: Draw): void {
  spar(d, tl(pt(-24, -100)), tl(pt(-34, -238)), 4.2);
  spar(d, tl(pt(96, -108)), tl(pt(90, -172)), 3.6);
  // A yard still lashed to the mainmast, hanging askew.
  const yc = tl(pt(-31, -196));
  d.pen.stroke(d.L([pt(yc.x - 50, yc.y - 12), pt(yc.x + 56, yc.y + 14)]), 2.6 * S, DARK_WOOD, 1, false);
  flag(d, tl(pt(-33, -230)));
}

function spar(d: Draw, foot: Pt, top: Pt, w: number): void {
  const breakLine = [pt(top.x - w * 0.6, top.y + 4), pt(top.x - w * 0.2, top.y - 4), pt(top.x + w * 0.1, top.y + 2), pt(top.x + w * 0.5, top.y - 6), pt(top.x + w * 0.7, top.y)];
  const shape = [pt(foot.x - w, foot.y + 6), ...breakLine, pt(foot.x + w, foot.y + 6)];
  paint(d, shape, WOOD, 0.8);
  ink(d, shape, 1.3);
  for (let k = 1; k < 8; k++) {
    const p = pt(lerp(foot.x, top.x, k / 8), lerp(foot.y, top.y, k / 8));
    hair(d, [pt(p.x - w * 0.8, p.y), pt(p.x + w * 0.8, p.y - 1)], 0.4, 0.5);
  }
}

/** A black flag, torn at the fly, with a skull and crossbones. */
function flag(d: Draw, at: Pt): void {
  const { rng } = d;
  const fly: Pt[] = [];
  for (let k = 0; k <= 8; k++) fly.push(pt(at.x + 54 + (k % 2 ? -8 - rng() * 8 : rng() * 3), at.y + 8 + k * 4.2 + Math.sin(k) * 2));
  const cloth = [pt(at.x + 3, at.y), ...qb(pt(at.x + 3, at.y), pt(at.x + 30, at.y + 6), pt(at.x + 54, at.y + 6), 8).slice(1), ...fly, pt(at.x + 3, at.y + 40)];
  d.pen.fill(d.L(cloth), '#1d1a1e', 0.92);
  ink(d, [...cloth, cloth[0]!], 0.9);
  // Holes worn through the cloth.
  for (let i = 0; i < 3; i++) d.pen.fill(d.L(oval(at.x + 14 + rng() * 30, at.y + 10 + rng() * 26, 1.6 + rng() * 1.6, 1.2 + rng(), 8)), PAPER_FILL, 0.35);
  const c = pt(at.x + 26, at.y + 20);
  const skull = oval(c.x, c.y - 2, 6, 5.4, 14);
  d.pen.fill(d.L(skull), '#efe6d2', 0.95);
  d.pen.fill(d.L([pt(c.x - 3.4, c.y + 2), pt(c.x + 3.4, c.y + 2), pt(c.x + 2.6, c.y + 6), pt(c.x - 2.6, c.y + 6)]), '#efe6d2', 0.95);
  for (const s of [-1, 1]) d.pen.fill(d.L(oval(c.x + s * 2.2, c.y - 2, 1.4, 1.6, 8)), '#1d1a1e', 1);
  for (const s of [-1, 1]) d.pen.stroke(d.L([pt(c.x - 10, c.y + 8 + s * 4), pt(c.x + 10, c.y + 8 - s * 4)]), 1.8 * S, '#efe6d2', 0.95, false);
}

/** Shrouds with ratlines up the mainmast, and the stays, one taut, one slack. */
function rigging(d: Draw): void {
  const top = tl(pt(-32, -214));
  const feet = [tl(pt(-70, -104)), tl(pt(-58, -104)), tl(pt(-46, -103))];
  for (const f of feet) hair(d, [f, top], 0.55, 0.75);
  for (let k = 1; k < 9; k++) {
    const t = k / 10;
    const a = pt(lerp(feet[0]!.x, top.x, t), lerp(feet[0]!.y, top.y, t));
    const b = pt(lerp(feet[2]!.x, top.x, t), lerp(feet[2]!.y, top.y, t));
    hair(d, [a, b], 0.45, 0.65);
  }
  hair(d, [tl(pt(-33, -224)), tl(pt(214, -164))], 0.6, 0.75);
  hair(d, qb(tl(pt(-34, -220)), pt(-140, -150), tl(pt(-200, -176)), 14), 0.6, 0.65);
  hair(d, [tl(pt(91, -166)), tl(pt(200, -156))], 0.55, 0.7);
}

/** Barnacles low on the hull and weed growing up off the deck. */
function crust(d: Draw): void {
  const { rng } = d;
  for (let i = 0; i < 22; i++) {
    const p = tl(pt(-180 + rng() * 330, -14 - rng() * 36));
    barnacle(d, p.x, p.y, 1.5 + rng() * 1.8);
  }
  for (let i = 0; i < 5; i++) weed(d, tl(pt(-110 + i * 45, -104 - (i === 4 ? 8 : 0))), 18 + rng() * 22, rng() * TAU);
}

function weed(d: Draw, root: Pt, height: number, phase: number): void {
  const stem = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return pt(root.x + Math.sin(u * 4 + phase) * 4 * u, root.y - u * height);
  });
  d.pen.stroke(d.L(stem), 1.4 * S, WEED, 0.85, false);
  stem.forEach((p, i) => {
    if (i < 2 || i % 2) return;
    const s = i % 4 ? 1 : -1;
    const leaf = oval(p.x + s * 3, p.y, 3, 1.4, 8);
    d.pen.fill(d.L(leaf), WEED, 0.55);
    hair(d, leaf, 0.4, 0.7, INK);
  });
}

/** The treasure chest, burst open in the sand, gold spilling out. */
function treasure(d: Draw, x: number, g: number): void {
  const { rng } = d;
  const box = [pt(x - 17, g), pt(x + 17, g), pt(x + 17, g - 16), pt(x - 17, g - 16)];
  // The lid thrown back on its hinges.
  const lid = [pt(x - 17, g - 16), pt(x + 17, g - 16), pt(x + 22, g - 30), pt(x - 10, g - 34)];
  paint(d, lid, WOOD, 0.7);
  ink(d, [...lid, lid[0]!], 1);
  hair(d, [pt(x - 13, g - 24), pt(x + 19, g - 22)], 1.2, 0.8, DARK_WOOD);
  // Heaped coins, then the box front over them.
  for (let i = 0; i < 26; i++) {
    const c = pt(x - 14 + rng() * 28, g - 15 - rng() * 7 * (1 - Math.abs(rng() - 0.5)));
    coin(d, c);
  }
  paint(d, box, WOOD, 0.75);
  ink(d, [...box, box[0]!], 1.1);
  for (const bx of [x - 11, x + 11]) d.pen.stroke(d.L([pt(bx, g), pt(bx, g - 16)]), 1.8 * S, '#5a4c43', 0.9, false);
  d.pen.fill(d.L(oval(x, g - 9, 2.6, 3, 10)), GOLD, 0.9);
  ring(d, oval(x, g - 9, 2.6, 3, 10), 0.7);
  // Coins spilled over the sand.
  for (let i = 0; i < 9; i++) coin(d, pt(x + 18 + rng() * 34, g - 1 - rng() * 2));
  for (let i = 0; i < 2; i++) {
    const c = pt(x + 22 + i * 14, g - 3);
    const rim = rotOval(c.x, c.y, 3.2, 1.2, 0.2 * i, 10);
    d.pen.fill(d.L(rim), GOLD, 0.85);
    ring(d, rim, 0.6);
  }
}

function coin(d: Draw, c: Pt): void {
  const face = oval(c.x, c.y, 2.4, 1.6, 10);
  d.pen.fill(d.L(face), GOLD, 0.95);
  ring(d, face, 0.5);
  hair(d, [pt(c.x - 1, c.y - 0.4), pt(c.x + 0.6, c.y - 0.8)], 0.4, 0.8, PAPER_FILL);
}

/** Draws the sunken ship into a canvas of SHIPWRECK_SIZE times ART_RES. */
export function drawShipwreck(ctx: CanvasRenderingContext2D, seed: number): void {
  shipwreck(frame(ctx, seed, false));
}
