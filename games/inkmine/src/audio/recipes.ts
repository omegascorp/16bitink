/**
 * Sound effects: which ones exist and the pure rules around them (pitch for
 * an ore, throttling, saved settings), after InkCrab's. The synthesis
 * itself lives in synth.ts; there are no audio files. Everything is meant
 * to sit low and soft under the ambience, as No Man's Sky's effects do.
 */
export const SFX_IDS = [
  // The drill: a soft grind while it works (soil, then rock) and a crumble as a block gives.
  'grindSoft', 'grindHard', 'crumbleSoft', 'crumbleHard',
  // Moving: a landing, the jetpack's first breath.
  'land', 'jetStart',
  // Finds and the bag: ore picked up, a part or the core found, ore banked, the bag or hold full, a no.
  'ore', 'find', 'bank', 'full', 'dull',
  // The suit: fed or topped up, air low, out of air, hurt, the shield, a charge armed, a blast far off, giving out, the winch.
  'fed', 'airLow', 'airOut', 'hurt', 'shield', 'fizz', 'blast', 'failed', 'winch',
  // The page and the story: a button, something mended or printed, a card, lift-off.
  'tick', 'mended', 'swell', 'liftOff',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Shortest gap between two plays of the same sound, ms: a long dig is a gentle texture, not a machine gun. */
export const MIN_GAP_MS: Readonly<Record<SfxId, number>> = {
  grindSoft: 210, grindHard: 240, crumbleSoft: 120, crumbleHard: 120,
  land: 250, jetStart: 300,
  ore: 70, find: 400, bank: 300, full: 900, dull: 600,
  fed: 300, airLow: 2500, airOut: 2500, hurt: 300, shield: 300, fizz: 400, blast: 200, failed: 2000, winch: 1000,
  tick: 50, mended: 600, swell: 500, liftOff: 2000,
};

/** True (and remembers it) when `id` hasn't played within its minimum gap. */
export function canPlay(id: SfxId, now: number, last: Map<string, number>): boolean {
  const prev = last.get(id);
  if (prev !== undefined && now - prev < MIN_GAP_MS[id]) return false;
  last.set(id, now);
  return true;
}

/** A major pentatonic over two octaves and a note, as pitch multipliers over the chime's root: any two finds in a row sound well together. Graphite's ores ring the lower, Mycel's the upper. */
const PENTATONIC = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4, 9 / 2, 5] as const;

/**
 * The pickup chime's pitch for an ore id: each ore its own note of the
 * pentatonic (so copper always rings the same), unknown ids at the root.
 */
export function orePitch(oreId: number): number {
  if (!Number.isInteger(oreId) || oreId <= 0) return 1;
  return PENTATONIC[(oreId - 1) % PENTATONIC.length]!;
}

export interface SoundSettings {
  readonly muted: boolean;
}

export const SOUND_KEY = 'inkmine:sound';

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

/** One word of the radio voice: when it starts and how long it lasts (s), and the pitch it glides from and to (Hz). */
export interface VoiceWord {
  readonly start: number;
  readonly dur: number;
  readonly from: number;
  readonly to: number;
}

/** Words longer than this many are cut short: a card's voice is a phrase, not a speech. */
const MAX_WORDS = 12;

/**
 * A line of the strange slow voice, word by word, seeded so the same line
 * always sounds the same (as its inked trace on the card always looks the
 * same): low, gliding, with a pause between words.
 */
export function voicePlan(words: number, seed: number, rng: (seed: number) => () => number): readonly VoiceWord[] {
  const n = Math.max(0, Math.min(MAX_WORDS, Math.floor(words)));
  const r = rng(seed);
  let t = 0;
  return Array.from({ length: n }, () => {
    const dur = 0.32 + r() * 0.3;
    const from = 120 + r() * 70;
    const to = from * (0.8 + r() * 0.45);
    const word = { start: t, dur, from, to };
    t += dur + 0.12 + r() * 0.16;
    return word;
  });
}
