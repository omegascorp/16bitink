import type { GameHost } from '@16bitink/game-sdk';
import type { Profile } from './logic/economy';
import { loadProfile, saveProfile } from './logic/save';

interface RegistryReader {
  readonly registry: { get(key: string): unknown; set(key: string, value: unknown): unknown };
}

export const REG = { host: 'host', profile: 'profile' } as const;

export const getHost = (s: RegistryReader): GameHost => s.registry.get(REG.host) as GameHost;

/** The player's profile, read from storage the first time it's asked for. */
export function getProfile(s: RegistryReader): Profile {
  const held = s.registry.get(REG.profile) as Profile | undefined;
  if (held) return held;
  const loaded = loadProfile(getHost(s).storage);
  s.registry.set(REG.profile, loaded);
  return loaded;
}

/** Replaces the profile and saves it. */
export function setProfile(s: RegistryReader, p: Profile): void {
  s.registry.set(REG.profile, p);
  saveProfile(getHost(s).storage, p);
}
