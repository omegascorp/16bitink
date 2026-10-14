/** Seconds without a mission task done before its red arrow points even at a find in view. */
export const LOST_SECONDS = 15;

/**
 * Whether the player seems lost on the mission: long enough since the last
 * task was done (a find picked up, a marked hunter eaten) that the red arrow
 * should point the way even when what's next is on screen.
 */
export class MissionNudge {
  private progress: number | null = null;
  private since = 0;

  /** `progress`: mission tasks done so far; `elapsed`: the level's seconds. Call each frame. */
  update(progress: number, elapsed: number): void {
    if (progress === this.progress) return;
    this.progress = progress;
    this.since = elapsed;
  }

  lost(elapsed: number): boolean {
    return this.progress !== null && elapsed - this.since >= LOST_SECONDS;
  }
}
