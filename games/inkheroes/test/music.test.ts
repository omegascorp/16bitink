import { describe, expect, it, vi } from 'vitest';
import { MusicPlayer } from '../src/audio/music';
import { MUSIC_TRACKS } from '../src/audio/tracks';

function fakeContext(): { ctx: AudioContext; sources: Record<string, unknown>[] } {
  const sources: Record<string, unknown>[] = [];
  const param = (): Record<string, unknown> => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const ctx = {
    currentTime: 0,
    decodeAudioData: vi.fn(async () => ({})),
    createGain: () => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() }),
    createBufferSource: () => {
      const s = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      sources.push(s);
      return s;
    },
  } as unknown as AudioContext;
  return { ctx, sources };
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r));

describe('the music', () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })));

  it('has a loop inside every file, with sound to spare on either side', () => {
    for (const t of Object.values(MUSIC_TRACKS)) {
      expect(t.loopStart).toBeGreaterThan(0);
      expect(t.loopEnd - t.loopStart).toBeGreaterThan(30);
    }
  });

  it('loops a track between its points, with nothing played before the gap-free loop', async () => {
    const { ctx, sources } = fakeContext();
    new MusicPlayer(ctx, {} as AudioNode).play('map');
    await settle();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ loop: true, loopStart: MUSIC_TRACKS.map.loopStart, loopEnd: MUSIC_TRACKS.map.loopEnd });
  });

  it('carries on when the same track is asked for again', async () => {
    const { ctx, sources } = fakeContext();
    const music = new MusicPlayer(ctx, {} as AudioNode);
    music.play('townGreek');
    await settle();
    music.play('townGreek');
    await settle();
    expect(sources).toHaveLength(1);
  });

  it('fades the last track out when another takes over, and plays only the newest asked for', async () => {
    const { ctx, sources } = fakeContext();
    const music = new MusicPlayer(ctx, {} as AudioNode);
    music.play('map');
    await settle();
    music.play('battle');
    music.play('townGreek');
    await settle();
    expect((sources[0] as { stop: ReturnType<typeof vi.fn> }).stop).toHaveBeenCalled();
    expect(sources).toHaveLength(2);
    expect(sources[1]).toMatchObject({ loopEnd: MUSIC_TRACKS.townGreek.loopEnd });
  });
});
