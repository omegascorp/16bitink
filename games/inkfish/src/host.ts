import type { GameEvent, GameHost } from '@16bitink/game-sdk';
import type { SoundBoard } from './audio/sound';
import type { Chapter } from './levels/types';

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  chapters: 'chapters',
  fullError: 'fullError',
  sound: 'sound',
} as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;

/** Reports a level event to the site's analytics. Never throws: a game must not break over a stat. */
export function trackGame(s: RegistryReader, event: GameEvent): void {
  try {
    (s.registry.get(REG.host) as GameHost | undefined)?.track?.(event);
  } catch {
    // Ignored on purpose.
  }
}
export const getChapters = (s: RegistryReader): Chapter[] => (s.registry.get(REG.chapters) as Chapter[] | undefined) ?? [];
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
/** The game's sound board; absent only in tests that build scenes without mounting the game. */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;
