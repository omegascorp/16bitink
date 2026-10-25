/**
 * Sound effects: which ones exist and the pure rules around them (pitch per
 * meal, stereo placement, throttling, saved settings), as in InkGecko. The
 * synthesis itself lives in synth.ts; there are no audio files.
 */
export const SFX_IDS = [
  // The snake: a strike's hiss, a meal going down (pitched by its size), a coil creaking tight, a big swallow, the head bumping something solid.
  'strike', 'gulp', 'squeeze', 'swallow', 'bump',
  // Trouble: biting its own body, losing a life, a nip off the tail, the snake grown long enough.
  'knot', 'hurt', 'nip', 'grown',
  // Prey: a mouse's squeak as it bolts, a frog's plop as it hops, a new one turning up.
  'squeak', 'plop', 'appear',
  // Enemies: the crow's caw, the hawk's scream, its dive's whoosh, a miss, the hen's cluck, wings flapping off when scared.
  'caw', 'cry', 'dive', 'miss', 'cluck', 'flap',
  // The Old Tomcat: a low growl as it stalks, the pounce, a hiss and yowl when struck, the last yowl as it runs.
  'growl', 'pounce', 'yowl', 'beaten',
  // A rush's clock in its last seconds.
  'tick',
  // Endings and the interface.
  'win', 'lose', 'click',
  // The map: the snake's slither up the route, a level's card opening.
  'steps', 'card',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of the same sound, ms. */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  strike: 120, gulp: 60, squeeze: 700, swallow: 500, bump: 350,
  knot: 300, hurt: 300, nip: 150, grown: 1000,
  squeak: 250, plop: 150, appear: 120,
  caw: 600, cry: 1400, dive: 300, miss: 300, cluck: 500, flap: 250,
  growl: 1200, pounce: 300, yowl: 300, beaten: 1600,
  tick: 400,
  win: 1000, lose: 1000, click: 40,
  steps: 120, card: 80,
};

/** Pitch for a gulp: smaller meals go down higher, bigger ones lower. */
export function pitchForMeal(size: number): number {
  return Math.max(0.55, Math.min(1.5, 16 / Math.max(6, size)));
}

export interface View {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** How far outside the view (in view widths) a sound can still be heard. */
const HEARING = 0.75;

/** Stereo pan (-1..1) and loudness (0..1) for a sound at `at`, heard from the camera's view. */
export function spatial(at: { readonly x: number; readonly y: number }, view: View): { pan: number; gain: number } {
  const w = Math.max(1, view.right - view.left);
  const h = Math.max(1, view.bottom - view.top);
  const cx = (view.left + view.right) / 2;
  const pan = Math.max(-1, Math.min(1, ((at.x - cx) / (w / 2)) * 0.8));
  const dx = Math.max(0, view.left - at.x, at.x - view.right) / w;
  const dy = Math.max(0, view.top - at.y, at.y - view.bottom) / h;
  const gain = Math.max(0, 1 - Math.hypot(dx, dy) / HEARING);
  return { pan, gain };
}

/** True (and remembers it) when `id` hasn't played within its minimum gap. */
export function canPlay(id: SfxId, now: number, last: Map<string, number>): boolean {
  const prev = last.get(id);
  if (prev !== undefined && now - prev < MIN_GAP_MS[id]) return false;
  last.set(id, now);
  return true;
}

export interface SoundSettings {
  readonly muted: boolean;
}

export const SOUND_KEY = 'inksnake:sound';

/** Saved settings from storage; anything unreadable means sound on. */
export function parseSoundSettings(raw: string | null): SoundSettings {
  if (!raw) return { muted: false };
  try {
    const data: unknown = JSON.parse(raw);
    return { muted: typeof data === 'object' && data !== null && (data as { muted?: unknown }).muted === true };
  } catch {
    return { muted: false };
  }
}
