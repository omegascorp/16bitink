import type { GameHost } from '@16bitink/game-sdk';
import type { SoundBoard } from './audio/sound';
import type { Profile } from './logic/economy';
import { loadProfile, saveProfile } from './logic/save';
import type { WorldSave } from './logic/worldSave';

interface RegistryReader {
  readonly registry: { get(key: string): unknown; set(key: string, value: unknown): unknown };
}

export const REG = { host: 'host', profile: 'profile', worlds: 'worlds', sound: 'sound', fullError: 'fullError' } as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;

/** The game's sound (audio/sound.ts), if it was set up: absent in tests and tools that build scenes without mounting. */
export const getSound = (s: RegistryReader): SoundBoard | undefined => s.registry.get(REG.sound) as SoundBoard | undefined;

/** The player's profile, read from storage the first time it's asked for. */
export function getProfile(s: RegistryReader): Profile {
  const held = s.registry.get(REG.profile) as Profile | undefined;
  if (held) return held;
  const loaded = loadProfile(getHost(s).storage);
  s.registry.set(REG.profile, loaded);
  return loaded;
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

/** Replaces the profile and saves it. */
export function setProfile(s: RegistryReader, p: Profile): void {
  s.registry.set(REG.profile, p);
  saveProfile(getHost(s).storage, p);
}
