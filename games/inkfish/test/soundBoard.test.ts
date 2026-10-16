import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundBoard } from '../src/audio/sound';
import { SOUND_KEY } from '../src/audio/recipes';

describe('SoundBoard platform mute', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('silences the game without touching the player\'s own saved switch', () => {
    const listen = { addEventListener: () => undefined, removeEventListener: () => undefined };
    vi.stubGlobal('window', listen);
    vi.stubGlobal('document', listen);
    const items = new Map<string, string>();
    const board = new SoundBoard({ getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) });
    board.setPlatformMuted(true);
    expect(board.muted).toBe(false);
    expect(items.has(SOUND_KEY)).toBe(false);
    board.setMuted(true);
    board.setPlatformMuted(false);
    expect(board.muted).toBe(true);
    expect(items.get(SOUND_KEY)).toBe('{"muted":true}');
    board.destroy();
  });
});
