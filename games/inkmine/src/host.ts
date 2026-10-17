import type { GameEvent, GameHost } from '@16bitink/game-sdk';
import type { SoundBoard } from './audio/sound';
import type { Profile } from './logic/economy';
import { advance, sessionStart } from './logic/progress';
import { loadProfile, saveProfile } from './logic/save';
import type { WorldSave } from './logic/worldSave';

interface RegistryReader {
  readonly registry: { get(key: string): unknown; set(key: string, value: unknown): unknown };
}

export const REG = { host: 'host', profile: 'profile', worlds: 'worlds', sound: 'sound', fullError: 'fullError', played: 'played' } as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;

/** The game's sound (audio/sound.ts), if it was set up: absent in tests and tools that build scenes without mounting. */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;

/** Reports a gameplay moment to the site's stats. Never throws: the game must not break over a stat. */
function track(s: RegistryReader, events: readonly GameEvent[]): void {
  for (const e of events) {
    try {
      getHost(s).track?.(e);
    } catch {
      // Ignored on purpose.
    }
  }
}

/** Seconds played in all so far, this session's included. */
const playedNow = (s: RegistryReader, p: Profile): number => (s.registry.get(REG.played) as number | undefined) ?? p.stats.played;

/** Counts `ms` of play: called every frame, which Phaser stops while the tab is hidden. A long stall counts as a second at most. */
export function tickPlay(s: RegistryReader, ms: number): void {
  const held = s.registry.get(REG.profile) as Profile | undefined;
  if (!held) return;
  s.registry.set(REG.played, playedNow(s, held) + Math.min(ms, 1000) / 1000);
}

/**
 * The player's profile, read from storage the first time it's asked for;
 * that's when the session's goal is reported started.
 */
export function getProfile(s: RegistryReader): Profile {
  const held = s.registry.get(REG.profile) as Profile | undefined;
  if (held) return held;
  const { profile, events } = sessionStart(loadProfile(getHost(s).storage));
  s.registry.set(REG.profile, profile);
  s.registry.set(REG.played, profile.stats.played);
  track(s, events);
  return profile;
}

/**
 * The latest changes to a world this session, held in memory: newer than
 * (or, with storage blocked, instead of) what's in storage, so going aboard
 * and back down never loses digging.
 */
export function heldWorld(s: RegistryReader, worldId: string): WorldSave | undefined {
  return (s.registry.get(REG.worlds) as Readonly<Record<string, WorldSave>> | undefined)?.[worldId];
}

export function holdWorld(s: RegistryReader, worldId: string, save: WorldSave): void {
  const held = (s.registry.get(REG.worlds) as Readonly<Record<string, WorldSave>> | undefined) ?? {};
  s.registry.set(REG.worlds, { ...held, [worldId]: save });
}

/** Replaces the profile and saves it, with the play time so far, reporting any goal it moved past. */
export function setProfile(s: RegistryReader, p: Profile): void {
  const { profile, events } = advance(p, playedNow(s, p));
  s.registry.set(REG.profile, profile);
  saveProfile(getHost(s).storage, profile);
  track(s, events);
}
