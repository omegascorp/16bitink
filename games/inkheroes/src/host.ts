import type { GameEvent, GameHost, OfferPlace } from '@16bitink/game-sdk';
import type { SoundBoard } from './audio/sound';

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  sound: 'sound',
  /** Why the full game's maps failed to load for an owner (null: they didn't fail). */
  fullError: 'fullError',
} as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;

/** Reports a map event to the site's analytics. Never throws: a game must not break over a stat. */
export function trackGame(s: RegistryReader, event: GameEvent): void {
  try {
    (s.registry.get(REG.host) as GameHost | undefined)?.track?.(event);
  } catch {
    // Ignored on purpose.
  }
}

/** Reports that the full-game offer is on screen (once per showing), for the site's stats. */
export function trackOffer(s: RegistryReader, where: OfferPlace): void {
  trackGame(s, { type: 'offer_view', where });
}

/** The game's sound, if it was set up (not in tests or headless runs). */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;

/** Why the full game's maps could not be fetched for an owner, if they couldn't. */
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null | undefined) ?? null;
