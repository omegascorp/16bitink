/**
 * Decoded frames waiting to be used, at most: each holds a full picture, and
 * hardware decoders stall once a handful of their frames are held.
 */
const AHEAD = 2;
/** Longest wait for the decoder before checking again, ms (some browsers lack the dequeue event). */
const POLL_MS = 15;

/**
 * Decodes a run of recorded frames one at a time, as the clip needs them,
 * so only a few decoded pictures are in memory at once. Each frame handed
 * out belongs to the caller, who must close it.
 */
export class FrameStream {
  private readonly decoder: VideoDecoder;
  private readonly ready: VideoFrame[] = [];
  private next = 0;
  private flushed = false;
  private failure: unknown = null;
  private wake: (() => void) | null = null;

  constructor(private readonly chunks: readonly EncodedVideoChunk[], config: VideoDecoderConfig) {
    this.decoder = new VideoDecoder({
      output: (frame) => {
        this.ready.push(frame);
        this.poke();
      },
      error: (err) => {
        this.failure = err;
        this.poke();
      },
    });
    this.decoder.configure(config);
    this.decoder.addEventListener('dequeue', () => this.poke());
  }

  /** The next frame in order, or null after the last. */
  async read(): Promise<VideoFrame | null> {
    for (;;) {
      if (this.failure) throw this.failure;
      const frame = this.ready.shift();
      if (frame) return frame;
      if (this.next < this.chunks.length) {
        while (this.next < this.chunks.length && this.decoder.decodeQueueSize + this.ready.length < AHEAD) this.decoder.decode(this.chunks[this.next++]!);
        await this.waitForDecoder();
      } else if (!this.flushed) {
        this.flushed = true;
        await this.decoder.flush();
      } else {
        return null;
      }
    }
  }

  close(): void {
    for (const f of this.ready.splice(0)) f.close();
    if (this.decoder.state !== 'closed') this.decoder.close();
  }

  private poke(): void {
    this.wake?.();
    this.wake = null;
  }

  private waitForDecoder(): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, POLL_MS);
      this.wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
}
