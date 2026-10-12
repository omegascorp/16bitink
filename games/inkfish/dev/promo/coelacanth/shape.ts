/**
 * The coelacanth's outline and fins, in its own units: 1000 from the nose
 * (x = +482) to the tip of the tail's middle lobe (x = -520), belly down,
 * its middle at the origin. Shared by the living fish (fish.ts) and its
 * fossil skeleton (skeleton.ts), so the bones sit exactly inside the body.
 */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });

/** A cubic Bézier sampled at n + 1 points (the start included). */
export function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const a = (1 - s) ** 3;
    const b = 3 * (1 - s) ** 2 * s;
    const c = 3 * (1 - s) * s * s;
    const d = s ** 3;
    return pt(a * p0.x + b * c1.x + c * c2.x + d * p1.x, a * p0.y + b * c1.y + c * c2.y + d * p1.y);
  });
}

/** Joins sampled segments, dropping each one's repeated first point. */
const chain = (segments: readonly Pt[][]): Pt[] => segments.flatMap((s, i) => (i === 0 ? s : s.slice(1)));

const NOSE = pt(482, 10);

/** The back, nose to tail. */
export const TOP: readonly Pt[] = chain([
  cubic(NOSE, pt(484, -32), pt(468, -62), pt(440, -80)),
  cubic(pt(440, -80), pt(405, -104), pt(355, -138), pt(300, -150)),
  cubic(pt(300, -150), pt(230, -166), pt(150, -178), pt(80, -176)),
  cubic(pt(80, -176), pt(-20, -172), pt(-120, -148), pt(-200, -120)),
  cubic(pt(-200, -120), pt(-290, -88), pt(-390, -48), pt(-442, -22)),
]);

/** The belly, nose to tail. */
export const BOTTOM: readonly Pt[] = chain([
  cubic(NOSE, pt(484, 36), pt(472, 52), pt(452, 62)),
  cubic(pt(452, 62), pt(420, 86), pt(370, 114), pt(320, 128)),
  cubic(pt(320, 128), pt(240, 152), pt(150, 170), pt(60, 168)),
  cubic(pt(60, 168), pt(-40, 166), pt(-130, 142), pt(-210, 118)),
  cubic(pt(-210, 118), pt(-300, 90), pt(-390, 48), pt(-442, 22)),
]);

/** The whole body outline, closed (back, then belly backwards). */
export const BODY: readonly Pt[] = [...TOP, ...[...BOTTOM].reverse().slice(0, -1)];

/** The height of a profile at x (linear between its samples). */
export function profileAt(profile: readonly Pt[], x: number): number {
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1]!;
    const b = profile[i]!;
    if ((x <= a.x && x >= b.x) || (x >= a.x && x <= b.x)) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return x > NOSE.x ? NOSE.y : profile[profile.length - 1]!.y;
}

export const topAt = (x: number): number => profileAt(TOP, x);
export const bottomAt = (x: number): number => profileAt(BOTTOM, x);
export const midAt = (x: number): number => (topAt(x) + bottomAt(x)) / 2;

/** The eye, the back edge of the gill cover, and the mouth. */
export const EYE = { x: 374, y: -44, r: 31 } as const;
export const GILL: readonly Pt[] = cubic(pt(300, -146), pt(250, -100), pt(232, 60), pt(296, 128));
export const MOUTH: readonly Pt[] = cubic(pt(482, 26), pt(455, 36), pt(415, 44), pt(372, 46), 8);
export const JAW: readonly Pt[] = cubic(pt(450, 64), pt(410, 82), pt(360, 90), pt(312, 86), 8);

/** A lobed fin: a fleshy, scaled stalk from `root` along `angle`, ending in a fan of rays. */
export interface Lobe {
  readonly root: Pt;
  readonly angle: number;
  readonly stalk: number;
  readonly width: number;
  readonly fan: number;
}

export interface LobeShape {
  readonly stalk: Pt[];
  readonly fan: Pt[];
  /** The fan's rays: from the stalk's end to its edge. */
  readonly rays: [Pt, Pt][];
  /** Where the stalk ends, and the bones inside it, root first. */
  readonly end: Pt;
  readonly bones: [Pt, Pt][];
}

/** The lobe's outline, its fan bent by `curl` radians (it trails the stroke). */
export function lobeShape(l: Lobe, curl: number): LobeShape {
  const d = pt(Math.cos(l.angle), Math.sin(l.angle));
  const n = pt(-d.y, d.x);
  const at = (along: number, side: number): Pt => pt(l.root.x + d.x * along + n.x * side, l.root.y + d.y * along + n.y * side);
  const end = at(l.stalk, 0);
  const w = l.width / 2;
  // A fleshy stalk, fat in the middle, narrowing to its end.
  const stalk = [
    ...cubic(at(-w * 0.7, -w * 0.85), at(l.stalk * 0.3, -w * 1.05), at(l.stalk * 0.8, -w * 0.62), at(l.stalk + w * 0.25, -w * 0.28), 9),
    ...cubic(at(l.stalk + w * 0.25, w * 0.28), at(l.stalk * 0.8, w * 0.62), at(l.stalk * 0.3, w * 1.05), at(-w * 0.7, w * 0.85), 9),
  ];
  // The fan: rays spread round the stalk's direction, turned by the curl, longest in the middle.
  const dir = l.angle + curl;
  const tips = Array.from({ length: 11 }, (_, i) => {
    const s = i / 10 - 0.5;
    const a = dir + s * 1.25;
    const r = l.fan * (0.55 + 0.45 * Math.cos(s * Math.PI));
    return pt(end.x + Math.cos(a) * r, end.y + Math.sin(a) * r);
  });
  const base = (side: number): Pt => pt(end.x + n.x * w * 0.5 * side - d.x * w * 0.5, end.y + n.y * w * 0.5 * side - d.y * w * 0.5);
  const fan = [base(-1), ...tips, base(1)];
  const rays = tips.map((tip, i): [Pt, Pt] => [pt(end.x + n.x * w * 0.35 * (i / 5 - 1) - d.x * w * 0.3, end.y + n.y * w * 0.35 * (i / 5 - 1) - d.y * w * 0.3), tip]);
  // Three bones down the stalk, like an arm's.
  const joints = [-0.05, 0.42, 0.75, 1].map((f) => at(l.stalk * f, 0));
  const bones = joints.slice(1).map((j, i): [Pt, Pt] => [joints[i]!, j]);
  return { stalk, fan, rays, end, bones };
}

/** The paired fins and the lobed second dorsal and anal fins, at rest. */
export const PECTORAL: Lobe = { root: pt(250, 74), angle: 2.3, stalk: 84, width: 84, fan: 118 };
export const PELVIC: Lobe = { root: pt(10, 156), angle: 2.05, stalk: 70, width: 74, fan: 100 };
export const DORSAL2: Lobe = { root: pt(-110, -146), angle: -2.4, stalk: 76, width: 78, fan: 112 };
export const ANAL: Lobe = { root: pt(-122, 138), angle: 2.4, stalk: 76, width: 78, fan: 112 };

/** The first dorsal: a tall fan of stiff rays on the back. */
export function dorsal1(sway: number): { readonly shape: Pt[]; readonly rays: [Pt, Pt][] } {
  const b0 = pt(124, -172);
  const b1 = pt(2, -170);
  const tip = pt(62 + sway, -330);
  const lead = cubic(b0, pt(122, -240), pt(98, -305), tip, 10);
  const trail = cubic(tip, pt(32 + sway, -300), pt(6, -236), b1, 10);
  const edge = [...lead, ...trail.slice(1)];
  const rays = Array.from({ length: 8 }, (_, i): [Pt, Pt] => {
    const f = (i + 1) / 9;
    return [pt(b0.x + (b1.x - b0.x) * f, b0.y + (b1.y - b0.y) * f), edge[Math.round(f * (edge.length - 1))]!];
  });
  return { shape: [...edge, pt(60, -150)], rays };
}

/** One lobe of the three-lobed tail: upper (side -1) or lower (side 1), swept by `sweep`. */
export function caudal(side: 1 | -1, sweep: number): { readonly shape: Pt[]; readonly rays: [Pt, Pt][] } {
  const y = (v: number): number => v * side;
  const b0 = pt(-205, y(124));
  const b1 = pt(-444, y(24));
  const tip = pt(-405 - sweep * 24, y(258) + sweep * 16);
  const lead = cubic(b0, pt(-255, y(195)), pt(-330, y(250)), tip, 10);
  const trail = cubic(tip, pt(-478, y(238)), pt(-486, y(100)), b1, 12);
  const edge = [...lead, ...trail.slice(1)];
  const rays = Array.from({ length: 11 }, (_, i): [Pt, Pt] => {
    const f = (i + 1) / 12;
    return [pt(b0.x + (b1.x - b0.x) * f, b0.y + (b1.y - b0.y) * f), edge[Math.round(f * (edge.length - 1))]!];
  });
  return { shape: [pt(-200, y(100)), ...edge], rays };
}

/** The small middle lobe: a stalk out of the back of the tail with a tuft of rays, like a brush. */
export function middleLobe(sweep: number): { readonly shape: Pt[]; readonly rays: [Pt, Pt][] } {
  const s = sweep * 10;
  const top = cubic(pt(-436, -20), pt(-468, -16), pt(-484, -13 + s * 0.5), pt(-490, -34 + s), 6);
  const tuft = cubic(pt(-490, -34 + s), pt(-536, -40 + s), pt(-536, 40 + s), pt(-490, 34 + s), 8);
  const bottom = cubic(pt(-490, 34 + s), pt(-484, 13 + s * 0.5), pt(-468, 16), pt(-436, 20), 6);
  const shape = [...top, ...tuft.slice(1), ...bottom.slice(1)];
  const rays = [-1, -0.5, 0, 0.5, 1].map((f): [Pt, Pt] => [pt(-484, s * 0.6 + f * 8), pt(-530, s + f * 32)]);
  return { shape, rays };
}
