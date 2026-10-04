import type { ProgressStore } from '@16bitink/game-sdk';

interface ProgressView {
  readonly data: unknown;
  readonly rev: number;
}

/** Saves that keep meeting newer copies give up after this many merges; the next save tries again. */
const MAX_MERGES = 3;

const isView = (v: unknown): v is ProgressView =>
  typeof v === 'object' && v !== null && 'data' in v && typeof (v as ProgressView).rev === 'number';

async function readBody(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string } | null> {
  return (await res.json().catch(() => null)) as { success?: boolean; data?: unknown; error?: string } | null;
}

/**
 * The signed-in player's account progress for `game`, or null when nobody
 * is signed in (or the check failed: the game then plays on local saves).
 * Fetches the saved copy once, up front, so it is ready when the game boots.
 */
export async function accountProgress(game: string): Promise<ProgressStore | null> {
  const url = `/api/progress/${encodeURIComponent(game)}`;
  let first: ProgressView;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.status === 401) return null;
    const body = await readBody(res);
    if (!res.ok || !body?.success || !isView(body.data)) throw new Error(body?.error ?? `Request failed (${res.status})`);
    first = body.data;
  } catch (err) {
    console.warn('[16bit.ink] could not load account progress', err);
    return null;
  }

  let rev = first.rev;
  let latest = first.data;
  // One save at a time, in order: each builds on the revision the last one got.
  let queue: Promise<void> = Promise.resolve();

  const put = async (data: unknown, merge: (theirs: unknown) => unknown): Promise<void> => {
    let body = data;
    for (let attempt = 0; attempt <= MAX_MERGES; attempt++) {
      const res = await fetch(url, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: body, rev }),
      });
      const reply = await readBody(res);
      if (res.ok && reply?.success && typeof (reply.data as { rev?: unknown } | undefined)?.rev === 'number') {
        rev = (reply.data as { rev: number }).rev;
        latest = body;
        return;
      }
      if (res.status !== 409 || !isView(reply?.data)) throw new Error(reply?.error ?? `Save failed (${res.status})`);
      // Another device saved first: fold its copy in and try again on top of it.
      rev = reply.data.rev;
      body = merge(reply.data.data);
    }
    throw new Error('Progress kept changing on another device');
  };

  return {
    load: () => Promise.resolve(latest),
    save: (data, merge) => {
      const run = queue.then(() => put(data, merge));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
