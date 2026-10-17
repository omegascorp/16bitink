/**
 * Where to draw things on a wrapping world. The sim keeps everything folded
 * into the grid (x from 0 to the world's width), but the camera roams
 * freely round the ring, so each thing is drawn at its copy nearest the
 * camera: the same trick as InkFish's sea (logic/ring.ts there). On a world
 * that doesn't wrap the span is infinite and nothing moves.
 */
export class Ring {
  /** The camera's middle, world px, as of the last frame. */
  centre = 0;

  constructor(readonly span: number) {}

  get wraps(): boolean {
    return Number.isFinite(this.span);
  }

  /** `x`'s copy nearest the camera. */
  near(x: number): number {
    return this.wraps ? x + this.span * Math.round((this.centre - x) / this.span) : x;
  }
}
