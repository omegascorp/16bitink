/**
 * Sound effects: which ones exist and the pure rules around them (pitch per
 * combo, stereo placement, throttling, saved settings), as in InkCrab. The
 * synthesis itself lives in synth.ts; there are no audio files.
 */
export const SFX_IDS = [
  // The gecko: a spit, a swap, a marble joining the line.
  'spit', 'swap', 'stuck',
  // The line: pops (pitched up per combo link), a gap closing, parts meeting, bonuses.
  'pop', 'pull', 'join', 'gap', 'streak',
  // Charms: one used, one dropping, one caught.
  'charm', 'drop', 'catch',
  // Trouble: the line near the well, a marble falling in.
  'danger', 'well',
  // Endings and the interface.
  'filled', 'win', 'lose', 'click',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of the same sound, ms. */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  spit: 40, swap: 60, stuck: 40,
  pop: 40, pull: 150, join: 80, gap: 200, streak: 200,
  charm: 150, drop: 200, catch: 100,
  danger: 350, well: 500,
  filled: 1000, win: 1000, lose: 1000, click: 40,
};

/** Pitch for a pop: each combo link a step higher, up a major scale. */
export function pitchForCombo(combo: number): number {
  const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  return 2 ** ((scale[Math.min(combo, scale.length - 1)] ?? 0) / 12);
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

export const SOUND_KEY = 'inkgecko:sound';

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
