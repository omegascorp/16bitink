/**
 * Keeps the generated ink drawings between visits, in IndexedDB, so a slow
 * device draws each one once: later boots and level starts decode the saved
 * PNGs (off the main thread) instead of re-running thousands of pen strokes.
 * PNG is lossless, so the textures are the same drawings.
 *
 * Drawings are saved in groups (boot, menu, each level): while a group is
 * tracked, every texture key asked for is noted, and the next time the group
 * is warmed those images are decoded ahead and handed to the texture code.
 *
 * The cache is tied to the game's source: the build defines __INKFISH_BUILD__
 * as a hash of it (see build-id.mjs), and a new hash starts afresh. Off in dev
 * (the source changes under a running server), in tests and in browsers
 * without IndexedDB; then everything is simply drawn as before.
 */
declare const __INKFISH_BUILD__: string | undefined;

const DB_NAME = 'inkfish-art';
const IMAGES = 'images';
const GROUPS = 'groups';
const META = 'meta';
/** Most bytes of drawings waiting to be saved; the rest are saved on a later visit. */
const MAX_PENDING_BYTES = 48 * 1024 * 1024;
/** IndexedDB can stall (old Safari): never hold a level start up longer than this. */
const WARM_TIMEOUT_MS = 2500;

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;
const BUILD = typeof __INKFISH_BUILD__ === 'string' ? __INKFISH_BUILD__ : '';

export const artCacheEnabled = BUILD !== '' && !isDev && typeof indexedDB !== 'undefined' && typeof createImageBitmap === 'function';

let dbPromise: Promise<IDBDatabase | null> | null = null;
/** Keys saved in the database (loaded on open), so nothing is encoded twice. */
const stored = new Set<string>();
/** Decoded drawings waiting for their texture to be made. */
const ready = new Map<string, ImageBitmap>();
const tracking = new Set<Set<string>>();
/** Bumped by dropUnusedArt: decodes started before it are no longer wanted. */
let epoch = 0;
const pending: { key: string; canvas: HTMLCanvasElement }[] = [];
let pendingBytes = 0;
let saving = false;

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

function warn(what: string, err: unknown): void {
  console.warn(`[inkfish] art cache: ${what}`, err);
}

async function openDb(): Promise<IDBDatabase | null> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => {
    for (const name of [IMAGES, GROUPS, META]) open.result.createObjectStore(name);
  };
  const db = await request(open);
  const meta = db.transaction(META, 'readonly').objectStore(META);
  if ((await request(meta.get('build'))) !== BUILD) {
    // A different build may draw differently: start afresh.
    const tx = db.transaction([IMAGES, GROUPS, META], 'readwrite');
    tx.objectStore(IMAGES).clear();
    tx.objectStore(GROUPS).clear();
    tx.objectStore(META).put(BUILD, 'build');
    await done(tx);
  } else {
    for (const key of await request(db.transaction(IMAGES, 'readonly').objectStore(IMAGES).getAllKeys())) stored.add(String(key));
  }
  return db;
}

function database(): Promise<IDBDatabase | null> {
  if (!artCacheEnabled) return Promise.resolve(null);
  dbPromise ??= openDb().catch((err: unknown) => {
    warn('unavailable, drawing everything', err);
    return null;
  });
  return dbPromise;
}

async function loadGroup(group: string, skip: (key: string) => boolean): Promise<void> {
  const db = await database();
  if (!db) return;
  const started = epoch;
  const tx = db.transaction([GROUPS, IMAGES], 'readonly');
  const keys = ((await request(tx.objectStore(GROUPS).get(group))) as string[] | undefined) ?? [];
  const wanted = keys.filter((k) => !skip(k) && !ready.has(k) && stored.has(k));
  const images = tx.objectStore(IMAGES);
  const blobs = await Promise.all(wanted.map((k) => request(images.get(k)) as Promise<Blob | undefined>));
  await Promise.all(wanted.map(async (key, i) => {
    const blob = blobs[i];
    if (!blob) return;
    try {
      const bmp = await createImageBitmap(blob);
      // Arrived after its level was built (a timed-out warm-up): nobody will take it.
      if (started !== epoch) bmp.close();
      else ready.set(key, bmp);
    } catch (err) {
      warn(`could not decode ${key}`, err);
    }
  }));
}

/**
 * Decodes the drawings `group` used last time, ahead of the code that asks for
 * them. `skip`: keys that already have a texture. Never rejects.
 */
export async function warmArt(group: string, skip: (key: string) => boolean): Promise<void> {
  if (!artCacheEnabled) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, WARM_TIMEOUT_MS);
  });
  try {
    await Promise.race([loadGroup(group, skip), timeout]);
  } catch (err) {
    warn(`could not load ${group}`, err);
  } finally {
    clearTimeout(timer);
  }
}

/** The decoded drawing for `key` if one was warmed; the caller owns (and closes) it. */
export function takeArt(key: string): ImageBitmap | undefined {
  const bmp = ready.get(key);
  ready.delete(key);
  return bmp;
}

/** Notes that `key` was asked for, for every group being tracked. */
export function noteArt(key: string): void {
  for (const keys of tracking) keys.add(key);
}

/** Starts noting keys for `group`; the returned function stops and saves the list. */
export function trackArt(group: string): () => void {
  if (!artCacheEnabled) return () => undefined;
  const keys = new Set<string>();
  tracking.add(keys);
  return () => {
    if (!tracking.delete(keys) || keys.size === 0) return;
    void saveGroup(group, keys);
  };
}

async function saveGroup(group: string, keys: ReadonlySet<string>): Promise<void> {
  try {
    const db = await database();
    if (!db) return;
    const tx = db.transaction(GROUPS, 'readwrite');
    const store = tx.objectStore(GROUPS);
    const before = ((await request(store.get(group))) as string[] | undefined) ?? [];
    const all = new Set([...before, ...keys]);
    if (all.size !== before.length) store.put([...all], group);
    await done(tx);
  } catch (err) {
    warn(`could not save ${group}`, err);
  }
}

/** Queues a freshly drawn canvas to be saved, in idle time. */
export function rememberArt(key: string, canvas: HTMLCanvasElement): void {
  if (!artCacheEnabled || stored.has(key)) return;
  const bytes = canvas.width * canvas.height * 4;
  if (pendingBytes + bytes > MAX_PENDING_BYTES) return;
  pending.push({ key, canvas });
  pendingBytes += bytes;
  if (!saving) {
    saving = true;
    idle(saveNext);
  }
}

/** Drops decoded drawings nobody asked for (the level no longer uses them). */
export function dropUnusedArt(): void {
  epoch += 1;
  ready.forEach((bmp) => bmp.close());
  ready.clear();
}

/** Drawings encoded and written together: one transaction, and the encodes run in parallel off the main thread. */
const SAVE_BATCH = 8;

/** Soon, preferring idle time; a running game is rarely idle, so don't wait long for it. */
function idle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 250 });
  else setTimeout(fn, 50);
}

const toPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned nothing'))), 'image/png'));

async function saveNext(): Promise<void> {
  const batch = pending.splice(0, SAVE_BATCH);
  if (batch.length === 0) {
    saving = false;
    return;
  }
  for (const { canvas } of batch) pendingBytes -= canvas.width * canvas.height * 4;
  try {
    const db = await database();
    const fresh = batch.filter((b) => !stored.has(b.key));
    if (db && fresh.length) {
      const blobs = await Promise.all(fresh.map((b) => toPng(b.canvas)));
      const tx = db.transaction(IMAGES, 'readwrite');
      fresh.forEach((b, i) => tx.objectStore(IMAGES).put(blobs[i], b.key));
      await done(tx);
      for (const b of fresh) stored.add(b.key);
    }
  } catch (err) {
    // Most likely the storage quota: keep playing, just without saving more.
    warn('could not save drawings', err);
    pending.length = 0;
    pendingBytes = 0;
    saving = false;
    return;
  }
  idle(() => void saveNext());
}
