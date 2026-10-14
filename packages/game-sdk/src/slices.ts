/**
 * Runs a long list of synchronous jobs (drawing textures, say) a slice at a
 * time, handing the main thread back to the browser between slices, so a
 * loading bar keeps moving and the page never freezes for seconds.
 */
export type SliceJob = () => void;

export interface SliceOptions {
  /** Most milliseconds of work before yielding. ~24 keeps the bar near 30 fps with little overhead. */
  readonly budgetMs?: number;
  /** Fraction of the jobs done (0..1), called after each slice. */
  readonly onProgress?: (fraction: number) => void;
  /** Injected in tests. */
  readonly now?: () => number;
  /** Injected in tests; by default lets the browser paint before carrying on. */
  readonly yieldTo?: () => Promise<void>;
}

const DEFAULT_BUDGET_MS = 24;

interface Scheduler {
  yield?: () => Promise<void>;
}

/**
 * scheduler.yield() resumes right after the browser's pending work (input,
 * a frame), without setTimeout's 4 ms clamp; older browsers fall back to it.
 */
export function yieldToBrowser(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
  const yieldNow = scheduler?.yield;
  if (typeof yieldNow === 'function') return yieldNow.call(scheduler);
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Runs `jobs` in order. Rejects with the first job's error, running none after it. */
export async function runInSlices(jobs: readonly SliceJob[], options: SliceOptions = {}): Promise<void> {
  const { budgetMs = DEFAULT_BUDGET_MS, onProgress, now = () => performance.now(), yieldTo = yieldToBrowser } = options;
  let next = 0;
  while (next < jobs.length) {
    const start = now();
    do {
      jobs[next]?.();
      next += 1;
    } while (next < jobs.length && now() - start < budgetMs);
    onProgress?.(next / jobs.length);
    if (next < jobs.length) await yieldTo();
  }
  if (jobs.length === 0) onProgress?.(1);
}
