/** What the player can switch off on its own: the music, the effects, and the narrator's voice. */
export type SoundKind = 'music' | 'effects' | 'narration';
export type SoundSettings = Readonly<Record<SoundKind, boolean>>;

const ALL_ON: SoundSettings = { music: true, effects: true, narration: true };

/** The settings kept in `raw`. A save from when one switch muted everything turns them all off. */
export function parseSettings(raw: string | null | undefined): SoundSettings {
  if (!raw) return ALL_ON;
  try {
    const kept = JSON.parse(raw) as { music?: unknown; effects?: unknown; narration?: unknown; muted?: unknown } | null;
    if (kept?.muted === true) return { music: false, effects: false, narration: false };
    return { music: kept?.music !== false, effects: kept?.effects !== false, narration: kept?.narration !== false };
  } catch {
    return ALL_ON;
  }
}

/** `s` with `kind` switched `on`. */
export const settingsWith = (s: SoundSettings, kind: SoundKind, on: boolean): SoundSettings => ({ ...s, [kind]: on });
