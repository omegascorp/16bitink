/** What the player can switch off on its own. */
export type SoundKind = 'music' | 'effects';
export type SoundSettings = Readonly<Record<SoundKind, boolean>>;

const ALL_ON: SoundSettings = { music: true, effects: true };

/** The settings kept in `raw`. A save from when one switch muted everything turns both off. */
export function parseSettings(raw: string | null | undefined): SoundSettings {
  if (!raw) return ALL_ON;
  try {
    const kept = JSON.parse(raw) as { music?: unknown; effects?: unknown; muted?: unknown } | null;
    if (kept?.muted === true) return { music: false, effects: false };
    return { music: kept?.music !== false, effects: kept?.effects !== false };
  } catch {
    return ALL_ON;
  }
}

/** `s` with `kind` switched `on`. */
export const settingsWith = (s: SoundSettings, kind: SoundKind, on: boolean): SoundSettings => ({ ...s, [kind]: on });
