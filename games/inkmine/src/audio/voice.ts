import type { SoundBoard } from './sound';

/**
 * The narrator's voice: recordings fetched once and kept as they came (a
 * few hundred KB of mp3 each), decoded only when they're played, so heard
 * lines don't pile up as raw audio; played on the sound board's own voice
 * track (not dipped with the rest), and paused, resumed or stopped from
 * where it is. Silent, and never throwing, where there's no Web Audio or
 * sound is off: the caller times the subtitles itself then.
 */
export class VoicePlayer {
  private readonly files = new Map<string, Promise<ArrayBuffer | null>>();
  private decoder: BaseAudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private ctx: AudioContext | null = null;
  /** When the playing source started, on its context's clock, less how far into the buffer it started. */
  private zero = 0;

  constructor(private readonly board: SoundBoard) {}

  /** Fetches the recording at `url` ahead of its line, behind whatever else is loading. */
  prefetch(url: string): void {
    void this.file(url, 'low');
  }

  /** The recording at `url`, decoded (null when it can't be fetched or decoded). */
  load(url: string): Promise<AudioBuffer | null> {
    return this.file(url, 'high').then((data) => {
      if (!data) return null;
      // Decoding takes the bytes it's given: a copy keeps them for next time.
      return (this.decoding()?.decodeAudioData(data.slice(0)) ?? Promise.resolve(null)).catch((err: unknown) => {
        console.warn('[inkmine] narration did not decode', url, err);
        return null;
      });
    });
  }

  /** The recording's bytes, fetched once; a failed fetch is tried again next time. */
  private file(url: string, priority: RequestPriority): Promise<ArrayBuffer | null> {
    let p = this.files.get(url);
    if (!p) {
      p = fetch(url, { priority })
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .catch((err: unknown) => {
          console.warn('[inkmine] narration did not load', url, err);
          this.files.delete(url);
          return null;
        });
      this.files.set(url, p);
    }
    return p;
  }

  /** Plays `buffer` from `at` seconds in; false when sound is off or not running yet. */
  play(buffer: AudioBuffer, at: number): boolean {
    this.stop();
    const track = this.board.voiceTrack();
    if (!track) return false;
    const src = track.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(track.out);
    src.start(track.ctx.currentTime + 0.02, Math.min(Math.max(0, at), buffer.duration));
    this.source = src;
    this.ctx = track.ctx;
    this.zero = track.ctx.currentTime + 0.02 - at;
    return true;
  }

  /** Seconds into the playing recording, or null when none is playing. */
  get position(): number | null {
    return this.source && this.ctx ? Math.max(0, this.ctx.currentTime - this.zero) : null;
  }

  stop(): void {
    if (!this.source) return;
    try {
      this.source.stop();
    } catch {
      // Already stopped.
    }
    this.source.disconnect();
    this.source = null;
  }

  /** A context to decode with before sound has started (browsers start it only on a tap or key). */
  private decoding(): BaseAudioContext | null {
    const live = this.board.voiceTrack()?.ctx;
    if (live) return live;
    if (!this.decoder && typeof OfflineAudioContext !== 'undefined') this.decoder = new OfflineAudioContext(1, 1, 44100);
    return this.decoder;
  }
}
