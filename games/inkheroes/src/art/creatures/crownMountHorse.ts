import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, gleam, LIGHT, limb, lineOf, mix, paint, shapeOf, SHADOW, type Joint } from './crownElitePaint';
import { apply, mapXY, type LegPose, type MountRig, type Stance } from './crownMountRig';

/**
 * The Crown's horses, shared by the Lancer's barded warhorse and the hero's
 * riding horse: a side view facing right with the near (viewer's) legs over
 * the body and the far legs behind it in shade. Proportions follow a real
 * horse: withers 49 units up, body as long as the horse is tall, a head of
 * about 21 and a neck a little longer; forelegs knee at 14, hocks at 17,
 * sloping pasterns and hooves flat on the ground.
 *
 * Everything here is drawn in the standing pose's coordinates; the rig
 * (crownMountRig.ts) says where it goes: the body is painted under its
 * `body` map, the neck bent by `warp`, the head under `head`, and the legs
 * come already placed in the figure.
 */
export interface HorseLook {
  readonly coat: string;
  /** Lower legs, mane and tail. */
  readonly points: string;
  readonly mane: string;
  readonly hoof: string;
  /** Leg thickness (1 for a warhorse, less for a riding horse). */
  readonly build: number;
  /** How it stands at rest (crownMountRig.ts). */
  readonly pose: Stance;
  /** A white blaze down the face. */
  readonly blaze?: boolean;
}

/** Points riders and tack hang off. */
export const HORSE = {
  seat: pt(-5, -51.4),
  withers: pt(2, -53),
  bit: pt(33, -52),
  poll: pt(25.5, -73.5),
  tailHead: pt(-28, -50.6),
} as const;

/** The body and neck as one outline (the head is laid over the neck's end). */
export const TORSO_KEYS: readonly (readonly [number, number])[] = [
  [23.6, -73.4], [17, -70.4], [10.4, -64], [5, -56], [1.6, -52.4], [-4, -49.6], [-13, -49.6], [-21, -52.4],
  [-27.6, -50.8], [-31.8, -45.4], [-33.2, -38.4], [-32.4, -31.4], [-30.6, -27.6], [-20, -27.8], [-9, -27.4],
  [2, -27.4], [9.6, -28.6], [15.4, -32], [21.4, -38], [23.6, -44], [23.2, -51], [24.2, -58], [26, -64], [27.4, -67.6],
];

const HEAD_KEYS: readonly (readonly [number, number])[] = [
  [23.2, -71.8], [25.6, -74.4], [28.8, -73], [31.2, -68.4], [33.6, -61], [35.4, -55.4], [36.2, -52.2],
  [35.4, -49.8], [33.4, -49.6], [31.2, -50.6], [29, -55], [25.6, -59], [23.4, -63.6],
];

/** The crest: where the mane grows, from the poll back to the withers. */
export const CREST = lineOf([[24.2, -73.2], [17.4, -70.4], [10.6, -64], [5.4, -56.4], [2.4, -52.6]]);

function pointIn(poly: readonly Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Runs `draw` clipped to outside `shape`. */
function outside(d: Draw, shape: readonly Pt[], draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -200, 400, 400);
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  draw();
  ctx.restore();
}

/** A hoof at the coronet `c`, turned by `tilt` (0 standing flat). */
function hoof(d: Draw, c: Pt, tilt: number, look: HorseLook): void {
  const [cs, sn] = [Math.cos(tilt), Math.sin(tilt)];
  const at = (x: number, y: number): Pt => pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  const shape = [at(-2.2, 0.1), at(-0.4, -0.5), at(1.5, -0.2), at(3.7, 3), at(3.5, 3.3), at(-2.7, 3.3), at(-2.8, 1.4)];
  paint(d, shape, look.hoof, { shadow: 0.55, hatch: 0, line: 0.5, gloss: true });
  d.pen.hair([at(-2.1, 0.7), at(1.8, 0.4)], 0.5, mix(look.points, '#f4e6c8', 0.3), 0.7);
  gleam(d, [at(0.6, 0.6), at(2.2, 2.4)], 0.45, 0.6);
}

/** One leg, painted, with its joints drawn in and its hoof; `belly` is how far the body has dropped over it. */
function leg(d: Draw, pose: LegPose, look: HorseLook, far: boolean, body: readonly Pt[] | null, belly: number): void {
  const j = pose.joints.map(([x, y, w]) => [x, y, w * look.build] as Joint);
  const l = limb(j, 7);
  const coat = far ? mix(look.coat, SHADOW, 0.32) : look.coat;
  const low = far ? mix(look.points, SHADOW, 0.3) : look.points;
  const paintIt = (): void => {
    paint(d, l.shape, coat, { shadow: 0.55, hatch: far ? 0.12 : 0.18, line: 0, lit: pt(0.25, 0.4) });
    // The dark stockings from the knee or hock down, fading up into the coat.
    const knee = j[3]!;
    d.pen.clipped(l.shape, () => {
      dab(d, [pt(knee[0] - 9, knee[1] - 1), pt(knee[0] + 9, knee[1] - 1), pt(knee[0] + 9, 4), pt(knee[0] - 9, 4)], low, 0.85, 1.2);
      // Shadow under the belly on the leg's top.
      if (body) dab(d, [pt(knee[0] - 12, -34 + belly), pt(knee[0] + 12, -34 + belly), pt(knee[0] + 12, -22 + belly), pt(knee[0] - 12, -24 + belly)], SHADOW, far ? 0.2 : 0.28, 2.2);
    });
  };
  if (body) outside(d, body, paintIt);
  else paintIt();
  // The leg's two edges, inked from where they leave the body.
  for (const side of [l.a, l.b]) {
    const from = body ? Math.max(0, side.findIndex((p) => !pointIn(body, p)) - 1) : 0;
    d.pen.stroke(side.slice(from), far ? 0.55 : 0.7, d.ink, 0.9, false);
  }
  // Knee or hock, fetlock and the cannon's tendon.
  const [kx, ky] = j[3]!;
  const [fx, fy] = j[6]!;
  d.pen.hair([pt(kx - 1.4, ky - 0.4), pt(kx + 1.6, ky + 0.6)], 0.4, d.ink, 0.55);
  d.pen.hair([pt(fx - 1.6, fy + 0.6), pt(fx + 1.2, fy - 0.4)], 0.35, d.ink, 0.45);
  if (!far) gleam(d, [pt(kx + 0.9, ky + 2.4), pt(fx + 1, fy - 2)], 0.5, 0.45);
  const c = j[7]!;
  hoof(d, pt(c[0], c[1]), pose.tilt, look);
}

const bellyOver = (rig: MountRig, pose: LegPose): number => {
  const x = pose.joints[3]![0];
  return apply(rig.body, pt(x, -30)).y + 30;
};

/** The far legs, in shade behind the body. */
export function farLegs(d: Draw, look: HorseLook, rig: MountRig): void {
  const { farHind, farFore } = rig.legs;
  leg(d, farHind, look, true, null, 0);
  leg(d, farFore, look, true, null, 0);
}

/** The near legs, over the body's lower edge (`body` is the torso's outline, in the figure). */
export function nearLegs(d: Draw, look: HorseLook, rig: MountRig, body: readonly Pt[]): void {
  const { nearHind, nearFore } = rig.legs;
  leg(d, nearHind, look, false, body, bellyOver(rig, nearHind));
  leg(d, nearFore, look, false, body, bellyOver(rig, nearFore));
}

/** The body and neck's outline, the neck bent by `warp`. */
export function torsoShape(warp: (p: Pt) => Pt = (p) => p): Pt[] {
  return shapeOf(mapXY(TORSO_KEYS, warp), 6);
}

/** The torso's outline where the rig has put it, in the figure (to clip the near legs). */
export function torsoInFigure(rig: MountRig): Pt[] {
  return torsoShape(rig.warp).map((p) => apply(rig.body, p));
}

/** Body and neck: coat wash, form shading, and the muscles a horse painter draws in. */
export function torso(d: Draw, look: HorseLook, warp: (p: Pt) => Pt = (p) => p): Pt[] {
  const body = torsoShape(warp);
  const w = (xy: readonly (readonly [number, number])[]): [number, number][] => mapXY(xy, warp);
  paint(d, body, look.coat, { shadow: 0.6, hatch: 0.16, line: 0, lit: pt(0.45, 0.2) });
  const { pen } = d;
  const ink = (xy: readonly (readonly [number, number])[], width = 0.4, a = 0.5): void => pen.hair(lineOf(w(xy)), width, d.ink, a);
  pen.clipped(body, () => {
    // The big masses catch the light: shoulder, barrel, haunch; the hollows between stay deep.
    for (const [x, y, rx, ry] of [[14, -45, 6, 8], [-22, -42, 7, 7], [-6, -40, 9, 5]] as const) {
      dab(d, shapeOf([[x - rx, y], [x, y - ry], [x + rx, y], [x, y + ry]]), LIGHT, 0.2, 2.6);
    }
    dab(d, shapeOf([[-14, -46], [-10, -40], [-13, -30], [-17, -36]]), SHADOW, 0.12, 2.2);
    dab(d, shapeOf([[-28, -32], [12, -33], [14, -26], [-28, -25]]), SHADOW, 0.22, 2.4);
    gleam(d, lineOf([[-27, -50.4], [-19, -51.4], [-8, -48.4], [0, -50.4]]), 1, 0.4);
    gleam(d, lineOf(w([[7.6, -60], [13.4, -66.4], [19, -70]])), 0.8, 0.35);
    dab(d, shapeOf(w([[20, -66], [25, -66], [27, -60], [22, -58]])), SHADOW, 0.3, 1.6);
  });
  // Shoulder blade, point of shoulder, elbow, the flank's fold, point of hip, hamstring, jugular groove.
  ink([[4, -51], [9.4, -43], [16.6, -35.6]], 0.45, 0.45);
  ink([[21.4, -42.6], [18.8, -38.6], [15, -34.4]], 0.4, 0.4);
  ink([[-17.4, -29.6], [-15.4, -36], [-16.6, -42]], 0.42, 0.45);
  ink([[-21, -46.4], [-19, -47.8], [-17.2, -46.4]], 0.38, 0.45);
  ink([[-31, -40], [-28.4, -34], [-25.4, -29.6]], 0.4, 0.4);
  ink([[22.4, -51], [19.2, -58], [16.4, -64]], 0.35, 0.3);
  pen.stroke(lineOf([[-29, -28.2], [-20, -27.8], [-9, -27.4], [2, -27.4], [9.6, -28.6]]), 0.6, d.ink, 0.85, false);
  return body;
}

/** The head: lean face, round jowl, eye, nostril and ears. */
export function head(d: Draw, look: HorseLook): Pt[] {
  const { pen } = d;
  // Far ear, then near ear.
  for (const [bx, tip, far] of [[24.2, pt(23.4, -80.4), true], [26.6, pt(27.2, -81), false]] as const) {
    const ear = shapeOf([[bx - 1.6, -73], [tip.x - 0.5, tip.y + 1.4], [tip.x, tip.y], [tip.x + 0.9, tip.y + 1.8], [bx + 1.8, -73.4]], 4);
    paint(d, ear, far ? mix(look.coat, SHADOW, 0.35) : look.coat, { shadow: 0.5, hatch: 0, line: 0.55 });
    if (!far) pen.hair([pt(bx - 0.2, -73.6), pt(tip.x - 0.1, tip.y + 2)], 0.6, mix(look.coat, SHADOW, 0.6), 0.7);
  }
  const shape = shapeOf(HEAD_KEYS, 5);
  paint(d, shape, look.coat, { shadow: 0.5, hatch: 0.14, line: 0.6, lit: pt(0.35, 0.15) });
  pen.clipped(shape, () => {
    // Darker muzzle; the blaze; jowl and the face's bony ridge.
    dab(d, shapeOf([[34, -58], [37.6, -54], [36.6, -48.6], [31, -49], [31.4, -54]]), look.points, 0.55, 1.4);
    if (look.blaze) dab(d, shapeOf([[28.2, -71.4], [30, -70], [33.8, -59.4], [35.2, -54.8], [34, -54.4], [31.4, -60.4]]), '#f6efe0', 0.9, 0.5);
    dab(d, shapeOf([[23.8, -64], [27.8, -62], [29, -57.4], [25.6, -56.6]]), SHADOW, 0.18, 1.6);
    dab(d, shapeOf([[25.6, -70], [28.4, -71], [30.6, -66], [28.8, -64]]), LIGHT, 0.25, 1.2);
  });
  pen.hair(lineOf([[23.8, -65.6], [27.6, -62.6], [28.8, -58], [28.6, -55]]), 0.5, d.ink, 0.6);
  pen.hair(lineOf([[29.2, -68.6], [32, -62], [33.8, -57]]), 0.35, d.ink, 0.3);
  // Eye: dark, with a lid line and a wet glint.
  pen.dot(28.6, -66.6, 0.95, '#1d1716');
  pen.hair(lineOf([[27.2, -67.6], [28.7, -68.1], [30, -67]]), 0.4, d.ink, 0.85);
  pen.dot(28.3, -66.95, 0.32, '#fdf8ea', 0.95);
  // Nostril and mouth.
  pen.hair(lineOf([[35.2, -54.6], [34.2, -53.6], [34.5, -52.2], [35.5, -52.4]]), 0.45, d.ink, 0.85);
  pen.hair(lineOf([[35.8, -50.6], [34, -50.6], [32.2, -51.2]]), 0.4, d.ink, 0.7);
  return shape;
}

/** The mane along the crest (bent with the neck by `warp`), combed into strands; `wind` lifts it. */
export function mane(d: Draw, look: HorseLook, warp: (p: Pt) => Pt = (p) => p, wind = 0, t = 0): void {
  const { pen } = d;
  const crest = CREST.map(warp);
  const top = crest.map((p) => pt(p.x - 0.6, p.y - 1.2));
  const n = crest.length;
  const bot = crest.map((p, i) => {
    const u = i / (n - 1);
    const lift = wind * u * (1.6 + 0.8 * Math.sin(t * Math.PI * 2 + u * 9));
    return pt(p.x - 1.2 - u * 1.4 - lift, p.y + 3.4 + Math.sin(u * 11) * 0.9 + u * 1.2 - lift * 0.9);
  });
  const shape = [...top, ...[...bot].reverse()];
  paint(d, shape, look.mane, { shadow: 0.45, hatch: 0, line: 0.55 });
  for (let i = 1; i < n - 1; i += 1) {
    const a = top[i]!;
    const b = bot[i]!;
    pen.hair([a, pt((a.x + b.x) / 2 - 0.6, (a.y + b.y) / 2), pt(b.x - 0.8, b.y + 0.4)], 0.3, i % 2 ? mix(look.mane, '#ffffff', 0.35) : d.ink, 0.6);
  }
}

/** The forelock between the ears (head coordinates). */
export function forelock(d: Draw, look: HorseLook): void {
  const lock = shapeOf([[25, -74.6], [27.6, -73.8], [29.8, -69.6], [28.8, -68.8], [26.4, -71.4]], 4);
  paint(d, lock, look.mane, { shadow: 0.3, hatch: 0, line: 0.45 });
}

/** The tail: a full fall of hair from the dock, combed; `lift` raises it (degrees), `swish` swings its end back. */
export function tail(d: Draw, look: HorseLook, swish = 0, lift = 0): void {
  const dock = pt(-27.6, -50);
  const [cs, sn] = [Math.cos((lift * Math.PI) / 180), Math.sin((lift * Math.PI) / 180)];
  const keys: [number, number][] = [[-27.6, -50], [-32.8, -47.6], [-37.4, -40], [-39.4 - swish, -29], [-38.6 - swish * 1.6, -15]];
  const raised = keys.map(([x, y], i): [number, number] => {
    // The dock is stiff: the lift bends the hair more the further down it falls.
    const k = Math.min(1, i / 2);
    const [dx, dy] = [x - dock.x, y - dock.y];
    const [rx, ry] = [dock.x + dx * cs - dy * sn, dock.y + dx * sn + dy * cs];
    return [x + (rx - x) * k, y + (ry - y) * k];
  });
  const spine = lineOf(raised, 5);
  const w = (u: number): number => 2.6 + Math.sin(Math.PI * Math.min(1, u * 1.3)) * 4.8 - u * 1.4;
  const l = limb(spine.map((p, i) => [p.x, p.y, w(i / (spine.length - 1))] as Joint), 1);
  paint(d, l.shape, look.mane, { shadow: 0.5, hatch: 0.14, line: 0.6 });
  const nr = l.spine.map((p, i, a) => {
    const q = a[Math.min(a.length - 1, i + 1)]!;
    const o = a[Math.max(0, i - 1)]!;
    const [dx, dy] = [q.x - o.x, q.y - o.y];
    const m = Math.hypot(dx, dy) || 1;
    return pt(-dy / m, dx / m);
  });
  for (const k of [-0.3, 0, 0.3]) {
    const strand = l.spine.map((p, i) => {
      const off = k * w(i / (l.spine.length - 1)) * 0.9;
      return pt(p.x + nr[i]!.x * off, p.y + nr[i]!.y * off);
    });
    d.pen.hair(strand.slice(2), 0.3, mix(look.mane, '#ffffff', 0.4), 0.55);
  }
}
