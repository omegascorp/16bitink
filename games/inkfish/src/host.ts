import type { Chapter } from './levels/types';
import type { KeyValueStore } from './logic/save';

/** What the embedding website provides to the game. */
export interface InkfishHost {
  /** True when the server confirmed the player owns the full game. */
  readonly unlocked: boolean;
  /** Fetches paid chapters from the server; rejects if not entitled. */
  loadFullChapters(): Promise<unknown>;
  /** Start the purchase flow (website handles checkout). */
  onBuy(): void;
  /** Leave the game (e.g. back to the catalog page). */
  onExit(): void;
  readonly storage?: KeyValueStore;
}

interface RegistryReader {
  readonly registry: { get(key: string): unknown };
}

export const REG = {
  host: 'host',
  chapters: 'chapters',
  fullError: 'fullError',
} as const;

export const getHost = (s: RegistryReader): InkfishHost => s.registry.get(REG.host) as InkfishHost;
export const getChapters = (s: RegistryReader): Chapter[] => (s.registry.get(REG.chapters) as Chapter[] | undefined) ?? [];
export const getFullError = (s: RegistryReader): string | null => (s.registry.get(REG.fullError) as string | null) ?? null;
