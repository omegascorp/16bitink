import type { GameHost } from '@16bitink/game-sdk';
import type { Chapter } from './levels/types';

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  chapters: 'chapters',
  fullError: 'fullError',
} as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;
export const getChapters = (s: RegistryReader): Chapter[] => (s.registry.get(REG.chapters) as Chapter[] | undefined) ?? [];
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
