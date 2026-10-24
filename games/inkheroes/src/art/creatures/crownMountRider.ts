import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, gleam, limb, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { HORSE } from './crownMountHorse';

/**
 * A Crown rider's parts and the horse's tack, shared by the Lancer and the
 * hero: saddle and saddle cloth, bridle and reins, and a rider sitting tall
 * on the horse (crownMountHorse.ts's seat) with heroic proportions: thigh
 * and shin about 13 units, torso 18, head 8. Drawn back to front: saddle,
 * leg, torso, then whatever the near arm holds, then the arm and the head.
 */
export const STEEL = '#a7b2c1';
export const GOLD = '#c99a2e';
export const LEATHER = '#7a4a2a';
export const CROWN_BLUE = '#2f55a8';

/** The rider's joints. */
export const RIDER = {
  hip: pt(-4.6, -54),
  knee: pt(5, -45.6),
  ankle: pt(4, -31.4),
  shoulder: pt(-2.6, -70.4),
  neck: pt(-1.2, -73),
  head: pt(0.2, -77.6),
  /** Where the far hand holds the reins, over the pommel. */
  reinHand: pt(6, -58.6),
} as const;

/** Saddle cloth (in `cloth`, edged in `trim`), the saddle and its girth. */
export function saddle(d: Draw, cloth: string, trim: string, war: boolean, withPad = true): void {
  const { pen } = d;
  if (withPad) clothPad(d, cloth, trim);
  const lift = war ? 3 : 0;
  const tree = shapeOf([[-14.6, -53.4 - lift], [-12.4, -57.4 - lift], [-10.6, -52.6], [-2, -50.6], [3.2, -52.4], [4.6, -56 - lift], [6.6, -55 - lift], [6, -50], [3, -47.4], [-11, -47.6], [-14.4, -49.6]], 4);
  paint(d, tree, LEATHER, { shadow: 0.5, hatch: 0.16, line: 0.6 });
  gleam(d, lineOf([[-13.4, -55.6 - lift], [-11.6, -53.8]]), 0.6, 0.55);
  pen.hair(lineOf([[-11, -48.6], [-2, -48.8], [5, -49.6]]), 0.35, GOLD, 0.8);
}

function clothPad(d: Draw, cloth: string, trim: string): void {
  const { pen } = d;
  const pad = shapeOf([[-16, -51.6], [-6, -49.8], [5.4, -51.8], [7, -46], [6.4, -40.6], [-4, -39.6], [-15.4, -40.6], [-17, -46]], 4);
  paint(d, pad, cloth, { shadow: 0.55, hatch: 0.18, line: 0.6 });
  const hem = lineOf([[-16.8, -42.6], [-15.2, -41.2], [-4, -40.2], [6.2, -41.2], [6.9, -43]]);
  pen.stroke(hem, 1.3, trim, 0.95, false);
  pen.hair(hem.map((p) => pt(p.x, p.y - 1.2)), 0.3, d.ink, 0.6);
  // Girth strap under the belly.
  paint(d, shapeOf([[1.8, -38], [4.6, -38], [5.2, -28], [2.4, -27.6]], 3), LEATHER, { shadow: 0.4, hatch: 0, line: 0.45 });
}

/** The bridle's headstall: cheekpiece, browband and noseband (head coordinates). */
export function headstall(d: Draw, strap: string): void {
  const { pen } = d;
  const s = (xy: readonly (readonly [number, number])[], w = 0.95): void => {
    pen.stroke(lineOf(xy), w + 0.5, d.ink, 0.9, false);
    pen.stroke(lineOf(xy), w, strap, 1, false);
  };
  s([[26.2, -73.4], [27, -66], [28.6, -59], [31.6, -53.4]]);
  s([[25.4, -71.2], [28.2, -70.4], [29.8, -69]], 0.8);
  s([[31.2, -58.6], [33.6, -57.6], [36, -56.8]], 0.9);
}

/** Reins: a slack curve from the bit ring (`bit`, where the head has put it) back to the rider's hand, and the ring. */
export function reins(d: Draw, bit: Pt, hand: Pt): void {
  const { pen } = d;
  const along = (u: number, sag: number): [number, number] => [bit.x + (hand.x - bit.x) * u, bit.y + (hand.y - bit.y) * u + sag];
  pen.stroke(lineOf([[bit.x, bit.y], along(0.35, 2.6), along(0.7, 1.2), [hand.x, hand.y]]), 0.7, d.ink, 0.9, false);
  pen.dot(bit.x - 0.2, bit.y - 0.4, 1, GOLD);
  pen.hair(lineOf([[bit.x - 0.9, bit.y - 0.9], [bit.x + 0.5, bit.y - 1.2]]), 0.3, '#fff2d8', 0.8);
}

/**
 * The near leg along the horse's side: a stirrup leather, then thigh, knee,
 * shin and foot in the stirrup. Plate (cuisse, knee cop, greave, pointed
 * sabaton) or cloth breeches and a riding boot.
 */
export function riderLeg(d: Draw, plate: boolean, thighColour: string): void {
  const { pen } = d;
  const { hip, knee, ankle } = RIDER;
  pen.stroke(lineOf([[-3, -50], [1.2, -40], [4, -31]]), 1.4, d.ink, 0.9, false);
  pen.stroke(lineOf([[-3, -50], [1.2, -40], [4, -31]]), 0.9, LEATHER, 1, false);
  const thigh = limb([[hip.x - 1, hip.y - 0.4, 8.6], [0.6, -49.6, 7.6], [knee.x, knee.y, 6]]);
  paint(d, thigh.shape, thighColour, { shadow: 0.5, hatch: 0.18, line: 0.6, gloss: plate });
  const shinColour = plate ? STEEL : '#4a3426';
  const shin = limb([[knee.x, knee.y, 5.6], [4.9, -39, 5.2], [ankle.x, ankle.y, 4]]);
  paint(d, shin.shape, shinColour, { shadow: 0.5, hatch: 0.16, line: 0.6, gloss: true });
  const foot = plate
    ? shapeOf([[1.8, -33.4], [5.8, -33], [10.4, -30.2], [12, -28.6], [6.4, -28.6], [2, -29]], 3)
    : shapeOf([[1.8, -33.2], [5.6, -33], [9.4, -30.6], [10, -28.8], [6, -28.4], [2, -28.8]], 3);
  paint(d, foot, shinColour, { shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  // The stirrup iron round the ball of the foot.
  pen.stroke(lineOf([[3.6, -31.4], [3.2, -28], [8.8, -27.6], [8.2, -30.6]]), 0.9, d.ink, 0.95, false);
  pen.stroke(lineOf([[3.6, -31.4], [3.2, -28], [8.8, -27.6]]), 0.5, '#d9dee6', 0.9, false);
  if (plate) {
    const cop = shapeOf([[knee.x - 2.6, knee.y - 1.6], [knee.x + 0.8, knee.y - 2.8], [knee.x + 3.2, knee.y - 0.4], [knee.x + 1.6, knee.y + 2.6], [knee.x - 1.8, knee.y + 2]], 4);
    paint(d, cop, STEEL, { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
    pen.dot(knee.x + 0.4, knee.y - 0.2, 0.6, GOLD);
    gleam(d, lineOf([[4.2, -42], [4, -34.4]]), 0.6, 0.7);
    for (const y of [-51.4, -48.4]) pen.hair(lineOf([[-4 + (y + 51.4), y - 3.4], [1.4 + (y + 51.4) * 0.6, y + 0.6]]), 0.35, d.ink, 0.5);
  } else {
    pen.hair(lineOf([[2.8, -41], [7.2, -41.6]]), 0.45, d.ink, 0.7);
    gleam(d, lineOf([[4, -40], [3.8, -34]]), 0.55, 0.55);
  }
}

/**
 * The torso: the skirt over the hips (surcoat or tassets in `skirt`), a
 * breastplate with its ridge lit, a gold belt, and a pauldron.
 */
export function riderTorso(d: Draw, skirt: string, trim: string): Pt[] {
  const { pen } = d;
  const fauld = shapeOf([[-9.6, -59], [2.6, -59], [5.6, -52], [4.4, -48.4], [-4, -49.6], [-11.2, -49.4], [-12, -53]], 4);
  paint(d, fauld, skirt, { shadow: 0.5, hatch: 0.18, line: 0.6 });
  pen.stroke(lineOf([[-11.6, -50.2], [-4, -50.4], [4.6, -49.2]]), 0.9, trim, 0.95, false);
  for (const x of [-6, -1, 3]) pen.hair(lineOf([[x - 0.4, -58], [x, -54], [x + 0.6, -50.6]]), 0.35, mix(skirt, SHADOW, 0.6), 0.7);
  const plate = shapeOf([[-8.2, -58.6], [-8.8, -64.4], [-7.4, -69.8], [-4.8, -72.6], [-0.8, -73.2], [2.6, -71.4], [4.8, -66.4], [4.4, -61.4], [2.8, -58.4]], 5);
  paint(d, plate, STEEL, { shadow: 0.55, hatch: 0.2, line: 0.65, gloss: true, lit: pt(0.55, 0.3) });
  // The breastplate's medial ridge and a gold edge at the neck.
  pen.hair(lineOf([[2.2, -71.6], [4.2, -66.2], [3.4, -60]]), 0.45, d.ink, 0.55);
  gleam(d, lineOf([[1.2, -70.6], [3, -66.2], [2.4, -61.4]]), 0.8, 0.85);
  pen.stroke(lineOf([[-4.6, -72.4], [-0.8, -73], [2.4, -71.2]]), 0.7, GOLD, 0.95, false);
  // The belt.
  paint(d, shapeOf([[-9, -60.2], [3.6, -60.4], [3.4, -58], [-9, -57.8]], 3), LEATHER, { shadow: 0.3, hatch: 0, line: 0.45 });
  pen.dot(2.2, -59.2, 0.9, GOLD);
  return plate;
}

/** A layered pauldron over the near shoulder. */
export function pauldron(d: Draw, at: Pt, colour = STEEL): void {
  for (const [dy, rx, ry] of [[3.6, 4.2, 2.6], [1.8, 4.6, 2.8], [0, 4.6, 3.6]] as const) {
    const lame = shapeOf([[at.x - rx, at.y + dy], [at.x - rx * 0.4, at.y + dy - ry], [at.x + rx * 0.6, at.y + dy - ry * 0.9], [at.x + rx, at.y + dy + 0.4], [at.x, at.y + dy + ry * 0.55]], 4);
    paint(d, lame, colour, { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
  }
  gleam(d, lineOf([[at.x - 2.6, at.y - 1.6], [at.x + 0.4, at.y - 3]]), 0.7, 0.8);
  d.pen.dot(at.x + 1, at.y - 0.6, 0.55, GOLD);
}

/** An armoured arm: upper arm from the shoulder, forearm to the wrist, and a gauntlet fist. */
export function plateArm(d: Draw, shoulder: Pt, elbow: Pt, wrist: Pt, colour = STEEL): void {
  const upper = limb([[shoulder.x, shoulder.y, 4.6], [elbow.x, elbow.y, 3.8]]);
  paint(d, upper.shape, colour, { shadow: 0.5, hatch: 0.16, line: 0.6, gloss: true });
  const fore = limb([[elbow.x, elbow.y, 4], [wrist.x, wrist.y, 3.4]]);
  paint(d, fore.shape, colour, { shadow: 0.5, hatch: 0.16, line: 0.6, gloss: true });
  const cop = shapeOf([[elbow.x - 2.2, elbow.y - 1], [elbow.x, elbow.y - 2.4], [elbow.x + 2, elbow.y], [elbow.x, elbow.y + 2.2]], 4);
  paint(d, cop, colour, { shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
  gleam(d, [pt(elbow.x + (wrist.x - elbow.x) * 0.2, elbow.y + (wrist.y - elbow.y) * 0.2 - 1), pt(elbow.x + (wrist.x - elbow.x) * 0.75, elbow.y + (wrist.y - elbow.y) * 0.75 - 1)], 0.6, 0.7);
}

/** Where the elbow goes for a hand at `wrist`: the arm's two bones kept their length, the elbow bent down and out. */
export function elbowFor(shoulder: Pt, wrist: Pt, upper = 8.9, fore = 13.1): Pt {
  const [dx, dy] = [wrist.x - shoulder.x, wrist.y - shoulder.y];
  const d = Math.max(Math.abs(upper - fore) + 0.01, Math.min(upper + fore - 0.01, Math.hypot(dx, dy)));
  const a = Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - fore * fore) / (2 * upper * d))));
  const base = Math.atan2(dy, dx) + a;
  return pt(shoulder.x + Math.cos(base) * upper, shoulder.y + Math.sin(base) * upper);
}

/** A gauntleted fist round a shaft at `at`. */
export function fist(d: Draw, at: Pt, colour = STEEL): void {
  const shape = shapeOf([[at.x - 2.4, at.y - 1.4], [at.x + 0.4, at.y - 2.6], [at.x + 2.6, at.y - 1], [at.x + 2.4, at.y + 1.8], [at.x - 0.4, at.y + 2.4], [at.x - 2.6, at.y + 1]], 4);
  paint(d, shape, colour, { shadow: 0.5, hatch: 0, line: 0.6, gloss: true });
  for (const k of [-0.8, 0.4]) d.pen.hair([pt(at.x - 1.2, at.y + k), pt(at.x + 1.8, at.y + k + 0.3)], 0.3, d.ink, 0.6);
}

/** Scale applied to the rider about the seat: heroic proportions on a real-sized horse. */
export const RIDER_SCALE = 1.15;

/** Where a point of the rider's drawing lands once the rider is scaled. */
export function onRider(p: Pt): Pt {
  const s = HORSE.seat;
  return pt(s.x + (p.x - s.x) * RIDER_SCALE, s.y + (p.y - s.y) * RIDER_SCALE);
}

/** The rider's drawing point that lands at `p` once scaled (onRider undone). */
export function offRider(p: Pt): Pt {
  const s = HORSE.seat;
  return pt(s.x + (p.x - s.x) / RIDER_SCALE, s.y + (p.y - s.y) / RIDER_SCALE);
}

/** Runs `draw` with the rider's scale about the seat. */
export function asRider(d: Draw, draw: () => void): void {
  const { ctx } = d.pen;
  const s = HORSE.seat;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(RIDER_SCALE, RIDER_SCALE);
  ctx.translate(-s.x, -s.y);
  draw();
  ctx.restore();
}

/** Shadow cast by the rider onto the horse's side under the leg. */
export function legShadow(d: Draw, body: readonly Pt[]): void {
  d.pen.clipped(body, () => dab(d, shapeOf([[-2, -48], [8, -45], [9, -32], [4, -28], [1, -40]]), SHADOW, 0.22, 1.8));
}
