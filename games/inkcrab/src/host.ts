import type { GameHost } from '@16bitink/game-sdk';
import type { SoundBoard } from './audio/sound';

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  touch: 'touch',
  /** Why the full game's beaches failed to load for an owner, or null. */
  fullError: 'fullError',
  sound: 'sound',
} as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
/** The game's sound, if it was set up (not in tests or headless runs). */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;
