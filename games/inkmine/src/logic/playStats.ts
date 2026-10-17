/** What the site's stats remember between saves (progress.ts): play time, and the step last reported and when it began. */
export interface PlayStats {
  /** Seconds played in all, counted only while the game is on screen. */
  readonly played: number;
  /** The key of the step last reported started; '' before the first. */
  readonly step: string;
  /** `played` when that step began. */
  readonly since: number;
}

export const NEW_STATS: PlayStats = { played: 0, step: '', since: 0 };
