/**
 * The reef shark, chapter 5's giant.
 *
 * While it's bigger than you it circles you, tighter every lap, then flexes
 * (the warning) and strikes. A dash breaks the circle: it has to start wide
 * again. It smells blood: every fish eaten near it pulls it to that spot in
 * a frenzy. Once you're bigger it keeps away from you, but blood still pulls
 * it in, so eat near it and be waiting when it comes.
 */

export type SharkMode = 'cruise' | 'circle' | 'flex' | 'strike' | 'rest' | 'frenzy' | 'wary';

export interface SharkState {
  readonly mode: SharkMode;
  readonly until: number;
  /** How wide it's circling you, px; it tightens every lap. */
  readonly radius: number;
  /** Where it smelled blood. */
  readonly bloodX: number;
  readonly bloodY: number;
  /** The next strike may start from this time, ms. */
  readonly strikeAt: number;
  /** Blood draws it again only from this time: after a frenzy it settles down a while, ms. */
  readonly smellAt: number;
}

export interface SharkSense {
  readonly now: number;
  /** Seconds since the last step. */
  readonly dt: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  readonly seen: boolean;
  /** You dashed this step. */
  readonly dashed: boolean;
  /** Blood in the water this step, if any, and how far from it. */
  readonly blood: { readonly x: number; readonly y: number; readonly dist: number } | null;
}

export const SHARK = {
  /** It starts circling you from this close... */
  circleRange: 520,
  /** ...this wide, tightening at this rate to the strike radius. */
  circleStart: 380,
  tighten: 55,
  strikeRadius: 170,
  flexMs: 450,
  strikeMs: 520,
  strikeSpeed: 600,
  restMs: 1500,
  strikeCooldownMs: 1800,
  /** Laps per second around you. */
  orbitSpeed: 0.24,
  cruiseSpeed: 190,
  /** It smells blood this far off... */
  smell: 1100,
  /** ...and rushes there (hunting) or comes, warily (hiding), for this long. */
  frenzyMs: 2400,
  frenzySpeed: 380,
  /** After a frenzy it ignores blood this long. */
  smellCooldownMs: 3000,
  lureSpeed: 250,
  waryDistance: 420,
  waryRange: 360,
  fleeSpeed: 330,
} as const;

export const SHARK_START: SharkState = { mode: 'cruise', until: 0, radius: SHARK.circleStart, bloodX: 0, bloodY: 0, strikeAt: 0, smellAt: 0 };

/** One step of the shark's mind. Pure: the scene moves the fish to match. */
export function stepShark(s: SharkState, i: SharkSense): SharkState {
  // Blood in the water beats everything but a strike already under way.
  const fresh = s.mode !== 'frenzy' && i.now >= s.smellAt;
  if (i.blood && fresh && i.blood.dist < SHARK.smell && s.mode !== 'strike' && s.mode !== 'flex') {
    return { ...s, mode: 'frenzy', until: i.now + SHARK.frenzyMs, bloodX: i.blood.x, bloodY: i.blood.y };
  }
  if (s.mode === 'frenzy') {
    return i.now >= s.until ? { ...s, mode: i.rel === 'hide' ? 'wary' : 'cruise', radius: SHARK.circleStart, smellAt: i.now + SHARK.smellCooldownMs } : s;
  }
  return i.rel === 'hide' ? wary(s) : hunt(s, i);
}

function hunt(s: SharkState, i: SharkSense): SharkState {
  if (s.mode === 'flex') return i.now >= s.until ? { ...s, mode: 'strike', until: i.now + SHARK.strikeMs } : s;
  if (s.mode === 'strike') return i.now >= s.until ? { ...s, mode: 'rest', until: i.now + SHARK.restMs, strikeAt: i.now + SHARK.restMs + SHARK.strikeCooldownMs } : s;
  if (s.mode === 'rest') return i.now >= s.until ? { ...s, mode: 'cruise', radius: SHARK.circleStart } : s;
  const hunting = i.rel === 'hunt' && i.seen;
  if (s.mode === 'circle') {
    if (!hunting) return { ...s, mode: 'cruise', radius: SHARK.circleStart };
    // A dash breaks the circle: it has to start wide again.
    if (i.dashed) return { ...s, radius: SHARK.circleStart };
    const radius = Math.max(SHARK.strikeRadius, s.radius - SHARK.tighten * i.dt);
    if (radius <= SHARK.strikeRadius && i.now >= s.strikeAt) return { ...s, mode: 'flex', until: i.now + SHARK.flexMs, radius };
    return { ...s, radius };
  }
  if (hunting && i.dist < SHARK.circleRange) return { ...s, mode: 'circle', radius: Math.min(SHARK.circleStart, Math.max(i.dist, SHARK.strikeRadius + 60)) };
  return s.mode === 'cruise' ? s : { ...s, mode: 'cruise' };
}

function wary(s: SharkState): SharkState {
  return s.mode === 'wary' ? s : { ...s, mode: 'wary' };
}
