import type { APIRoute, AstroCookies } from 'astro';
import { findGame } from '../../data/games';
import { isPass } from '../../data/pass';
import { MAX_BATCH_BYTES, parseBatch, readBody, toStoredEvents, type StoredEvent } from '../../lib/analytics';
import { clientIp } from '../../lib/clientIp';
import { db } from '../../lib/db';
import { recordEvents } from '../../lib/db/eventRepo';
import { linkVisitor } from '../../lib/db/visitorLinkRepo';
import { countryOf } from '../../lib/geo';
import { fail, isSameOrigin } from '../../lib/http';
import { currentUser } from '../../lib/owner';
import { parseUserAgent } from '../../lib/userAgent';

export const prerender = false;

/** A game players can play, or the pass (bought from the home page, where there's no game to name). */
const isPlayable = (slug: string): boolean => isPass(slug) || findGame(slug)?.status === 'playable';
const accepted = (): Response => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

/**
 * Ties this browser's visitor id to the signed-in account, if any (see
 * visitorLinkModel.ts). The account never goes into the events themselves.
 * A failure is logged and costs the player nothing.
 */
async function linkSignedIn(cookies: AstroCookies, visitor: string): Promise<void> {
  try {
    const user = await currentUser(cookies);
    if (!user) return;
    await db();
    await linkVisitor(visitor, user.userId, new Date());
  } catch (err) {
    console.error('[analytics] could not link visitor to account', { err });
  }
}

async function storeEvents(events: () => Promise<StoredEvent[]>, count: number): Promise<void> {
  try {
    const stored = await events();
    await db();
    await recordEvents(stored);
  } catch (err) {
    console.error('[analytics] could not store events', { count, err });
  }
}

/**
 * Stores a batch of analytics events from our own pages (sent with fetch
 * or sendBeacon, as text), and links the browser to the account when
 * someone is signed in. The browser learns nothing back: 204 either way
 * once the batch is valid, so a failure here never shows to a player.
 */
export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const raw = await readBody(request, MAX_BATCH_BYTES);
  if (raw === null) return fail(413, 'Batch too large');
  const batch = parseBatch(raw);
  if (!batch) return fail(400, 'Invalid events');

  const agent = parseUserAgent(request.headers.get('user-agent') ?? '', batch.touch === true);
  if (agent.bot) return accepted();
  const events = async (): Promise<StoredEvent[]> => {
    const country = await countryOf(clientIp(request, () => clientAddress));
    return toStoredEvents(batch, { os: agent.os, browser: agent.browser, device: agent.device, country }, Date.now(), isPlayable);
  };
  // Side by side: the link adds one upsert, not a wait after the events.
  await Promise.all([storeEvents(events, batch.events.length), linkSignedIn(cookies, batch.visitor)]);
  return accepted();
};
