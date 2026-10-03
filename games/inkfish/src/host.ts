import type { GameHost } from '@16bitink/game-sdk';
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
export const getChapters = (s: RegistryReader): Chapter[] => (s.registry.get(REG.chapters) as Chapter[] | undefined) ?? [];
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
/** The game's sound board; absent only in tests that build scenes without mounting the game. */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;
