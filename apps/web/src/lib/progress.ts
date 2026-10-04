/**
 * Game progress saved to a player's account. The site doesn't know any
 * game's save format, so it stores each one as an opaque JSON value and
 * leaves validation to the game. `rev` counts saves: a write must name the
 * revision it was based on, so a device that missed another device's save
 * gets that copy back to merge instead of overwriting it.
 */
export interface ProgressRecord {
  /** The game's progress, as JSON text. */
  readonly data: string;
  readonly rev: number;
}

/** Largest progress one game may save, bytes of JSON. Far above any real save. */
export const MAX_PROGRESS_BYTES = 64 * 1024;

export interface ProgressWrite {
  readonly data: string;
  /** The revision this save was based on; 0 when the device has seen none. */
  readonly rev: number;
}

/**
 * Validates a PUT body `{ data, rev }` (raw JSON text, untrusted). `data`
 * must be a JSON object; it's kept as text so its keys never reach a query.
 */
export function parseProgressWrite(raw: string): ProgressWrite | null {
  if (raw.length > MAX_PROGRESS_BYTES + 64) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const { data, rev } = body as { data?: unknown; rev?: unknown };
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  if (typeof rev !== 'number' || !Number.isSafeInteger(rev) || rev < 0) return null;
  const text = JSON.stringify(data);
  if (text.length > MAX_PROGRESS_BYTES) return null;
  return { data: text, rev };
}

/** The API's view of a record: the progress parsed back to JSON. */
export function toProgressView(record: ProgressRecord | null): { readonly data: unknown; readonly rev: number } {
  if (!record) return { data: null, rev: 0 };
  try {
    return { data: JSON.parse(record.data) as unknown, rev: record.rev };
  } catch {
    return { data: null, rev: record.rev };
  }
}
