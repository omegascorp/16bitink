import { z } from 'zod';

/**
 * First-party analytics: what the browser may send to POST /api/events, and
 * how one batch becomes stored events. Everything here is untrusted input:
 * fields are bounded, games must be known, and timestamps come from the
 * server's clock (a client's clock only says how long ago each event was).
 */

/** A random id the browser made up: never derived from anything about the visitor. */
const Id = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const Game = z.string().regex(/^[a-z0-9-]{1,40}$/);
/** The browser reports play time at least every minute, so one report is never anywhere near this. */
export const MAX_PLAY_TIME_SECONDS = 600;
/** A level run longer than this is not a real one. */
const Seconds = z.number().finite().min(0).max(4 * 3600);
const Level = { level: z.string().min(1).max(40), n: z.number().int().min(1).max(500), name: z.string().max(80).optional() };
const At = z.number().finite();
/** The game's own version (its package.json), so stats can be told apart by release. */
const Version = { version: z.string().regex(/^[0-9A-Za-z.+-]{1,40}$/).optional() };

const Event = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pageview'), at: At, path: z.string().regex(/^\/[^\s]{0,199}$/), ref: z.string().max(100).optional() }),
  z.object({ type: z.literal('game_start'), at: At, game: Game, ...Version }),
  z.object({ type: z.literal('play_time'), at: At, game: Game, seconds: z.number().finite().min(0).max(MAX_PLAY_TIME_SECONDS), ...Version }),
  z.object({ type: z.literal('level_start'), at: At, game: Game, ...Level, ...Version }),
  z.object({
    type: z.literal('level_end'), at: At, game: Game, ...Level, ...Version,
    result: z.enum(['win', 'lose', 'quit']), seconds: Seconds,
    score: z.number().int().min(0).max(1e9).optional(), cause: z.string().max(40).optional(),
  }),
]);

export const MAX_BATCH_EVENTS = 50;
export const MAX_BATCH_BYTES = 32 * 1024;

const Batch = z.object({
  visitor: Id,
  session: Id,
  /** The client's clock when it sent the batch: each event's age is `sentAt - at`. */
  sentAt: z.number().finite(),
  /** A touch screen: tells an iPad (which claims to be a Mac) from a Mac. */
  touch: z.boolean().optional(),
  /** Checked one by one below, so one bad event doesn't cost the rest of the batch. */
  events: z.array(z.unknown()).min(1).max(MAX_BATCH_EVENTS),
});

export type ClientEvent = z.infer<typeof Event>;
export type ClientBatch = Omit<z.infer<typeof Batch>, 'events'> & { readonly events: readonly ClientEvent[] };
export type EventName = ClientEvent['type'];

/**
 * Validates a raw request body. Null when the batch itself is malformed or
 * holds no valid event; invalid events inside a good batch are dropped.
 */
export function parseBatch(raw: string): ClientBatch | null {
  if (raw.length === 0 || raw.length > MAX_BATCH_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = Batch.safeParse(body);
  if (!parsed.success) return null;
  const events = parsed.data.events.flatMap((e) => {
    const one = Event.safeParse(e);
    return one.success ? [one.data] : [];
  });
  return events.length > 0 ? { ...parsed.data, events } : null;
}

/**
 * Reads a request body as text, giving up (null) past `maxBytes` however
 * the body is sent: a missing or false content-length doesn't get around it.
 */
export async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(size);
  chunks.reduce((at, c) => (bytes.set(c, at), at + c.byteLength), 0);
  return new TextDecoder().decode(bytes);
}

/** Who sent a batch, worked out on the server (the IP itself is never kept). */
export interface Visit {
  readonly os: string;
  readonly browser: string;
  readonly device: string;
  /** ISO country code, or null when unknown. */
  readonly country: string | null;
}

/** One stored event. Shaped like other analytics tools' events, so the data can move later. */
export interface StoredEvent extends Visit {
  readonly ts: Date;
  readonly meta: { readonly event: EventName; readonly game: string | null };
  readonly visitor: string;
  readonly session: string;
  readonly path?: string;
  readonly ref?: string;
  readonly level?: string;
  readonly n?: number;
  readonly name?: string;
  readonly result?: 'win' | 'lose' | 'quit';
  readonly seconds?: number;
  readonly score?: number;
  readonly cause?: string;
  /** The game's version, on game events. */
  readonly version?: string;
}

/** Older events than this in one batch are clamped: a tab asleep for days shouldn't rewrite history. */
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Turns a valid batch into events to store. Drops events for games that
 * aren't playable here (`isGame`), and dates each one by the server clock.
 */
export function toStoredEvents(batch: ClientBatch, visit: Visit, nowMs: number, isGame: (slug: string) => boolean): StoredEvent[] {
  return batch.events.flatMap((e): StoredEvent[] => {
    const { type, at, game, ...props } = e as ClientEvent & { readonly game?: string };
    if (game !== undefined && !isGame(game)) return [];
    const age = Math.min(MAX_AGE_MS, Math.max(0, batch.sentAt - at));
    return [{ ...visit, ...props, ts: new Date(nowMs - age), meta: { event: type, game: game ?? null }, visitor: batch.visitor, session: batch.session }];
  });
}
