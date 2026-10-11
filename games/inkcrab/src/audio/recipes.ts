/**
 * Sound effects: which ones exist and the pure rules around them (pitch for
 * size, stereo placement, throttling, saved settings), as in InkFish. The
 * synthesis itself lives in synth.ts; there are no audio files.
 */
export const SFX_IDS = [
  // The crab: eating and growing, the sand it digs and drops, its shell.
  'eat', 'full', 'grow', 'dig', 'place', 'pour', 'jump', 'hide', 'out', 'movein', 'knock', 'tok',
  // Trouble and help: caught, a vent's blast, a gull's stoop, a rival trading up, a follower joining.
  'caught', 'steam', 'stoop', 'trade', 'join',
  // Missions: a find dug up, a marked hunter eaten.
  'find', 'quarry',
  // The beach changing: the tide turning in, a squall, a gust, a cloud over the moon.
  'tide', 'rain', 'gust', 'dark',
  // Endings and the interface.
  'win', 'lose', 'click',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of the same sound, ms: a long dig shouldn't buzz like a hive. */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  eat: 50, full: 500, grow: 400, dig: 90, place: 90, pour: 450, jump: 120, hide: 200, out: 300, movein: 300, knock: 250, tok: 200,
  caught: 300, steam: 300, stoop: 900, trade: 300, join: 300,
  find: 200, quarry: 300,
  tide: 2000, rain: 2000, gust: 1500, dark: 2000,
  win: 1000, lose: 1000, click: 40,
};

/** Pitch multiplier for a meal: a crumb makes a high nibble, a clam a deeper crunch. */
export function pitchForSize(points: number): number {
  const p = 1.5 - Math.log2(Math.max(1, points)) * 0.25;
  return Math.min(1.5, Math.max(0.6, p));
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

export const SOUND_KEY = 'inkcrab:sound';

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
