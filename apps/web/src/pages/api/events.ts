import type { APIRoute } from 'astro';
import { findGame } from '../../data/games';
import { isPass } from '../../data/pass';
import { MAX_BATCH_BYTES, parseBatch, readBody, toStoredEvents } from '../../lib/analytics';
import { clientIp } from '../../lib/clientIp';
import { db } from '../../lib/db';
import { recordEvents } from '../../lib/db/eventRepo';
import { countryOf } from '../../lib/geo';
import { fail, isSameOrigin } from '../../lib/http';
import { parseUserAgent } from '../../lib/userAgent';

export const prerender = false;

/** A game players can play, or the pass (bought from the home page, where there's no game to name). */
const isPlayable = (slug: string): boolean => isPass(slug) || findGame(slug)?.status === 'playable';
const accepted = (): Response => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

/**
 * Stores a batch of analytics events from our own pages (sent with fetch
 * or sendBeacon, as text). The browser learns nothing back: 204 either way
 * once the batch is valid, so a failure here never shows to a player.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!isSameOrigin(request)) return fail(403, 'Cross-origin request rejected');
  const raw = await readBody(request, MAX_BATCH_BYTES);
  if (raw === null) return fail(413, 'Batch too large');
  const batch = parseBatch(raw);
  if (!batch) return fail(400, 'Invalid events');

  const agent = parseUserAgent(request.headers.get('user-agent') ?? '', batch.touch === true);
  if (agent.bot) return accepted();
  try {
    const country = await countryOf(clientIp(request, () => clientAddress));
    const events = toStoredEvents(batch, { os: agent.os, browser: agent.browser, device: agent.device, country }, Date.now(), isPlayable);
    await db();
    await recordEvents(events);
  } catch (err) {
    console.error('[analytics] could not store events', { count: batch.events.length, err });
  }
  return accepted();
};
