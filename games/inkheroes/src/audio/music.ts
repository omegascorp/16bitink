import { MUSIC_TRACKS, type TrackId } from './tracks';

/** How loud the music sits under the effects. */
const LEVEL = 0.42;
/** How long one track takes to give way to the next, seconds. */
const FADE_S = 1.2;
/** Tracks kept decoded: a town and the map, going back and forth, needn't load each time. */
const KEPT = 2;

/**
 * The background music on the game's audio context. A decoded track loops
 * by itself with no gap; its files carry a little sound on either side of
 * the loop points, so what the encoder adds at the ends is never heard.
 */
export class MusicPlayer {
  private wanted: TrackId | null = null;
  private now: { id: TrackId; source: AudioBufferSourceNode; level: GainNode } | null = null;
  private readonly decoded = new Map<TrackId, Promise<AudioBuffer>>();

  constructor(private readonly ctx: AudioContext, private readonly out: AudioNode) {}

  /** Plays `id`, fading out whatever played before; the same track carries on. */
  play(id: TrackId | null): void {
    this.wanted = id;
    if (this.now?.id === id) return;
    this.fadeOut();
    if (!id) return;
    void this.buffer(id).then((buffer) => {
      if (this.wanted === id && this.now?.id !== id) this.begin(id, buffer);
    }).catch(() => this.decoded.delete(id));
  }

  private buffer(id: TrackId): Promise<AudioBuffer> {
    const known = this.decoded.get(id);
    if (known) {
      // Most recently heard goes last, so the oldest is the one let go.
      this.decoded.delete(id);
      this.decoded.set(id, known);
      return known;
    }
    const loading = fetch(MUSIC_TRACKS[id].url).then((r) => r.arrayBuffer()).then((data) => this.ctx.decodeAudioData(data));
    this.decoded.set(id, loading);
    for (const old of [...this.decoded.keys()].slice(0, -KEPT)) this.decoded.delete(old);
    return loading;
  }

  private begin(id: TrackId, buffer: AudioBuffer): void {
    const { loopStart, loopEnd } = MUSIC_TRACKS[id];
    const t = this.ctx.currentTime;
    const level = this.ctx.createGain();
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(LEVEL, t + FADE_S);
    level.connect(this.out);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = loopStart;
    source.loopEnd = loopEnd;
    source.connect(level);
    source.start(t, loopStart);
    this.now = { id, source, level };
  }

  private fadeOut(): void {
    const last = this.now;
    if (!last) return;
    this.now = null;
    const t = this.ctx.currentTime;
    last.level.gain.cancelScheduledValues(t);
    last.level.gain.setValueAtTime(last.level.gain.value, t);
    last.level.gain.linearRampToValueAtTime(0, t + FADE_S);
    last.source.stop(t + FADE_S);
    last.source.onended = () => last.level.disconnect();
  }
}
