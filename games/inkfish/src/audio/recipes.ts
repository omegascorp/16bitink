import { ITEM_INFO, type ItemId } from '../levels/items';

/**
 * Sound effects: which ones exist and the pure rules around them (pitch for
 * size, stereo placement, throttling, saved settings). The synthesis itself
 * lives in synth.ts; there are no audio files.
 */
export type SfxId =
  | 'eat' | 'eatBig' | 'dash' | 'grow' | 'hurt' | 'zap' | 'hooked' | 'free' | 'splash'
  | 'squawk' | 'powerup' | 'yuck' | 'boom' | 'clang' | 'drop' | 'frenzy' | 'spotted'
  | 'win' | 'lose' | 'click';

/** The sound of an item's own effect, on top of the power-up cheer for good ones. */
const ITEM_EFFECT_SFX: Readonly<Partial<Record<ItemId, SfxId>>> = {
  battery: 'zap', duck: 'squawk', firecracker: 'boom', bag: 'yuck', rings: 'yuck', lure: 'hooked',
};

/** What swimming into an item sounds like: every bonus cheers with the power-up, then its own effect if it has one. */
export function itemSfx(kind: ItemId): SfxId[] {
  const effect = ITEM_EFFECT_SFX[kind];
  const cheer: SfxId[] = ITEM_INFO[kind].good ? ['powerup'] : [];
  return effect ? [...cheer, effect] : cheer;
}

/** Shortest gap between two plays of the same sound, ms: a jelly bloom shouldn't buzz like a hive. */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  eat: 45, eatBig: 200, dash: 120, grow: 400, hurt: 200, zap: 140, hooked: 300, free: 300, splash: 120,
  squawk: 350, powerup: 150, yuck: 200, boom: 200, clang: 150, drop: 60, frenzy: 250, spotted: 600,
  win: 1000, lose: 1000, click: 40,
};

/** Pitch multiplier for a meal: little fish make a high "plip", big ones a deep gulp. */
export function pitchForSize(size: number): number {
  const p = 1.6 - Math.log2(Math.max(1, size) / 8) * 0.22;
  return Math.min(1.6, Math.max(0.5, p));
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

export const SOUND_KEY = 'inkfish:sound';

/** Saved settings from storage; anything unreadable means sound on. */
export function parseSoundSettings(raw: string | null): SoundSettings {
  if (!raw) return { muted: false };
  try {
    const data: unknown = JSON.parse(raw);
    const muted = typeof data === 'object' && data !== null && (data as { muted?: unknown }).muted === true;
    return { muted };
  } catch {
    return { muted: false };
  }
}
