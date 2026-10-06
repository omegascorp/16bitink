/**
 * The striped bass, chapter 1's giant: an ambusher that lives in the weed.
 *
 * While it's bigger than you it waits inside a weed patch near you. Swim
 * past and the weed shivers (the warning), then it bursts out at you and,
 * having missed, drifts a moment to get its breath back. Once you're bigger,
 * it bolts for the nearest weed and tucks itself in where you can't bite it;
 * swim into the patch to flush it out, and catch it in the open.
 */

export type BassMode = 'roam' | 'lurk' | 'tense' | 'burst' | 'recover' | 'flee' | 'tucked' | 'flushed';

export interface BassState {
  readonly mode: BassMode;
  /** When a timed mode (tense, burst, recover, flushed) ends, ms. */
  readonly until: number;
  /** The weed patch it's heading for or sitting in. */
  readonly patch: number | null;
  /** A patch it was just flushed from and won't go back to until shunUntil. */
  readonly shunned: number | null;
  readonly shunUntil: number;
  /** No new strike before this, ms: after one, it goes back to the weed first. */
  readonly strikeAt: number;
}

export interface BassSense {
  readonly now: number;
  /** hunt: it's bigger than you. hide: you're bigger. even: neither can eat the other. */
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  /** You're in plain view (not hidden in cover yourself, not in the air). */
  readonly seen: boolean;
  /** The patch it's sitting in, if any. */
  readonly inPatch: number | null;
  /** The patch you're inside, if any. */
  readonly playerPatch: number | null;
  /** The patch to make for, picked by the scene (near you to hunt, away from you to hide); null with no cover. */
  readonly goal: number | null;
}

export const BASS = {
  /** It bursts out at you from this close, px. */
  strikeRange: 300,
  /** The weed shivers this long before it bursts: your warning. */
  tenseMs: 560,
  burstMs: 480,
  burstSpeed: 660,
  recoverMs: 1500,
  /** Rest between the end of one strike and the next. */
  strikeCooldownMs: 2400,
  /** Hunting from a patch further than this from you, it moves to a closer one. */
  shiftRange: 900,
  flushedMs: 1100,
  /** How long a patch it was flushed from stays off limits. */
  shunMs: 9000,
  roamSpeed: 150,
  /** Further than this from the weed it's making for, it hurries at hurrySpeed. */
  hurryRange: 700,
  hurrySpeed: 270,
  fleeSpeed: 235,
  flushSpeed: 430,
} as const;

export const BASS_START: BassState = { mode: 'roam', until: 0, patch: null, shunned: null, shunUntil: 0, strikeAt: 0 };

const HUNTING: readonly BassMode[] = ['roam', 'lurk', 'tense', 'burst', 'recover'];

/** Tucked out of reach: it neither bites nor can be bitten. */
export function bassTucked(mode: BassMode): boolean {
  return mode === 'lurk' || mode === 'tense' || mode === 'tucked';
}

/** One step of the bass's mind. Pure: the scene moves the fish to match. */
export function stepBass(s: BassState, i: BassSense): BassState {
  const shun = i.now < s.shunUntil ? s : { ...s, shunned: null };
  return i.rel === 'hide' ? hide(shun, i) : hunt(shun, i);
}

function hunt(s: BassState, i: BassSense): BassState {
  // Timed moves play out whatever happens.
  if (s.mode === 'tense') return i.now >= s.until ? { ...s, mode: 'burst', until: i.now + BASS.burstMs } : s;
  if (s.mode === 'burst') {
    return i.now >= s.until ? { ...s, mode: 'recover', until: i.now + BASS.recoverMs, strikeAt: i.now + BASS.recoverMs + BASS.strikeCooldownMs } : s;
  }
  if (s.mode === 'recover') return i.now >= s.until ? { ...s, mode: 'roam', patch: i.goal } : s;
  const strike = i.rel === 'hunt' && i.seen && i.dist < BASS.strikeRange && i.now >= s.strikeAt;
  if (!HUNTING.includes(s.mode)) return { ...s, mode: 'roam', patch: i.goal };
  if (s.mode === 'lurk') {
    if (strike) return { ...s, mode: 'tense', until: i.now + BASS.tenseMs };
    if (i.goal !== s.patch && i.dist > BASS.shiftRange) return { ...s, mode: 'roam', patch: i.goal };
    return s;
  }
  // Caught in the open (or with no weed at all), it still lunges if you come close.
  if (strike) return { ...s, mode: 'tense', until: i.now + BASS.tenseMs };
  if (i.goal !== null && i.inPatch === i.goal) return { ...s, mode: 'lurk', patch: i.goal };
  return { ...s, patch: i.goal };
}

function hide(s: BassState, i: BassSense): BassState {
  if (s.mode === 'flushed') {
    return i.now >= s.until ? { ...s, mode: 'flee', patch: i.goal } : s;
  }
  if (s.mode === 'tucked') {
    if (s.patch !== null && i.playerPatch === s.patch) {
      return { ...s, mode: 'flushed', until: i.now + BASS.flushedMs, shunned: s.patch, shunUntil: i.now + BASS.shunMs };
    }
    return s;
  }
  if (s.mode !== 'flee') return { ...s, mode: 'flee', patch: i.goal };
  if (i.goal !== null && i.inPatch === i.goal) return { ...s, mode: 'tucked', patch: i.goal };
  return { ...s, patch: i.goal };
}
