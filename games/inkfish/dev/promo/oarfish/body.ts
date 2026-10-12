/**
 * The oarfish's shape, as plain geometry (no drawing): a long ribbon whose
 * spine bends in a wave running from head to tail, and the outline, fins
 * and crest laid along it. World units are metres, y down.
 *
 * Every part is placed in the fish's own straight frame, `s` (0 snout .. 1
 * tail tip, along the body) and `v` (metres out from the spine, dorsal side
 * positive), then carried onto the bent spine, so the fins and crest bend
 * with the body.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface RibbonPose {
  /** The snout, world m. */
  readonly x: number;
  readonly y: number;
  /** Where the head points, radians (0 right, -π/2 up). */
  readonly heading: number;
  readonly length: number;
  /** The swimming wave: its bend (radians), how many waves fit along the body, and its phase. */
  readonly amp: number;
  readonly waves: number;
  readonly phase: number;
  /** A steady bend along the whole body, radians from head to tail (lying on the sand). */
  readonly curve: number;
  /** Phase of the ripple running down the dorsal fin (how an oarfish swims). */
  readonly fin: number;
  /** Phase of the crest's slow sway. */
  readonly crest: number;
  /** 0 alive .. 1 lying dead: crest and fin folded down. */
  readonly limp: number;
}

/** Body depth over length: a ribbon. */
export const DEPTH_RATIO = 1 / 24;
/** Spine samples: dense at the head (where the detail is), sparser down the long body. */
export const SPINE_N = 300;
const SAMPLE_POWER = 1.6;

export interface SpinePoint {
  readonly s: number;
  readonly x: number;
  readonly y: number;
  /** Unit tangent, head towards tail. */
  readonly tx: number;
  readonly ty: number;
}

/** The angle of the spine at s: heading reversed (towards the tail), bent by the steady curve and the swimming wave. */
export function spineAngle(p: RibbonPose, s: number): number {
  const wave = p.amp * (0.22 + 0.78 * s) * Math.sin(2 * Math.PI * p.waves * s - p.phase);
  return p.heading + Math.PI + p.curve * s + wave;
}

/** The spine from snout to tail tip: a fixed length, whatever the bend. */
export function spineOf(p: RibbonPose): SpinePoint[] {
  const pts: SpinePoint[] = [];
  let x = p.x;
  let y = p.y;
  let prev = 0;
  for (let i = 0; i <= SPINE_N; i++) {
    const s = (i / SPINE_N) ** SAMPLE_POWER;
    if (i > 0) {
      const a = spineAngle(p, (s + prev) / 2);
      x += Math.cos(a) * (s - prev) * p.length;
      y += Math.sin(a) * (s - prev) * p.length;
    }
    const a = spineAngle(p, s);
    pts.push({ s, x, y, tx: Math.cos(a), ty: Math.sin(a) });
    prev = s;
  }
  return pts;
}

/** The point at body position s (0..1) and offset v (m, dorsal positive), on the bent spine. */
export function placeOn(spine: readonly SpinePoint[], s: number, v: number): Pt {
  const q = Math.max(0, Math.min(1, s)) ** (1 / SAMPLE_POWER) * SPINE_N;
  const i = Math.min(SPINE_N - 1, Math.floor(q));
  const f = q - i;
  const a = spine[i]!;
  const b = spine[i + 1]!;
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  const tx = a.tx + (b.tx - a.tx) * f;
  const ty = a.ty + (b.ty - a.ty) * f;
  const n = Math.hypot(tx, ty) || 1;
  // Dorsal: a quarter turn from the tangent (for a fish facing right, up).
  return { x: x - (ty / n) * v, y: y + (tx / n) * v };
}

/** The tail tip. */
export const tailOf = (spine: readonly SpinePoint[]): Pt => spine[spine.length - 1]!;

// ---------------------------------------------------------------- the profile

/** Where the head ends (behind the gill cover), as a fraction of the body. */
export const HEAD_S = 0.055;

/**
 * The body's top and bottom edges at s, in m from the spine: a blunt rounded
 * head with the mouth a little high, deepest just behind it, then a long
 * slow taper to a thin tail.
 */
export function edgesAt(length: number, s: number): { readonly top: number; readonly bottom: number } {
  const d = length * DEPTH_RATIO;
  const head = Math.sin((Math.min(1, s / (HEAD_S * 0.62)) * Math.PI) / 2);
  const taper = (1 - s) ** 0.62 * (1 - 0.18 * s) * (1 + 0.1 * Math.sin(Math.PI * Math.min(1, s / 0.3)));
  const lift = d * 0.06 * (1 - Math.min(1, s / HEAD_S));
  return { top: lift + (d / 2) * head ** 0.5 * taper, bottom: lift - (d / 2) * head ** 0.75 * taper };
}

/** The dorsal fin: from just behind the crest to the tail. */
export const FIN_FROM = 0.04;
/** How tall the dorsal fin stands at s, m (before its ripple). */
export function finHeight(length: number, s: number): number {
  if (s < FIN_FROM) return 0;
  const d = length * DEPTH_RATIO;
  const rise = Math.min(1, (s - FIN_FROM) / 0.025);
  return d * 0.42 * rise * (1 - 0.45 * s) * (1 - Math.max(0, (s - 0.97) / 0.03));
}

/**
 * The fin's ripple at s: a wave running from head to tail (`waves` along the
 * body). Returns how far each ray leans back (radians from upright) and its
 * height factor.
 */
export const FIN_WAVES = 24;
export function rippleAt(p: RibbonPose, s: number): { readonly lean: number; readonly reach: number } {
  const w = Math.sin(2 * Math.PI * FIN_WAVES * s - p.fin);
  const alive = 1 - p.limp;
  return { lean: 0.35 + 0.32 * w * alive + 0.75 * p.limp, reach: (1 + 0.14 * w * alive) * (1 - 0.55 * p.limp) };
}

/** The crest: the first rays of the dorsal fin, long and red, rising from the head. */
export const CREST_RAYS = 8;
export interface CrestRay {
  readonly root: number;
  /** Length, m. */
  readonly length: number;
  /** Lean back from upright, radians. */
  readonly lean: number;
}
export function crestOf(p: RibbonPose): CrestRay[] {
  const d = p.length * DEPTH_RATIO;
  return Array.from({ length: CREST_RAYS }, (_, i) => {
    const u = i / (CREST_RAYS - 1);
    const sway = 0.1 * Math.sin(p.crest - i * 0.55) * (1 - p.limp);
    return {
      root: 0.012 + u * 0.026,
      length: d * (2.5 - 1.5 * u ** 1.2) * (1 - 0.15 * p.limp),
      lean: 0.32 + 0.55 * u + sway + 0.9 * p.limp,
    };
  });
}

/** The two long pelvic rays ("oars") from the throat, with paddle tips. */
export const PELVIC_S = 0.05;
export const PELVIC_LEN = 0.085;
