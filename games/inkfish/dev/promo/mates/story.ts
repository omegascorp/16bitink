import { SEADEVIL_ART } from '../../../src/art/fish/species/seadevil';
import { bottomAt, C, xAt } from '../../../src/art/fish/kit';
import type { SfxId } from '../../../src/audio/recipes';
import type { Pose } from '../chain';
import { clamp01, lerp, ramp, smooth, VIDEO } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This tiny fish is about to become part of her body": how male deep-sea
 * anglerfish fuse to females, told by a narrator (words.ts). Every beat is
 * timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     close up on a tiny male in the dark
 *   5.1   "She can be sixty times longer…": the camera pulls back to show her
 *   7.6   "When he finds her in the dark, he bites…": he dashes to her belly
 *   11.7  "His mouth fuses to her skin. Their blood vessels join.": a magnifier shows the join
 *   15.4  "Some females carry up to eight males…": the camera pulls back; more males appear on her
 *   18.2  "Down here, a partner is so rare that…": the camera pans away from her across the empty
 *         dark to a lone male, and zooms in on him,
 *   21    "…this tiny fish": where the loop began.
 *
 * World units are px at zoom 1, with her body's centre at the origin.
 */
export const LOOP_S = 21;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string): number {
  const w = WORDS.find((x) => x.text === text);
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return w.start / TEMPO;
}

export const REVEAL_FROM = said('She');
export const REVEAL_TO = said('him.');
export const DASH_FROM = said('When');
export const BITE_AT = said('bites…');
export const FUSE_FROM = said('His');
export const VEINS_FROM = said('Their');
export const PULL_FROM = said('Some');
export const DIVE_FROM = said('Down');
const FUSE_TO = said('Their') - 0.15;
const VEINS_TO = said('Some') - 0.2;
const PULL_TO = PULL_FROM + 0.8;
/** "Down here, a partner…": the camera pans away from her until it finds the next male, alone in the dark. */
export const PAN_TO = said('partner') + 0.1;

/** Her length, and his: drawn 30 times smaller (in some species it's 60). */
export const HER_LEN = 700;
export const HIS_LEN = HER_LEN / 30;
/** Zooms: on him, on both of them, on her belly. */
export const CLOSE = 15;
export const WIDE = 0.95;
export const NEAR = 2.4;

interface Pt { readonly x: number; readonly y: number }

// ---------------------------------------------------------------- her

/** World px per px of her drawing. */
const S = HER_LEN / (2 * SEADEVIL_ART.hl);
/** Her tail's slow sway: beats per loop, so it loops. */
const SWAYS = 3;
const HER_EFFORT = 0.1;

export function herAt(t: number): Pose {
  return { j: 0, shape: 'seadevil', age: 0, x: 0, y: 0, length: HER_LEN, facing: 1, tilt: 0, beat: (2 * Math.PI * SWAYS * t) / LOOP_S, effort: HER_EFFORT };
}

/**
 * A point on her belly at body position `along` (0 nose .. 1 tail), in world
 * px, where the swimmer (swimmer.ts) draws it: bent with her tail. And the
 * way into her body there (unit vector).
 */
export function bellyAt(along: number, t: number): { readonly at: Pt; readonly inward: Pt } {
  const a = SEADEVIL_ART;
  const point = (u: number): Pt => {
    const x = xAt(a, u);
    // As drawSwimmer bends a column: by its distance back from the nose.
    const back = (C + a.hl - x) / (2 * a.hl);
    const bend = Math.max(0, (back - 0.3) / 0.7);
    const dy = a.hh * (0.12 + 0.14 * HER_EFFORT) * bend * bend * Math.sin(herAt(t).beat - 2.4 * back);
    return { x: (x - C) * S, y: (bottomAt(a, u) - C + dy) * S };
  };
  const at = point(along);
  const ahead = point(along - 0.01);
  const behind = point(along + 0.01);
  const len = Math.hypot(ahead.x - behind.x, ahead.y - behind.y);
  // The belly runs nose to tail; into the body is a quarter turn up from it.
  const tx = (ahead.x - behind.x) / len;
  const ty = (ahead.y - behind.y) / len;
  return { at, inward: { x: ty, y: -tx } };
}

// ---------------------------------------------------------------- him

export interface MalePose {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  /** Where his head points, radians (0 is right). */
  readonly angle: number;
  /** Tail-beat phase, and 0 calm .. 1 swimming hard. */
  readonly beat: number;
  readonly effort: number;
  /** 0 free .. 1 fused: his mouth gone into her skin, his eye dimmed. */
  readonly fused: number;
}

/** Where he bites her: a little behind the deepest part of her belly. */
export const BITE_ALONG = 0.45;
/** Where he starts, swimming in the dark below and behind her, and how fast. */
const START = { x: -560, y: 330 } as const;
const DRIFT = { x: 7, y: -2 } as const;

/** A male swimming freely, `tau` seconds after the loop's start (negative: before it). */
function freeMale(tau: number): MalePose {
  return {
    x: START.x + DRIFT.x * tau,
    y: START.y + DRIFT.y * tau + 1.5 * Math.sin(2 * Math.PI * 0.5 * tau),
    length: HIS_LEN,
    angle: Math.atan2(DRIFT.y, DRIFT.x) + 0.08 * Math.sin(2 * Math.PI * 0.5 * tau + 1),
    beat: 2 * Math.PI * 3 * tau,
    effort: 0.5,
    fused: 0,
  };
}

/** A male attached at `along` on her belly, mouth to her skin, body hanging out from her. */
function attached(along: number, t: number, fused: number, beat: number, effort: number): MalePose {
  const { at, inward } = bellyAt(along, t);
  // Mouth just inside her skin; his body out along the normal.
  const mouth = { x: at.x + inward.x * HIS_LEN * 0.08, y: at.y + inward.y * HIS_LEN * 0.08 };
  return {
    x: mouth.x - inward.x * HIS_LEN * 0.5,
    y: mouth.y - inward.y * HIS_LEN * 0.5,
    length: HIS_LEN,
    angle: Math.atan2(inward.y, inward.x),
    beat,
    effort,
    fused,
  };
}

/** His mouth, given his pose. */
export const mouthOfMale = (m: MalePose): Pt => ({ x: m.x + Math.cos(m.angle) * m.length * 0.5, y: m.y + Math.sin(m.angle) * m.length * 0.5 });

/** How far his mouth has fused into her skin. */
export const fusion = (t: number): number => ramp(t, FUSE_FROM, FUSE_TO);
/** How far the shared blood vessels have grown. */
export const veins = (t: number): number => ramp(t, VEINS_FROM, VEINS_TO);

/** The male of the story: drifting in the dark, dashing to her, biting on and fusing. */
export function heAt(t: number): MalePose {
  if (t < DASH_FROM) return freeMale(t);
  const bitten = attached(BITE_ALONG, t, fusion(t), 2 * Math.PI * 5 * t, Math.max(0, 1 - (t - BITE_AT) / 1.2));
  if (t >= BITE_AT) return bitten;
  // The dash: from his drifting spot to her belly, quick then braking, turning to bite.
  const from = freeMale(DASH_FROM);
  const target = attached(BITE_ALONG, BITE_AT, 0, 0, 1);
  const u = (t - DASH_FROM) / (BITE_AT - DASH_FROM);
  const e = smooth(u);
  const arc = Math.sin(Math.PI * u) * 60;
  const x = lerp(from.x, target.x, e);
  const y = lerp(from.y, target.y, e) + arc;
  const turn = ramp(u, 0.6, 1);
  return { x, y, length: HIS_LEN, angle: lerp(Math.atan2(target.y - from.y, target.x - from.x), target.angle, turn), beat: 2 * Math.PI * 8 * t, effort: 1, fused: 0 };
}

/**
 * How far from her the next male is: far out in the dark, so the camera has
 * to travel to find him and she is long gone from the picture by the time it
 * zooms in. The loop can't tell: it began with her out of the picture too.
 */
const NEXT_SHIFT = { x: -1400, y: 40 } as const;

/** The next male, drifting alone in the dark as the camera comes looking for him. */
export function nextMaleAt(t: number): MalePose | null {
  if (t < DIVE_FROM) return null;
  const m = freeMale(t - LOOP_S);
  return { ...m, x: m.x + NEXT_SHIFT.x, y: m.y + NEXT_SHIFT.y };
}

/** The other males she carries: where on her belly, and when each appears. With him and the first, eight. */
const OTHERS = [0.3, 0.6, 0.37, 0.53, 0.68, 0.76, 0.84] as const;
const POP_FROM = PULL_FROM + 0.55;
const POP_EVERY = 0.3;
export const MALE_COUNT = OTHERS.length + 1;

/** The other males on her at time t, with how long since each appeared (for its pop). */
export function othersAt(t: number): { readonly pose: MalePose; readonly since: number }[] {
  return OTHERS.map((along, i) => ({ along, since: t - (POP_FROM + i * POP_EVERY), i }))
    .filter((m) => m.since >= 0)
    .map((m) => ({ pose: attached(m.along, t, 1, 2 * Math.PI * 2 * t + m.i, 0.1), since: m.since }));
}

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** He sits a little above the middle of the picture, clear of the captions. */
const LIFT = 160;
const onHim = (m: MalePose, zoom: number): Pt => ({ x: m.x, y: m.y + LIFT / zoom });
/** Both of them in the wide shot: her high in the picture, him below her tail, both clear of the captions. */
const BOTH = { x: -80, y: 274 } as const;
/** On her belly where he bites, low in the picture, leaving room for the magnifier above. */
const BELLY = (() => {
  const { at } = bellyAt(BITE_ALONG, BITE_AT);
  return { x: at.x, y: at.y - 40 / NEAR };
})();
/** Where the magnifier sits on screen, and its radius. */
export const LENS = { x: 540, y: 560, r: 250 } as const;

/**
 * Zooming between two framings: the zoom moves evenly in scale (log), and
 * the middle of the picture moves so that both ends stay put on screen
 * rather than swinging out of view on the way.
 */
function zoomBetween(u: number, fromZoom: number, toZoom: number, from: Pt, to: Pt): Camera {
  const zoom = Math.exp(lerp(Math.log(fromZoom), Math.log(toZoom), smooth(u)));
  const w = (1 / zoom - 1 / toZoom) / (1 / fromZoom - 1 / toZoom);
  return { x: to.x + (from.x - to.x) * w, y: to.y + (from.y - to.y) * w, zoom };
}

export function cameraAt(t: number): Camera {
  if (t < REVEAL_FROM) return { ...onHim(heAt(t), CLOSE), zoom: CLOSE };
  if (t < REVEAL_TO) return zoomBetween((t - REVEAL_FROM) / (REVEAL_TO - REVEAL_FROM), CLOSE, WIDE, onHim(heAt(t), CLOSE), BOTH);
  if (t < DASH_FROM) return { ...BOTH, zoom: WIDE };
  if (t < BITE_AT) return zoomBetween((t - DASH_FROM) / (BITE_AT - DASH_FROM), WIDE, NEAR, BOTH, BELLY);
  if (t < PULL_FROM) return { ...BELLY, zoom: NEAR };
  if (t < PULL_TO) return zoomBetween((t - PULL_FROM) / (PULL_TO - PULL_FROM), NEAR, WIDE, BELLY, BOTH);
  if (t < DIVE_FROM) return { ...BOTH, zoom: WIDE };
  const found = onHim(nextMaleAt(PAN_TO)!, WIDE);
  if (t < PAN_TO) {
    const u = smooth((t - DIVE_FROM) / (PAN_TO - DIVE_FROM));
    return { x: lerp(BOTH.x, found.x, u), y: lerp(BOTH.y, found.y, u), zoom: WIDE };
  }
  return zoomBetween((t - PAN_TO) / (LOOP_S - PAN_TO), WIDE, CLOSE, found, onHim(nextMaleAt(t)!, CLOSE));
}

/**
 * How far the drifting snow has been carried sideways by the pan, px: it
 * moves with the water as the camera travels, a whole screen width in all,
 * so it is back where it began by the loop point.
 */
export function snowShift(t: number): number {
  return VIDEO.width * smooth((t - DIVE_FROM) / (PAN_TO - DIVE_FROM));
}

// ---------------------------------------------------------------- marks on the picture

/** The "him" ring around him in the wide shot, 0 .. 1. */
export const himRing = (t: number): number => Math.min(ramp(t, REVEAL_TO - 0.5, REVEAL_TO), 1 - ramp(t, DASH_FROM + 0.4, DASH_FROM + 0.8));

/** A ring pulsing once round the lone male as the camera finds him, 0 .. 1 over its life, or outside that. */
export const foundRing = (t: number): number => (t - (PAN_TO - 0.2)) / 0.8;

/** The magnifier over the join, 0 .. 1. */
export const magnifier = (t: number): number => Math.min(ramp(t, FUSE_FROM - 0.4, FUSE_FROM), 1 - ramp(t, PULL_FROM - 0.2, PULL_FROM + 0.2));

/** The bite's ink burst: 0 .. 1 over its life, or outside that. */
export const chomp = (t: number): number => (t - BITE_AT) / 0.25;

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'dash', t: REVEAL_FROM + 0.1, pitch: 0.55, gain: 0.18, pan: 0 },
  { id: 'dash', t: DASH_FROM + 0.1, pitch: 1.1, gain: 0.22, pan: -0.2 },
  { id: 'eat', t: BITE_AT, pitch: 1.3, gain: 0.35, pan: 0 },
  { id: 'suck', t: FUSE_FROM + 0.2, pitch: 0.7, gain: 0.15, pan: 0 },
  ...OTHERS.map((_, i): SoundCue => ({ id: 'drop', t: POP_FROM + i * POP_EVERY, pitch: 1.2 + i * 0.08, gain: 0.14, pan: -0.3 + i * 0.1 })),
  { id: 'dash', t: DIVE_FROM + 0.15, pitch: 0.7, gain: 0.2, pan: -0.3 },
  { id: 'dash', t: PAN_TO + 0.3, pitch: 0.9, gain: 0.16, pan: 0 },
];

/** How much a pop ring has grown, 0 .. 1, `since` seconds after a male appears. */
export const popRing = (since: number): number => clamp01(since / 0.45);
