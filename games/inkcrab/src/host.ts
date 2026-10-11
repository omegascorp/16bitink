import type { GameHost } from '@16bitink/game-sdk';

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  touch: 'touch',
  /** Why the full game's beaches failed to load for an owner, or null. */
  fullError: 'fullError',
} as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
